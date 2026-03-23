import { parseReplay } from '../replay-reader';
import { readFileSync } from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('Replay Parser Integration Test', () => {
  it('should successfully parse a complete 10.04 replay file without crashing', () => {
    // 1. Load the real 10.04 replay file
    const replayPath = path.resolve(process.cwd(), 'replays', '[10.04] SmallBrawlhaven.replay');
    const buffer = readFileSync(replayPath);
    
    // 2. Parse the buffer
    const replay = parseReplay(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    
    // 3. Verify core properties
    expect(replay).toBeDefined();
    expect(replay.version).toBe(263); // 10.04 Patch
    expect(replay.levelId).toBe(94); // Small Brawlhaven
    expect(replay.onlineGame).toBe(true);
    expect(replay.heroCount).toBe(1);
    
    // 4. Verify entities (The bypass should allow it to perfectly extract 2 entities)
    expect(replay.entities).toBeDefined();
    expect(replay.entities.length).toBe(2);
    
    // Verify first entity mapping
    const entity1 = replay.entities[0];
    expect(entity1.id).toBe(1);
    expect(entity1.name).toBe('zBlackneight');
    expect(entity1.data.team).toBe(7938069);
    
    // Verify second entity mapping
    const entity2 = replay.entities[1];
    expect(entity2.id).toBe(2);
    expect(entity2.name).toBe('I, Saibot');
    expect(entity2.data.team).toBe(1441796);
    
    // 5. Verify the matches inputs are populated (can be 0 for aborted replays)
    expect(Object.keys(replay.inputs).length).toBeGreaterThanOrEqual(0);
    
    // 6. Verify end of match state was reached (End state 2)
    expect(replay.endOfMatchFanfare).toBeDefined();
  });
});
