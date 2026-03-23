# 🔬 Notes d'Ingénierie Inverse — Format `.replay` Brawlhalla

> **Source de référence :** [itselectroz/brawlhalla-replay-reader](https://github.com/itselectroz/brawlhalla-replay-reader)
> **Date d'analyse :** 2026-03-20
> **Auteur :** Agent IA BRAT

---

## 1. Pipeline de Déchiffrement

Le fichier `.replay` est un blob binaire compressé et chiffré. Le pipeline de décodage est :

```
Fichier .replay brut (bytes)
    │
    ▼
┌─────────────────────────────┐
│  1. Décompression zlib      │  inflateSync() / pako.inflate()
│     (RFC 1950 — deflate)    │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  2. Déchiffrement XOR       │  Chaque octet XOR avec une clé
│     (clé de 62 octets,      │  cyclique de 62 bytes
│      appliquée en boucle)   │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  3. Flux de bits (BitStream)│  Lecture bit par bit,
│     NON aligné sur les      │  pas octet par octet
│     octets                  │
└─────────────────────────────┘
```

### Clé XOR (62 octets)

```typescript
const XOR_KEY = [
  107, 16, 222, 60, 68, 75, 209, 70, 160, 16, 82, 193, 178, 49, 211, 106,
  251, 172, 17, 222, 6, 104, 8, 120, 140, 213, 179, 249, 106, 64, 214, 19,
  12, 174, 157, 197, 212, 107, 84, 114, 252, 87, 93, 26, 6, 115, 194, 81,
  75, 176, 201, 140, 120, 4, 17, 122, 239, 116, 62, 70, 57, 160, 199, 166,
];
```

> **Note :** L'ordre est `inflate` d'abord, puis `XOR`. Pour l'écriture (repack), c'est l'inverse : `XOR` → `deflate`.

---

## 2. Structure du Format Binaire — Machine à États

Après déchiffrement, le flux de bits est parcouru via une **machine à états**. Chaque section commence par un **tag de 3 bits** qui identifie le type de données qui suit :

```
┌──────────────────────────────────────────────────────────────────┐
│                    FLUX DE BITS DÉCHIFFRÉ                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐         │
│  │ Tag 3b  │   │ Tag 3b  │   │ Tag 3b  │   │ Tag 3b  │  ...    │
│  │ = 3     │   │ = 4     │   │ = 6     │   │ = 1     │         │
│  │ HEADER  │   │ PLAYER  │   │ RESULTS │   │ INPUTS  │         │
│  │  DATA   │   │  DATA   │   │         │   │         │         │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘         │
│                                                                  │
│  Ordre typique : [3, 4, 6, 1, 5, 7, 2]                          │
│  (mais l'ordre est dynamique, lu séquentiellement)               │
└──────────────────────────────────────────────────────────────────┘
```

### Tableau des Tags d'État

| Tag (3 bits) | Nom | Contenu |
|---|---|---|
| `3` | Header | `randomSeed` (32b), `version` (32b), `playlistId` (32b), `playlistName` (string si playlistId ≠ 0), `onlineGame` (1b) |
| `4` | PlayerData | `GameSettings` (12×32b), `levelId` (32b), `heroCount` (16b), puis boucle d'entités (joueurs) avec checksum |
| `6` | Results | `length` (32b = durée du match en ms), version check (32b), puis résultats par entityId (5b id + 16b score) |
| `1` | Inputs | Boucle : entityId (5b), inputCount (32b), puis par input : timestamp (32b), hasInput (1b), inputState (14b si hasInput) |
| `5` | Deaths (KO Faces) | Boucle : entityId (5b), timestamp (32b) |
| `7` | Victory Faces | Même format que Deaths |
| `2` | End of Stream | Arrêt de la lecture |

---

## 3. Détail des Structures de Données

### 3.1 Header (Tag 3)

```
randomSeed      : ReadInt()     → 32 bits
version         : ReadInt()     → 32 bits
playlistId      : ReadInt()     → 32 bits
playlistName    : ReadString()  → 16b length + N bytes UTF-8 (si playlistId ≠ 0)
onlineGame      : ReadBoolean() → 1 bit
```

### 3.2 PlayerData (Tag 4)

```
GameSettings    : 12 × ReadInt() → 12 × 32 bits
levelId         : ReadInt()      → 32 bits
heroCount       : ReadShort()    → 16 bits

BOUCLE (tant que ReadBoolean() == true) :
  entityId      : ReadInt()      → 32 bits
  entityName    : ReadString()   → 16b length + N bytes UTF-8
  PlayerData    : (voir ci-dessous)

secondVersionCheck : ReadInt()   → 32 bits (doit == version du header)
checksum        : ReadInt()      → 32 bits (calculé côté parseur pour vérification)
```

#### Structure PlayerData par entité

```
colourId        : ReadInt()      → 32 bits
spawnBotId      : ReadInt()      → 32 bits
emitterId       : ReadInt()      → 32 bits
playerThemeId   : ReadInt()      → 32 bits
taunts[8]       : 8 × ReadInt() → 8 × 32 bits
winTaunt        : ReadShort()    → 16 bits
loseTaunt       : ReadShort()    → 16 bits
ownedTaunts     : Boucle (ReadBoolean + ReadInt) → variable
avatarId        : ReadShort()    → 16 bits
team            : ReadInt()      → 32 bits
unknown2        : ReadInt()      → 32 bits
heroes[]        : heroCount × HeroData
bot             : ReadBoolean()  → 1 bit
handicapsEnabled: ReadBoolean()  → 1 bit
  (si true) :
    handicapStockCount              : ReadInt() → 32 bits
    handicapDamageDoneMultiplier    : ReadInt() → 32 bits
    handicapDamageTakenMultiplier   : ReadInt() → 32 bits
```

#### Structure HeroData

```
heroId          : ReadInt()      → 32 bits
costumeId       : ReadInt()      → 32 bits
stance          : ReadInt()      → 32 bits
weaponSkins     : ReadInt()      → 32 bits (2 × 16b high/low)
```

### 3.3 Results (Tag 6)

```
length (match duration ms) : ReadInt()     → 32 bits
thirdVersionCheck          : ReadInt()     → 32 bits
hasResults                 : ReadBoolean() → 1 bit

Si hasResults :
  BOUCLE (tant que ReadBoolean() == true) :
    entityId : ReadBits(5) → 5 bits
    result   : ReadShort() → 16 bits

endOfMatchFanfare : ReadInt() → 32 bits
```

### 3.4 Inputs (Tag 1)

```
BOUCLE (tant que ReadBoolean() == true) :
  entityId   : ReadBits(5) → 5 bits
  inputCount : ReadInt()   → 32 bits

  Pour i = 0..inputCount-1 :
    timestamp  : ReadInt()     → 32 bits
    hasInput   : ReadBoolean() → 1 bit
    inputState : si hasInput → ReadBits(14) → 14 bits
                 sinon → 0
```

### 3.5 Deaths / Faces (Tags 5 et 7)

```
BOUCLE (tant que ReadBoolean() == true) :
  entityId  : ReadBits(5) → 5 bits
  timestamp : ReadInt()   → 32 bits

Trié par timestamp croissant après lecture.
```

---

## 4. Mapping `inputState` — Bitmask (14 bits)

Le champ `inputState` est un bitmask de 14 bits. Le mapping exact des bits vers les actions de jeu est dérivé de l'analyse des replays et de la documentation communautaire :

| Bit | Masque | Action | Description Brawlhalla |
|---|---|---|---|
| 0 | `0x0001` | `AIM_UP` | Directionnel haut (viser en haut) |
| 1 | `0x0002` | `DROP_DOWN` / `FAST_FALL` | Directionnel bas (Fast-Fall en l'air, drop-through sur plateforme) |
| 2 | `0x0004` | `MOVE_LEFT` | Déplacement gauche |
| 3 | `0x0008` | `MOVE_RIGHT` | Déplacement droite |
| 4 | `0x0010` | `JUMP` | Saut |
| 5 | `0x0020` | `HEAVY_ATTACK` | Attaque lourde (Signatures au sol, Recovery/GP en l'air) |
| 6 | `0x0040` | `LIGHT_ATTACK` | Attaque légère (NLight/SLight/DLight au sol, NAir/SAir/DAir en l'air) |
| 7 | `0x0080` | `DODGE` | Esquive (Spot Dodge, Directional Dodge, Chase Dodge) |
| 8 | `0x0100` | `THROW_ITEM` | Lancer d'arme (Weapon Toss) |
| 9 | `0x0200` | `DASH` | Dash au sol |
| 10 | `0x0400` | `EMOTE_TAUNT` | Taunt / Émote (probable) |
| 11 | `0x0800` | `PRIORITY_INPUT` | Input prioritaire (probable — à confirmer) |
| 12 | `0x1000` | `UNKNOWN_12` | Usage inconnu |
| 13 | `0x2000` | `UNKNOWN_13` | Usage inconnu |

### Combinaisons typiques et leur signification

| inputState binaire | Actions | Interprétation gameplay |
|---|---|---|
| `00000000010000` | `JUMP` | Saut simple |
| `00000001000000` | `LIGHT_ATTACK` | Attaque légère neutre (NLight au sol, NAir en l'air) |
| `00000001001000` | `MOVE_RIGHT` + `LIGHT_ATTACK` | SLight (attaque légère latérale droite) |
| `00000001000010` | `DROP_DOWN` + `LIGHT_ATTACK` | DLight (attaque légère vers le bas) |
| `00000000100001` | `AIM_UP` + `HEAVY_ATTACK` | NSig (Signature neutre, vise vers le haut) |
| `00000000101000` | `MOVE_RIGHT` + `HEAVY_ATTACK` | SSig droite (Signature latérale) |
| `00000000100010` | `DROP_DOWN` + `HEAVY_ATTACK` | DSig (Signature vers le bas) |
| `00000010000000` | `DODGE` | Spot Dodge |
| `00000010001000` | `MOVE_RIGHT` + `DODGE` | Dodge directionnel vers la droite |
| `00000100000000` | `THROW_ITEM` | Weapon Toss |
| `00001000000000` | `DASH` | Dash au sol |

### Notes de validation

- Les bits 0-9 sont confirmés par le comportement observé dans les replays.
- Les bits 10-13 restent à confirmer avec davantage de replays de test. Ils sont rarement activés.
- `MOVE_LEFT` + `MOVE_RIGHT` simultanés (`0x000C`) seraient incohérents et indiqueraient un problème de parsing.

---

## 5. Calcul du Checksum (PlayerData)

La vérification d'intégrité utilise un checksum calculé à partir des données joueur :

```typescript
checksum  = colourId * 5
          + spawnBotId * 93
          + emitterId * 97
          + playerThemeId * 53
          + Σ(taunts[i] * (13 + i))   // i = 0..7
          + winTaunt * 37
          + loseTaunt * 41
          + Σ(popcount(ownedTaunts[i]) * (11 + i))  // popcount = nombre de bits à 1
          + team * 43
          + Σ(heroId[i] * (17+i) + costumeId[i] * (7+i) + stance[i] * (3+i) + weaponSkins[i] * (2+i))
          + (handicapsEnabled ? stockCount*31 + round(damageDone/10)*3 + round(damageTaken/10)*23 : 29)

// Le checksum global est : (Σ checksums joueurs + levelId * 47) % 173
```

---

## 6. Limitations & Données Manquantes

### Données **disponibles** dans le `.replay`

| Donnée | Source | Remarques |
|---|---|---|
| Noms des joueurs | `Entity.name` | Directement lisible |
| Légendes jouées | `HeroData.heroId` | Nécessite une table de correspondance heroId → nom |
| Costumes | `HeroData.costumeId` | Identifiant numérique uniquement |
| Inputs complets | `inputs[entityId][]` | Timestamp + bitmask 14 bits par frame |
| Morts (KO) | `deaths[]` | EntityId + timestamp |
| Durée du match | `ReplayData.length` | En millisecondes |
| Mode de jeu | `playlistId` / `playlistName` | 1v1 Ranked, 2v2, etc. |
| Carte (Map) | `levelId` | Nécessite correspondance levelId → nom |
| Paramètres de jeu | `GameSettings` | Vies, durée, vitesse, ratio dégâts |
| Graine aléatoire | `randomSeed` | Pour la reproductibilité |
| Équipes | `PlayerData.team` | Utile pour le 2v2 |
| Version du replay | `version` | Pour la compatibilité |

### Données **absentes** (à inférer par heuristiques)

| # | Donnée manquante | Impact | Heuristique envisagée |
|---|---|---|---|
| 1 | **Hit Events** (qui a frappé qui) | Impossible de savoir si une attaque a touché | Corréler `HEAVY_ATTACK` input → `Death` adverse dans une fenêtre temporelle |
| 2 | **Positions X/Y des joueurs** | Pas de tracking spatial | Non reconstructible — on ne peut pas implémenter la Domination Spatiale |
| 3 | **État Hitstun** (flag) | Pas de marqueur direct quand un joueur est en stun | Inférer via : absence soudaine d'inputs (freeze) suivie d'un burst d'inputs (mashing) |
| 4 | **État Armed / Unarmed** | Pas de flag "le joueur possède une arme" | Tracker les inputs `THROW_ITEM` comme transitions armed→unarmed |
| 5 | **Frames d'animation** (Startup, Active, Recovery) | Pas de frame data dans le replay | Impossible sans base de données externe de frame data |
| 6 | **Dégâts actuels** (barre de vie) | Pas de points de vie dans le replay | Non reconstructible sans Hit Events |
| 7 | **ItemEquip / ItemDrop events** | Pas d'événement de ramassage d'arme | Seul `THROW_ITEM` est un indicateur fiable |
| 8 | **Identité de l'arme équipée** | Le replay ne dit pas quelle arme le joueur tient | Inférable partiellement via `heroId` → les deux armes de la légende |
| 9 | **Gravity Cancel** | Pas de flag GC | Inférer : `DODGE` en l'air + `LIGHT_ATTACK`/`HEAVY_ATTACK` dans les ~10 frames suivantes |
| 10 | **Chase Dodge** | Pas de flag Chase Dodge | Inférer : `DODGE` dans les ~15 frames après un hit détecté |

### Champs `unknown` du repo de référence

- `PlayerData.unknown2` — Probablement un numéro de joueur ou un identifiant interne
- `GameSettings.unknown` et `GameSettings.unknown2` — 2 entiers 32 bits de finalité inconnue en fin de GameSettings

---

## 7. Compatibilité & Versions

- Le champ `version` du replay est vérifié **3 fois** dans le flux (header, après playerData, après results) — les 3 doivent matcher.
- Le repo de référence a été testé avec la version `209` du format replay.
- Les changements de version de Brawlhalla peuvent modifier la structure du replay (nouveaux champs, bits supplémentaires).

---

## 8. Adaptation pour le Navigateur

| Concept Node.js (référence) | Équivalent Navigateur (BRAT) |
|---|---|
| `Buffer` | `Uint8Array` |
| `Buffer.alloc(n)` | `new Uint8Array(n)` |
| `buffer[i]` | `uint8Array[i]` |
| `buffer.length` | `uint8Array.length` |
| `buffer.slice()` | `uint8Array.slice()` |
| `buffer.toString('utf-8')` | `new TextDecoder('utf-8').decode(uint8Array)` |
| `zlib.inflateSync()` | `pako.inflate()` |
| `Buffer.from(str, 'utf-8')` | `new TextEncoder().encode(str)` |
