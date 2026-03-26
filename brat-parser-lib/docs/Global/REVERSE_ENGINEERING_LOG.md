# Journal de Bord - Reverse Engineering 10.04

## Étape 1 : Hypothèse initiale
Le problème vient du bit scanner utilisé dans PlayerData. Il faut remplacer ce scanner par une lecture conditionnelle précise des variables (isBot, etc.).

## Étape 2 : Création du script de test
Le script test-all-replays.ts existe et renvoie 1 succès sur 8. Les logs montrent que la plupart des échecs viennent d'un Unknown replay state tag ou d'une End of Stream, parce que la méthode Anchor Scanner a mal calculé les bits à sauter.

## Étape 3: Analyser les bits de PlayerData
Je modifie temporairement le parseur pour dumper les 500 bits qui suivent le ConnectionTime dans test-all-replays et comprendre pourquoi le nombre de bits varie entre Human et Bot, ou s'il y a des booleens (isBot/hasHandicap) codés avant la longueur variable.

## Étape 4: Déduction mathématique des données de PlayerData
Le bloc manquant après ConnectionTime fait 360 bits pour un humain et 162 bits pour un bot. Si HeroData fait 128 bits, il reste 232 bits (Humain) et 34 bits (Bot). Fait troublant: 232 = 7 * 33 + 1, et 34 = 1 * 33 + 1. Cela correspond EXACTEMENT à l'empreinte d'une boucle 'while(stream.ReadBoolean()) { stream.ReadInt(); }' ! La question est : Est-ce qu'il y a un isBot avant ou après cette boucle, et où se trouve le HeroData exact? Le document précédent disait l'avoir trouvé à 480 bits, ce qui est mathématiquement impossible puisque l'entité suivante démarre à 360 bits.

## Étape 5: Amélioration de l'Ancre B
L'analyse montre que le scanner d'Ancre B a un taux de faux positifs énorme (~2 faux positifs sur 2000 bits) car il ne vérifie que 10 bits de données pour confirmer le tag Inputs (4 bits tag + 1 bit loop + 5 bits id). Je vais modifier l'Ancre B pour vérifier l'inputCount et le premier timestamp, ce qui éliminera les faux positifs.

## Étape 6: Dry-Run Parsing
La variation des tailles de blocs entre humain/bot nécessitait un code plus robuste. L'implémentation de validation "Dry Run", consistant à lire virtuellement l'intégralité du bloc Inputs suivant pour vérifier sa conformité (timestamps et validInputs > 0), a permis d'éliminer définitivement l'ensemble des faux positifs d'offsets (comme c'était le cas sur le replay Jikoku (1)). Résultat : 100% (8/8) d'extraction réussie. 
