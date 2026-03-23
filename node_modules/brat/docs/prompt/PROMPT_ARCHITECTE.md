# Prompt pour l'Agent Architecte IA

**Rôle :** Tu agis en tant qu'Architecte Logiciel et Lead Developer Senior.

**Contexte :** 
Je te fournis en pièce jointe le fichier `CAHIER_DES_CHARGES.md` d'un nouveau projet d'analyse e-sport nommé BRAT (Brawlhalla Replay Analyzer & Tracker). Ce projet est un MVP basé sur Next.js, mais son cœur technique repose sur le Reverse-Engineering du format de fichier binaire `.replay` spécifique au jeu.

**Ton Objectif :**
Tu as l'interdiction de générer du code dans ta réponse. 
Ta seule mission est d'analyser le cahier des charges et de créer un fichier nommé `ROADMAP_DEVELOPPEMENT.md`. 
Ce fichier doit être la "Bible de Développement" que je fournirai plus tard à un Agent Développeur pour qu'il code l'application sans jamais se perdre.

**Instructions de structuration pour `ROADMAP_DEVELOPPEMENT.md` :**
L'objectif vital de cette roadmap est le principe des "Petites Victoires Validables". Tu dois diviser le projet entier en Grandes Phases, elles-mêmes divisées en Étapes, elles-mêmes découpées en "Micro-Tâches".
Chaque "Micro-Tâche" doit obligatoirement avoir une "Condition de Validation" (un test manuel ou visuel) que l'Agent Développeur devra passer avec succès avant d'avoir l'autorisation de passer à la tâche suivante.

**Voici les Grandes Phases que tu dois au minimum détailler :**
- **Phase 1 : L'Infrastructure & Ingénierie Inverse (La donnée avant tout).** *L'agent doit faire des recherches sur le repo GitHub "itselectroz/brawlhalla-replay-reader"* et prouver qu'il arrive à lire un dump brut de touches (inputs) et de métadonnées depuis un `.replay` local.
- **Phase 2 : Le système UI "Drag & Drop".** Gérer l'upload client, le Loader asynchrone, et la connexion avec la logique de la Phase 1.
- **Phase 3 : Le Moteur d'Analyse (Tier 1).** Utiliser les données brutes de la Phase 1 pour calculer uniquement les features catégorisées "Tier 1" dans le cahier des charges.
- **Phase 4 : Les tests et l'affichage des métriques Tier 1.**

**Format attendu dans ton rendu Markdown pour chaque Micro-Tâche :**
- [ ] **Tâche N.x** : *Description de l'action technique stricte.*
- 🛡️ **Test de Validation** : *Ce qu'il faut consoler ou vérifier sur le navigateur/terminal pour s'assurer que c'est solide.*

*Prends le temps d'étudier le cahier des charges, l'importance primordiale de l'ingénierie inverse, et génère cette roadmap de développement la plus rigoureuse et fragmentée possible !*