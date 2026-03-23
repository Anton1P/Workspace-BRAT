# 🗺️ ROADMAP DE DÉVELOPPEMENT — BRAT (Brawlhalla Replay Analyzer & Tracker)

> **Bible de Développement pour l'Agent Développeur IA.**
> Chaque micro-tâche est une "Petite Victoire Validable". **Tu n'as PAS le droit de passer à la tâche suivante tant que la 🛡️ Condition de Validation n'est pas satisfaite.**

---

## Méta-Informations

| Clé | Valeur |
|---|---|
| **Stack** | Next.js (App Router), TypeScript, CSS Vanilla |
| **Hébergement** | Vercel (0€) |
| **Traitement** | 100% côté client (aucune donnée serveur) |
| **Scope MVP** | Gantelets (Gauntlets), Lance (Spear), Mains nues (Unarmed) |
| **Repo de Référence** | [itselectroz/brawlhalla-replay-reader](https://github.com/itselectroz/brawlhalla-replay-reader) |

---

## Convention de Lecture

- `[ ]` = Tâche non commencée
- `[/]` = Tâche en cours
- `[x]` = Tâche validée (la condition de validation est passée)
- 🛡️ = **Condition de Validation** (obligatoire avant de continuer)

---

# ═══════════════════════════════════════════════════════════════
# PHASE 1 — INFRASTRUCTURE & INGÉNIERIE INVERSE
# « La Donnée Avant Tout »
# ═══════════════════════════════════════════════════════════════

> **Objectif :** Prouver que l'on peut lire un fichier `.replay` binaire de Brawlhalla, en extraire les métadonnées et les inputs bruts, et les afficher sous forme de JSON lisible — le tout dans le navigateur, sans serveur.

---

## Étape 1.1 — Recherche & Compréhension du Repo de Référence

- [ ] **Tâche 1.1.1** : *Cloner ou explorer en profondeur le repo GitHub `itselectroz/brawlhalla-replay-reader`. Documenter dans un fichier `NOTES_REVERSE_ENGINEERING.md` à la racine du projet :*
  - La structure du format binaire `.replay` (en-tête, sections, offsets).
  - La méthode de décompression utilisée (si applicable — zlib, gzip, etc.).
  - Le rôle de la classe `ReplayData` et de sa méthode statique `ReadReplay(data: Buffer)`.
  - Le format de chaque type retourné : `ReplayData`, `Death`, `Input`, `GameSettings`, `Entity`, `PlayerData`, `HeroData`.
  - Le fonctionnement du champ `inputState` (bitmask) : quels bits correspondent à quelles touches (Light Attack, Heavy Attack, Jump, Dodge, Dash, Throw, directionnels Haut / Bas / Gauche / Droite).
  - 🛡️ **Test de Validation** : Le fichier `NOTES_REVERSE_ENGINEERING.md` existe, est lisible, contient au minimum un tableau de mapping des bits de `inputState` vers les touches du jeu, et un schéma textuel de la structure binaire du `.replay`.

- [ ] **Tâche 1.1.2** : *Identifier les limitations de la bibliothèque de référence : version du jeu supportée, champs marqués `unknown`, données manquantes (positions X/Y, états Hitstun, événements Hit). Lister dans `NOTES_REVERSE_ENGINEERING.md` ce qui est directement disponible vs. ce qui devra être inféré.*
  - 🛡️ **Test de Validation** : La section "Limitations & Données Manquantes" du fichier contient au minimum 5 items catégorisés.

---

## Étape 1.2 — Setup & Scaffolding du Projet Next.js

- [ ] **Tâche 1.2.1** : *Initialiser un projet Next.js avec TypeScript en utilisant `npx -y create-next-app@latest ./ --typescript --eslint --app --src-dir --no-tailwind --import-alias "@/*"`. S'assurer que le projet compile et se lance correctement.*
  - 🛡️ **Test de Validation** : `npm run dev` démarre sans erreur. La page par défaut de Next.js s'affiche dans le navigateur à `http://localhost:3000`. Le terminal n'affiche aucun warning TypeScript.

- [ ] **Tâche 1.2.2** : *Créer l'arborescence de dossiers du projet. S'assurer que chaque dossier contient au minimum un fichier `index.ts` vide (ou un `.gitkeep`) pour être tracké par Git.*
  ```
  src/
  ├── app/                    # Next.js App Router
  │   ├── layout.tsx
  │   ├── page.tsx
  │   └── globals.css
  ├── core/                   # Cœur métier (parsing, engine)
  │   ├── parser/             # Décodeur binaire .replay
  │   │   ├── replay-reader.ts
  │   │   ├── binary-reader.ts
  │   │   └── types.ts
  │   └── engine/             # Moteur d'analyse (Phases 3+)
  │       └── index.ts
  ├── components/             # Composants UI React
  │   └── index.ts
  ├── hooks/                  # Custom React Hooks
  │   └── index.ts
  └── utils/                  # Utilitaires divers
      └── index.ts
  ```
  - 🛡️ **Test de Validation** : La commande `find src -type d` (ou `Get-ChildItem -Recurse -Directory src`) affiche exactement les dossiers listés ci-dessus. `npm run build` passe toujours sans erreur.

---

## Étape 1.3 — Implémentation du Lecteur Binaire (Binary Reader)

- [ ] **Tâche 1.3.1** : *Créer `src/core/parser/binary-reader.ts`. Cette classe utilitaire encapsule un `ArrayBuffer` et offre des méthodes de lecture séquentielle (read-cursor pattern) :*
  - `readUint8()`, `readUint16LE()`, `readUint32LE()`, `readInt32LE()`
  - `readFloat32LE()`, `readFloat64LE()`
  - `readBytes(length: number): Uint8Array`
  - `readString(length: number): string`
  - `readBool(): boolean`
  - Propriété `offset` (position actuelle) et `remaining` (octets restants).
  - Méthodes `skip(n: number)` et `seek(position: number)`.
  - Le tout doit fonctionner avec `ArrayBuffer` / `DataView` (API Web, pas de Node `Buffer`).
  - 🛡️ **Test de Validation** : Créer un fichier `src/core/parser/__tests__/binary-reader.test.ts`. Écrire un test unitaire qui construit un `ArrayBuffer` manuellement avec des valeurs connues (ex. `[0x42, 0x52, 0x41, 0x54]`), instancie `BinaryReader`, et vérifie que `readUint8()` retourne `0x42`, `readString(4)` retourne `"BRAT"`, et que l'offset avance correctement. Exécuter avec `npx jest` ou le test runner configuré. **Tous les tests doivent passer.**

- [ ] **Tâche 1.3.2** : *Ajouter la gestion de la décompression. D'après la recherche de la Tâche 1.1.1, implémenter la routine de décompression nécessaire (probable : `pako` pour la décompression zlib côté navigateur). Installer `pako` via `npm install pako` et `@types/pako` via `npm install -D @types/pako` si nécessaire. Créer une fonction `decompressReplayBuffer(raw: ArrayBuffer): ArrayBuffer` dans `binary-reader.ts` ou un fichier séparé `decompress.ts`.*
  - 🛡️ **Test de Validation** : Comprimer manuellement un payload connu avec `pako.deflate`, puis vérifier que `decompressReplayBuffer` le décompresse correctement et retourne les mêmes bytes. Test unitaire passant.

---

## Étape 1.4 — Implémentation du Parser `.replay` (Replay Reader)

- [ ] **Tâche 1.4.1** : *Créer `src/core/parser/types.ts`. Définir toutes les interfaces TypeScript miroirs des types du repo de référence, adaptées à l'usage navigateur :*
  ```typescript
  export interface ReplayData {
    length: number;
    results: Record<number, number>;
    deaths: Death[];
    inputs: Record<number, InputEvent[]>;
    randomSeed: number;
    version: number;
    playlistId: number;
    playlistName: string | undefined;
    onlineGame: boolean;
    gameSettings: GameSettings | undefined;
    levelId: number;
    heroCount: number;
    entities: Entity[];
  }

  export interface Death {
    entityId: number;
    timestamp: number; // en millisecondes
  }

  export interface InputEvent {
    timestamp: number;
    inputState: number; // Bitmask
  }

  export interface GameSettings { /* ... */ }
  export interface Entity { /* ... */ }
  export interface PlayerData { /* ... */ }
  export interface HeroData { /* ... */ }
  ```
  - 🛡️ **Test de Validation** : `npm run build` passe sans erreur TypeScript. Depuis un fichier test, on peut importer chaque type et l'utiliser (ex: `const d: Death = { entityId: 1, timestamp: 5000 };`).

- [ ] **Tâche 1.4.2** : *Créer un enum ou un objet constant `InputFlags` dans `types.ts` qui mappe chaque bit du champ `inputState` à une action de jeu. Ce mapping doit être issu de la recherche faite en Tâche 1.1.1.*
  ```typescript
  export const InputFlags = {
    AIM_UP:       1 << 0,  // Bit 0
    DROP_DOWN:    1 << 1,  // Bit 1 (aussi Fast-Fall)
    MOVE_LEFT:    1 << 2,  // Bit 2
    MOVE_RIGHT:   1 << 3,  // Bit 3
    JUMP:         1 << 4,  // Bit 4
    HEAVY_ATTACK: 1 << 5,  // Bit 5 (Signatures)
    LIGHT_ATTACK: 1 << 6,  // Bit 6
    DODGE:        1 << 7,  // Bit 7
    THROW_ITEM:   1 << 8,  // Bit 8 (Weapon Toss)
    // ... valider avec la recherche
  } as const;
  ```
  - 🛡️ **Test de Validation** : Écrire un test qui vérifie que `InputFlags.JUMP & someKnownInputState` retourne le résultat attendu pour au moins 3 cas connus. Le bitmasking fonctionne correctement.

- [ ] **Tâche 1.4.3** : *Créer `src/core/parser/replay-reader.ts`. Implémenter la fonction principale `parseReplay(rawBuffer: ArrayBuffer): ReplayData`. Cette fonction :*
  1. Décompresse le buffer si nécessaire.
  2. Instancie un `BinaryReader`.
  3. Lit l'en-tête du replay (nombre magique, version, seed aléatoire, etc.).
  4. Parse les métadonnées (`playlistId`, `levelId`, `onlineGame`, `gameSettings`).
  5. Parse les entités (joueurs, bots) et leurs `PlayerData` / `HeroData`.
  6. Parse le tableau des `deaths`.
  7. Parse le dictionnaire complet d'`inputs` par entité.
  8. Retourne un objet `ReplayData` complet et typé.
  - *L'implémentation doit reproduire fidèlement la logique de `ReadReplay` du repo de référence, mais avec `ArrayBuffer`/`DataView` au lieu de `Buffer` Node.*
  - 🛡️ **Test de Validation** : Avoir au minimum un fichier `.replay` réel (fourni manuellement dans un dossier `test-fixtures/`). Exécuter `parseReplay` dessus. Le résultat doit être un objet `ReplayData` valide avec : `version` > 0, `entities.length >= 2`, `Object.keys(inputs).length >= 2`, `deaths.length >= 0`.

---

## Étape 1.5 — Preuve de Concept : Dump Brut dans la Console du Navigateur

- [ ] **Tâche 1.5.1** : *Créer un composant React temporaire `src/components/DebugReplayLoader.tsx`. Ce composant affiche un simple `<input type="file" accept=".replay">`. Quand un fichier est sélectionné :*
  1. Lire le fichier avec `FileReader.readAsArrayBuffer()`.
  2. Passer le buffer à `parseReplay()`.
  3. `console.log()` l'objet `ReplayData` résultant dans la console du navigateur.
  - 🛡️ **Test de Validation** : Ouvrir `http://localhost:3000` dans le navigateur, ouvrir la console DevTools (F12), charger un fichier `.replay` réel via l'input. **La console affiche un objet JSON lisible** contenant : `entities` (avec les noms des joueurs), `deaths` (avec les timestamps), et `inputs` (avec des tableaux de `{ timestamp, inputState }`). Aucune erreur dans la console.

- [ ] **Tâche 1.5.2** : *Enrichir le dump en console avec un décodage humain des inputs. Créer une fonction utilitaire `decodeInputState(state: number): string[]` dans `src/utils/input-decoder.ts` qui prend un `inputState` et retourne un tableau de noms de touches actives.*
  ```typescript
  // Ex: decodeInputState(0b10010000) => ["JUMP", "DODGE"]
  ```
  - 🛡️ **Test de Validation** : Dans la console, après chargement d'un `.replay`, logger le résultat de `decodeInputState()` sur les 20 premiers inputs du joueur 1. Les résultats doivent inclure des noms lisibles de touches (`"LIGHT_ATTACK"`, `"JUMP"`, etc.) et non des nombres bruts. Les combinaisons de touches doivent être cohérentes (ex: `["MOVE_RIGHT", "JUMP"]` est cohérent, `["MOVE_LEFT", "MOVE_RIGHT"]` simultané serait suspect et doit être signalé si rencontré).

---

### ✅ JALON DE PHASE 1 (Gate Check)
> **Avant de passer à la Phase 2, les conditions suivantes doivent TOUTES être vraies :**
> 1. Un fichier `.replay` réel peut être chargé dans le navigateur via un `<input type="file">`.
> 2. L'objet `ReplayData` est affiché correctement dans la console DevTools.
> 3. Les noms des joueurs, les données de mort, et les inputs décodés en noms de touches sont visibles.
> 4. `npm run build` passe sans erreur.
> 5. Le fichier `NOTES_REVERSE_ENGINEERING.md` est complet.

---

# ═══════════════════════════════════════════════════════════════
# PHASE 2 — SYSTÈME UI « DRAG & DROP »
# « L'Expérience Utilisateur Avant les Calculs »
# ═══════════════════════════════════════════════════════════════

> **Objectif :** Construire l'interface Drag & Drop en remplacement du `<input>` de debug, avec un écran de chargement animé et une connexion clean vers le parser de la Phase 1.

---

## Étape 2.1 — Design System & Fondations CSS

- [ ] **Tâche 2.1.1** : *Créer le Design System dans `src/app/globals.css`. Définir les variables CSS (custom properties) pour tout le projet :*
  - **Palette** : Mode sombre par défaut (fond `#0A0A0F`, surface `#12121A`, accent primaire bleu électrique `#3B82F6`, accent secondaire violet `#8B5CF6`, texte primaire `#E2E8F0`, texte secondaire `#94A3B8`, couleurs sémantiques : success `#10B981`, warning `#F59E0B`, danger `#EF4444`).
  - **Typographie** : Importer la police `Inter` depuis Google Fonts. Définir les tailles, hauteurs de ligne, et font-weights.
  - **Espacements** : Grille de 4px (0.25rem).
  - **Bordures** : Radius standard (8px, 12px, 16px, pill).
  - **Effets** : Ombres, glassmorphism (`backdrop-filter: blur()`), transitions par défaut.
  - Reset CSS minimal (box-sizing, margin/padding).
  - 🛡️ **Test de Validation** : La page `http://localhost:3000` affiche un fond sombre (#0A0A0F), le texte est en Inter. Dans DevTools, les CSS custom properties sont visibles et accessibles via `getComputedStyle(document.documentElement).getPropertyValue('--color-primary')`.

---

## Étape 2.2 — Composant Drag & Drop Zone

- [ ] **Tâche 2.2.1** : *Créer `src/components/DropZone/DropZone.tsx` et `src/components/DropZone/DropZone.css`. Le composant doit :*
  - Occuper la majeure partie de l'écran (min-height 60vh).
  - Afficher un état par défaut avec une bordure en pointillés animée (dash animation), une icône de fichier, et le texte "Glissez vos fichiers .replay ici".
  - Avoir un bouton secondaire "Parcourir les fichiers" qui ouvre un `<input type="file" accept=".replay" multiple>` caché.
  - Gérer les événements `onDragEnter`, `onDragOver`, `onDragLeave`, `onDrop`.
  - Changer de style visuel quand un fichier est survolé (bordure en surbrillance, fond légèrement teinté de bleu).
  - Filtrer pour n'accepter que les fichiers `.replay`.
  - Supporter le multi-fichiers (drag & drop de plusieurs `.replay` à la fois).
  - 🛡️ **Test de Validation** : Visuellement, la zone de drop est visible et centrée sur la page. Quand on survole la zone avec un fichier, la bordure s'illumine en bleu. Le bouton "Parcourir" ouvre le sélecteur de fichiers natif. Le drop d'un fichier `.txt` est rejeté (aucun traitement), le drop d'un `.replay` est accepté. Vérifier dans la console DevTools que `console.log("File accepted:", file.name)` s'affiche.

- [ ] **Tâche 2.2.2** : *Ajouter les micro-animations au composant `DropZone` :*
  - Animation `pulse` subtile sur l'icône en état idle.
  - Animation `scale` légère sur la zone lors du `dragEnter`.
  - Animation de "particules" ou de reflet (shimmer) sur la bordure en idle.
  - Transition `ease-in-out` fluide entre les états.
  - 🛡️ **Test de Validation** : En observant la page sans interaction pendant 3 secondes, l'icône pulse doucement. Quand on drag un fichier au-dessus de la zone, on voit un changement d'échelle fluide. Les animations sont performantes (pas de jank, vérifier avec le Performance tab de DevTools — FPS > 55).

---

## Étape 2.3 — État de Chargement (Loader)

- [ ] **Tâche 2.3.1** : *Créer `src/components/Loader/Loader.tsx` et `src/components/Loader/Loader.css`. Le composant affiche un écran de chargement premium qui remplace la DropZone pendant le parsing :*
  - Un spinner ou une animation de barre de progression circulaire (ring loader).
  - Le texte "Analyse en cours..." avec le nom du fichier.
  - Un sous-texte "Traitement 100% local — vos données ne quittent jamais votre appareil".
  - Un fond avec un subtil gradient animé (bleu vers violet).
  - 🛡️ **Test de Validation** : Injecter un `await new Promise(r => setTimeout(r, 3000))` artificiel avant `parseReplay()` pour simuler un délai. Le loader s'affiche pendant exactement 3 secondes, puis disparaît. Il est centré, l'animation tourne sans saccade, et le nom du fichier est affiché.

---

## Étape 2.4 — Hook de Gestion d'État & Connexion au Parser

- [ ] **Tâche 2.4.1** : *Créer `src/hooks/useReplayAnalyzer.ts`. Ce custom hook orchestre tout le flux :*
  ```typescript
  type AnalyzerState =
    | { status: 'idle' }
    | { status: 'loading'; fileName: string }
    | { status: 'success'; data: ReplayData; fileName: string }
    | { status: 'error'; error: string; fileName: string };
  ```
  - Expose `state`, `processFile(file: File): Promise<void>`, et `reset(): void`.
  - `processFile` : lit le fichier en `ArrayBuffer` via `FileReader`, appelle `parseReplay()`, met à jour l'état.
  - Gère les erreurs (fichier corrompu, mauvais format) avec un message explicite.
  - 🛡️ **Test de Validation** : Depuis la console DevTools, ou via un bouton de test, appeler `processFile` avec un vrai fichier `.replay`. L'état passe de `idle` → `loading` → `success`. L'objet `data` contient un `ReplayData` valide. Tester aussi avec un fichier `.txt` renommé en `.replay` : l'état passe à `error` avec un message explicite.

- [ ] **Tâche 2.4.2** : *Connecter le hook à la page principale `src/app/page.tsx`. La page doit maintenant :*
  1. Afficher `<DropZone>` quand `state.status === 'idle'`.
  2. Afficher `<Loader>` quand `state.status === 'loading'`.
  3. Afficher un placeholder `<div>Dashboard (à venir) — Données chargées pour {state.data.entities.length} joueurs</div>` quand `state.status === 'success'`.
  4. Afficher un message d'erreur stylisé avec un bouton "Réessayer" quand `state.status === 'error'`.
  - 🛡️ **Test de Validation** : Parcourir tout le flux visuellement : DropZone visible → Drag & Drop d'un `.replay` → Loader visible → Texte "Dashboard (à venir) — Données chargées pour X joueurs" affiché (où X ≥ 2). Cliquer sur "Réessayer" (si erreur) ramène à la DropZone.

---

### ✅ JALON DE PHASE 2 (Gate Check)
> **Avant de passer à la Phase 3, les conditions suivantes doivent TOUTES être vraies :**
> 1. Le Drag & Drop fonctionne avec les animations.
> 2. Les fichiers `.replay` sont parsés automatiquement après le drop.
> 3. Le Loader s'affiche pendant le parsing.
> 4. En cas de succès, un texte de confirmation s'affiche avec le nombre de joueurs.
> 5. En cas d'erreur, un message explicite est montré avec un bouton "Réessayer".
> 6. `npm run build` passe sans erreur.

---

# ═══════════════════════════════════════════════════════════════
# PHASE 3 — MOTEUR D'ANALYSE (TIER 1)
# « Transformer la Donnée Brute en Intelligence »
# ═══════════════════════════════════════════════════════════════

> **Objectif :** Implémenter les 4 métriques classées "Tier 1" dans le cahier des charges. Ce sont les plus simples car elles reposent principalement sur du comptage et de la lecture directe d'inputs/flags.

---

## Rappel : Métriques Tier 1

| # | Métrique | Principe |
|---|---|---|
| 7 | **Signature Efficiency Ratio** | Heavy Attack Inputs vs Hit Events |
| 6 | **Grounded vs Aerial Approach Ratio** | État `Airborne` au moment du Hit Event |
| 11 | **Weapon Starvation Index** | Timer sur `ItemEquip` / `ItemDrop` |
| 3 | **Mash / Panic Input Ratio** | Volume de touches pendant Hitstun |

---

## Étape 3.1 — Architecture du Moteur d'Analyse

- [ ] **Tâche 3.1.1** : *Créer `src/core/engine/types.ts`. Définir les interfaces de sortie pour chaque métrique Tier 1 :*
  ```typescript
  export interface SignatureEfficiencyResult {
    totalHeavyAttackInputs: number;
    heavyAttackHits: number;
    heavyAttackWhiffs: number;
    efficiencyRatio: number; // hits / total (0 à 1)
    perSignatureBreakdown: {
      neutral: { attempts: number; hits: number };
      side: { attempts: number; hits: number };
      down: { attempts: number; hits: number };
    };
  }

  export interface GroundedVsAerialResult {
    groundedApproaches: number;
    aerialApproaches: number;
    ratio: number; // aerial / total
    groundedAttackTypes: Record<string, number>; // SLight: 5, DLight: 3...
    aerialAttackTypes: Record<string, number>;   // NAir: 2, DAir: 4...
  }

  export interface WeaponStarvationResult {
    totalMatchDurationMs: number;
    playerArmedDurationMs: number;
    opponentUnarmedDurationMs: number;
    overlapDurationMs: number; // Temps armé pendant que l'adversaire est désarmé
    starvationIndex: number;  // overlap / totalDuration (0 à 1)
  }

  export interface MashPanicResult {
    totalInputsDuringHitstun: number;
    totalHitstunFrames: number;
    inputsPerFrame: number; // mesure du mashing
    usefulInputs: number;  // inputs juste à la fin du hitstun
    panicRatio: number;    // useless / total (0 à 1)
  }

  export interface Tier1AnalysisResult {
    signatureEfficiency: SignatureEfficiencyResult;
    groundedVsAerial: GroundedVsAerialResult;
    weaponStarvation: WeaponStarvationResult;
    mashPanic: MashPanicResult;
  }
  ```
  - 🛡️ **Test de Validation** : `npm run build` passe sans erreur. Les types sont correctement importables dans d'autres fichiers. Aucun `any` implicite dans les définitions.

- [ ] **Tâche 3.1.2** : *Créer `src/core/engine/analyzer.ts` avec la structure squelette du moteur d'analyse :*
  ```typescript
  export function analyzeTier1(replay: ReplayData, targetEntityId: number): Tier1AnalysisResult {
    return {
      signatureEfficiency: analyzeSignatureEfficiency(replay, targetEntityId),
      groundedVsAerial: analyzeGroundedVsAerial(replay, targetEntityId),
      weaponStarvation: analyzeWeaponStarvation(replay, targetEntityId),
      mashPanic: analyzeMashPanic(replay, targetEntityId),
    };
  }
  ```
  - Chaque sous-fonction retourne un résultat "stub" (valeurs à 0) pour l'instant.
  - 🛡️ **Test de Validation** : Appeler `analyzeTier1(parsedReplay, 1)` avec un `ReplayData` réel retourne un objet Tier1AnalysisResult avec toutes les propriétés à 0 (ou valeurs par défaut). Aucune erreur runtime.

---

## Étape 3.2 — Implémentation : Signature Efficiency Ratio

- [ ] **Tâche 3.2.1** : *Implémenter `analyzeSignatureEfficiency()` dans `src/core/engine/metrics/signature-efficiency.ts`. L'algorithme doit :*
  1. Parcourir le tableau `inputs[targetEntityId]`.
  2. Détecter chaque frame où le bit `HEAVY_ATTACK` est activé (via `inputState & InputFlags.HEAVY_ATTACK`).
  3. Compter les "Heavy Attack Inputs" totaux.
  4. Croiser avec les `deaths` et les données disponibles pour estimer les hits réussis. **Note :** Si les `Hit Events` ne sont pas directement dans le format `.replay`, documenter la limitation et utiliser une heuristique (ex: un `Death` survenant dans les N frames suivant un Heavy Attack input = hit probable).
  5. Calculer le ratio `hits / total`.
  - 🛡️ **Test de Validation** : Avec un `.replay` réel, `analyzeSignatureEfficiency()` retourne un objet où `totalHeavyAttackInputs > 0`. Le `efficiencyRatio` est un nombre entre 0 et 1. `console.log` le résultat et vérifier visuellement que les nombres sont cohérents (ex: un match de Brawlhalla typique contient entre 10 et 100 Heavy Attacks).

---

## Étape 3.3 — Implémentation : Grounded vs Aerial Approach Ratio

- [ ] **Tâche 3.3.1** : *Implémenter `analyzeGroundedVsAerial()` dans `src/core/engine/metrics/grounded-vs-aerial.ts`. L'algorithme doit :*
  1. Parcourir les inputs du joueur cible.
  2. Quand un input `LIGHT_ATTACK` ou `HEAVY_ATTACK` est détecté, déterminer si le joueur est en l'air ou au sol.
  3. **Heuristique pour "en l'air"** : Si un `JUMP` input a été détecté dans les N frames précédentes sans `DROP_DOWN` / retour au sol, le joueur est probablement aérien.
  4. Classifier chaque attaque comme `grounded` ou `aerial`.
  5. Calculer le ratio `aerial / total`.
  - 🛡️ **Test de Validation** : Avec un `.replay` réel, le résultat a `groundedApproaches + aerialApproaches > 0`. Le ratio est entre 0 et 1. Les valeurs sont cohérentes : les deux types d'approches sont non-nuls (un joueur utilise forcément les deux).

---

## Étape 3.4 — Implémentation : Weapon Starvation Index

- [ ] **Tâche 3.4.1** : *Implémenter `analyzeWeaponStarvation()` dans `src/core/engine/metrics/weapon-starvation.ts`. L'algorithme doit :*
  1. Scanner les inputs de tous les joueurs pour les événements `THROW_ITEM` (bit Weapon Toss).
  2. Tracker les périodes où le joueur possède une arme (entre `ItemEquip` et `ItemDrop`/`THROW_ITEM`).
  3. Tracker les périodes où l'adversaire est désarmé.
  4. Calculer le chevauchement (temps armé + adversaire désarmé).
  5. **Limitation :** Si les événements `ItemEquip`/`ItemDrop` ne sont pas dans le format replay, utiliser l'heuristique du `THROW_ITEM` comme seul indicateur. Documenter la limitation.
  - 🛡️ **Test de Validation** : `totalMatchDurationMs > 0` et `starvationIndex` est un nombre entre 0 et 1. Si l'heuristique est utilisée, un commentaire dans le code et dans la console explique la limitation.

---

## Étape 3.5 — Implémentation : Mash / Panic Input Ratio

- [ ] **Tâche 3.5.1** : *Implémenter `analyzeMashPanic()` dans `src/core/engine/metrics/mash-panic.ts`. L'algorithme doit :*
  1. Identifier les périodes de "Hitstun" du joueur cible. **Heuristique :** un joueur est en hitstun entre le moment d'un `Death Event` de l'adversaire-qui-le-frappe (ou détection d'un changement de momentum brutal dans les inputs, i.e., absence de certains inputs pendant N frames suivie d'un burst d'inputs).
  2. Compter le nombre total d'inputs (toutes touches confondues) pendant ces périodes.
  3. Comparer avec les inputs "utiles" (ceux juste à la sortie du hitstun — les premiers inputs "actionnables").
  4. Calculer le `panicRatio`.
  - **Note :** Le Hitstun n'est probablement pas un flag direct. L'heuristique doit être documentée.
  - 🛡️ **Test de Validation** : `totalInputsDuringHitstun >= 0`, `panicRatio` entre 0 et 1. À la console, le résultat est cohérent. Si le replay ne contient aucun moment de hitstun détecté (ce qui serait anormal pour un vrai match), documenter la raison.

---

## Étape 3.6 — Fonction Maître `analyzeTier1` Complète

- [ ] **Tâche 3.6.1** : *Remplacer les stubs de l'Étape 3.1.2 par les vraies implémentations. Vérifier que `analyzeTier1()` retourne un objet complet avec toutes les métriques calculées.*
  - 🛡️ **Test de Validation** : Charger un `.replay` réel, exécuter `analyzeTier1(replayData, entityId)`. `console.log` le résultat complet en format JSON indenté. **Chaque sous-objet a des valeurs numériques non-nulles (sauf cas légitimes documentés).** Le `JSON.stringify` produit un objet lisible sans `undefined` ni `NaN`.

---

### ✅ JALON DE PHASE 3 (Gate Check)
> **Avant de passer à la Phase 4, les conditions suivantes doivent TOUTES être vraies :**
> 1. Les 4 métriques Tier 1 sont calculées sans erreur runtime.
> 2. Chaque métrique retourne des valeurs numériques cohérentes avec un `.replay` réel.
> 3. Les limitations et heuristiques sont documentées dans le code via des commentaires.
> 4. `npm run build` passe sans erreur.
> 5. La fonction `analyzeTier1` est unitairement testable.

---

# ═══════════════════════════════════════════════════════════════
# PHASE 4 — TESTS & AFFICHAGE DES MÉTRIQUES TIER 1
# « Rendre les Données Belles et Fiables »
# ═══════════════════════════════════════════════════════════════

> **Objectif :** Créer les tests automatisés pour le moteur d'analyse, construire les composants de visualisation (cartes, graphiques), et assembler le dashboard final.

---

## Étape 4.1 — Suite de Tests Automatisés

- [ ] **Tâche 4.1.1** : *Configurer Jest (ou Vitest) si pas encore fait. Ajouter la configuration dans `package.json` ou `jest.config.ts`. S'assurer que `npm test` fonctionne et exécute les tests existants (binary-reader.test.ts au minimum).*
  - 🛡️ **Test de Validation** : `npm test` s'exécute et affiche le résultat des tests existants. Aucun test échoue.

- [ ] **Tâche 4.1.2** : *Créer `src/core/engine/__tests__/analyzer.test.ts`. Écrire des tests pour chaque métrique Tier 1 avec des données mockées (pas de dépendance à un fichier `.replay` réel pour les tests unitaires) :*
  - **Test `signatureEfficiency`** : Créer un `ReplayData` mockée avec 10 inputs `HEAVY_ATTACK` et 4 `deaths` temporellement corrélés. Vérifier que le ratio retourné est ≈ 0.4.
  - **Test `groundedVsAerial`** : Mock avec 3 attaques après un `JUMP` et 7 attaques sans `JUMP` préalable. Vérifier le ratio ≈ 0.3.
  - **Test `weaponStarvation`** : Mock avec des séquences `THROW_ITEM` connues. Vérifier les durées.
  - **Test `mashPanic`** : Mock avec un burst de 20 inputs dans une fenêtre de hitstun de 30 frames. Vérifier le ratio.
  - 🛡️ **Test de Validation** : `npm test` affiche **tous les tests passants** (vert). Aucun test en skip ni en `todo`.

- [ ] **Tâche 4.1.3** : *Créer un test d'intégration `src/core/__tests__/integration.test.ts` qui charge un vrai fichier `.replay` depuis `test-fixtures/`, le parse, exécute `analyzeTier1`, et vérifie que le résultat n'a ni `NaN`, ni `undefined`, ni `Infinity`.*
  - 🛡️ **Test de Validation** : `npm test` inclut ce test et il passe. Le test vérifie explicitement chaque propriété de top-level du résultat.

---

## Étape 4.2 — Composants de Visualisation

- [ ] **Tâche 4.2.1** : *Créer `src/components/MetricCard/MetricCard.tsx` et `MetricCard.css`. Composant réutilisable de "carte métrique" qui affiche :*
  - Un titre (nom de la métrique).
  - Une valeur principale grande (ex: "72%").
  - Un sous-texte explicatif.
  - Une petite icône ou indicateur de couleur (vert = bon, orange = moyen, rouge = à améliorer).
  - Un style glassmorphism (arrière-plan semi-transparent, blur, bordure subtile).
  - Effet de hover (léger scale + changement d'ombre).
  - Props : `title: string`, `value: string | number`, `subtitle: string`, `quality: 'good' | 'medium' | 'bad'`.
  - 🛡️ **Test de Validation** : Rendre `<MetricCard title="Signature Efficiency" value="72%" subtitle="18/25 hits" quality="good" />` sur la page. La carte est visuellement premium : fond semi-transparent, bordure brillante, texte lisible, icône de qualité verte visible. Le hover produit un effet fluide.

- [ ] **Tâche 4.2.2** : *Créer `src/components/RatioBar/RatioBar.tsx` et `RatioBar.css`. Barre horizontale de comparaison de ratio :*
  - Deux sections colorées proportionnelles (ex: 60% bleu "Grounded" / 40% violet "Aerial").
  - Labels aux extrémités ou au-dessus.
  - Animation de remplissage au montage (de 0% à la vraie valeur, ease-out).
  - Props: `leftLabel: string`, `rightLabel: string`, `leftValue: number`, `rightValue: number`, `leftColor: string`, `rightColor: string`.
  - 🛡️ **Test de Validation** : `<RatioBar leftLabel="Sol" rightLabel="Air" leftValue={65} rightValue={35} leftColor="#3B82F6" rightColor="#8B5CF6" />` s'affiche avec une barre à 65/35. L'animation de remplissage est visible au premier rendu.

- [ ] **Tâche 4.2.3** : *Créer `src/components/StatBreakdown/StatBreakdown.tsx` et `StatBreakdown.css`. Tableau détaillé pour les sous-données (ex: breakdown par signature Neutral/Side/Down) :*
  - Rangées alternées (light/dark).
  - Mini barres de progression dans les cellules.
  - Headers stylisés.
  - Props: `headers: string[]`, `rows: { label: string; values: (string | number)[] }[]`.
  - 🛡️ **Test de Validation** : Afficher le composant avec les données mockées du breakdown des signatures (3 rangées : Neutral, Side, Down avec des valeurs de test). Le tableau est lisible, les rangées alternent de couleur, les mini barres de progression sont proportionnelles.

---

## Étape 4.3 — Assemblage du Dashboard

- [ ] **Tâche 4.3.1** : *Créer `src/components/Dashboard/Dashboard.tsx` et `Dashboard.css`. Ce composant reçoit `Tier1AnalysisResult` et `ReplayData` en props et assemble la vue complète :*
  - **Header du Dashboard** : Nom du match, noms des joueurs, légendes jouées, résultat (victoire/défaite), durée du match.
  - **Sélecteur de joueur** : Tabs ou boutons pour choisir quel joueur analyser (quand le replay contient 2+ joueurs).
  - **Grille de Cartes** : Layout CSS Grid responsive (2 colonnes desktop, 1 colonne mobile) contenant les 4 MetricCards Tier 1.
  - 🛡️ **Test de Validation** : Le dashboard s'affiche avec les données d'un vrai replay. Le header montre les bons noms de joueurs. Cliquer sur un onglet de joueur met à jour toutes les métriques. Le layout est responsive (tester en redimensionnant la fenêtre du navigateur).

- [ ] **Tâche 4.3.2** : *Affiner chaque section du Dashboard avec les composants de visualisation :*
  - **Section "Signature Efficiency"** : `MetricCard` (ratio global) + `StatBreakdown` (Neutral / Side / Down).
  - **Section "Grounded vs Aerial"** : `MetricCard` (ratio) + `RatioBar` (visuel de la proportion).
  - **Section "Weapon Starvation"** : `MetricCard` (index) + texte explicatif du temps.
  - **Section "Mash / Panic"** : `MetricCard` (ratio) + texte de conseil adaptatif (si ratio > 0.5 : "Vous paniquez souvent sous pression", sinon : "Bon contrôle sous pression").
  - 🛡️ **Test de Validation** : Toutes les 4 sections sont visibles et stylisées. Les données affichées correspondent aux valeurs calculées (vérifier en croisant avec le `console.log` du résultat `analyzeTier1`). Le texte adaptatif de la section "Mash/Panic" change selon la valeur du ratio.

---

## Étape 4.4 — Connexion Finale & Polish

- [ ] **Tâche 4.4.1** : *Modifier `src/app/page.tsx` pour, à l'état `success`, :*
  1. Exécuter `analyzeTier1(replayData, selectedEntityId)`.
  2. Passer le résultat au `<Dashboard>`.
  3. Ajouter un bouton "Analyser un autre replay" en haut qui appelle `reset()` du hook et revient à la DropZone.
  - 🛡️ **Test de Validation** : Le flux complet fonctionne de bout en bout : DropZone → Drag & Drop → Loader → Dashboard avec métriques réelles. Le bouton "Analyser un autre replay" ramène à la DropZone proprement (toutes les données précédentes sont nettoyées).

- [ ] **Tâche 4.4.2** : *Ajouter les transitions entre les états (DropZone → Loader → Dashboard). Utiliser des animations CSS `@keyframes` (fade-in, slide-up) pour que les transitions entre les écrans soient fluides et non abruptes.*
  - 🛡️ **Test de Validation** : Les transitions entre chaque état sont visuellement fluides. Il n'y a pas de "flash" blanc ni de saut brutal entre les écrans. Chaque transition dure entre 300ms et 500ms.

- [ ] **Tâche 4.4.3** : *Ajouter les meta tags SEO dans `src/app/layout.tsx` :*
  - `<title>BRAT — Brawlhalla Replay Analyzer & Tracker</title>`
  - `<meta name="description" content="Analysez vos replays Brawlhalla et améliorez votre gameplay avec des métriques e-sport avancées. 100% gratuit, 100% local.">`.
  - Open Graph tags pour le partage social.
  - Favicon personnalisé.
  - 🛡️ **Test de Validation** : Inspecter le `<head>` du document dans DevTools. Les balises `<title>`, `<meta name="description">`, et les balises `og:` sont présentes avec le bon contenu.

- [ ] **Tâche 4.4.4** : *Lancer `npm run build` en production et vérifier qu'il n'y a aucune erreur ni warning.*
  - 🛡️ **Test de Validation** : `npm run build` affiche "Compiled successfully" sans aucun warning. La taille du bundle est raisonnable (< 500KB first load JS).

---

### ✅ JALON DE PHASE 4 — MVP COMPLET (Gate Check Final)
> **Le MVP est considéré comme terminé quand les conditions suivantes sont TOUTES vraies :**
> 1. ✅ Un fichier `.replay` réel peut être glissé-déposé sur la page.
> 2. ✅ Le parsing est exécuté côté client sans erreur.
> 3. ✅ Les 4 métriques Tier 1 sont calculées et affichées dans un dashboard premium.
> 4. ✅ Le sélecteur de joueur fonctionne pour chaque participant du replay.
> 5. ✅ Tous les tests unitaires et d'intégration passent (`npm test`).
> 6. ✅ Le build de production passe (`npm run build`).
> 7. ✅ L'application est responsive (testée à 1920px, 1280px, et 375px de large).
> 8. ✅ Les transitions et animations sont fluides (> 55 FPS).
> 9. ✅ Les meta tags SEO sont en place.
> 10. ✅ L'application est prête à être déployée sur Vercel.

---

## Annexe : Récapitulatif des Fichiers Créés

| Fichier | Phase | Rôle |
|---|---|---|
| `NOTES_REVERSE_ENGINEERING.md` | 1 | Documentation de la recherche |
| `src/core/parser/binary-reader.ts` | 1 | Lecture binaire séquentielle |
| `src/core/parser/types.ts` | 1 | Interfaces TypeScript du replay |
| `src/core/parser/replay-reader.ts` | 1 | Parser principal `.replay` → `ReplayData` |
| `src/utils/input-decoder.ts` | 1 | Décodage bitmask → noms de touches |
| `src/components/DropZone/*` | 2 | Zone de Drag & Drop |
| `src/components/Loader/*` | 2 | Écran de chargement |
| `src/hooks/useReplayAnalyzer.ts` | 2 | Hook d'orchestration des états |
| `src/core/engine/types.ts` | 3 | Interfaces des résultats d'analyse |
| `src/core/engine/analyzer.ts` | 3 | Fonction maître `analyzeTier1` |
| `src/core/engine/metrics/signature-efficiency.ts` | 3 | Métrique #7 |
| `src/core/engine/metrics/grounded-vs-aerial.ts` | 3 | Métrique #6 |
| `src/core/engine/metrics/weapon-starvation.ts` | 3 | Métrique #11 |
| `src/core/engine/metrics/mash-panic.ts` | 3 | Métrique #3 |
| `src/core/engine/__tests__/analyzer.test.ts` | 4 | Tests unitaires |
| `src/core/__tests__/integration.test.ts` | 4 | Test d'intégration |
| `src/components/MetricCard/*` | 4 | Carte de métrique |
| `src/components/RatioBar/*` | 4 | Barre de ratio |
| `src/components/StatBreakdown/*` | 4 | Tableau de détails |
| `src/components/Dashboard/*` | 4 | Dashboard principal |
| `src/app/globals.css` | 2 | Design System CSS |
| `src/app/page.tsx` | 2-4 | Page principale (évolution progressive) |
| `src/app/layout.tsx` | 4 | Layout avec SEO |
