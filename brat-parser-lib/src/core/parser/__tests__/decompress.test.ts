import { describe, it, expect } from 'vitest';
import pako from 'pako';
import { xorDecrypt, decompressReplayBuffer } from '../decompress';

describe('Decompression & XOR Decryption', () => {
  describe('xorDecrypt', () => {
    it('should XOR decrypt and be reversible (applying twice = original)', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const copy = new Uint8Array(original);

      xorDecrypt(copy);
      // After one XOR, data should be different
      expect(copy).not.toEqual(original);

      // After a second XOR, data should be back to original
      xorDecrypt(copy);
      expect(copy).toEqual(original);
    });

    it('should apply the XOR key cyclically', () => {
      // Create data longer than the 64-byte key to test cycling
      const data = new Uint8Array(130).fill(0);
      xorDecrypt(data);

      // Byte 0 should equal XOR_KEY[0] (since 0 ^ key = key)
      expect(data[0]).toBe(107); // XOR_KEY[0]
      // Byte 64 should equal XOR_KEY[0] again (cycling)
      expect(data[64]).toBe(107);
      // Byte 65 should equal XOR_KEY[1]
      expect(data[65]).toBe(16);
    });
  });

  describe('decompressReplayBuffer', () => {
    it('should decompress a known zlib-compressed + XOR-encrypted payload', () => {
      // Create a known payload, XOR-encrypt it, then compress it
      // This simulates what a .replay file would contain
      const originalPayload = new Uint8Array([
        0x42, 0x52, 0x41, 0x54, 0x00, 0xFF, 0x12, 0x34,
      ]);

      // Simulate the encoding pipeline (reverse of decoding):
      // 1. XOR encrypt the payload
      const xorEncrypted = new Uint8Array(originalPayload);
      xorDecrypt(xorEncrypted); // XOR is its own inverse

      // 2. Deflate compress
      const compressed = pako.deflate(xorEncrypted);

      // Now decompress: should reverse the pipeline
      const result = decompressReplayBuffer(compressed.buffer);
      expect(result).toEqual(originalPayload);
    });

    it('should throw a clear error for invalid data', () => {
      const garbage = new Uint8Array([0xFF, 0xFE, 0xFD, 0xFC]);
      expect(() => decompressReplayBuffer(garbage.buffer)).toThrow(
        'Failed to decompress .replay file'
      );
    });
  });
});
