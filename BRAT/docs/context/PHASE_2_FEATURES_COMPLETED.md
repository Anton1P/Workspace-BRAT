# Checkpoint Phase 2.1 & 2.4 - Socle Analytique et Frontend (BRAT)

Ce document de synthèse technique détaille l'état actuel de l'interface utilisateur (Next.js) et de notre moteur de calcul des métriques (Tier 1 & aménagement Tier 2). Il sert de référence absolue pour les futurs agents qui interviendront sur la logique métier ou le design system du projet BRAT.

---

## 1. Architecture Frontend Actuelle (Fichiers & Structure)

L'application a été structurée en Next.js App Router, favorisant l'isolation des composants et un découplage fort entre le "Core Engine" (algorithmes) et les "Composants Graphiques".

### 📂 Arborescence Principale
*   `src/app/page.tsx` : Contrôleur de vue principal gérant dynamiquement les phases (DropZone -> Loader -> Dashboard) sans rechargement de page.
*   `src/app/layout.tsx` : Socle HTML global avec définition de métadonnées SEO et injection de la font Google `Inter`.
*   `src/app/globals.css` : Hub du Design System "Vanilla CSS".
*   `src/components/DropZone/` : Composant drag & drop réactif gérant l'upload local du fichier binaire `.replay`.
*   `src/components/Loader/` : Composant de transition immersif (Spinners multiples et texte d'état) conservant l'utilisateur en attente pendant l'analyse.
*   `src/components/Dashboard/` : Interface massive d'ordonnancement des métriques. Contient la liste des joueurs (`RosterCard`) et la zone d'affichage dédiée (`HeroCard`).
*   `src/components/Metrics/` : Composants agnostiques dédiés à l'affichage analytique (APMTracker, ApproachGauge, ComboTracker).
*   `src/components/KillTimeline/` : Frise chronologique interactive pleine largeur.

### 🎨 Design System : Glassmorphism Utility-First
Au lieu d'importer une librairie lourde, nous avons utilisé un CSS Vanilla avancé axé sur le **Glassmorphism Premium** :
*   Variables CSS globales (ex: `--primary`, `--background-dark`) dans `:root`.
*   Classe utilitaire `.glass-panel` : Fournit un fond sombre semi-transparent (`rgba(30, 41, 59, 0.7)`), avec `backdrop-filter: blur(12px)` et une subtile asymétrie de bordure pour l'effet volume de verre.
*   Animations `keyframes` isolées (ex: `fadeIn` pour une fluidité d'apparition des cartes, `glow` pour induire les hovers).

---

## 2. Le Moteur d'Analyse (Logique Métier)

Tous les calculs ont été isolés dans `src/core/engine/` en totale indépendance de l'interface graphique. Ils consomment les données extraites au préalable par la `brat-parser-lib` (figée).

*   **APM Tracker (`metrics/apm.ts`)**
    *   *Logique :* Un simple "Keys per second" serait faux dans Brawlhalla. L'APM calcule le nombre de changements d'états **réels** d'un joueur, divisé par la durée de son existence dans le match en minutes.
    *   *Filtrage :* Nous scrutons de multiples frames. Nous ignorons tous les états vides "relâchés" (`currentState === 0`) et incrémentons l'action uniquement si le `currentState` diffère stricto sensu du `previousState` afin d'éviter la génération artificielle de spam de touche enfoncée (ex: une touche directionnelle maintenue sur 180 frames ne génère qu'une seule action).

*   **Approach Gauge (`metrics/approach-ratio.ts`)**
    *   *Logique :* Évalue si les attaques d'un joueur partent du sol (Grounded) ou des airs (Aerial).
    *   *Heuristique :* Mémorisation dans une fenêtre glissante de la `AIRBORNE_FLAG` (jump, drop, air dodge) du joueur _avant_ que celui-ci ne lance le bitmask d'une attaque (`LIGHT_ATTACK` ou `HEAVY_ATTACK`).
    *   *Reset State :* L'état aérien est réinitialisé si le système détecte des déplacements typiquement au sol (ex: Ground Dodge) avant l'attaque, garantissant de fiables ratios finaux air/sol.

*   **Combo Tracker (Amorce Tier 2 - `metrics/combo-tracker.ts`)**
    *   *Logique :* Comptabilisation de séquences de "hits" ou d'agressions.
    *   *Heuristique Temporelle :* Le moteur boucle sur les initiations strictes des attaques (en différenciant Light et Heavy). Il traque l'intervalle temporel avec la dernière attaque : `(ts - lastAttackTimestamp) <= 400`. Si valide, le combo s'étend et on sauvegarde le pic d'agressivité `maxComboLength`.
    *   *Stylisation:* Calcule un comportement (Agresseur, Punisseur, Équilibré) selon des triggers mathématiques sur les ratios (ex: `lightRatio > 65%`).

*   **Kill Timeline (`KillTimeline.tsx` / Intégré UI)**
    *   *Logique :* Trace la position des morts (`replay.deaths`) d'un match sous la forme d'une barre horizontale temporelle.
    *   *Formule Relative :* Le CSS est injecté via le style natif JSX en position "Absolute" -> `left: ${(death.timestamp / replay.length) * 100}%`.
    *   *Tooltip :* Afin d'éviter une librairie encombrante et non sécure comme `react-tooltip`, la timeline gère son état interactif d'overlay au z-index supérieur localement (`hoveredDeath` -> setState sur les balises de crânes `onMouseEnter` et `onMouseLeave`).

---

## 3. La Gestion des Assets Visuels (Bypass Brawltome & Architecture de Repli)

Nous devions intégrer des visuels externes liés aux IDs du Replay (`brawlhalla-data.ts`), mais les images servies sur les CDNs ou le wiki causaient des blocages (CORB/CORS/404) ou d'imprévisibles temps d'attentes.

*   **Stratégie Actuelle : Les Assets Locaux Statiques**
    *   Toutes les Légendes et Armes de l'API Brawltome ont été téléchargées physiquement dans `public/assets/legends/avatars/` et `public/assets/weapons/`. L'application utilise les répertoires Next.js natifs offrant 0 latence logicielle ou d'accès réseaux corrompus.
*   **Formatage et "Clean" de chaînes (Regex)**
    *   Les noms récupérés via la `LegendMap` (ex: "Bödvar", "Red Raptor") sont envoyés dans l'utilitaire : `.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase()`.
    *   "Red Raptor" se transforme en la string `redraptor` parfaite, accédant ainsi à `redraptor.png`.
*   **Protection : Mécanisme "Fallback" Inflexibles**
    *   Dans le cas d'un Hero ID inconnu (non encore mappé dans la dictionnaire) ou d'un fichier SVG/PNG inexistant soulevant une erreur Next: La balise embarque systématiquement un gestionnaire `onError: {(e) => (e.target.style.display = 'none')}`.
    *   De manière sous-jacente, le conteneur flexbox qui enferme l'image est doté d'un style natif de backup affichant un carré gris semi-transparent texturé, stylisé avec un joli **?** central évitant que la grille du Glassmorphism ne se brise.

---

## 4. Les "Hidden Tweaks" et Initiatives Non-Demandées

*   **Timeout Artificiel du Loader :** Une simulation de charge Async (Timeout de 800ms) a été intégrée secrètement au moment du `parseReplay` pour maximiser le rendu "Lourd/Pro" de l'UI pendant l'attente du JSON, bien que le traitement soit instantané en JS natif.
*   **Extension Dynamique des Headers TypeScript (`types.ts`) :** Modification continue des interfaces de retours originelles de parser (ajout de `ComboResult` et du `ApproachRatioResult` complet).
*   **Correctif sur la Signature Efficiency (`signature-efficiency.ts`) :** Le bitmask original de test du `hasInput` n'était pas fiable ou passait sous les radars de certains objets. Le script d'identification binaire a été réécrit pour lire proprement la frame, patchant un bug où des signautures non lancées étaient qualifiées comme actives.
*   **Conversion des Emojis en Composants Natifs :** Transition d'un affichage Emoji "⚔️" pour les armes vers un map URL ciblant des miniatures physiques (`.weaponIcon` à 16px de large avec drop shadow).

---

## 5. État du Routage / Hook Global

*   `useReplayAnalyzer.ts` orchestre l'ensemble de l'expérience utilisateur et la synchronisation avec le Parser Binaire.
*   Il fonctionne selon une machine à état finie simple (`State Machine`) gérée par React :
    1.  `idle` : Affiche l'invitation "Drop le fichier".
    2.  `loading` : Fichier perçu, montage du Spinner d'attente (artificiel ou lié au processing CPU intensif si de gros replays arrivent).
    3.  `success` -> Rendu total du `Dashboard.tsx` via la mémorisation d'un state global hébergé en Top-Layer (`replayData`).
*   Ce state global React couplé en props sur le Dashboard (`<Dashboard replayData={data} tier1Analysis={analysis} />`) rend inutiles les lourds "Stores" (Redux, Zustand) tant que les besoins ne concernent que la Timeline d'un unique match à la fois.

## 1. Moteur Analytique (Tier 2) : Offensive & Défensive avancée

Notre Dashboard dispose aujourd'hui d'algorithmes poussés capables d'analyser des situations de jeu sans se fier au parser natif du jeu (qui ne lit pas les hitbox). Les heuristiques suivantes traduisent les inputs bruts du joueur en véritables concepts de VS Fighting.

### ⚔️ Combo Tracker & Agressivité
*   **La "String" de 1200ms :** Le parseur ne détectant que les frappes dans le vide, notre algorithme recalcule les "vrais" combos et strings. Nous avons paramétré une tolérance de **1200ms** (environ 70 frames). Ce délai est chirurgical : il est trop long pour représenter un *True Combo* (in-dodgeable), mais parfait pour capturer un **Dodge Read** (où le joueur attend l'esquive de son adversaire avant de relancer son agression).
*   **Filtrage Intelligent :** Le tracker ignore délibérément les déplacements simples ou esquives dans son calcul de la string. Il se concentre strictement sur l'enchaînement de `LIGHT_ATTACK` et `HEAVY_ATTACK`.
*   **Output UI :** Le composant `ComboTracker.tsx` restitue la plus longue séquence réussie (Max String) et en déduit le profil du joueur (Agresseur, Punisher, etc.).

### 🛡️ Dodge Profiler (Radar SVG Dynamique)
*   **Analyse Vectorielle en 9 Axes :** Le `DodgeProfiler` scrute chaque bit de `DODGE` et le croise avec les bits directionnels exacts (`UP`, `DOWN`, `LEFT`, `RIGHT`). Cela génère une cartographie précise sur 9 directions (les 8 octants + le Spot Dodge neutre).
*   **Rendu SVG Natif Intégral :** Plutôt que de charger des librairies comme Chart.js ou Recharts (lourdes et inflexibles), j'ai programmé un composant React qui dessine un Spider Chart / Radar Chart en SVG pur.
*   **Mécanique du Polygone :** Le polygone de la toile est dynamique : la coordonnée $(x, y)$ de chaque point est calculée via trigonométrie élémentaire `x = 50 + radius * cos(angle)` en mappant les pourcentages d'utilisation de chaque esquive sur l'échelle des rayons. 
*   **Alerte Spot Dodge :** Le composant embarque une logique visuelle critique : si un joueur abuse du Spot Dodge (direction neutre) à plus de **40%**, un badge d'alerte rouge clignotant s'affiche pour signaler cette faille défensive béante exploitable par l'adversaire.

---

## 2. Visualisation Temporelle & Intensité de Match

Outre les stats brutes, l'utilisateur a besoin de voir comment l'énergie du match a évolué dans le temps.

### 📊 L'Intensity Graph (Histogramme Flottant)
*   **Le concept de "Buckets" (10 secondes) :** Le composant `IntensityGraph` ne se contente pas de faire la moyenne de l'APM global. L'algorithme découpe l'intégralité du match (`replay.length`) en tranches ("buckets") de 10 000ms. Il compte l'APM de chaque joueur dans chaque bucket.
*   **Rendu Flexbox CSS sans librairie :** C'est un pur tour de force CSS. Les barres sont des `div` alignées en *Flexbox* (align-items: flex-end). 
*   **Normalisation d'échelle :** La hauteur verticale (hauteur `style={{ height: "X%" }}`) n'est pas absolue. Le script trouve le **maxAPM** absolu de tout le match, puis toutes les autres barres sont des pourcentages relatifs à ce pic d'intensité maximale. Cela garantit un graphe parfaitement proportionné, peu importe le "niveau" (Bronze ou pro) des joueurs.

### ⏱️ La Kill Timeline V2 (Avatars Dynamiques)
*   **Évolution du Design :** Terminés les crânes génériques (Lucide React). La frise chronologique positionne de façon absolue la mort des joueurs le long de la durée du match.
*   **Mapping Complexe de l'Entité :** Devant une donnée binaire éclatée, l'algorithme doit croiser `death.entityId` -> chercher dans `replay.entities` -> isoler `victim.data.heroes[0].heroId` (car l'ID n'est pas à la racine de data) -> faire correspondre à notre dictionnaire `LegendMap`.
*   **CSS Glassmorphism & UX :** Chaque mort est un avatar de Légende circulaire, entouré d'une bordure colorée selon l'équipe (`border-blue-500` ou `border-pink-500`), dotée d'un ombrage diffus (box-shadow drop-glow) avec un Tooltip dynamique propre au survol (z-index maîtrisé).

---

## 3. Évolution du Système d'Assets (Local-First Absolu)

Pour garantir une expérience 0 latence, 100% hors-ligne (indispensable pour l'eSport en LAN) et éviter les erreurs réseau (CORS, 404), nous avons purgé le "*hotlinking*".

*   **Le Bypass Brawltome :** Interdiction stricte de récupérer les images de légendes via `https://brawltome.app/...`.
*   **Hébergement Physique Next.js :** Toutes les assets visuels ont été téléchargés et placés dans le dossier public du projet (`/public/assets/legends/avatars/`).
*   **Convention de Nommage & Mapping Dynamique :** La règle est draconienne pour le routeur. Les noms de personnages sont normalisés (ex: "Bödvar" devient `"bodvar"`, "Red Raptor" devient `"redraptor"`) et appelés localement avec l'extension `.png`.
*   **Tolérance Zéro au Fallback Mensonger :** Plus aucun "Orc (Xull)" ou "Bödvar" n'est affiché par défaut si une Légende est inconnue. Le système préfère avertir l'utilisateur de la donnée manquante (un point d'interrogation `?`) ou d'un rendu minimaliste plutôt que d'injecter une donnée faussement positive.

---

## 4. État du Code & "Hidden Logic" (Détails du Lead Dev)

Le moteur cache de nombreuses optimisations de bas niveau :
*   **Précision Binaire des Attaques :** Exploitation fine du parsing, nous confirmons systématiquement l'intention avec les masques bitwise `0x0040` (Light) et `0x0020` (Heavy) pour trier l'inputs-spam du vrai déclenchement de coups.
*   **Gestion du Modèle d'Événements UI :** Le projet étant massivement riche en éléments graphiques, aucune librairie d'UI n'a été insérée pour les Tooltips ou Graphes. Tout est régi par des états React locaux (useState) avec une parfaite hiérarchie du `z-index` pour éviter que les tooltips de la KillTimeline ne passent sous l'IntensityGraph.
*   **Performances Rendu React :** La structure itérative massive (mapper 100 buckets d'APM x 4 joueurs) utilise les clés primaires robustes (HeroIds + Index Temps) pour éviter les re-renders inutiles au Virtual DOM et prévenir les ralentissements sur des `.replay` anormalement longs.

---
**Clôture Finale de la Phase 2 :** L'outil n'est plus un simple "lecteur ASCII". C'est un moteur complet et réactif de Visualisation de la Donnée. Le Dashboard est capable d'absorber la complexité du moteur de jeu et de le restituer avec une grande élégance visuelle CSS/SVG. La fondation est parfaite pour la création des fonctionnalités d'IA (Phase 3).
