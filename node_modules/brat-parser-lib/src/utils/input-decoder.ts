/**
 * Input State Decoder — Converts bitmask values to human-readable action names.
 *
 * Updated for post-9.08 / AltMode format (version ≥ 246).
 */

import { InputFlags, InputFlagNames, TauntMap } from '../core/parser/types';

/**
 * Decode a 14-bit inputState bitmask into an array of active action names.
 *
 * @param state The inputState bitmask value from a replay InputEvent
 * @returns Array of active action names (e.g., ["MOVE_RIGHT", "JUMP", "LIGHT_ATTACK"])
 */
export function decodeInputState(state: number): string[] {
  if (state === 0) return [];

  const activeActions: string[] = [];

  // Check individual flags (bits 0-9)
  const singleBitFlags = [
    InputFlags.AIM_UP,
    InputFlags.DROP,
    InputFlags.MOVE_LEFT,
    InputFlags.MOVE_RIGHT,
    InputFlags.JUMP,
    InputFlags.PRIORITY_NEUTRAL,
    InputFlags.HEAVY_ATTACK,
    InputFlags.LIGHT_ATTACK,
    InputFlags.DODGE_DASH,
    InputFlags.PICKUP_THROW,
  ];

  for (const flag of singleBitFlags) {
    if ((state & flag) !== 0) {
      const name = InputFlagNames[flag];
      if (name) activeActions.push(name);
    }
  }

  // Check taunt (bits 10-13)
  const tauntBits = state & InputFlags.TAUNT_MASK;
  if (tauntBits !== 0) {
    const tauntName = TauntMap[tauntBits];
    activeActions.push(tauntName ?? `TAUNT_UNKNOWN(0x${tauntBits.toString(16)})`);
  }

  return activeActions;
}

/**
 * Check for potentially inconsistent input combinations.
 *
 * @param state The inputState bitmask value
 * @returns Array of warning strings, empty if no issues detected
 */
export function detectInputAnomalies(state: number): string[] {
  const warnings: string[] = [];

  if ((state & InputFlags.MOVE_LEFT) && (state & InputFlags.MOVE_RIGHT)) {
    warnings.push('MOVE_LEFT + MOVE_RIGHT simultaneously');
  }

  if ((state & InputFlags.AIM_UP) && (state & InputFlags.DROP)) {
    warnings.push('AIM_UP + DROP simultaneously');
  }

  return warnings;
}
