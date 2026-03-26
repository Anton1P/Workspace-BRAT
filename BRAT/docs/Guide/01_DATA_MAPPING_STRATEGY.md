# Guide d'Implémentation 01 : Stratégie de Mapping des Données (Data Mapping Strategy)

Ce document pose les fondations du traitement des données extraites par le parseur binaire `brat-parser-lib` pour l'analyse algorithmique. Tout agent IA chargé de construire de nouvelles "features" dans l'application BRAT doit maîtriser les concepts présents ici.

## 1. La Règle des 60Hz et la Résolution Temporelle

Le moteur de Brawlhalla enregistre ses états à une fréquence immuable de **60 trames par seconde (60Hz)**. 
Cela implique qu'une "frame" de jeu dure exactement **~16.66 millisecondes** (`1000 / 60`).

*   **Tick Rate** : L'écart minimum entre deux timestamps dans l'objet `ReplayData` sera toujours un multiple de 16,66ms (ex: 16ms, 32ms, 48ms, etc. arrondi à l'entier dans le stream).
*   **Frame Data** : En transformant les différences de timestamp en frames (`deltaTime / 16.66`), vous obtenez l'unité de mesure exacte pour l'exécution d'algorithmes exigeants (comme le startup, les fenêtres d'esquives ou les punish windows).

## 2. Logique de Changement d'État et Delta-Compression

Le tableau `inputs` d'un joueur ne représente **pas** une ligne par frame. Il fonctionne en **Delta-Compression (State Change)**.

*   **Une action est "maintenue"** : Si à `t=1000ms`, le log indique `[LEFT, LIGHT_ATTACK]`, le jeu considérera que le joueur maintient la touche gauche et attaque. Ce statut est maintenu en continu par le moteur de jeu, frame après frame.
*   **L'écrasement de statut** : Ce n'est que lorsqu'une nouvelle entrée apparaît (ex: `t=1250ms : [LEFT]`) que l'état précédent est écrasé.
*   **Le retour au neutre** : Un tableau vide `[]` indique instantanément la relâche de toutes les touches (Return to Netural).

### Conséquence Algorithmique de l'Extraction
Pour analyser l'évolution du joueur, vous devez toujours comparer l'état actuel `S_n` avec l'état précédent `S_n-1`. 

*Pseudo-code du traitement du Diff :*
```typescript
const previousState = new Set(lastInput.actions);
const currentState = new Set(currentInput.actions);

// Touches pressées spécifiquement à cette frame (non maintenues avant)
const newlyPressed = [...currentState].filter(a => !previousState.has(a));

// Touches relâchées (présentes avant, mais disparues)
const released = [...previousState].filter(a => !currentState.has(a));
```

## 3. Lexique de Correspondance des "Input Flags"

Pour traduire le comportement humain en logique machine, voici le mapping exact des constantes généralement définies. Un joueur a réalisé l'action [Action] si et seulement si l'input décodé comprend le drapeau suivant :

| Appellation In-Game | Masque Binaire Décodé (Flag) | Description Contextuelle |
| :--- | :--- | :--- |
| **Saut** (Jump) | `JUMP` | Fait bondir le personnage. S'il y a un `DODGE_DASH` proche/simultané, peut être un Dash-Jump. |
| **Esquive / Dash** | `DODGE_DASH` | Dépend du contexte. Au sol et suivi d'un mouvement : *Dash*. En l'air ou neutre : *Esquive*. |
| **Attaque Légère** | `LIGHT_ATTACK` | C'est le bouton pour le NLight, SLight, DLight, NAir, SAir et DAir. |
| **Attaque Lourde / Signature** | `HEAVY_ATTACK` | Déclenche un Sig au sol, un Recovery/Ground Pound en l'air. |
| **Jet d'Arme** | `ITEM` (ou Toss / Throw) | Lance un item ou ramasse une arme sur le sol. |
| **Provocation** | `TAUNT` | Joue une animation pré-définie et verrouille le joueur dans des Recovery Frames intenses. |

### Note sur les Directions :
Les actions offensives sont modulées par la direction pressée *simultanément* par le joueur. 
Ex : Un joueur frappant `[DOWN, HEAVY_ATTACK]` réalise une "Down Signature" (au sol) ou un "Ground Pound" (en l'air).

## 4. Limitation Technique Majeure Préventive
Les données `inputs` nous donnent **l'intention** du joueur. Elles de reflètent pas toujours **l'action effective** si le joueur n'a pas pu exécuter sa commande (exemple : s'il appuie sur `LIGHT_ATTACK` alors qu'il est verrouillé dans un état de *Hitstun*, l'attaque ne partira pas). Cela dictera la façon dont nous calculerons la fiabilité des attaques et des combo-drops (cf. Tier 1 & 2 Features).