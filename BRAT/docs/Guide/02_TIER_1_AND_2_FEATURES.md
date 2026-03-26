# Guide d'Implémentation 02 : Features Tier 1 & Tier 2

Ce document détaille les algorithmes à utiliser pour calculer les métriques de base et intermédiaires du Dashboard de BRAT.

---

## 1. APM (Actions Per Minute)

*   **Concept :** Mesurer la vélocité mécanique utile du joueur par minute.
*   **Data Source :** `ReplayData.inputs` (pour un `entityId` spécifique), duree du match (`results.matchLength` ou offset du dernier tick).
*   **Logique Algorithmique :**
    1. Parcourir chaque log dans `inputs`.
    2. Filtrer via l'algorithme "Newly Pressed" (cf. *01_DATA_MAPPING_STRATEGY*). Ne comptez *que* l'apparition d'un nouveau bouton (1 action). Évitez absolument de compter un array entier ou une touche maintenue.
    3. Optionnel (Qualité Pro) : Ne pas compter les actions lorsque le joueur est mort (entre la capture de sa Death à `t` et son respawn/invulnérabilité estimé).
    4. Diviser la somme d'actions par `MatchLength / 60000`.
*   **Edge Cases :** Ne pas additionner purement `inputs.length`. Étant donné le système de state change, relâcher un bouton (array vide) inscrit une ligne mais n'est pas vu comme une *Action* APM de type mécanique active.

---

## 2. Signature Efficiency Ratio

*   **Concept :** Ratio entre les Signatures (Heavy Attacks au sol) dans le vide et celles qui touchent véritablement. Détecteur de "spam".
*   **Data Source :** L'historique des `inputs` (`HEAVY_ATTACK`) et les événements de Hit/Dégâts.
*   **Logique Algorithmique :**
    1. Isoler les moments temporels où `HEAVY_ATTACK` apparaît dans les inputs tout en étant présumé au sol (pas de saut précédent ou délai long).
    2. Calculer s'il y a un événement de "Damage Dealt" sur l'adversaire ou "Hitstun" forcé dans les `<X> frames` (Startup de la Sig) après cet input.
    3. `Ratio = (Sigs ayant touché) / (Total Sigs lancées) * 100` 
*   **Edge Cases :** Si les hitboxes confirmés ("Hit Events") ne sont pas décodées par l'outil de base, vous devrez chercher l'interruption artificielle des mouvements de l'adversaire (Stun imposé). Les Gravity Cancels `[DODGE, DANS L'AIR, avec HEAVY_ATTACK]` comptent aussi comme des Signatures.

---

## 3. Mash / Panic Input Ratio

*   **Concept :** Le nombre de fois où le joueur presse frénétiquement des touches alors qu'il ne peut rien faire (coincé en Recovery frame ou Hitstun).
*   **Data Source :** `inputs` respectifs des deux joueurs. Le marqueur "Hitstun" si disponible (ou déduit lors d'un combot adverse inesquivable).
*   **Logique Algorithmique :**
    1. Identifier une période de vulnérabilité imposée : T1 (début du coup adverse) à T2 (Fin du stun).
    2. Compter toutes les entrées pressées activement (JUMP, DODGE, ATTACK) apparaissant entre T1 et T2.
    3. Un bouton "Maintenu" n'est pas un Mash. Le Mash implique des relâchements de touches et de multiples impulsions (spams d'ID). Accumuler toutes ces frappes "perdues" (lost inputs).
*   **Edge Cases :** Maintenir une flèche de direction (pour orienter son Ejection *DI - Directional Influence*) est une bonne décision pro (pas du Mashing). Il faut filtrer les directions pures de la liste du "Mashing".

---

## 4. Dodge Habit Tracker (Heatmap Défensive)

*   **Concept :** Cartographier la direction instinctive d'esquive après que le joueur s'est fait toucher.
*   **Data Source :** Séquences d'attaques adverses (Hit Events) enchaînées avec l'action `DODGE_DASH` du joueur ciblé.
*   **Logique Algorithmique :**
    1. Capter un dégât ou une fin de string ennemi sur notre joueur.
    2. Scrutiner le premier état de notre joueur où l'action `DODGE_DASH` apparaît dans la seconde (`< 60 frames`) qui suit.
    3. Regarder les *Touchés directionnelles* conjointement associées à cette frame (ex. `[UP, RIGHT, DODGE_DASH]`). 
    4. Alimenter un compteur/Map : `{ "Up-Right": 5, "Neutral": 2, "Down": 1 }`.
*   **Edge Cases :** Si aucune direction n'est associée (seulement `[DODGE_DASH]`), l'esquive est de type "Sur place" (Spot Dodge). Si le joueur attaque l'air *avant* d'esquiver, ce n'est pas une "Dodge Habit" primaire, ignorez l'entrée.

---

## 5. Grounded vs Aerial Approach Ratio

*   **Concept :** Analyser l'engagement initial : le joueur aime-t-il bondir vers l'ennemi ou rester au sol ?
*   **Data Source :** Array `inputs` et analyse contextuelle du temps inactif précédent (Neutral Game time).
*   **Logique Algorithmique :**
    1. Chercher un "Engagement" (la première `LIGHT_ATTACK` ou `HEAVY_ATTACK` après au moins 1,5 à 2 secondes sans attaque de quiconque).
    2. Remonter la timeline dans les 20 à 40 frames précédentes :
        *   S'il y a un `JUMP` qui n'a pas touché terre, marquer comme "Aerial Approach".
        *   S'il y a un `DODGE_DASH` (Dash au sol), marquer comme "Grounded Approach".
*   **Edge Cases :** Une attaque de type `HEAVY_ATTACK` avec un saut en cours peut s'avérer être un "Recovery" si elle n'est pas accompagnée d'un Gravity Cancel. Distinguez bien les `[JUMP] > [DOWN, LIGHT_ATTACK]` qui constituent une engage aérienne agressive typique (Dair).