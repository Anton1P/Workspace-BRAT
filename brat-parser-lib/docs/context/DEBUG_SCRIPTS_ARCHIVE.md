# Archive des Scripts de Débogage

Ce document répertorie tous les scripts de débogage temporaires créés durant la Phase 1 du reverse-engineering. Ces scripts ont été supprimés du répertoire de production `brat-parser-lib` pour le garder propre, mais leurs concepts ou extraits sont conservés ici au cas où il serait nécessaire de les recréer à l'avenir lors d'un changement de version de Brawlhalla (ex: Patch 11.xx).

---

## 1. Nom du fichier supprimé : `scripts/test-all-replays.ts`

**Rôle historique :** 
Ce script de test massif permettait de boucler sur le dossier entier `BRAT/replays/` pour valider la robustesse de nos algorithmes. C'est lui qui a permis de certifier la méthode du "Dry-Run Anchor Scanner" et la méthode d'offset inversée (Reverse Offset) pour lire l'objet `HeroData` sans désynchroniser le `BitStream`. Il nous garantissait un taux de réussite de "8/8" succès (et affichait les variables complexes des héros comme la stance ou les skins d'armes).

**Contenu clé / Snippet :**
```typescript
import fs from 'fs';
import path from 'path';
import { parseReplay } from '../src/core/parser/replay-reader';

const replaysDir = path.resolve(__dirname, '../../BRAT/replays');

async function main() {
    const files = fs.readdirSync(replaysDir).filter(f => f.endsWith('.replay'));
    let successCount = 0;

    for (const file of files) {
        const filePath = path.join(replaysDir, file);
        const data = fs.readFileSync(filePath);
        const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);                                                              
        
        try {
            const parsed = parseReplay(arrayBuffer);
            const numEntities = parsed.entities.length;
            
            console.log(`✅ [SUCCESS] ${file}`);
            if (numEntities > 0) {
               console.log(`   - Player 1 Heroes: ${parsed.entities[0].data.heroes.length} (IDs: ${parsed.entities[0].data.heroes.map(h => `${h.heroId} [Stance: ${h.stance}]`).join(', ')})`)
            }
            successCount++;
        } catch (e: any) {
            console.error(`❌ [FAILED] ${file} - offset: ${e.offset}`);
        }
    }
}
main();
```

---

## 2. Nom du fichier supprimé : `scripts/dump-bits.ts`

**Rôle historique :** 
Cet outil essentiel servait à extraire et afficher une séquence de bits brute à partir d'un offset précis dans un fichier `.replay` (souvent SmallBrawlhaven). Il a été longuement utilisé lors des phases de reverse-engineering hardcore pour deviner visuellement la taille du saut causé par la nouvelle boucle booléenne introduite par la mise à jour 10.04 avant le PlayerData. 

**Contenu clé / Snippet :**
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { decompressReplayBuffer, BitStream } from 'brat-parser-lib';

function runDump() {
  const filePath = path.join(__dirname, '../../BRAT/test-fixtures/[10.04] SmallBrawlhaven.replay');
  const rawBuffer = fs.readFileSync(filePath);
  const decrypted = decompressReplayBuffer(rawBuffer.buffer.slice(rawBuffer.byteOffset, rawBuffer.byteOffset + rawBuffer.byteLength));
  const stream = new BitStream(decrypted);

  const version = stream.ReadInt();
  console.log(`Replay Version: ${version}`);
  // La suite consistait généralement en une lecture brute des bits depuis stream.getReadOffset()
}
```

---

## 3. Nom du fichier supprimé : `debug-replays.ts`

**Rôle historique :** 
Il s'agissait du premier script primitif créé à la racine de la librairie pour lancer des tests "one-shot" ciblés sur certains fichiers chaotiques (comme BikiniBottom ou MammothFortress), pour rapidement afficher la trace d'erreur ou le nombre d'entités récupérées et vérifier d'où tombait l'exception sans avoir à exécuter tout le dossier.

**Contenu clé / Snippet :**
```typescript
import fs from 'fs';
import { parseReplay } from './src/core/parser/replay-reader';

const buffer = fs.readFileSync('../BRAT/replays/[10.04] BikiniBottom.replay');  
try {
  const slicedBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const replay = parseReplay(slicedBuffer);
  console.log('Success!', replay.entities.length, 'entities');
} catch (e: any) {
  console.error('BikiniBottom error:', e.message);
}
```

---

## 4. Fichiers supprimés : scripts/temp-*.ts (et autres dumps temporaires)

**Rôle historique :**
Ces différents scripts jetables (temp-analyzer, temp-dump1 à 6, temp-scanner, test-hero, dump_results.txt) ont été générés lors de nos sessions intensives d'ingénierie inverse pour scanner en force brute le stream. Ils nous ont permis de deviner les structures cachées et de trouver l'ordre des bits pour les masques de Héros en lisant massivement des booléens et entiers.

**Contenu clé :**
Il s'agissait de clones mineurs de dump-bits.ts modifiant simplement les offsets de d�part ou affichant des matrices d'essais bruts dans la console.



---

## 5. Fichiers logs supprimés : dump.txt, out.txt (à la racine)

**Rôle historique :**
Fichiers txt générés par nos commandes PowerShell lors des débogages de la console.

