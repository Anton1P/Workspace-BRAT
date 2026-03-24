/**
 * Cet outil sert à extraire et afficher une séquence de bits brute à partir 
 * d'un offset précis dans un fichier .replay, utilisé pour le reverse-engineering.
 */
import * as fs from 'fs';
import * as path from 'path';
import { decompressReplayBuffer, BitStream } from 'brat-parser-lib';

enum STATE {
  INPUTS = 1,
  END = 2,
  HEADER = 3,
  PLAYER_DATA = 4,
  FACES_DEATHS = 5,
  RESULTS = 6,
  FACES_VICTORY = 7,
  INVALID = 8,
}

function runDump() {
  const filePath = path.join(__dirname, '../../BRAT/test-fixtures/[10.04] SmallBrawlhaven.replay');
  const rawBuffer = fs.readFileSync(filePath);
  const decrypted = decompressReplayBuffer(rawBuffer.buffer.slice(rawBuffer.byteOffset, rawBuffer.byteOffset + rawBuffer.byteLength));
  const stream = new BitStream(decrypted);

  const version = stream.ReadInt();
  console.log(`Replay Version: ${version}`);

  let stop = false;
  while (stream.getReadBytesAvailable() > 0 && !stop) {
    const state = stream.ReadBits(4);

    if (state === STATE.HEADER) {
      stream.ReadInt(); // randomSeed
      const playlistId = stream.ReadInt();
      if (playlistId !== 0) {
        stream.ReadString(); // playlistName
      }
      stream.ReadBoolean(); // onlineGame
    }
    else if (state === STATE.PLAYER_DATA) {
      // GameSettings
      stream.ReadInt(); stream.ReadInt(); stream.ReadInt(); stream.ReadInt(); stream.ReadInt();
      stream.ReadInt(); stream.ReadInt(); stream.ReadInt(); stream.ReadInt(); stream.ReadInt();
      stream.ReadInt(); stream.ReadInt(); stream.ReadInt(); stream.ReadInt(); stream.ReadInt();
      
      const levelId = stream.ReadInt();
      const heroCount = stream.ReadShort();
      console.log(`LevelId: ${levelId}, heroCount: ${heroCount}`);

      while(stream.ReadBoolean()) {
        const entityId = stream.ReadInt();
        const entityName = stream.ReadString();
        console.log(`\nFound Entity ID=${entityId}, Name="${entityName}"`);

        // PlayerDataBlock
        stream.ReadInt(); // colourId
        stream.ReadInt(); // spawnBotId
        stream.ReadInt(); // companionId
        stream.ReadInt(); // emitterId
        stream.ReadInt(); // playerThemeId

        for (let i = 0; i < 8; i++) stream.ReadInt(); // taunts

        stream.ReadShort(); // winTaunt
        stream.ReadShort(); // loseTaunt

        while (stream.ReadBoolean()) {
          stream.ReadInt(); // ownedTaunts
        }

        stream.ReadShort(); // avatarId
        stream.ReadInt(); // team
        const connectionTime = stream.ReadInt();
        console.log(`ConnectionTime = ${connectionTime}`);

        if (entityId === 2) {
            console.log(`\n--- STARTING FATAL DUMP AT BIT OFFSET ___ (Byte: ${stream.getReadBytesAvailable()} left) ---`);
            let bitString = '';
            for (let i = 0; i < 500; i++) {
            bitString += stream.ReadBoolean() ? '1' : '0';
            }

            dumpAndFormat(bitString);
            return; // Work is done
        } else {
            // skip 360 bits for entity 1
            for (let i = 0; i < 360; i++) stream.ReadBoolean();
        }
      }
    }
    else {
      console.log(`Reached state ${state}, stopping.`);
      break;
    }
  }
}

function dumpAndFormat(bitString: string) {
  let output = '';

  for (let i = 0; i < bitString.length; i += 32) {
    const chunk = bitString.substring(i, i + 32).padEnd(32, '0');
    const chunkReversedForVal = chunk.split('').reverse().join('');
    const num = parseInt(chunkReversedForVal, 2);

    const line = `Chunk: ${chunk} | Reversed: ${chunkReversedForVal} | Valeur: ${num} | Hex: 0x${num.toString(16).padStart(8, '0')}\n`;
    console.log(line.trim());
    output += line;
  }

  const outPath = path.join(__dirname, '../../tmp/10_04_mystery_bits.txt');
  fs.mkdirSync(path.join(__dirname, '../../tmp'), { recursive: true });
  fs.writeFileSync(outPath, output, 'utf-8');
  console.log(`\n✅ Result saved to ${outPath}`);
}

runDump();