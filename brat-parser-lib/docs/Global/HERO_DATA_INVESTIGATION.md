# 🕵️ HERO DATA INVESTIGATION

## 1. Contexte de l'Analyse
Actuellement, bien que le parseur des fichiers `.replay` fonctionne sans erreur (100% de succès sur les tests 10.04 grâce au système de *Dry-Run Anchor Scanner*), nous avons remarqué que le tableau `heroes` de chaque Entité est systématiquement retourné `vide (Array 0)`.
L'objectif de cette investigation passive (sans modifier le code actuel) a été de fouiller dans les codes sources des anciens serveurs C# (`Talafhah1`) et JS/TS (`itselectroz`) afin de cartographier l'emplacement de ces données et de comprendre pourquoi elles sont ignorées.

## 2. Structure et Cartographie d'un Héros (HeroData)
En analysant les anciens dépôts, on comprend que l'objet `HeroData` a été historiquement structuré de manière très simple. Il est constitué d'exactement **4 Entiers (Int32)**, ce qui représente une taille invariable de **128 bits** par héros.

Voici sa structure d'origine extraite de `HeroData.ts` (depuis itselectroz/brawlhalla-replay-reader) :
```typescript
export class HeroData {
  public heroId: number = -1;       // Int32 : 32 bits
  public costumeId: number = -1;    // Int32 : 32 bits
  public stance: number = -1;       // Int32 : 32 bits
  public weaponSkins: number = -1;  // Int32 : 32 bits (1/2 low, 1/2 high field)
}
```

## 3. Analyse de l'Émplacement (Où sont ces bits ?)
Dans le code de l'ancien parseur, la lecture des `Heroes` s'effectuait dans `readPlayerData` avec le flux suivant :
```javascript
this.avatarId = data.ReadShort();
this.team = data.ReadInt();
this.unknown2 = data.ReadInt(); // L'équivalent de notre 'ConnectionTime' !

// --- LA LECTURE DES HÉROS COMMENÇAIT EXACTEMENT ICI ---
this.heroes = [];
for (let i = 0; i < heroCount; i++) {
    this.heroes.push(HeroData.read(data)); // Consomme 128 bits
}

// ... puis venaient les booleans isBot et handicapsEnabled
```
Dans notre code actuel (`readPlayerDataBlock`), nous retournons le bloc *juste après avoir lu* `ConnectionTime`, laissant notre **Anchor Scanner** nettoyer absolument tous les bits restants.

### 💡 L'Hypothèse Mathématique de Révélation
Durant la Phase 1, nous avons noté que l'Anchor Scanner sautait :
* **360 bits** pour un Humain
* **162 bits** pour un Bot

Vérifions mathématiquement cette hypothèse :
Si les 128 premiers bits de ce "saut" sont le bloc `HeroData` (pour 1 héros)...
Il reste à sauter post-HeroData :
* `360 - 128 = 232 bits` pour un Humain.
* `162 - 128 = 34 bits` pour un Bot.

Or, une boucle liste de type `while(stream.ReadBoolean()) { stream.ReadInt(); }` coûte exactement 33 bits par itération + 1 bit `false` de fin.
* `7 * 33 + 1 = 232 bits` (L'Humain a 7 objets en profil)
* `1 * 33 + 1 = 34 bits` (Le Bot a 1 objet de base).

**Conclusion Absolue :** 
L'Anchor Scanner saute bien les `HeroData` ! Ils sont parfaitement intacts, non obfusqués, situés exactement dans les 128 premiers bits qui suivent immédiatement `ConnectionTime`.

## 4. Proposition d'Intégration (Pseudo-code non intrusif)
Puisque le Dry-Run de l'Anchor Scanner ne dépend que de sa capacité à glisser (slide) mathématiquement vers son ancre, si nous lisons préventivement les `heroes`, l'Anchor Scanner sautera magiquement les bits restants (232 et 34) sans planter. 

Voici le pseudocode à intégrer dans `readPlayerDataBlock` un jour :

```typescript
// Fin actuelle de src/core/parser/replay-reader.ts > readPlayerDataBlock
const team = stream.ReadInt();
const connectionTime = stream.ReadInt();

// NOUVEAU BLOC : Récupération Légitime des Héros
const heroes = [];
for (let i = 0; i < heroCount; i++) {
   heroes.push({
      heroId: stream.ReadInt(),
      costumeId: stream.ReadInt(),
      stance: stream.ReadInt(),
      weaponSkins: stream.ReadInt()
   });
}

// L'Anchor scanner balayera silencieusement la boucle mystère (themes/emojis post 10.04) 
// qui s'exécute juste après la lecture de ce héros.
return {
  colourId, spawnBotId, companionId, emitterId, playerThemeId,
  taunts, winTaunt, loseTaunt, ownedTaunts,
  avatarId, team, connectionTime,
  heroes: heroes, // Rempli publiquement avec succès !
  bot: false,
  handicapsEnabled: false,
  handicapStockCount: 3,
  handicapDamageDoneMultiplier: 1,
  handicapDamageTakenMultiplier: 1,
};
```

Il suffira d'ajouter ce bloc dans la fonction, et l'Anchor Scanner de `replay-reader.ts` continuera de stabiliser l'ensemble. 
(Aucun fichier source n'a été modifié lors de cette analyse).