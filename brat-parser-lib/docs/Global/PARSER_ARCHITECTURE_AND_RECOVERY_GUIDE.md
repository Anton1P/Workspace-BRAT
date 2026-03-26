# 📖 PARSER ARCHITECTURE AND RECOVERY GUIDE

## 🎯 Rôle et Mission du Document
Ce document est la référence absolue pour tout agent IA (ou développeur) chargé de maintenir, déboguer ou mettre à jour le parseur `.replay` de Brawlhalla (`brat-parser-lib`). Si une future mise à jour du jeu (ex: patch 11.0+) casse le système, **LIRE CE DOCUMENT EN ENTIER EST LA PREMIÈRE ÉTAPE OBLIGATOIRE** avant de modifier le moindre bit de code. Il explique les concepts critiques, les choix d'architecture (notamment post-patch 10.04), et fournit les protocoles de réparation.

---

## 1. Vue d'ensemble du Pipeline de Parsing

Le parseur fonctionne comme un pipeline de transformation séquentielle et une machine à états finis. Voici le tunnel complet, de l'octet brut à l'objet JSON final :

1. **Extraction Brute :** Lecture du fichier `.replay` sous forme de flux `ArrayBuffer`.
2. **Décompression (zlib) :** Le payload est compressé via zlib. On utilise `pako.inflate` pour obtenir le buffer intermédiaire.
3. **Décryptage (XOR) :** Le buffer décompressé est masqué par une clé XOR cyclique. Le script applique cette clé (historiquement basée sur une portion de 62 bytes, ou dynamique selon la version) pour révéler le flux binaire en clair.
4. **Lecture Binaire (BitStream) :** Le buffer en clair n'est pas aligné sur des octets (bytes), mais sur des bits. Le `BitStream` lit séquentiellement chaque bit, short, int ou string séquentiellement.
5. **Machine à États (State Tags) :** Après la lecture de l'entête (version), le flux est régi par des "State Tags" de **4-bits** (ex : 1 = Inputs, 6 = Results), qui dictent le format du bloc suivant. Les blocs sont consommés jusqu'à la fin du stream.
6. **Agrégation JSON :** Les entités, inputs et résultats sont structurés dans un objet `ReplayData` standardisé.

---

## 2. Analyse Détaillée de l'Architecture (Fichier par Fichier)

### `decompress.ts`
Gère la transformation initiale du blob.
- **Ordre critique :** La décompression (`pako.inflate`) DOIT précéder le décryptage XOR. Le jeu zippe d'abord, puis obfusque le résultat.
- **Clé XOR :** La routine utilise une clé cyclique pour faire un `buffer[i] ^ key[i % key.length]`. C'est l'ultime étape avant de passer le buffer au `BitStream`.

### `binary-reader.ts` (BitStream)
C’est le cœur de la lecture séquentielle.
- **Ordre des bits :** La lecture est effectuée en traitement MSB-first (Most Significant Bit) au sein de chaque octet.
- **Piège JavaScript (Bitwise) :** JavaScript gère les opérations bitwise (`<<`, `>>`, `|`) sur des entiers signés de 32 bits. Lors de la lecture d'un entier (`ReadInt`), il est **IMPÉRATIF** de forcer la conversion en entier non-signé de 32 bits en utilisant l'opérateur de décalage logique `>>> 0`. Ne pas le faire corrompra les grands entiers (ex: timestamps ou compteurs de frames).

### `types.ts` & `input-decoder.ts`
Définit la typologie des données et la logique d'extraction des actions.
- **Structure des Inputs :** Les actions des joueurs sont stockées sous forme d'événements temporels couplés à un masque binaire ("state") souvent encodé sur 14-bits.
- **Décodage :** Chaque bit du masque correspond à un état (Jump, Attack, Dodge, etc.). Les "Taunts" (Emotes) sont spécifiquement isolés et encodés sur les bits 10 à 13 (soit 4 bits permettant jusqu'à 16 slots de taunt).

### `replay-reader.ts`
Contient la "State Machine" principale.
- **Mécanique :** Une boucle lit un bloc de 4 bits (`stream.ReadBits(4)`) pour identifier le tag de la section à venir (valeurs typiques : 1 à 8). Le parseur route ensuite vers le sous-parseur approprié (`readInputs`, `readResults`, etc.).

---

## 3. Le Cœur du Système : L'Anchor Scanner avec Validation "Dry-Run"

### Le Problème Historique (Patch 10.04+)
Avant le patch 10.04, le bloc `PlayerData` avait une structure prévisible et se terminait par un integer "footer" signalant la version du replay (ex: `263`). BMG a supprimé ce footer et rendu la taille du payload `PlayerData` asymétrique.
- Un bot possède un bloc très court (ex: ~162 bits inconnus).
- Un joueur humain possède un bloc long (ex: ~360 bits inconnus, incluant cosmétiques, UI themes).
- Conséquence : Toute lecture statique échoue lamentablement selon les participants de la partie. L'ancienne méthode crachait "Unknown state tag" car elle était désynchronisée au moment d'attaquer la boucle des tags suivants.

### La Solution Actuelle : Scanner d'Ancre (Anchor Scanner) avec Dry-Run
Le parseur ignore la structure interne mouvante de `PlayerData` et "cherche" la balise du prochain bloc valide avec un mécanisme de **Look-ahead**.

1. **Sauvegarde de l'Offset :** L'offset binaire actuel `O` est enregistré.
2. **Saut Itératif :** Le parser incrémente `skippedBits` et teste si l'on se trouve sur une ancre valide (`Ancre B` marquant la fin des joueurs).
3. **Le Dry-Run (Validation Virtuelle) :** Lors du test de l'Ancre B (qui suppose que le prochain tag est `1` pour Inputs ou `6` pour Results), le parseur ne vérifie pas simplement un tag de 4 bits. Il **simule** la lecture complète du bloc présumé.
   - Par exemple, pour les Inputs (Tag 1), le Dry-Run entre dans une zone de test isolée : il lit les booléens, vérifie la cohérence de l'`entityId` (< 20), l'`inputCount` (< 300000), puis boucle sur tous les `timestamps` simulés.
4. **Critère de Validation Absolu :** Le bloc testé n'est validé comme Ancre Officielle QUE SI :
   - Le parsing est arrivé au bout sans exception (`try/catch`).
   - Au moins un bloc de données valide a été lu (`validInputs > 0`).
   - Le tag trouvé *après* ce bloc simulé est un tag de suite réseau parfaitement valide et logique (ex: un autre tag Inputs, ou Results, etc.).
5. **Restauration :** Une fois le Dry-Run couronné de succès, le `BitStream` rembobine à l'endroit exact qui a permis ce succès, et la machine à états principale reprend son cours normal, parfaitement resynchronisée.

---

## 4. Protocole de Réparation pour la Future IA (Recovery Guide)

Si le parseur crashe sur un nouveau patch, suivez strictement ces instructions.

### Scénario A : Erreur `BitStream: End of stream reached`
- **Diagnostic :** Le parseur a consommé tout le buffer avant de terminer sa machine à états, potentiellement à cause d'une lecture frénétique dans une boucle qui n'a pas rencontré sa condition de sortie, ou d'une erreur de taille (par exemple, un champ string lu comme un entier massif).
- **Consigne de l'IA :** Ne modifiez **PAS** les logiques fondamentales du `BitStream`.
- **Action Requise :** 
  1. Identifiez dans quel sous-parseur (lecture des Entités, lectures des Inputs, etc.) le crash survient.
  2. Si cela survient juste après le `PlayerData`, c'est que l'Ancre Scanner a mal identifié sa cible (Faux Positif) et a induit le parseur principal à lire des bits corrompus de façon séquentielle. Auditez la mécanique Dry-Run pour la rendre encore plus stricte.

### Scénario B : Erreur `Unknown replay state tag: 0` (ou tag absurde)
- **Diagnostic :** La machine à états s'est déclenchée, a demandé 4 bits pour connaître la prochaine étape, et a reçu une valeur incohérente (comme 0, 13, 14 ou 15). Cela signifie que le parseur est **désynchronisé** (Offset Shift). Il est en train de lire le milieu d'une donnée (un résidu de timestamp, une string, etc.) en pensant que c'est un Tag de Structure.
- **Consigne de l'IA :** Un décalage d'un seul bit (oublier un `stream.ReadBoolean()`) suffit à propager l'erreur en cascade et produire ce crash.
- **Action Requise :**
  1. Localisez quel a été le dernier "State Tag" lu avec succès.
  2. Allez dans la fonction dédiée (`readInputs`, `readResults`, etc.).
  3. Utilisez temporairement une fonction de Dump (`dumpBits`) pour extraire et analyser visuellement les données binaires autour de la zone de désynchronisation. Cherchez des patterns (des séries de zéros, des tailles prévisibles).
  4. Comparez les replays : La valeur corrompue varie-t-elle selon s'il y a des bots, des handicaps, des morts ?
  5. Ajustez les appels `ReadBits`, `ReadBoolean`, ou `ReadInt` pour rétablir l'alignement binaire parfait, ou étendez le mécanisme Dry-Run si c'est un bloc complexe impossible à anticiper.
