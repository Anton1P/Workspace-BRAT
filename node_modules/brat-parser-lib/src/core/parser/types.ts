/**
 * TypeScript type definitions for Brawlhalla .replay file data.
 *
 * Supports the post-9.08 / AltMode format (version ≥ 246).
 * Based on Talafhah1/BrawlhallaReplayReader and itselectroz/brawlhalla-replay-reader.
 */

// ============================================================================
// INPUT FLAGS — Bitmask (14 bits) — Post-9.08 Format
// ============================================================================

/**
 * Bitmask constants for the `inputState` field (post-9.08 format).
 * Each input event stores a 14-bit bitmask where each bit (or group)
 * represents a game action being held during that frame.
 *
 * Note: Bits 10-13 encode taunts using a specific pattern — use
 * `TAUNT_MASK` to extract the taunt value, then check `TauntMap`.
 */
export const InputFlags = {
  AIM_UP:                   1 << 0,   // 0x0001 — Aim Up
  DROP:                     1 << 1,   // 0x0002 — Drop / Fast-fall
  MOVE_LEFT:                1 << 2,   // 0x0004 — Move Left
  MOVE_RIGHT:               1 << 3,   // 0x0008 — Move Right
  JUMP:                     1 << 4,   // 0x0010 — Jump
  PRIORITY_NEUTRAL:         1 << 5,   // 0x0020 — Prioritize Neutral over Side (auto-set with AIM_UP)
  HEAVY_ATTACK:             1 << 6,   // 0x0040 — Heavy Attack (Signatures / Recovery / GP)
  LIGHT_ATTACK:             1 << 7,   // 0x0080 — Light Attack
  DODGE_DASH:               1 << 8,   // 0x0100 — Dodge / Dash
  PICKUP_THROW:             1 << 9,   // 0x0200 — Pick Up / Throw
  TAUNT_MASK:               0x3C00,   // Bits 10-13: taunt encoding
} as const;

/**
 * Human-readable names for each InputFlag bit.
 */
export const InputFlagNames: Record<number, string> = {
  [InputFlags.AIM_UP]:           'AIM_UP',
  [InputFlags.DROP]:             'DROP',
  [InputFlags.MOVE_LEFT]:        'MOVE_LEFT',
  [InputFlags.MOVE_RIGHT]:       'MOVE_RIGHT',
  [InputFlags.JUMP]:             'JUMP',
  [InputFlags.PRIORITY_NEUTRAL]: 'PRIORITY_NEUTRAL',
  [InputFlags.HEAVY_ATTACK]:     'HEAVY_ATTACK',
  [InputFlags.LIGHT_ATTACK]:     'LIGHT_ATTACK',
  [InputFlags.DODGE_DASH]:       'DODGE_DASH',
  [InputFlags.PICKUP_THROW]:     'PICKUP_THROW',
};

/**
 * Taunt encoding map — extracted from bits 10-13 via (inputState & 0x3C00).
 */
export const TauntMap: Record<number, string> = {
  0x0400: 'TAUNT_1',
  0x0C00: 'TAUNT_2',
  0x0800: 'TAUNT_3',
  0x1800: 'TAUNT_4',
  0x1000: 'TAUNT_5',
  0x3000: 'TAUNT_6',
  0x2000: 'TAUNT_7',
  0x2400: 'TAUNT_8',
};

// ============================================================================
// REPLAY DATA TYPES
// ============================================================================

/**
 * Complete parsed replay data.
 */
export interface ReplayData {
  /** Duration of the match in milliseconds */
  length: number;
  /** Match results per entity ID (entityId → placement/score) */
  results: Record<number, number>;
  /** List of death events (KO) */
  deaths: Death[];
  /** Victory face events */
  victoryFaces: Face[];
  /** Input events per entity ID */
  inputs: Record<number, InputEvent[]>;
  /** Random seed used for the match */
  randomSeed: number;
  /** Replay format version */
  version: number;
  /** Playlist identifier (game mode) */
  playlistId: number;
  /** Human-readable playlist name (e.g., "PlaylistType_2v2Ranked_DisplayName") */
  playlistName: string | undefined;
  /** Whether the match was online */
  onlineGame: boolean;
  /** Game settings (lives, duration, speed, etc.) */
  gameSettings: GameSettings | undefined;
  /** Map/level identifier */
  levelId: number;
  /** Number of heroes (legends) per player */
  heroCount: number;
  /** List of entities (players/bots) in the match */
  entities: Entity[];
  /** End of match fanfare ID */
  endOfMatchFanfare: number;
}

/**
 * A death/KO event — records which entity died and when.
 */
export interface Death {
  /** ID of the entity that died */
  entityId: number;
  /** Timestamp of death in milliseconds */
  timestamp: number;
}

/**
 * A face event (used for both deaths and victory faces).
 */
export interface Face {
  /** ID of the associated entity */
  entityId: number;
  /** Timestamp in milliseconds */
  timestamp: number;
}

/**
 * A single input event — a timestamped snapshot of held buttons.
 */
export interface InputEvent {
  /** Timestamp of this input in milliseconds */
  timestamp: number;
  /** Bitmask of active inputs — decode with InputFlags */
  inputState: number;
}

/**
 * Game match settings (post-9.08 format — 15 × 32-bit fields).
 */
export interface GameSettings {
  flags: number;
  maxPlayers: number;
  /** Match duration limit in seconds */
  duration: number;
  roundDuration: number;
  startingLives: number;
  scoringType: number;
  scoreToWin: number;
  /** Game speed percentage (100 = normal) */
  gameSpeed: number;
  /** Damage ratio percentage (100 = normal) */
  damageRatio: number;
  levelSetID: number;
  itemSpawnRuleSetId: number;
  weaponSpawnRateId: number;
  gadgetSpawnRateId: number;
  customGadgetsField: number;
  variation: number;
}

/**
 * An entity in the match (player or bot).
 */
export interface Entity {
  /** Unique entity ID within the match */
  id: number;
  /** Player name */
  name: string;
  /** Player-specific data (cosmetics, heroes, team, etc.) */
  data: PlayerData;
}

/**
 * Data about a specific player.
 */
export interface PlayerData {
  colourId: number;
  spawnBotId: number;
  companionId: number;
  emitterId: number;
  playerThemeId: number;
  taunts: number[];
  winTaunt: number;
  loseTaunt: number;
  /** Owned taunts — bit field representation */
  ownedTaunts: number[];
  avatarId: number;
  team: number;
  /** Connection time */
  connectionTime: number;
  /** Selected heroes/legends */
  heroes: HeroData[];
  /** Whether this entity is a bot */
  bot: boolean;
  /** Whether handicaps are enabled for this player */
  handicapsEnabled: boolean;
  /** Number of extra stocks for handicap */
  handicapStockCount: number;
  /** Damage done multiplier for handicap */
  handicapDamageDoneMultiplier: number;
  /** Damage taken multiplier for handicap */
  handicapDamageTakenMultiplier: number;
}

/**
 * Data about a selected legend.
 */
export interface HeroData {
  /** Legend identifier */
  heroId: number;
  /** Skin/costume identifier */
  costumeId: number;
  /** Stat stance setting */
  stance: number;
  /** Weapon skin 1 */
  weaponSkin1: number;
  /** Weapon skin 2 */
  weaponSkin2: number;
}
