# Guide d'Exploitation des Données d'Input (Brawlhalla)

Ce document est une référence technique détaillée destinée aux développeurs et aux agents IA chargés d'analyser la séquence d'inputs (`ReplayData.inputs`) des replays. Il décrit comment le moteur de Brawlhalla enregistre le temps, les touches, et comment interpréter correctement ces données pour créer des fonctionnalités telles que des calculateurs d'APM (Actions Per Minute) ou des détecteurs de combos.

---

## 1. La Fréquence d'Enregistrement (Le Tick Rate)

Lors de l'analyse des logs d'inputs, l'écart minimum entre deux timestamps est toujours d'environ **16 millisecondes** (par exemple : `t=6208ms` - `t=6192ms` = `16ms`).

**Explication technique :**
Le moteur physique de Brawlhalla s'exécute à une fréquence stricte de **60 Hz** (60 frames par seconde).
Par conséquent, la résolution temporelle maximale du jeu est de `1000 ms / 60 ≈ 16.66 ms` par frame. Le jeu n'est littéralement pas capable d'enregistrer deux actions distinctes avec un écart inférieur à ce tick rate. Chaque ligne de donnée correspond au marqueur temporel exact ("tick") d'une frame spécifique.

---

## 2. La Règle de Simultanéité (Les Bitmasks)

Exemple typique d'une extraction par le parseur :
`t=6208ms: [DROP, LIGHT_ATTACK, DODGE_DASH]`

**Règle absolue :** À l'intérieur des crochets, il n'existe **aucun ordre chronologique**.
Ces tableaux représentent un *"snapshot" (instantané) exact et figé* de l'état de la manette au moment du tick défini.

L'ordre d'affichage des actions (ex: `DROP` avant `LIGHT_ATTACK`) ne dépend en rien de la vitesse d'exécution du joueur. Il est simplement le reflet de l'ordre de lecture des bits lors du décodage du **masque binaire de 14-bits** sérialisé dans le format `.replay`. Toutes les touches mentionnées dans le tableau sont perçues comme étant pressées et maintenues *simultanément* par le moteur.

---

## 3. Le Système de "State Change" (Delta-Compression)

L'observation des timestamps révèle souvent des "trous" conséquents entre les événements.
Exemple d'une séquence :
- `t=6480ms: [DROP]`
- `t=6544ms: []` *(64ms plus tard sans aucune touche)*
- `t=6704ms: [LEFT]` *(160ms plus tard)*

**Compression temporelle :**
Le moteur n'enregistre pas l'état exact de la manette en continu à chaque frame. Il fonctionne purement de manière **événementielle (State Change)**. 

Si un joueur appuie sur la touche "Droite" et la maintient pendant 3 secondes, il n'y aura qu'un seul log temporel au début de cette période (avec l'action `[RIGHT]`). 
La touche est considérée comme "maintenue activement" par l'engine tant qu'un **nouvel état** n'est pas envoyé dans le flux de la timeline. L'apparition d'un tableau vide `[]` représente l'état "Neutre" : cela indique explicitement que le joueur a totalement relâché la prise, écrasant ainsi l'état précédent.

---

## 4. Guide d'Exploitation (Tips pour l'Algorithmique)

### A. Calculer le véritable APM (Actions Per Minute)

Pour calculer un score d'APM cohérent, il ne faut **pas** additionner le nombre de lignes (timestamps), ni accumuler la taille de chaque tableau d'un même timestamp. Par exemple, une ligne `[LEFT]` suivie plus tard d'une ligne `[LEFT, JUMP]` indique qu'une seule nouvelle action a été déclenchée : le saut.

**Algorithme (Concept en Pseudo-Code) :**
```javascript
let totalActions = 0;
let previousState = new Set();

for (const input of player.inputs) {
    const currentState = new Set(input.actions);
    
    // Identifier les touches qui viennent d'être frappées (non-présentes dans l'état d'avant)
    const pressedKeys = [...currentState].filter(action => !previousState.has(action));
    
    // Seules les NOuVELLES pressions horizontales/verticales augmentent le calcul des actions
    totalActions += pressedKeys.length;
    
    // Mise à jour de l'état pour la frame suivante
    previousState = currentState;
}

const durationInMinutes = matchLengthMs / 60000;
const realAPM = totalActions / durationInMinutes;
```

### B. Tolérance pour la Détection de Combos

Puisque l'entrée agit comme un State Change verrouillé par ticks (~16ms), un détecteur de combos qui fait le lien entre une direction et une action s'appuie sur le croisement temporel.
Pour identifier une attaque complexe (ex: "Down Signature"), l'analyste doit : 
1. Trouver l'apparition d'une attaque (ex: `HEAVY_ATTACK`).
2. Vérifier si un sous-état directionnel (ex: `DOWN`) est *déjà contenu* dans le frame state actuel, **OU** dans le frame state resté ouvert par rétention (State Change) immédiatement avant. 
3. Utiliser les timestamps du jeu pour valider la tolérance de la mémoire tampon des enchaînements (frames d'animation) au lieu de mesurer des événements logiques continus.
