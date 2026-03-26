# Guide d'Implémentation 03 : Features Expérimentales et Simulation Théorique (Tier 3 & 4)

Les features classées Tier 3 et 4 dans le *Cahier des Charges* reposent sur des calculs d'une très grande complexité. Ce document énonce les limites techniques du système de Replay actuel et propose des approches (heuristiques) pour les contourner.

## 1. La Nature Cachée des Coordonnées Matricielles

**L'avertissement majeur :**
Le Replay de Brawlhalla n'est pas un fichier vidéo, ni un enregistrement de positions spatiales (`X, Y`). C'est un **Keylogger** (un enregistrement de touches manettes validées) doublé d'une "seed" (graine) aléatoire. Le moteur officiel du jeu de BMG repasse simplement les touches dans son propre moteur physique.

### Les Impacts sur l'IA (Les Interdits) :
- Nous ne POUVONS PAS lire "Le Joueur est à la position X = -300".
- Nous ne POUVONS PAS dessiner de notre côté *directement* la Hitbox parfaite d'une attaque sur une map si nous ne construisons pas ou ne chargeons pas un "dico des Hitboxes / Hurtboxes" statique de la version Patch du jeu (Ici 10.04).
- Les données de **Domination Spatiale (Stage Control)** ou **Edge-Guard Efficiency** n'existent pas nativement dans notre extraction binaire de base.

## 2. Approches Heuristiques Recommandées

Comment une IA peut-elle alors calculer une zone "off-stage" ou une chute mortelle ? Par la **Déduction Contextuelle** basée sur les `inputs` !

### Heuristique du "Off-Stage" (Pour Edge-Guard & Resource Burn)
Même si nous ne connaissons pas les coordonnées X/Y, une IA peut supposer avec une marge d'erreur (<10%) qu'un combat a lieu au-dessus du vide selon la détresse de gestion des ressources.

*   **Le Concept de base (Max Resources) :** Dans Brawlhalla, vous avez obligatoirement pour remonter : 2 ou 3 Sauts selon la légende/mode, 1 Recovery (Heavy attaquer en l'air sans Gravity Cancel), et 1 Esquive.
*   **Logique d'Algorithme :**
    1. Si un joueur `Target` semble subir une attaque agressive enchaînée (`Hitstun` induit par Inputs du `Striker`).
    2. Suivre les signaux de détresse de `Target` via l'accumulation : `T_Jump1 += 1` -> `T_Dodge += 1` -> `T_Recovery += 1`.
    3. Si le compteur monte et que la `Target` déclenche tout son kit défensif consécutivement sans jamais qu'un temps de repos très prolongé n'apparaisse (Toucher le sol reset les ressources). C'est qu'il est poussé *Off-Stage*.
    4. S'il meurt peu après cette séquence frénétique, c'est un **Edge-guard validé**.

### Heuristique du "Choke Factor" et Stock Advantage
Les vies (Stocks) et Tirs fatals peuvent souvent être déduits facilement :
*   Cherchez dans l'objet Replay (`results.entities` ou `replay.deaths`) le tableau officiel contenant (si patch décodable) le Moment (timestamp) exact d'un Death.
*   Retracez ce timestamp dans le tableau des inputs pour identifier la "Stock Perdue".
*   Vous pouvez mesurer le temps ou le taux d'erreur APM (Inputs paniqués, Cf Guide 2) du tueur avant le "Death Timestamp", cela nous donne son index de stress de finisseur de frag (*Choke Factor*).

## 3. Le Saint-Graal (À venir post-MVP)

Pour que BRAT atteigne une précision e-sport absolu sur le Tier 4 (Simulation Spatiale) sans avoir à deviner, l'application devrait théoriquement implémenter **un simulateur de Physique JS**.
- Utiliser un array statique JSON contenant les Frame Data des légendes.
- Lancer les variables de Speed, Air Friction, Weapon Stun dans un émulateur React léger.
- Injecter les `ReplayData.inputs` dans ce Moteur pour trouver les positions physiques sur l'écran. 

Ceci est actuellement en dehors du scope "MVP" et demande un temps très lourd d'import des Assets (Les données brut de BMG). Restez sur l'analyse Big Data pure des variables disponibles d'inputs pour la version V1.