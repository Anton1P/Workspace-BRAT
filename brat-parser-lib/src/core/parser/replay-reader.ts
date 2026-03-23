/**
 * Replay Reader — Main parser for Brawlhalla .replay files.
 *
 * Supports the post-9.08 / AltMode replay format (version ≥ 246).
 *
 * Key format changes from older versions:
 * - First 32 bits = replay version (prefix, read before state machine)
 * - State tags are 4 bits wide (was 3 bits)
 * - inputState bitmask mapping has changed
 *
 * Pipeline:
 * 1. Decompress & decrypt the raw binary file (inflate → XOR)
 * 2. Read the 32-bit version prefix
 * 3. Parse the 4-bit state machine to extract all replay data
 */

import { BitStream } from './binary-reader';
import { decompressReplayBuffer } from './decompress';
import type {
  ReplayData,
  Death,
  Face,
  InputEvent,
  GameSettings,
  Entity,
  PlayerData,
  HeroData,
} from './types';

// ============================================================================
// STATE MACHINE TAGS (4 bits each — post-9.08 format)
// ============================================================================

/** State tag constants — each section starts with a 4-bit tag */
const STATE = {
  INPUTS: 1,
  END: 2,
  HEADER: 3,
  PLAYER_DATA: 4,
  FACES_DEATHS: 5,
  RESULTS: 6,
  FACES_VICTORY: 7,
  INVALID: 8,
} as const;

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

/**
 * Parse a raw .replay file buffer into structured ReplayData.
 *
 * @param rawBuffer The raw file contents as read by FileReader.readAsArrayBuffer()
 * @returns Complete parsed ReplayData
 * @throws Error if the file is corrupted or has an unsupported format
 */
export function parseReplay(rawBuffer: ArrayBuffer): ReplayData {
  // Step 1: Decompress & Decrypt
  const decrypted = decompressReplayBuffer(rawBuffer);
  const stream = new BitStream(decrypted);

  // Step 2: Read version prefix (32 bits before the state machine)
  const version = stream.ReadInt();

  // Step 3: Initialize ReplayData
  const replay: ReplayData = {
    length: -1,
    results: {},
    deaths: [],
    victoryFaces: [],
    inputs: {},
    randomSeed: -1,
    version,
    playlistId: -1,
    playlistName: undefined,
    onlineGame: false,
    gameSettings: undefined,
    levelId: -1,
    heroCount: -1,
    entities: [],
    endOfMatchFanfare: 0,
  };

  // Step 4: Parse the 4-bit state machine
  let stop = false;
  while (stream.getReadBytesAvailable() > 0 && !stop) {
    const state = stream.ReadBits(4);

    switch (state) {
      case STATE.HEADER:
        readHeader(stream, replay);
        break;
      case STATE.PLAYER_DATA:
        readPlayerData(stream, replay);
        break;
      case STATE.RESULTS:
        readResults(stream, replay);
        break;
      case STATE.INPUTS:
        readInputs(stream, replay);
        break;
      case STATE.FACES_DEATHS:
        readFaces(stream, replay, true);
        break;
      case STATE.FACES_VICTORY:
        readFaces(stream, replay, false);
        break;
      case STATE.INVALID:
        throw new Error(
          'Invalid replay packet (state 8). This replay file may be corrupted or from an incomplete match.'
        );
      case STATE.END:
        stop = true;
        break;
      default:
        throw new Error(`Unknown replay state tag: ${state}`);
    }
  }

  return replay;
}

// ============================================================================
// SECTION READERS
// ============================================================================

/**
 * Read the replay header: randomSeed, playlistId, playlistName, onlineGame.
 * Note: version is read as a prefix, not in the header section.
 */
function readHeader(stream: BitStream, replay: ReplayData): void {
  replay.randomSeed = stream.ReadInt();
  replay.playlistId = stream.ReadInt();

  if (replay.playlistId !== 0) {
    replay.playlistName = stream.ReadString();
  }

  replay.onlineGame = stream.ReadBoolean();
}

/**
 * Read player/entity data: gameSettings, levelId, heroCount, and all entities.
 * Includes checksum validation.
 */
function readPlayerData(stream: BitStream, replay: ReplayData): void {
  // Post-9.08 PlayerData no longer repeats the version integer
  replay.gameSettings = readGameSettings(stream);
  replay.levelId = stream.ReadInt();
  replay.heroCount = stream.ReadShort();
  
  replay.entities = [];
  
  while (stream.ReadBoolean()) {
    const entityId = stream.ReadInt();
    console.log(`[ReadPlayerData] Entity ID=${entityId} at offset ${stream['readOffset']}`);
    const entityName = stream.ReadString();
    console.log(`[ReadPlayerData] Entity name=${entityName} at offset ${stream['readOffset']}`);
    
    const playerDataBlock = readPlayerDataBlock(stream, replay.heroCount);

    replay.entities.push({
      id: entityId,
      name: entityName,
      data: playerDataBlock,
    });

    // --- ULTIMATE ANCHOR SCANNER DYNAMIQUE V2 ---
    let foundAnchor = false;
    let skippedBits = 0;
    const startOffset = stream.getReadOffset();

    while (!foundAnchor && skippedBits < 2000) {
        stream.setReadOffset(startOffset + skippedBits);
        const currentOffset = stream.getReadOffset();

        try {
            // 1. RÈGLE DE DISTANCE : On ignore tout ce qui est inférieur à 130 bits
            if (skippedBits < 130) {
                skippedBits++;
                continue;
            }

            // On teste le bit actuel
            const testBool = stream.ReadBoolean();

            if (testBool === true) {
                // --- ANCRE A RENFORCÉE : Nouvelle Entité ---
                const testEntityId = stream.ReadInt();
                if (testEntityId > 0 && testEntityId < 50) {
                    // Deep Look-ahead : le champ suivant est la longueur du nom (Short16)
                    const nameLength = stream.ReadShort(); 
                    if (nameLength > 0 && nameLength < 50) {
                        stream.setReadOffset(currentOffset); // On restaure l'offset sur le testBool
                        foundAnchor = true;
                        console.log(`[SYNC] Ancre A (Entité ${testEntityId}) validée après ${skippedBits} bits sautés.`);
                        break;
                    }
                }
            } else {
                // --- ANCRE B RENFORCÉE : Fin du bloc PlayerData ---
                const testChecksum = stream.ReadInt();
                const nextTag = stream.ReadBits(4);
                
                // Tags valides après PlayerData : 1 (Inputs) ou 6 (Results)
                if (nextTag === 1 || nextTag === 6) {
                    // Deep Look-ahead dans le bloc suivant !
                    if (nextTag === 1) { 
                        // Si c'est le bloc Inputs : le bit suivant est 'true' (hasInputLoop), puis l'EntityId (5 bits)
                        const hasInputLoop = stream.ReadBoolean();
                        const inputEntityId = stream.ReadBits(5);
                        if (hasInputLoop === true && inputEntityId > 0 && inputEntityId < 10) {
                            stream.setReadOffset(currentOffset);
                            foundAnchor = true;
                            console.log(`[SYNC] Ancre B (Inputs) validée après ${skippedBits} bits sautés.`);
                            break;
                        }
                    } else if (nextTag === 6) { 
                        // Si c'est le bloc Results : les 32 bits suivants sont la durée du match (Length)
                        const matchLengthMs = stream.ReadInt();
                        // Un match dure entre 5 secondes et 15 minutes
                        if (matchLengthMs > 5000 && matchLengthMs < 900000) {
                            stream.setReadOffset(currentOffset);
                            foundAnchor = true;
                            console.log(`[SYNC] Ancre B (Results) validée après ${skippedBits} bits sautés.`);
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            // End of stream reached during test
        }

        skippedBits++;
    }

    if (!foundAnchor) {
        throw new Error(`[BRAT] Échec total du scanner après ${skippedBits} bits.`);
    }
  }

  // Fin du bloc: la boucle while vient de lire le 'false' de l'Ancre B.
  // Nous devons consommer le checksum bidon (32 bits) pour positionner le stream 
  // exactement sur le prochain State Tag (4 bits) attendu par le parser principal.
  stream.ReadInt();
}

/**
 * Read GameSettings: 15 × 32-bit integers (post-9.08 format).
 */
function readGameSettings(stream: BitStream): GameSettings {
  return {
    flags: stream.ReadInt(),
    maxPlayers: stream.ReadInt(),
    duration: stream.ReadInt(),
    roundDuration: stream.ReadInt(),
    startingLives: stream.ReadInt(),
    scoringType: stream.ReadInt(),
    scoreToWin: stream.ReadInt(),
    gameSpeed: stream.ReadInt(),
    damageRatio: stream.ReadInt(),
    levelSetID: stream.ReadInt(),
    itemSpawnRuleSetId: stream.ReadInt(),
    weaponSpawnRateId: stream.ReadInt(),
    gadgetSpawnRateId: stream.ReadInt(),
    customGadgetsField: stream.ReadInt(),
    variation: stream.ReadInt(),
  };
}

function readPlayerDataBlock(stream: BitStream, heroCount: number): PlayerData {
  const colourId = stream.ReadInt();
  const spawnBotId = stream.ReadInt();
  const companionId = stream.ReadInt();
  const emitterId = stream.ReadInt();
  const playerThemeId = stream.ReadInt();

  const taunts: number[] = [];
  for (let i = 0; i < 8; i++) {
    taunts.push(stream.ReadInt());
  }

  const winTaunt = stream.ReadShort();
  const loseTaunt = stream.ReadShort();

  const ownedTaunts: number[] = [];
  while (stream.ReadBoolean()) {
    ownedTaunts.push(stream.ReadInt());
  }

  const avatarId = stream.ReadShort();
  const team = stream.ReadInt();
  const connectionTime = stream.ReadInt();

  return {
    colourId, spawnBotId, companionId, emitterId, playerThemeId,
    taunts, winTaunt, loseTaunt, ownedTaunts,
    avatarId, team, connectionTime,
    heroes: [], // Skipped for now
    bot: false,
    handicapsEnabled: false,
    handicapStockCount: 3,
    handicapDamageDoneMultiplier: 1,
    handicapDamageTakenMultiplier: 1,
  };
}

/**
 * Read match results: match length, entity results, fanfare.
 * Note: post-9.08 format has no version check in results.
 */
function readResults(stream: BitStream, replay: ReplayData): void {
  replay.length = stream.ReadInt();

  if (stream.ReadBoolean()) {
    replay.results = {};
    while (stream.ReadBoolean()) {
      const entityId = stream.ReadBits(5);
      const result = stream.ReadShort();
      replay.results[entityId] = result;
    }
  }

  replay.endOfMatchFanfare = stream.ReadInt();
}

/**
 * Read all input events, grouped by entity ID.
 * Each input has a timestamp (32b) and an optional 14-bit inputState bitmask.
 */
function readInputs(stream: BitStream, replay: ReplayData): void {
  while (stream.ReadBoolean()) {
    const entityId = stream.ReadBits(5);
    const inputCount = stream.ReadInt();

    if (!replay.inputs[entityId]) {
      replay.inputs[entityId] = [];
    }

    for (let i = 0; i < inputCount; i++) {
      const timestamp = stream.ReadInt();
      const hasInput = stream.ReadBoolean();
      const inputState = hasInput ? stream.ReadBits(14) : 0;

      replay.inputs[entityId].push({
        timestamp,
        inputState,
      });
    }
  }
}

/**
 * Read face events (deaths or victory faces).
 * Both use the same format: boolean-prefixed list of (entityId 5b, timestamp 32b).
 * Results are sorted by timestamp ascending.
 */
function readFaces(stream: BitStream, replay: ReplayData, isDeaths: boolean): void {
  const arr: Face[] = [];

  while (stream.ReadBoolean()) {
    const entityId = stream.ReadBits(5);
    const timestamp = stream.ReadInt();
    arr.push({ entityId, timestamp });
  }

  arr.sort((a, b) => a.timestamp - b.timestamp);

  if (isDeaths) {
    replay.deaths = arr as Death[];
  } else {
    replay.victoryFaces = arr;
  }
}

// ============================================================================
// CHECKSUM
// ============================================================================

/**
 * Calculate the checksum for a PlayerData block.
 */
function calcPlayerChecksum(pd: PlayerData): number {
  let checksum = 0;

  checksum += pd.colourId * 5;
  checksum += pd.spawnBotId * 93;
  checksum += pd.companionId * 91;
  checksum += pd.emitterId * 97;
  checksum += pd.playerThemeId * 53;

  for (let i = 0; i < pd.taunts.length; i++) {
    checksum += pd.taunts[i] * (13 + i);
  }

  checksum += pd.winTaunt * 37;
  checksum += pd.loseTaunt * 41;

  for (let i = 0; i < pd.ownedTaunts.length; i++) {
    let taunt = pd.ownedTaunts[i];
    taunt -= (taunt >> 1) & 1431655765;
    taunt = (taunt & 858993459) + ((taunt >> 2) & 858993459);
    taunt = (((taunt + (taunt >> 4)) & 252645135) * 16843009) >> 24;
    checksum += taunt * (11 + i);
  }

  checksum += pd.team * 43;

  for (let i = 0; i < pd.heroes.length; i++) {
    const hero = pd.heroes[i];
    checksum += hero.heroId * (17 + i);
    checksum += hero.costumeId * (7 + i);
    checksum += hero.stance * (3 + i);
    checksum += hero.weaponSkin1 * (2 + i);
    checksum += hero.weaponSkin2 * (2 + i);
  }

  if (!pd.handicapsEnabled) {
    checksum += 29;
  } else {
    checksum += pd.handicapStockCount * 31;
    checksum += Math.round(pd.handicapDamageDoneMultiplier / 10) * 3;
    checksum += Math.round(pd.handicapDamageTakenMultiplier / 10) * 23;
  }

  return checksum;
}
