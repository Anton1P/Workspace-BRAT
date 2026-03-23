# 📖 ARCHIVE DE DÉVELOPPEMENT : LA RÉSOLUTION DU PATCH 10.04

## 1. Contexte et Problématique Initiale
Lors de la Phase 1 du projet BRAT, le parser `.replay` s'est heurté à une modification silencieuse de la part de BMG (Brawlhalla) à partir du patch 10.04. 
Le bloc `PlayerData` provoquait une désynchronisation fatale du `BitStream` (erreur `Version mismatch: expected 263`), entraînant des tableaux vides pour les joueurs, les inputs et les résultats.

## 2. Les Découvertes Clés (Le Bit Dumper)
Grâce à un script de dump chirurgical, nous avons découvert deux changements majeurs dans la structure binaire :
1. **L'Asymétrie des données :** Le gap de données inconnues inséré après le `ConnectionTime` n'est pas fixe. Il fait **exactement 360 bits pour un Joueur Humain** (contenant probablement les IDs cosmétiques, emojis, UI themes) mais seulement **162 bits pour un Bot** (inventaire basique).
2. **Disparition du Footer Version :** Le traditionnel check de sécurité `263` qui marquait la fin du bloc `PlayerData` a été totalement supprimé du format.

## 3. La Solution Architecturale : Anchor Scanner V2
Pour surmonter l'asymétrie sans faire crasher le parser sur des faux positifs (probabilité de 31% sur des lectures de 4 bits), nous avons implémenté le "Deep Look-ahead Anchor Scanner" avec deux règles strictes :

* **La Règle de Distance Minimale (130 bits) :** Un bloc de personnage fait physiquement au moins 130 bits (`HeroID`, `Costume`, `Stance`, `isBot`, etc.). Le scanner ignore donc systématiquement toute ancre potentielle dans les 130 premiers bits pour éviter les données cosmétiques poubelles.
* **Le Deep Look-ahead :**
  * **Ancre A (Nouvelle Entité) :** Si le bit est `true`, on lit l'ID (< 50) ET on valide que le short suivant correspond à une longueur de pseudo cohérente.
  * **Ancre B (Fin des Joueurs) :** Si le bit est `false`, on lit le prochain State Tag (1 ou 6). Si c'est 1 (Inputs), on vérifie le bit `hasInputLoop` et l'ID. Si c'est 6 (Results), on vérifie que la durée du match (32 bits) est logiquement comprise entre 5 secondes et 15 minutes.

## 4. Statut Actuel
La tuyauterie est robuste. Le parser glisse parfaitement sur les blocs de tailles dynamiques et décode avec succès les `Entities`, `Inputs`, `Deaths`, et `Results`. La donnée brute est prête à être exploitée par le moteur d'analyse Tier 1.