/**
 * Decompression & Decryption utilities for Brawlhalla .replay files.
 *
 * Pipeline: raw file bytes → zlib inflate → XOR decrypt → parseable BitStream
 *
 * The XOR key is a fixed 62-byte key found in the reference implementation.
 * Order matters: inflate first, then XOR.
 */

import pako from 'pako';

/**
 * The 62-byte XOR key used to decrypt the decompressed replay data.
 * Source: itselectroz/brawlhalla-replay-reader
 */
const XOR_KEY: readonly number[] = [
  107, 16, 222, 60, 68, 75, 209, 70, 160, 16, 82, 193, 178, 49, 211, 106,
  251, 172, 17, 222, 6, 104, 8, 120, 140, 213, 179, 249, 106, 64, 214, 19,
  12, 174, 157, 197, 212, 107, 84, 114, 252, 87, 93, 26, 6, 115, 194, 81,
  75, 176, 201, 140, 120, 4, 17, 122, 239, 116, 62, 70, 57, 160, 199, 166,
] as const;

/**
 * Apply the XOR decryption key to a buffer in-place.
 * The key is applied cyclically (wrapping every 62 bytes).
 *
 * @param data The buffer to decrypt (modified in-place)
 */
export function xorDecrypt(data: Uint8Array): void {
  for (let i = 0; i < data.length; i++) {
    data[i] ^= XOR_KEY[i % XOR_KEY.length];
  }
}

/**
 * Decompress and decrypt a raw .replay file buffer.
 *
 * Pipeline:
 * 1. Inflate (zlib decompress) the raw bytes
 * 2. XOR decrypt with the fixed 62-byte key
 *
 * @param rawBuffer The raw .replay file contents as ArrayBuffer
 * @returns Decrypted Uint8Array ready for bit-level parsing
 * @throws Error if decompression fails (i.e., not a valid .replay file)
 */
export function decompressReplayBuffer(rawBuffer: ArrayBuffer): Uint8Array {
  const raw = new Uint8Array(rawBuffer);

  // Step 1: zlib inflate (decompress)
  let decompressed: Uint8Array;
  try {
    decompressed = pako.inflate(raw);
  } catch (error) {
    throw new Error(
      `Failed to decompress .replay file: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      'The file may be corrupted or not a valid Brawlhalla replay.'
    );
  }

  // Step 2: XOR decrypt (in-place)
  xorDecrypt(decompressed);

  return decompressed;
}
