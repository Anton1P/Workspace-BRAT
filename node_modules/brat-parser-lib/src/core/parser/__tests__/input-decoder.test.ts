import { decodeInputState } from '../../../utils/input-decoder';
import { InputFlags } from '../types';
import { describe, it, expect } from 'vitest';

describe('Input Decoder Unit Tests', () => {
  it('should decode basic directional and action inputs correctly', () => {
    // Simulate pressing MOVE_RIGHT and JUMP together
    const inputState = InputFlags.MOVE_RIGHT | InputFlags.JUMP;
    
    const result = decodeInputState(inputState);
    
    expect(result).toContain('MOVE_RIGHT');
    expect(result).toContain('JUMP');
    expect(result.length).toBe(2);
  });

  it('should explicitly decode taunt patterns correctly via TAUNT_MASK', () => {
    // 0x0400 corresponds to TAUNT_1
    const result1 = decodeInputState(0x0400);
    expect(result1).toContain('TAUNT_1');
    
    // 0x0C00 corresponds to TAUNT_2
    const result2 = decodeInputState(0x0C00);
    expect(result2).toContain('TAUNT_2');
    
    // 0x3000 corresponds to TAUNT_6
    const result6 = decodeInputState(0x3000);
    expect(result6).toContain('TAUNT_6');
  });

  it('should gracefully handle empty or zero input state', () => {
    const result = decodeInputState(0);
    expect(result.length).toBe(0);
  });
  
  it('should correctly handle a complex simultaneous input frame', () => {
    // Simulate: DROP + MOVE_LEFT + DODGE_DASH + LIGHT_ATTACK
    const inputState = InputFlags.DROP | InputFlags.MOVE_LEFT | InputFlags.DODGE_DASH | InputFlags.LIGHT_ATTACK;
    const result = decodeInputState(inputState);
    
    expect(result).toContain('DROP');
    expect(result).toContain('MOVE_LEFT');
    expect(result).toContain('DODGE_DASH');
    expect(result).toContain('LIGHT_ATTACK');
    expect(result.length).toBe(4);
  });
});
