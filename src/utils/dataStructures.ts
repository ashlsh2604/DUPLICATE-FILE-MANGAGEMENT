/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fnv1a, generateDeterministicHash } from './crypto';
import { MerkleNode, VirtualFile, HashTableBucket } from '../types/dedup';

/**
 * --------------------------------------------------------------------------
 * 1. Custom Hash Table with Separate Chaining (Linked List Buckets)
 * --------------------------------------------------------------------------
 * Demonstrates collision resolution, load factor monitoring, and bucket distribution.
 */
export interface HashNode<K, V> {
  key: K;
  value: V;
  next: HashNode<K, V> | null;
}

export class DedupHashTable<K extends string | number, V> {
  private buckets: Array<HashNode<K, V> | null>;
  private _capacity: number;
  private _size: number;
  private readonly loadFactorThreshold: number;

  constructor(initialCapacity: number = 32, loadFactorThreshold: number = 0.75) {
    this._capacity = Math.max(initialCapacity, 8);
    this.loadFactorThreshold = loadFactorThreshold;
    this.buckets = new Array(this._capacity).fill(null);
    this._size = 0;
  }

  private hashKey(key: K): number {
    const str = String(key);
    return fnv1a(str) % this._capacity;
  }

  public set(key: K, value: V): void {
    if ((this._size + 1) / this._capacity > this.loadFactorThreshold) {
      this.resize(this._capacity * 2);
    }

    const index = this.hashKey(key);
    let head = this.buckets[index];

    // Check if key already exists in the chain
    let curr: HashNode<K, V> | null = head;
    while (curr !== null) {
      if (curr.key === key) {
        curr.value = value;
        return;
      }
      curr = curr.next;
    }

    // Insert new node at head of chain (O(1))
    const newNode: HashNode<K, V> = { key, value, next: head };
    this.buckets[index] = newNode;
    this._size++;
  }

  public get(key: K): V | undefined {
    const index = this.hashKey(key);
    let curr = this.buckets[index];
    while (curr !== null) {
      if (curr.key === key) {
        return curr.value;
      }
      curr = curr.next;
    }
    return undefined;
  }

  public has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  public get size(): number {
    return this._size;
  }

  public get capacity(): number {
    return this._capacity;
  }

  public get loadFactor(): number {
    return this._size / this._capacity;
  }

  public resize(newCapacity: number): void {
    const oldBuckets = this.buckets;
    this._capacity = newCapacity;
    this.buckets = new Array(newCapacity).fill(null);
    this._size = 0;

    for (let i = 0; i < oldBuckets.length; i++) {
      let curr = oldBuckets[i];
      while (curr !== null) {
        this.set(curr.key, curr.value);
        curr = curr.next;
      }
    }
  }

  /**
   * Returns snapshot of bucket chains for the visualizer.
   */
  public getBucketDistribution(): HashTableBucket[] {
    return this.buckets.map((head, index) => {
      const items: HashTableBucket['items'] = [];
      let curr = head;
      while (curr !== null) {
        const val = curr.value as any;
        items.push({
          key: String(curr.key),
          fileId: val?.id || String(curr.key),
          fileName: val?.name || val?.path || String(curr.key),
          hashPrefix: String(curr.key).slice(0, 8),
        });
        curr = curr.next;
      }
      return { index, items };
    });
  }

  /**
   * Diagnostic statistics for algorithm presentation.
   */
  public getMetrics() {
    let maxChainLength = 0;
    let emptyBuckets = 0;
    const chainLengths: number[] = [];

    for (let i = 0; i < this._capacity; i++) {
      let len = 0;
      let curr = this.buckets[i];
      while (curr !== null) {
        len++;
        curr = curr.next;
      }
      chainLengths.push(len);
      if (len === 0) emptyBuckets++;
      if (len > maxChainLength) maxChainLength = len;
    }

    return {
      size: this._size,
      capacity: this._capacity,
      loadFactor: parseFloat(this.loadFactor.toFixed(3)),
      maxChainLength,
      emptyBuckets,
      collisionCount: Math.max(0, this._size - (this._capacity - emptyBuckets)),
    };
  }
}

/**
 * --------------------------------------------------------------------------
 * 2. Directory Merkle Tree / Path Trie Visualizer
 * --------------------------------------------------------------------------
 * Computes recursive SHA-256 hashes for directory nodes to detect entire duplicate folders.
 */
export class DirectoryMerkleTree {
  public root: MerkleNode;

  constructor() {
    this.root = {
      id: 'root',
      name: '/',
      path: '/',
      type: 'directory',
      size: 0,
      hash: '',
      children: [],
    };
  }

  /**
   * Inserts a file into the tree and creates missing directory nodes.
   */
  public insertFile(file: VirtualFile): void {
    const cleanPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
    const segments = cleanPath.split('/').filter(Boolean);
    let curr = this.root;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isFile = i === segments.length - 1;

      if (!curr.children) {
        curr.children = [];
      }

      let child = curr.children.find(c => c.name === seg);
      if (!child) {
        const subPath = (curr.path === '/' ? '' : curr.path) + '/' + seg;
        child = {
          id: isFile ? file.id : `dir_${subPath}`,
          name: seg,
          path: subPath,
          type: isFile ? 'file' : 'directory',
          size: isFile ? file.size : 0,
          hash: isFile ? (file.fullHash || '') : '',
          children: isFile ? undefined : [],
        };
        curr.children.push(child);
      }

      if (!isFile) {
        curr = child;
      }
    }
  }

  /**
   * Recursively computes Merkle hashes bottom-up.
   * File hash = file.fullHash
   * Directory hash = SHA-256 of sorted child names & child hashes
   */
  public computeMerkleHashes(node: MerkleNode = this.root): string {
    if (node.type === 'file') {
      return node.hash || generateDeterministicHash(node.path);
    }

    if (!node.children || node.children.length === 0) {
      node.hash = generateDeterministicHash('empty_dir_' + node.name);
      return node.hash;
    }

    // Sort children for canonical determinism
    node.children.sort((a, b) => a.name.localeCompare(b.name));

    let totalSize = 0;
    const childHashPayload = node.children.map(child => {
      const childHash = this.computeMerkleHashes(child);
      totalSize += child.size;
      return `${child.name}:${childHash}`;
    }).join('|');

    node.size = totalSize;
    node.hash = generateDeterministicHash(childHashPayload, node.name);
    return node.hash;
  }

  /**
   * Scans for duplicate directories having identical Merkle hashes.
   */
  public findDuplicateSubtrees(): Map<string, MerkleNode[]> {
    const hashMap = new Map<string, MerkleNode[]>();

    const traverse = (node: MerkleNode) => {
      if (node.type === 'directory' && node.hash && node.path !== '/' && (node.children?.length ?? 0) > 0) {
        const existing = hashMap.get(node.hash) || [];
        existing.push(node);
        hashMap.set(node.hash, existing);
      }
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(this.root);

    // Filter to only hashes that appear in 2 or more distinct directories
    const duplicates = new Map<string, MerkleNode[]>();
    for (const [hash, nodes] of hashMap.entries()) {
      if (nodes.length > 1) {
        duplicates.set(hash, nodes);
        // Mark nodes as duplicate
        const originalPath = nodes[0].path;
        for (let i = 1; i < nodes.length; i++) {
          nodes[i].isDuplicateSubtree = true;
          nodes[i].duplicateOfPath = originalPath;
        }
      }
    }

    return duplicates;
  }
}

/**
 * --------------------------------------------------------------------------
 * 3. Bloom Filter Implementation
 * --------------------------------------------------------------------------
 * Space-efficient probabilistic filter for quick negative presence checks.
 */
export class DedupBloomFilter {
  public readonly size: number; // m bits
  public readonly numHashes: number; // k
  private bitArray: Uint8Array;
  private count: number;

  constructor(sizeBits: number = 256, numHashes: number = 3) {
    this.size = sizeBits;
    this.numHashes = numHashes;
    this.bitArray = new Uint8Array(Math.ceil(sizeBits / 8));
    this.count = 0;
  }

  /**
   * Computes the k bit indices using Kirsch-Mitzenmacher double-hashing:
   * g_i(x) = (h1(x) + i * h2(x)) mod m
   */
  public getBitIndices(item: string): number[] {
    const h1 = fnv1a(item, 0x811c9dc5);
    const h2 = fnv1a(item, 0x9e3779b9) || 1; // ensure non-zero
    const indices: number[] = [];

    for (let i = 0; i < this.numHashes; i++) {
      const combined = (h1 + i * h2) >>> 0;
      indices.push(combined % this.size);
    }
    return indices;
  }

  public add(item: string): void {
    const indices = this.getBitIndices(item);
    for (const idx of indices) {
      const byteIdx = Math.floor(idx / 8);
      const bitOffset = idx % 8;
      this.bitArray[byteIdx] |= (1 << bitOffset);
    }
    this.count++;
  }

  public mightContain(item: string): boolean {
    const indices = this.getBitIndices(item);
    for (const idx of indices) {
      const byteIdx = Math.floor(idx / 8);
      const bitOffset = idx % 8;
      if ((this.bitArray[byteIdx] & (1 << bitOffset)) === 0) {
        return false; // Definitely NOT in set (0 false negatives)
      }
    }
    return true; // Possibly in set
  }

  public isBitSet(bitIndex: number): boolean {
    if (bitIndex < 0 || bitIndex >= this.size) return false;
    const byteIdx = Math.floor(bitIndex / 8);
    const bitOffset = bitIndex % 8;
    return (this.bitArray[byteIdx] & (1 << bitOffset)) !== 0;
  }

  public getRawBits(): boolean[] {
    const result: boolean[] = new Array(this.size);
    for (let i = 0; i < this.size; i++) {
      result[i] = this.isBitSet(i);
    }
    return result;
  }

  public getTheoreticalFalsePositiveRate(): number {
    if (this.count === 0) return 0;
    // P ≈ (1 - e^(-k * n / m))^k
    const exponent = -(this.numHashes * this.count) / this.size;
    const rate = Math.pow(1 - Math.exp(exponent), this.numHashes);
    return Math.min(1, Math.max(0, rate));
  }

  public get elementsCount(): number {
    return this.count;
  }
}
