import { describe, it, expect } from 'vitest';
import { BitStream } from '../binary-reader';

describe('BitStream', () => {
  /**
   * Helper: create a BitStream from an array of byte values.
   */
  function createStream(bytes: number[]): BitStream {
    return new BitStream(new Uint8Array(bytes));
  }

  describe('ReadBits', () => {
    it('should read individual bits correctly', () => {
      // 0b10110100 = 0xB4 = 180
      const stream = createStream([0xB4]);
      expect(stream.ReadBits(1)).toBe(1); // bit 7: 1
      expect(stream.ReadBits(1)).toBe(0); // bit 6: 0
      expect(stream.ReadBits(1)).toBe(1); // bit 5: 1
      expect(stream.ReadBits(1)).toBe(1); // bit 4: 1
      expect(stream.ReadBits(1)).toBe(0); // bit 3: 0
      expect(stream.ReadBits(1)).toBe(1); // bit 2: 1
      expect(stream.ReadBits(1)).toBe(0); // bit 1: 0
      expect(stream.ReadBits(1)).toBe(0); // bit 0: 0
    });

    it('should read 3-bit state tags (critical for replay format)', () => {
      // Replay uses 3-bit state tags: 3=header, 4=playerData, 6=results, 1=inputs
      // Binary: 011 100 110 001 = 0x73 0x30 (approx)
      // State 3 = 011, State 4 = 100, State 6 = 110, State 1 = 001
      // 01110011 00010000 = 0x73 0x10
      const stream = createStream([0x73, 0x10]);
      expect(stream.ReadBits(3)).toBe(3);  // 011
      expect(stream.ReadBits(3)).toBe(4);  // 100
      expect(stream.ReadBits(3)).toBe(6);  // 110
      expect(stream.ReadBits(3)).toBe(1);  // 001
    });

    it('should read 5-bit entity IDs correctly', () => {
      // Entity ID 17 = 10001 in 5 bits
      // Byte: 10001_000 = 0x88
      const stream = createStream([0x88]);
      expect(stream.ReadBits(5)).toBe(17);
    });

    it('should read 14-bit inputState values', () => {
      // inputState is 14 bits in the replay format
      // Test value: 80 = 0b00000001010000 in 14 bits
      // This means JUMP(bit4) + LIGHT_ATTACK(bit6)
      // Pack 14 bits MSB-first into bytes: 00000001 010000xx
      // Byte 0: 0x01, Byte 1: 0x40 (last 2 bits are don't-care)
      const stream = createStream([0x01, 0x40]);
      expect(stream.ReadBits(14)).toBe(80);
    });

    it('should read across byte boundaries', () => {
      // Read 4 bits from first byte, then 8 bits spanning both bytes
      const stream = createStream([0xAB, 0xCD]);
      stream.ReadBits(4); // consume 0xA = 1010
      // Remaining: 1011 11001101
      // Reading 8 bits: 10111100 = 0xBC = 188
      expect(stream.ReadBits(8)).toBe(0xBC);
    });

    it('should throw on reading past end of stream', () => {
      const stream = createStream([0xFF]);
      stream.ReadBits(8); // consume all 8 bits
      expect(() => stream.ReadBits(1)).toThrow('End of stream reached');
    });
  });

  describe('ReadByte', () => {
    it('should read sequential bytes', () => {
      const stream = createStream([0x42, 0x52, 0x41, 0x54]);
      expect(stream.ReadByte()).toBe(0x42); // 'B'
      expect(stream.ReadByte()).toBe(0x52); // 'R'
      expect(stream.ReadByte()).toBe(0x41); // 'A'
      expect(stream.ReadByte()).toBe(0x54); // 'T'
    });
  });

  describe('ReadShort (16-bit)', () => {
    it('should read a 16-bit value correctly', () => {
      // 0x1234 = 4660
      // In big-endian bit order: 00010010 00110100
      const stream = createStream([0x12, 0x34]);
      expect(stream.ReadShort()).toBe(0x1234);
    });
  });

  describe('ReadInt (32-bit)', () => {
    it('should read a 32-bit value correctly', () => {
      // 0x12345678
      const stream = createStream([0x12, 0x34, 0x56, 0x78]);
      expect(stream.ReadInt()).toBe(0x12345678);
    });

    it('should handle negative values (signed 32-bit)', () => {
      // 0xFFFFFFFF = -1 in signed 32-bit
      const stream = createStream([0xFF, 0xFF, 0xFF, 0xFF]);
      expect(stream.ReadInt()).toBe(-1);
    });
  });

  describe('ReadBoolean', () => {
    it('should read boolean bits', () => {
      // 0b10100000 = 0xA0
      const stream = createStream([0xA0]);
      expect(stream.ReadBoolean()).toBe(true);  // 1
      expect(stream.ReadBoolean()).toBe(false); // 0
      expect(stream.ReadBoolean()).toBe(true);  // 1
      expect(stream.ReadBoolean()).toBe(false); // 0
    });
  });

  describe('ReadString', () => {
    it('should read a length-prefixed UTF-8 string', () => {
      // String "BRAT" = 4 chars
      // Length: 0x0004 (16 bits)
      // Data: 0x42 0x52 0x41 0x54
      const stream = createStream([0x00, 0x04, 0x42, 0x52, 0x41, 0x54]);
      expect(stream.ReadString()).toBe('BRAT');
    });

    it('should read an empty string', () => {
      const stream = createStream([0x00, 0x00]);
      expect(stream.ReadString()).toBe('');
    });
  });

  describe('ReadByteList', () => {
    it('should read N bytes into a Uint8Array', () => {
      const stream = createStream([0x01, 0x02, 0x03, 0x04]);
      const result = stream.ReadByteList(3);
      expect(result).toEqual(new Uint8Array([0x01, 0x02, 0x03]));
    });
  });

  describe('getReadBytesAvailable', () => {
    it('should report correct remaining bytes', () => {
      const stream = createStream([0x00, 0x00, 0x00, 0x00]);
      expect(stream.getReadBytesAvailable()).toBe(4);
      stream.ReadByte();
      expect(stream.getReadBytesAvailable()).toBe(3);
      stream.ReadBits(4); // half a byte
      expect(stream.getReadBytesAvailable()).toBe(2); // rounded down
    });
  });

  describe('offset tracking', () => {
    it('should track read offset correctly in bits', () => {
      const stream = createStream([0x00, 0x00]);
      expect(stream.getReadOffset()).toBe(0);
      stream.ReadBits(3);
      expect(stream.getReadOffset()).toBe(3);
      stream.ReadByte();
      expect(stream.getReadOffset()).toBe(11);
      stream.ReadBoolean();
      expect(stream.getReadOffset()).toBe(12);
    });
  });

  describe('complex replay-like sequence', () => {
    it('should handle a mixed-width read sequence like a real replay', () => {
      // Simulate a mini replay header:
      // State tag (3 bits): 3 = Header → 011
      // randomSeed (32 bits): 69330341 = 0x0421F9A5
      // version (32 bits): 209 = 0x000000D1
      //
      // 011 00000 10000010 00011111 10011010 01010000 00000000 000000001 10100010 0000000...
      // We need to carefully pack this into bytes.
      //
      // Instead of manual packing, let's use a simpler test:
      // Just verify that reading 3 bits then 32 bits from known bytes works.

      // Bytes: 0x60 0x84 0x3F 0x34 0xA0
      // Binary: 01100000 10000100 00111111 00110100 10100000
      // Reading 3 bits: 011 = 3
      // Reading 32 bits: 00000100 00100001 11111001 10100101 = 0x0421F9A5 = 69330341
      const stream = createStream([0x60, 0x84, 0x3F, 0x34, 0xA0]);

      const stateTag = stream.ReadBits(3);
      expect(stateTag).toBe(3); // Header state

      const seed = stream.ReadInt();
      expect(seed).toBe(0x0421F9A5); // 69330341
    });
  });
});
