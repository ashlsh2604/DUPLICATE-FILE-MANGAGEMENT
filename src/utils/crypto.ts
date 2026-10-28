/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Computes the real SHA-256 digest of an ArrayBuffer or string using the Web Crypto API.
 * Returns a 64-character lowercase hexadecimal string.
 */
export async function computeSHA256(data: ArrayBuffer | string): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bufferToHex(hashBuffer);
}

/**
 * Reads a slice of a real File and returns its SHA-256 digest.
 */
export async function hashFileSlice(file: File, start: number, end: number): Promise<string> {
  const slice = file.slice(start, end);
  const buffer = await slice.arrayBuffer();
  return computeSHA256(buffer);
}

/**
 * Computes a fast partial hash of a file by hashing the first 4KB and last 4KB.
 * This is Tier 1 of the multi-tiered deduplication pipeline.
 */
export async function computeRealPartialHash(file: File): Promise<string> {
  const CHUNK_SIZE = 4096;
  if (file.size <= CHUNK_SIZE * 2) {
    const fullBuffer = await file.arrayBuffer();
    return computeSHA256(fullBuffer);
  }

  const headSlice = file.slice(0, CHUNK_SIZE);
  const tailSlice = file.slice(file.size - CHUNK_SIZE, file.size);

  const [headBuf, tailBuf] = await Promise.all([
    headSlice.arrayBuffer(),
    tailSlice.arrayBuffer()
  ]);

  // Combine head and tail
  const combined = new Uint8Array(CHUNK_SIZE * 2);
  combined.set(new Uint8Array(headBuf), 0);
  combined.set(new Uint8Array(tailBuf), CHUNK_SIZE);

  return computeSHA256(combined.buffer);
}

/**
 * Converts an ArrayBuffer to a lowercase hex string.
 */
export function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  let hexString = '';
  for (let i = 0; i < byteArray.length; i++) {
    const hex = byteArray[i].toString(16).padStart(2, '0');
    hexString += hex;
  }
  return hexString;
}

/**
 * Fast 32-bit FNV-1a hash implementation for string keys.
 * Used for bucket indexing in custom Hash Tables and Bloom Filter hash functions.
 */
export function fnv1a(str: string, seed: number = 0x811c9dc5): number {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0; // ensure unsigned 32-bit integer
}

/**
 * Deterministic pseudo-cryptographic hash generator for synthetic and mock files.
 * Provides avalanche effect and uniform distribution across 256 bits (64 hex chars).
 */
export function generateDeterministicHash(contentSeed: string, salt: string = ''): string {
  let h1 = fnv1a(contentSeed + salt + '_tier0', 0x811c9dc5);
  let h2 = fnv1a(contentSeed + salt + '_tier1', 0x9e3779b9);
  let h3 = fnv1a(contentSeed + salt + '_tier2', 0x5bd1e995);
  let h4 = fnv1a(contentSeed + salt + '_tier3', 0x27d4eb2f);
  let h5 = fnv1a(contentSeed + salt + '_tier4', 0x165667b1);
  let h6 = fnv1a(contentSeed + salt + '_tier5', 0xd3a2646c);
  let h7 = fnv1a(contentSeed + salt + '_tier6', 0xfd7046c5);
  let h8 = fnv1a(contentSeed + salt + '_tier7', 0xb55a4f09);

  const hexParts = [h1, h2, h3, h4, h5, h6, h7, h8].map(h => 
    h.toString(16).padStart(8, '0')
  );
  return hexParts.join('');
}

/**
 * Format bytes into human-readable string (B, KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  if (isNaN(bytes) || bytes < 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

/**
 * Formats time in milliseconds with clear units.
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return '< 1 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
