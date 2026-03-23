# 🎮 BRAT (Brawlhalla Replay Analysis Tool)

BRAT est une application web Next.js permettant de lire, décoder et analyser les fichiers `.replay` du jeu **Brawlhalla**. Elle fonctionne en duo avec le moteur d'analyse `brat-parser-lib`, qui décompresse les données binaires et extrait les entrées (inputs) des joueurs.

## 🏗️ Architecture du projet

Le projet est conçu avec une architecture "Monorepo" (Workspace). Il nécessite que les deux dossiers soient placés côte à côte dans votre environnement de développement :
```text
/votre-dossier-racine
  ├── BRAT/              # (Ce dossier) L'interface web en Next.js
  ├── brat-parser-lib/   # La librairie de parsing binaire
  └── package.json       # Fichier de configuration du workspace (optionnel mais recommandé)
```

## 🚀 Installation & Démarrage

### 1. Prérequis
- **Node.js** (version 18+ recommandée)
- **npm** (inclus avec Node.js)

### 2. Installation des dépendances
Pour installer correctement l'application et lier la librairie locale `brat-parser-lib`, ouvrez un terminal dans le dossier `BRAT` (ou à la racine du workspace si configuré ainsi) et lancez :

```bash
npm install
```

> **Note :** La dépendance `brat-parser-lib` est paramétrée dans le `package.json` de BRAT pour pointer vers le dossier local adjacent (`"file:../brat-parser-lib"`).

### 3. Compilation de la librairie (Géré automatiquement)
Grâce aux alias configurés dans le `tsconfig.json` et au paramétrage spécifique de Turbopack, **Next.js compile la librairie à la volée**. Vous n'avez pas besoin de recompiler `brat-parser-lib` manuellement pendant le développement. Le "Hot Reloading" s'appliquera même si vous modifiez le code de la librairie expérimentale. 

### 4. Lancer le serveur de développement
Dans le dossier `BRAT`, lancez :

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur pour voir l'application.

## 🛠️ Stack Technique

- **Framework :** [Next.js](https://nextjs.org/) (App Router)
- **Langage :** TypeScript
- **Bundler :** Turbopack
- **Librairie de parsing binaire :** `brat-parser-lib` (Décompression Inflate / extraction binaire / XOR)

---

> Ce projet a été initialisé avec `create-next-app` de Vercel. Des modifications spécifiques ont été apportées au cache de Next et à Turbopack pour supporter une expérience développeur optimale sur une dépendance locale non-compilée.
