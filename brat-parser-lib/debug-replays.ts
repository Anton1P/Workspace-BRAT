import fs from 'fs';
import { parseReplay } from './src/core/parser/replay-reader';
import { BitStream } from './src/core/parser/binary-reader';
import { decompressReplayBuffer } from './src/core/parser/decompress';

const buffer = fs.readFileSync('../BRAT/replays/[10.04] BikiniBottom.replay');
try {
  const slicedBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const replay = parseReplay(slicedBuffer);
  console.log('Success!', replay.entities.length, 'entities');
} catch (e: any) {
  console.error('BikiniBottom error:', e.message);
}

const buffer2 = fs.readFileSync('../BRAT/replays/[10.04] Jikoku (3).replay');
try {
  const slicedBuffer = buffer2.buffer.slice(buffer2.byteOffset, buffer2.byteOffset + buffer2.byteLength);
  const replay2 = parseReplay(slicedBuffer);
  console.log('Success!', replay2.entities.length, 'entities');
} catch (e: any) {
  console.error('Jikoku 3 error:', e.message);
}

const buffer3 = fs.readFileSync('../BRAT/replays/[10.04] MammothFortress.replay');
try {
  const slicedBuffer = buffer3.buffer.slice(buffer3.byteOffset, buffer3.byteOffset + buffer3.byteLength);
  const replay3 = parseReplay(slicedBuffer);
  console.log('Success!', replay3.entities.length, 'entities');
} catch (e: any) {
  console.error('MammothFortress error:', e.message);
}
