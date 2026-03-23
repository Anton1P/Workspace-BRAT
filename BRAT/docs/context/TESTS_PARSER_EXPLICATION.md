# Explication du Parser de Replay (Patch 10.04)

Ce document fournit un historique détaillé, un contexte architectural et une explication mathématique de l'implémentation du parser de replay pour BRAT, en ciblant spécifiquement la version 10.04 de Brawlhalla (Replay Version 263).

## 1. Objectif du Parser

L'objectif de cette étape (1.4 et 1.5) était de créer une implémentation TypeScript robuste capable de décompresser, décrypter, et lire les événements bit-à-bit d'un fichier `.replay`. Les parseurs existants (comme le C# de Talafhah1 ou celui de itselectroz) étaient obsolètes depuis la version 9.08, et totalement cassés sur la version 10.04.

L'objectif final du frontend BRAT (Tier 1) n'est pas de créer un lecteur vidéo web (ce qui requerrait le dump de la mémoire du jeu), mais un **extracteur d'Inputs et de Métriques** :
- Extraire la RandomSeed et les GameSettings
- Extraire les Entités (Joueurs) et assigner leurs IDs
- Extraire la frame exacte de chaque Input (Mouvement, Attaques, Dodges)
- Extraire les résultats du match.

## 2. Le Mécanisme de Lecture Binaire (`BitStream`)

Les fichiers `.replay` de Brawlhalla ne sont pas alignés sur des Octets (Bytes). La majorité des champs, y compris les machines à états (State Tags), utilisent des tailles de variables non-standards (4 bits, 5 bits, 16 bits).
Le `BitStream` lit le fichier décompressé de manière séquentielle, MSB-First au niveau du bit, tout en conservant une taille Big-Endian pour le regroupement de plusieurs octets.

### Exemple de Lecture d'un Short (16 bits)
1. Le code boucle 16 fois (`remaining = 16` jusqu'à `1`).
2. Pour chaque boucle, il extrait le X-ième bit de l'octet courant.
3. Il décale ce bit vers la gauche (`bit << (remaining - 1)`) et fait un OU logique (`|=`) avec un résultat final entier.
4. Cela permet de lire un nombre indépendamment des limites physiques d'un octet en mémoire RAM.

## 3. Le Problème du Patch 10.04 (Et sa Résolution Numérique)

Le problème majeur rencontré lors de la lecture du bloc `PlayerData` était une désynchronisation totale du flux de bits, provoquant le crash fatal `Unknown replay state tag: 0` ou `End of stream reached`. La lecture des joueurs devenait corrompue.

### 3.1 La Structure Connue (Post-9.08)
À l'intérieur du bloc d'Entité `readPlayerDataBlock`, la structure était:
- 5 IDs (Int32)
- 8 Taunts pré-équipés (Int32)
- WinTaunt et LoseTaunt (Int16)
- Liste des Taunts possédés (Boucle `while(Boolean) { Int32 }`)
- AvatarID (Int16)
- Team (Int32)
- ConnectionTime (Int32)
- **Le bloc des Héros sélectionnés (`HeroData`)**

### 3.2 L'Analyse du Crash
En convertissant manuellement les offsets de bit en hexadécimal et en valeurs décimales, nous avons constaté que:
- L'ID d'Avatar (`304`), la Team (`7938069`) et le `ConnectionTime` (`269008287`) se composaient de données parfaitement logiques et conformes.
- Le bit immédiatement après (Offset 1307) formait l'entier gigantesque et corrompu `-133837744` au lieu d'un `HeroID` valide (comme `1` pour Bödvar ou `32` pour Mirage).

### 3.3 Le Scanner Temporel
Pour comprendre ce qui avait changé, j'ai écrit un script Bruteforce (`scan-hero.ts`) qui parcourait le fichier bit après bit, à la recherche d'opérations logiques (Un `HeroID` valide, suivi d'un Stance valide, etc.). Cette recherche a échoué.

J'ai ensuite modifié un scanner pour extraire littéralement tous les entiers après `ConnectionTime`. C'est là que j'ai découvert le héros `32` (Mirage) et son costume `0` localisés exactement **15 Entiers plus tard** (480 bits). Le parser C# `Talafhah1` n'avait aucune trace de ces 15 entiers !

### 3.4 La Vérification Architecturale (Le Bypass de 360 Bits)
Cependant, ajouter un bypass de 480 bits crashait plus loin. J'ai donc développé un script pour localiser mathématiquement le nom de l'entité 2 `"I, Saibot"` directement dans le binaire. Le résultat est tombé : Offset 1700.
En rebroussant chemin depuis 1700 :
- Nom : 1700
- ID de l'entité : 1668 (32 bits)
- Boolean d'existence de l'entité 2 : 1667 (1 bit)

Le `ConnectionTime` de l'entité 1 finissant à 1307, l'écart strict était de `1667 - 1307 = 360 bits EXACTEMENT`. 
La différence entre 9.08 et 10.04 n'était donc pas une taille de Variable, mais bien **l'ajout de nouveaux champs valant exactement 360 bits** au lieu des 130 bits d'un bloc `HeroData` standard.

En demandant au Stream d'ignorer ces `360 bits` après le `ConnectionTime`, le Stream s'est réaligné impeccablement sur le reste du fichier de 5 Mo, prouvant le succès de la théorie !

## 4. Extraction Matérielle des Inputs (Moteur Tier 1)

L'architecture de BRAT a pour finalité l'analyse des styles de jeu et de la mobilité. Heureusement, le bloc `Inputs` n'a pas subi de refonte bloquante.
Les Inputs sont lus dans une boucle d'état (`STATE.INPUTS`), et chaque frame inclut un Bitmask de 14 bits (auparavant 13 bits en pré-9.08) stockant l'état des touches maintenues.

Le fichier `input-decoder.ts` permet de filtrer ces masques :
- Le bit `0x0080` identifie une Light Attack.
- Le bit `0x0100` identifie une esquive ou un dash (Crucial pour calculer le temps d'invulnérabilité d'un joueur, ou ses réactions punitives).
- Les bits supérieurs `10-13` forment une matrice d'identification du Taunt.

## 5. Résultat et Couverture

Deux tests majeurs :
1. `replay-reader.test.ts` (Integration) : Effectue l'injection et parse le binaire 10.04 brut pour générer un objet State et Extraire 2 Entités. Validé fonctionnel.
2. `input-decoder.test.ts` (Unit) : Exécute des simulations de collisions de bouttons simultanées et les isole pour construire un arbre cognitif des contrôles. Validé fonctionnel.

Le parseur est structurellement et mathématiquement stable pour le projet UI. Le reverse-engineering des 360 bits omis sera une tâche post-MVP en fonction du besoin de la roadmap.
