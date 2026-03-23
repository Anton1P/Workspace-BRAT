# Cahier des Charges - BRAT (Brawlhalla Replay Analyzer & Tracker)

## 1. Vision, Outils et Fonctionnement (User Flow)
- **Le Préalable Technique (D'abord, la donnée !) :** Avant même d'afficher quoi que ce soit, le système doit pouvoir extraire la donnée. L'agent IA chargé du projet devra obligatoirement faire des recherches et s'inspirer du repo GitHub **[itselectroz/brawlhalla-replay-reader](https://github.com/itselectroz/brawlhalla-replay-reader)** pour comprendre l'ingénierie inverse des fichiers binaires `.replay` et la recréer en TypeScript.
- **Cinématique d'utilisation (L'expérience) :**
  1. **Drag & Drop :** L'utilisateur glisse-dépose son (ou ses) fichier(s) `.replay` directement sur la page web.
  2. **Analyse Locale (Loading) :** L'application affiche un écran de chargement. Le script TS décode et compile la donnée en local dans le navigateur (aucune donnée n'est envoyée vers un serveur).
  3. **Affichage (Dashboard) :** Le traitement se termine et l'interface affiche instantanément les graphiques et résultats.
- **Architecture & Hébergement :** Application Web locale (Next.js), hébergée sur Vercel (0€, déploiement continu, updates invisibles pour le joueur). 
- **Scope du MVP :** Armes limitées à Gantelets (Gauntlets), Lance (Spear) et Mains nues (Unarmed).

---

## 2. Glossaire pour l'Agent d'Architecture IA
Pour implémenter ces fonctionnalités, l'agent devra comprendre ces concepts techniques cruciaux de Brawlhalla :

### Concepts de Temps & d'États (Frame Data)
- **Frame :** Unité de temps du jeu (Le jeu tourne en 60 FPS, donc 1 frame = ~16.6ms).
- **Startup Frames :** Frames de préparation avant qu'une attaque ne fasse des dégâts (hitbox inactive).
- **Active Frames :** Frames pendant lesquelles l'attaque peut frapper l'adversaire.
- **Recovery Frames :** Frames de vulnérabilité où le joueur a fini son attaque mais ne peut pas encore agir.
- **Hitstun (Stun) :** État d'un joueur frappé, temporairement propulsé et incapable de réaliser la moindre action.
- **Dodge Window :** Le nombre précis de frames laissées entre deux attaques pour qu'une esquive soit techniquement possible.

### Mouvements & Mécaniques Défensives
- **Dodge (Esquive) :** Rend le joueur invincible brièvement (peut être directionnel ou sur place).
- **Chase Dodge :** Esquive spéciale et accélérée, déblocable instantanément après avoir touché l'adversaire pour le poursuivre.
- **Dash / Dash-Jump :** Accélération rapide au sol, très souvent enchaînée avec un saut bas et rapide (Dash-Jump).
- **Fast-Fall :** Action d'accélérer au maximum la chute du personnage en appuyant vers le bas en l'air.
- **Gravity Cancel (GC) :** Utiliser une esquive sur place en l'air pour réaliser une attaque normalement réservée au sol.
- **Wall Slip :** Mécanique limitant le "Wall Hugging". L'icône de point d'exclamation s'affiche puis le joueur perd tous ses sauts s'il abuse du mur sans initier de combat.

### Concepts d'Attaques & Combats
- **Light Attacks (NLight, SLight, DLight) :** Attaques légères au sol (Neutral, Side, Down).
- **Air Attacks (NAir, SAir, DAir) :** Attaques légères aériennes.
- **Signatures (Sigs) :** Attaques lourdes au sol, propres et uniques à chaque "Légende" (Personnage).
- **Recovery / Ground Pound (GP) :** Attaques lourdes aériennes (le Recovery projette vers le haut pour se sauver, le GP projette violemment vers le bas).
- **True Combo :** Enchaînement parfait entre deux dégâts ayant une "Dodge Window" de 0 frame. Inesquivable.
- **String :** Enchaînement d'attaques comportant des Dodge Windows. Demande de "lire" l'adversaire.
- **Read :** Prédire avec succès l'action défensive d'un adversaire (souvent son esquive) pour placer une attaque dévastatrice.
- **Whiff :** Frapper dans le vide avec une attaque, s'exposant ainsi à une sévère punition.
- **Punish :** Frapper un adversaire pendant ses *Recovery Frames* consécutives à un *Whiff*.
- **Edge-Guard :** Stratégie consistant à intercepter et empêcher un joueur éjecté de remonter sur le terrain.
- **Gimp :** Prendre la *Stock* (vie) de l'adversaire alors qu'il a très peu de dégâts (vert/jaune), généralement en brisant sa récupération en dehors du terrain.
- **Weapon Toss :** Jeter physiquement son arme sur l'adversaire pour l'interrompre ou préparer un combo à mains nues (*Unarmed*).
- **Inputs :** Les logs de touches envoyées au parseur (Light attack, Heavy attack, Jump, Dodge, Dash, Fast-fall, etc.).

---

## 3. Catégorisation UI/UX (Où afficher les données)
Le Front-End sera divisé en ces 5 tableaux de bord distincts illustrant un aspect précis du gameplay.

### Catégorie A : Exécution & Précision Mécanique
*Statistiques sur la fluidité des doigts et les APM utiles.*
1. **Analyse de Combos & Drops**
   - **Concept :** Suivre le taux de réussite des "True Combos" et des "Strings", en identifiant exactement à quel moment le combo a été "droppé" (raté).
   - **Intérêt Pro :** C'est la base de l'entraînement. Savoir que l'on rate son "DLight -> SAir" 40% du temps aux Gantelets indique immédiatement ce qu'il faut travailler en mode entraînement libre.
2. **Fluidité (Fast-Fall Frame Delay)**
   - **Concept :** Outil frame-perfect calculant le nombre exact de frames de retard entre la fin d'une animation (sortie de stun ou fin d'une attaque) et l'input d'un fast-fall.
   - **Intérêt Pro :** La différence entre un joueur Or et un joueur Diamant réside dans la vitesse de retombée au sol. Mesurer ce retard aide à "nettoyer" ses inputs pour gagner de précieuses millisecondes de réactivité.
3. **Mash / Panic Input Ratio**
   - **Concept :** Mesurer la différence entre les inputs (touches pressées) utiles et les frappes désordonnées (mashing) pendant que le personnage est en état de Hitstun.
   - **Intérêt Pro :** Les joueurs pro ne cliquent que quand c'est nécessaire. Ce ratio révèle à quel point un joueur panique sous la pression de l'adversaire.

### Catégorie B : Neutral Game & Engagement
*Comment le joueur initie et gagne ses premières interactions.*
4. **Neutral Game Win Rate**
   - **Concept :** Calculer le pourcentage de fois où un joueur réussit à porter le "premier coup" (First Strike) lors d'une phase de neutral (quand les deux joueurs sont à distance et au sol).
   - **Intérêt Pro :** C'est un indicateur direct de la qualité des déplacements (movement) et de l'intelligence de jeu (spacing). Gagner le neutre, c'est maîtriser le rythme du match.
5. **Whiff Punish Rate**
   - **Concept :** Taux de réussite pour frapper l'ennemi pendant qu'il est coincé dans ses Recovery Frames (l'animation où il est vulnérable après avoir raté une attaque).
   - **Intérêt Pro :** Savoir punir les erreurs adverses est le b.a.-ba du jeu compétitif. Un score faible ici indique un style de jeu trop passif ou un manque de réactivité face aux ouvertures.
6. **Grounded vs Aerial Approach Ratio**
   - **Concept :** Analyser par quel moyen le joueur engage le combat : la proportion d'attaques initiées en l'air (Jump, DAir) par rapport à celles initiées ancrées au sol (Dash, SLight).
   - **Intérêt Pro :** Une approche trop aérienne est facilement contrée à haut niveau car le joueur perd l'option de "Dash" instantané. Cela alerte le joueur sur sa prévisibilité d'engagement.
7. **Signature Efficiency Ratio**
   - **Concept :** Ratio mathématique des attaques lourdes (Signatures) lancées dans le vide par rapport à celles qui touchent. On identifie également quelle signature spécifique (Neutral, Side, Down) rate le plus souvent.
   - **Intérêt Pro :** Le détecteur de "Spam" ultime. Cela force le joueur à se rendre compte qu'il utilise ses attaques avec le plus de recovery frames de manière hasardeuse.
8. **Weapon Toss Setup Rate**
   - **Concept :** Lancer son arme face à l'adversaire est une mécanique primordiale. L'outil calcule le pourcentage de jets d'armes qui touchent l'adversaire ou ouvrent sur une attaque *Unarmed* réussie dans la seconde qui suit.
   - **Intérêt Pro :** Sépare ceux qui jettent leur arme au hasard par accident, de ceux qui l'utilisent comme un véritable outil chirurgical pour initier le combat (*Setups* et interruption de *recoveries*).

### Catégorie C : Advantage State & Finition (Kill)
*Comment le joueur capitalise sur son avantage.*
9. **Choke Factor**
   - **Concept :** Chronométrer et compter le nombre d'inputs nécessaires pour finaliser une "Stock" (prendre une vie) lorsque l'ennemi est "dans le rouge" (santé critique).
   - **Intérêt Pro :** Révèle si un joueur souffre de nervosité (choking) pour trouver le "Kill Confirm", ce qui permet souvent à des adversaires presque morts de réaliser d'énormes come-backs.
10. **Edge-Guard Efficiency**
    - **Concept :** Ratio des stocks (vies) prises avec succès quand l'adversaire a été expulsé hors du terrain (off-stage), par rapport au nombre de fois où l'adversaire parvient à remonter sur la plateforme.
    - **Intérêt Pro :** Un indicateur vital de la capacité à conclure un avantage hors du terrain. Essentiel pour des armes agressives off-stage comme les Gantelets ou la Faux.
11. **Weapon Starvation Index**
    - **Concept :** Chronométrage du temps total passé avec une arme en main pendant que l'adversaire est maintenu à mains nues (*Unarmed*) en lui volant ou jetant les armes qui apparaissent (Weapon-guarding).
    - **Intérêt Pro :** Le contrôle des armes est une dimension tactique majeure de Brawlhalla. Ne pas "starver" son adversaire, c'est lui laisser beaucoup trop d'options gratuites.
12. **Domination Spatiale (Stage Control Matrix) [Expérimental]**
    - **Concept :** Diviser virtuellement le terrain. L'outil analyse le pourcentage de temps passé au centre du terrain (zone de pouvoir) par rapport au temps passé acculé sur les bords extérieurs ou en l'air.
    - **Intérêt Pro :** Contrôler le centre, c’est contrôler le match. Les joueurs passifs ou qui reculent trop verront mathématiquement que leur perte de contrôle spatial nuit à leur *Neutral Game*.

### Catégorie D : Psychologie, Défense & Survie
*Analyse des habitudes subconscientes et de la résistance à la pression.*
13. **Dodge Habit Tracker**
    - **Concept :** Créer une "Heatmap" (matrice) de la direction des esquives d'un joueur juste après avoir reçu un coup spécifique (ex: "Après un SLight, il esquive en haut à droite 80% du temps").
    - **Intérêt Pro :** Les bons adversaires adaptent leurs *Strings* en lisant (Read) tes directions d'esquive. Cet outil te prouve que tu es prévisible et qu'il faut varier tes options d'évasion.
14. **Temps de Réaction Dodge**
    - **Concept :** Mesure exacte du délai (en frames) entre le moment où l'esquive devient possible (fin du Hitstun) et le moment où le joueur appuie sur le bouton "Dodge".
    - **Intérêt Pro :** Identifier si le joueur réagit de manière optimale (*frame perfect*) ou s'il offre des "Dodge Windows" artificiellement plus grandes à son adversaire à cause de sa lenteur de réaction.
15. **"Wake-up Attack" Tracker**
    - **Concept :** Suivre la tendance du joueur à appuyer sur le bouton d'attaque dès la frame 1 de sa sortie d'un état de Hitstun, au lieu de s'enfuir (Dash) ou deReset le neutre.
    - **Intérêt Pro :** Les attaques "Wake-up" instinctives sont souvent le signe d'un joueur qui panique ou refuse de concéder l'avantage à son adversaire, ce qui l'expose à de lourdes punitions.
16. **Resource Burn-Rate**
    - **Concept :** Quantifier le "gaspillage" des options aériennes. Compter combien de fois un joueur propulsé en l'air utilise précipitamment tous ses sauts, son Dodge et son Recovery avant même d'avoir amorcé une descente.
    - **Intérêt Pro :** Épuiser ses ressources défensives très haut dans les airs fait du joueur une proie facile (une enclume) en phase de descente, facilitant grandement le travail de l'attaquant.
17. **Momentum Factor (Stock Lead Mentality)**
    - **Concept :** Filtrer et comparer toutes les autres métriques (comme le Neutral Game ou la fluidité) selon si le joueur est en avance de vies (Stock lead) ou s'il est en retard.
    - **Intérêt Pro :** L'analyse psychologique pure. Prouver qu'un joueur perd tous ses moyens techniques (chute de stats mécaniques) dès qu'il passe derrière au score, nécessitant un travail de résistance mentale.
18. **Recovery Predictability [Expérimental]**
    - **Concept :** Détecter des schémas de remontée constants sur le terrain. (ex: revenir toujours sur le mur bas en utilisant le saut avant le recovery).
    - **Intérêt Pro :** Permet au joueur de comprendre pourquoi il se fait toujours intercepter lors de son Edge-Guard, à cause d'une trajectoire et d'un timing stéréotypés.

### Catégorie E : Synergie d'Équipe (Spécial 2v2)
19. **2v2 Team Disruption Indicator**
    - **Concept :** L'E-sport se joue avec le Team Damage (dégâts alliés) activé. Cet outil mesure le volume de dégâts critiques (rouges) infligés à son propre allié, ainsi que le nombre d'interruptions accidentelles des combos de l'allié.
    - **Intérêt Pro :** Le Graal pour les coachs d'équipe 2v2. Évalue instantanément la qualité du placement spatial (*spacing*) et de la synergie, forçant les coéquipiers à ne plus se marcher sur les pieds.

---

## 4. Triage Technique de l'IA (Difficulté d'Implémentation & Roadmap)
Instruction pour l'IA d'architecture qui concevra l'application : ce classement détermine l'ordre de développement du Back-End d'analyse.

### Tier 1 : Basique (Extraction Directe & Comptage simple)
*Données nécessitant de lire majoritairement les Inputs bruts et des Flags basiques du parser.*
- **Signature Efficiency Ratio** (Compter `Heavy Attack Inputs` vs `Hit Events`).
- **Grounded vs Aerial Approach Ratio** (Détecter état `Airborne` au moment d'un `Hit Event`).
- **Weapon Starvation Index** (Timer basique sur les événements `ItemEquip` / `ItemDrop`).
- **Mash / Panic Input Ratio** (Compter le volume de touches pressées pendant les frames où un flag `Hitstun`= true).

### Tier 2 : Intermédiaire (Timers, États relatifs et Contextes)
*Traque le contexte du match sur des périodes de 1 à 5 secondes.*
- **Analyse de Combos & Drops** (Calcul des frames entre un hit N et hit N+1 pour différencier True Combo vs Drop).
- **Neutral Game Win Rate** (Suivi temps passé sans dégâts -> qui casse le statut).
- **Choke Factor** (Trigger: Health > Seuil critique. Timer jusqu'à `Death Event`).
- **Weapon Toss Setup Rate** (Détecter l'entité Weapon, puis un `Hit Event` Unarmed dans les 60 frames suivantes).
- **Momentum Factor** (Conditionnement des calculs en fonction de l'Event `Stock Lost`).
- **Dodge Habit Tracker** (Capter l'input directionnel lors du premier `Dodge Event` suivant un `Hit Event`).
- **Resource Burn-Rate** (Suivi des décrémentations du compteur de saut/dodge/recovery du state du joueur).
- **2v2 Team Disruption Indicator** (Vérifier `TargetID` = `AllyID` lors des `Hit Events`).

### Tier 3 : Difficile (Frame Data précise et Hitboxes virtuelles)
*Nécessite de faire de la "Simulation d'état" ou d'avoir accès à une API/Dictionnaire de données très fin pour le patch donné.*
- **Fluidité (Fast-Fall Frame Delay)** (Calcul du timestamp exact fin d'animation de Recovery -> Timestamp début d'input Fast-Fall direction bas).
- **Temps de Réaction Dodge** (Timestamp attaque ennemie -> Timestamp validation esquive).
- **"Wake-up Attack" Tracker** (Frame exacte de sortie de Hitstun = première frame de tentative d'un Input Offensif ou Défensif).
- **Whiff Punish Rate** (Détecter le "Whiff" adverse qui lance une période de vulnérabilité T, et confirmer que nous avons placé un `Hit Event` durant T).
- **Edge-Guard Efficiency** (Zone géographique "off-stage" + détection si l'opposant meurt ou revient toucher le sol "on-stage").

### Tier 4 : Expérimental (Heuristiques, Géométrie / Mathématiques Lourdes)
*Peut nécessiter une reconstitution de la carte/map.*
- **Domination Spatiale (Stage Control)** (Positions X/Y, délimiter physiquement la largeur et hauteur du terrain, suivre la moyenne).
- **Recovery Predictability** (Mémoriser les chemins de retour XYZ sur de multiples vies, appliquer un algorithme de similarité/pattern-matching géométrique).