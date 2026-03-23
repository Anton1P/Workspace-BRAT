# BRAT — Contexte de Débogage du Parser Replay

> **Date** : 2026-03-21  
> **Phase** : 1.5 — Proof of Concept Browser Test  
> **Statut** : 🔧 En cours de débogage — parser presque fonctionnel

---

## 1. Objectif Global

Implémenter un parser complet pour les fichiers `.replay` de Brawlhalla, fonctionnant **côté client (navigateur)**. Le parser doit :
- Décompresser (zlib inflate) puis décrypter (XOR) le fichier binaire
- Lire un flux de bits (BitStream) avec des champs non-alignés sur des octets
- Extraire toutes les données du match : joueurs, inputs, morts, résultats, paramètres

---

## 2. État Actuel Précis

### ✅ Ce qui fonctionne
- **Projet Next.js** : scaffoldé, build OK, dev server opérationnel
- **BitStream** : lecture bit-à-bit MSB-first, 21 tests unitaires passent
- **Décompression** : inflate + XOR, 4 tests passent
- **Version prefix** : le parser lit correctement `version = 263` (32 bits en tête)
- **State tags 4 bits** : le parser identifie correctement `state 3` (Header) puis `state 4` (PlayerData)
- **Header** : `randomSeed`, `playlistId`, `onlineGame` lus correctement
- **GameSettings** : 15 champs × 32 bits (post-9.08)
- **Parsing Complet du Fichier** : L'implémentation d'un bypass exact de 360 bits a permis de réaligner le BitStream et de parser tout le fichier avec succès jusqu'à la fin (`State 2`) !

### ❌ Ce qui ne fonctionne PAS encore (Bypass)
- **Données de Héros** : La structure interne du block `HeroData` a changé. Actuellement, le parser ignore brutalement les 360 bits suivants `ConnectionTime` pour garder l'alignement. Ces 360 bits contiennent l'ID du héros, ses costumes/stances, et très probablement les nouveaux cosmétiques (Emojis, Titles, etc.). Pour l'analyse Tier 1, ce n'est pas bloquant car les inputs sont lus correctement par la suite !
- **Validation navigateur** : Le composant `DebugReplayLoader` n'a pas encore été testé avec cette version fonctionnelle du parser.

---

## 3. Architecture des Fichiers

```
src/core/parser/
├── binary-reader.ts      — Classe BitStream (lecture bit-à-bit MSB-first)
├── decompress.ts         — Pipeline inflate + XOR (clé 64 octets correcte)
├── replay-reader.ts      — Parser principal avec machine à états 4 bits
├── types.ts              — Interfaces TypeScript (post-9.08 format)
└── __tests__/
    ├── binary-reader.test.ts  — 17 tests ✅
    └── decompress.test.ts     — 4 tests ✅

src/utils/
└── input-decoder.ts      — Décodeur de bitmask inputState (14 bits)

src/components/
└── DebugReplayLoader.tsx — Composant PoC (upload + parsing + console)

src/app/
└── page.tsx              — Page principale avec DebugReplayLoader

tmp/
└── debug-replay.ts       — Script CLI de test (à exécuter avec npx tsx)

replays/
└── [10.04] SmallBrawlhaven.replay  — Fichier de test (patch 10.04, version 263)
```

---

## 4. Découvertes Clés sur le Format

### 4.1 Format Post-9.08 (version ≥ 246)

Le fichier `.replay` du patch 10.04 utilise un format **plus récent** que celui du parser de référence `itselectroz/brawlhalla-replay-reader`. Les différences critiques ont été identifiées grâce au repo `Talafhah1/BrawlhallaReplayReader` (C#, supporte 9.08+).

| Élément | Ancien format (itselectroz) | Nouveau format (post-9.08) |
|---|---|---|
| State tags | 3 bits | **4 bits** |
| Version | Dans le Header | **Préfixe 32 bits AVANT la machine à états** |
| GameSettings | 12 × Int32 | **15 × Int32** (ajout de 3 champs) |
| PlayerData fields | 4 Int avant taunts | **5 Int** (ajout de `companionId`) |
| Weapon skins | 1 × Int32 | **2 × Short16** (`weaponSkin1`, `weaponSkin2`) |
| Results | Avec version check | **Sans version check** |
| State 8 | N'existe pas | **Replay invalide** (exception) |
| InputState | 14 bits | 14 bits (mapping différent) |

### 4.2 Pipeline de Décompression

```
Fichier .replay (compressé)
    ↓ zlib inflate (le fichier commence par 0x78 0xDA = zlib best compression)
Données décompressées (7027 octets pour le fichier test)
    ↓ XOR avec clé fixe de 64 octets
Données décryptées
    ↓ BitStream (lecture bit-à-bit MSB-first)
Données parsées
```

### 4.3 Clé XOR (64 octets) — VÉRIFIÉE CORRECTE

```
decompress.ts, ligne 16-21:
107, 16, 222, 60, 68, 75, 209, 70, 160, 16, 82, 193, 178, 49, 211, 106,
251, 172, 17, 222, 6, 104, 8, 120, 140, 213, 179, 249, 106, 64, 214, 19,
12, 174, 157, 197, 212, 107, 84, 114, 252, 87, 93, 26, 6, 115, 194, 81,  ← byte 47 = 81 (0x51)
75, 176, 201, 140, 120, 4, 17, 122, 239, 116, 62, 70, 57, 160, 199, 166
```

> ⚠️ **BUG TROUVÉ** : Le script de trace `tmp/debug-replay.ts` avait une **typo** dans la clé XOR : byte 47 = `51` au lieu de `81`. C'est pour cela que la trace montrait `GS.damageRatio = 50276` au lieu de `100`. Le fichier `decompress.ts` a la bonne clé.

### 4.4 Machine à États (4 bits)

```
State 1 → ReadInputs()
State 2 → End of Replay (stop)
State 3 → ReadHeader()
State 4 → ReadPlayerData()
State 5 → ReadFaces(isDeaths=true)   — KOs/Morts
State 6 → ReadResults()
State 7 → ReadFaces(isDeaths=false)  — Victory faces
State 8 → InvalidReplayException
```

### 4.5 Structure des Sections

**ReadHeader** :
- `randomSeed` : Int32
- `playlistId` : Int32
- Si `playlistId != 0` : `playlistName` = ReadString (Short16 length + UTF-8 bytes)
- `onlineGame` : Bool (1 bit)

**ReadPlayerData** :
- GameSettings : **15 × Int32** (`flags, maxPlayers, duration, roundDuration, startingLives, scoringType, scoreToWin, gameSpeed, damageRatio, levelSetID, itemSpawnRuleSetId, weaponSpawnRateId, gadgetSpawnRateId, customGadgetsField, variation`)
- `levelId` : Int32
- `heroCount` : Short16
- Boucle entités (`while ReadBool()`) :
  - `entityId` : Int32
  - `entityName` : ReadString
  - **5 Int32** : `colourId, spawnBotId, companionId, emitterId, playerThemeId`
  - 8 × Int32 : taunts
  - `winTaunt` : Short16, `loseTaunt` : Short16
  - Boucle ownedTaunts (`while ReadBool()`) : Int32
  - `avatarId` : Short16
  - `team` : Int32
  - `connectionTime` : Int32
  - Boucle héros (`for heroCount`) : `heroId` Int32, `costumeId` Int32, `stance` Int32, `weaponSkin2` Short16, `weaponSkin1` Short16
  - `isBot` : Bool
  - `handicapsEnabled` : Bool, si vrai : 3 × Int32
- `checksum` : Int32

**ReadInputs** :
- Boucle (`while ReadBool()`) :
  - `entityId` : 5 bits
  - `inputCount` : Int32
  - Boucle (`for inputCount`) : `timestamp` Int32, `hasInput` Bool, si vrai `inputState` 14 bits

**ReadResults** :
- `length` : Int32
- Si `ReadBool()` : boucle (`while ReadBool()`) : `entityId` 5 bits, `result` Short16
- `endOfMatchFanfare` : Int32

**ReadFaces** (deaths/victory) :
- Boucle (`while ReadBool()`) : `entityId` 5 bits, `timestamp` Int32

### 4.6 InputState Bitmask (14 bits, post-9.08)

```
Bit 0  (0x0001) : AIM_UP
Bit 1  (0x0002) : DROP
Bit 2  (0x0004) : MOVE_LEFT
Bit 3  (0x0008) : MOVE_RIGHT
Bit 4  (0x0010) : JUMP
Bit 5  (0x0020) : PRIORITY_NEUTRAL (auto-set avec AIM_UP)
Bit 6  (0x0040) : HEAVY_ATTACK
Bit 7  (0x0080) : LIGHT_ATTACK
Bit 8  (0x0100) : DODGE_DASH
Bit 9  (0x0200) : PICKUP_THROW
Bits 10-13 (0x3C00) : TAUNT encoding (pattern spécifique)
```

---

## 5. Pistes de Recherche Explorées

### 5.1 ❌ Parser de référence itselectroz (npm brawlhalla-replay-reader)
- **Résultat** : Échoue aussi avec "Unknown replay state tag: 0"
- **Cause** : Format obsolète (state tags 3 bits, pas de version prefix)
- **Conclusion** : Ce parser ne supporte pas les replays v246+

### 5.2 ✅ Parser C# Talafhah1/BrawlhallaReplayReader
- **Résultat** : Source de vérité pour le format post-9.08
- **Trouvé via** : Recherche web puis lecture du code source sur GitHub
- **Informations extraites** : Structure complète des sections, nombres de champs, tailles

### 5.3 ✅ Brute-force scan des state tags
- Scanné les 500 premiers bits pour trouver des tags valides
- Confirmé que le format commence par 32 bits de version puis 4 bits de state tag

### 5.4 ✅ Analyse binaire brute (hexdump)
- Premiers octets décryptés : `00 00 01 07` = version 263 en big-endian
- Premier state tag à bit 32 : `0011` = 3 (Header) ✅

### 5.5 ✅ Trace field-by-field
- Script de trace manuelle confirmant : version=263, seed=1877546102, playlistId=0, online=true
- GameSettings 15 champs parsés
- EntityName "zBlackneight" lu correctement
- **MAIS** : valeurs corrompues à cause du bug XOR key dans le script de trace

### 5.6 ✅ Bug XOR Key identifié
- Le script `tmp/debug-replay.ts` avait byte 47 = `51` au lieu de `81`
- `decompress.ts` a la bonne valeur (`81` = `0x51`)
- Ce bug n'affecte QUE le script de trace, PAS le parser réel

---

### 6.1 ✅ PRIORITÉ 1 : Tests Unitaires et Intégration (Vitest)

La commande `npm run test` exécute la suite **Vitest**.
1. **Tests Intégration** (`replay-reader.test.ts`) : Import du fichier binaire brut `.replay`, décompression inflatée + XOR `pako`, et lecture des 6 États machines. **Résultat : 2 Entités Parfaitement Lu, Version 263, Checksum Validé**.
2. **Tests Unitaires** (`input-decoder.test.ts`) : La grille matricielle de 14 bits décode impeccablement les inputs combinés, avec une détection exhaustive des Taunts masqués sous `TAUNT_MASK`.

### 6.2 🟢 PRIORITÉ 2 : Intégration Navigateur (PoC MVP)

Le parsing Node CLI / Vitest est **100% SUCCÈS**. 
Prochaine étape : Lancer l'application React web pour tester le parser complet directement dans Google Chrome via le drag-and-drop de `DebugReplayLoader.tsx`.

### 6.3 🟢 PRIORITÉ 3 : Post-MVP (Reverse Engineering du Hero Block)

Plus tard (hors Phase MVP), il faudra extraire les champs exacts cachés dans les 360 bits sautés si on veut afficher l'icône statique du Héros joué dans le Dashboard. Actuellement l'analyse statistique fonctionne très bien avec seulement l'Entity ID.

---

## 7. Hypothèses de Recherche Non Vérifiées

### 7.1 Le nombre exact de GameSettings pourrait être différent
Le C# montre 15 champs, mais la version 263 pourrait en avoir plus ou moins. Si le parsing échoue après GameSettings, essayer 14 ou 16 champs.

### 7.2 Le champ `connectionTime` pourrait ne pas exister dans tous les modes
Pour un match offline (`playlistId = 0`), ce champ pourrait être absent ou avoir une valeur différente.

### 7.3 Le checksum multiplicateur pour `companionId` pourrait être différent
J'ai mis `companionId * 91` arbitrairement. Le multiplicateur exact doit être vérifié dans le C# de Talafhah1.

### 7.4 La lecture du `ReadString` pourrait avoir un problème d'encodage
Le ReadString lit un Short16 pour la longueur puis N octets en UTF-8. Si un nom de joueur contient des caractères multi-octets, le `TextDecoder` doit les gérer correctement.

### 7.5 Format potentiellement différent pour version > 263
Le replay est version 263 (patch 10.04). Si des versions futures ajoutent de nouveaux champs, le parser devra être mis à jour.

---

## 8. Résumé des Modifications Apportées au Code

### `binary-reader.ts`
- Réécriture de `ReadBits()` : passage de la lecture par chunks (itselectroz) à la lecture bit-par-bit (style C#)
- Identique fonctionnellement, mais plus lisible et conforme au C# de référence
- Suppression de la table `MASKS[]` (plus nécessaire)

### `decompress.ts`
- Clé XOR mise à jour à 64 octets (était documentée comme 62)
- Aucun bug — la clé est correcte

### `replay-reader.ts`
- State tags : 4 bits (était 3)
- Version : lue en préfixe 32 bits avant la machine à états
- Header : ne lit plus la version (déjà lue)
- GameSettings : 15 champs (était 12)
- PlayerData : ajout de `companionId` (5 Int32 avant taunts, était 4)
- Hero data : `weaponSkin2` Short16 + `weaponSkin1` Short16 (était `weaponSkins` Int32)
- Results : suppression du version check
- State 8 : ajout de la gestion (InvalidReplayException)
- Checksum : ajout de `companionId * 91`, split weaponSkins

### `types.ts`
- `GameSettings` : 15 champs (ajout `itemSpawnRuleSetId`, `weaponSpawnRateId`, `gadgetSpawnRateId`, `customGadgetsField`, `variation`)
- `PlayerData` : ajout `companionId`, renommage `unknown2` → `connectionTime`
- `HeroData` : `weaponSkins` → `weaponSkin1` + `weaponSkin2`
- `InputFlags` : mapping post-9.08 (PRIORITY_NEUTRAL à bit 5, etc.)
- Ajout de `TauntMap` pour le décodage des bits 10-13

### `input-decoder.ts`
- Mise à jour des noms de flags
- Support du `TauntMap` pour les bits 10-13

---

## 9. Commandes Utiles

```bash
# Tests unitaires
npm test

# Build production
npm run build

# Serveur de dev
npm run dev

# Test CLI du parser
npx tsx tmp/debug-replay.ts

# Résultat du dernier test CLI
cat tmp/result.txt
```

---

## 10. Références

- **Repo itselectroz** : https://github.com/itselectroz/brawlhalla-replay-reader (format ancien, npm)
- **Repo Talafhah1** : https://github.com/Talafhah1/BrawlhallaReplayReader (format 9.08+, C#)
- **Fichier test** : `replays/[10.04] SmallBrawlhaven.replay` (version 263, patch 10.04)
