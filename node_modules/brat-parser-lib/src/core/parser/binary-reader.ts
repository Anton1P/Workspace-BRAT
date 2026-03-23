/**
 * BitStream — Bit-level binary reader for Brawlhalla .replay files.
 *
 * The .replay format uses non-byte-aligned data fields (e.g., 3-bit state tags,
 * 5-bit entity IDs, 14-bit inputStates). This class reads individual bits from
 * a Uint8Array using a bit-level cursor.
 *
 * Adapted from itselectroz/brawlhalla-replay-reader for browser usage
 * (Uint8Array instead of Node.js Buffer).
 */

/**
 * Precomputed masks for reading N bits.
 * MASKS[n] = (1 << n) - 1, i.e., a number with the lowest N bits set.
 * MASKS[32] = -1 (0xFFFFFFFF) to handle the 32-bit edge case with signed integers.
 */
const MASKS: readonly number[] = [
  0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383, 32767,
  65535, 131071, 262143, 524287, 1048575, 2097151, 4194303, 8388607, 16777215,
  33554431, 67108863, 134217727, 268435455, 536870911, 1073741823, 2147483647,
  -1,
] as const;

export class BitStream {
  private data: Uint8Array;
  private readOffset: number;

  constructor(data: Uint8Array) {
    this.data = data;
    this.readOffset = 0;
  }

  /**
   * Returns the underlying buffer.
   */
  public getBuffer(): Uint8Array {
    return this.data;
  }

  /**
   * Replaces the underlying buffer and resets the read offset.
   */
  public setBuffer(data: Uint8Array): void {
    this.data = data;
    this.readOffset = 0;
  }

  /**
   * Returns the number of complete bytes remaining to be read.
   */
  public getReadBytesAvailable(): number {
    return (this.data.length * 8 - this.readOffset) >>> 3;
  }

  /**
   * Returns the current read offset in bits.
   */
  public getReadOffset(): number {
    return this.readOffset;
  }

  /**
   * Sets the read offset in bits.
   */
  public setReadOffset(offset: number): void {
    this.readOffset = offset;
  }

  /**
   * Read `count` bits from the stream and return as a number.
   * Uses per-bit reading (MSB-first within each byte) matching
   * the C# reference implementation exactly.
   *
   * @param count Number of bits to read (1-32)
   * @returns The value read, as an unsigned integer
   * @throws Error if reading past the end of the stream
   */
  public ReadBits(count: number): number {
    let result = 0;
    let remaining = count;

    while (remaining !== 0) {
      if (this.readOffset >= this.data.length * 8) {
        throw new Error('BitStream: End of stream reached');
      }

      const byteIndex = this.readOffset >> 3;
      const bitIndex = this.readOffset & 7;

      // Read MSB-first: the bit at position `bitIndex` within the byte
      // bitIndex 0 = MSB (bit 7), bitIndex 7 = LSB (bit 0)
      const bit = (this.data[byteIndex] & (1 << (7 - bitIndex))) !== 0 ? 1 : 0;

      // Place this bit at position (remaining - 1) in the result
      result |= bit << (remaining - 1);
      remaining--;
      this.readOffset++;
    }

    return result;
  }

  /**
   * Read a single byte (8 bits).
   */
  public ReadByte(): number {
    return this.ReadBits(8);
  }

  /**
   * Read `count` bytes into a new Uint8Array.
   */
  public ReadByteList(count: number): Uint8Array {
    const result = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      result[i] = this.ReadByte();
    }
    return result;
  }

  /**
   * Read a single character (1 byte → char code).
   */
  public ReadChar(): string {
    return String.fromCharCode(this.ReadByte());
  }

  /**
   * Read a 16-bit unsigned integer.
   */
  public ReadShort(): number {
    return this.ReadBits(16);
  }

  /**
   * Read a 32-bit integer.
   * Note: JavaScript bitwise operations work on signed 32-bit integers,
   * so this may return negative values for large unsigned values.
   */
  public ReadInt(): number {
    return this.ReadBits(32);
  }

  /**
   * Read a UTF-8 string prefixed by a 16-bit length.
   * Format: [2 bytes: length] [length bytes: UTF-8 data]
   */
  public ReadString(): string {
    const length = this.ReadShort();
    const bytes = this.ReadByteList(length);
    return new TextDecoder('utf-8').decode(bytes);
  }

  /**
   * Read a single bit as a boolean.
   */
  public ReadBoolean(): boolean {
    return this.ReadBits(1) !== 0;
  }
}
