/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fnv1a, generateDeterministicHash } from './crypto';
import { MerkleNode, VirtualFile, HashTableBucket } from '../types/dedup';

/**
 * --------------------------------------------------------------------------
 * 1. STACK IMPLEMENTATION (LIFO - Last In, First Out)
 * --------------------------------------------------------------------------
 * Fundamental for:
 * - Depth-First Search (DFS) directory traversal without call-stack recursion
 * - Undo/Redo resolution action history
 * - Post-order Merkle Tree hash rollup
 */
export interface StackNode<T> {
  value: T;
  next: StackNode<T> | null;
}

export class DedupStack<T> {
  private topNode: StackNode<T> | null = null;
  private _size: number = 0;
  private maxDepthRecorded: number = 0;

  public push(value: T): void {
    const newNode: StackNode<T> = { value, next: this.topNode };
    this.topNode = newNode;
    this._size++;
    if (this._size > this.maxDepthRecorded) {
      this.maxDepthRecorded = this._size;
    }
  }

  public pop(): T | undefined {
    if (this.topNode === null) return undefined;
    const val = this.topNode.value;
    this.topNode = this.topNode.next;
    this._size--;
    return val;
  }

  public peek(): T | undefined {
    return this.topNode ? this.topNode.value : undefined;
  }

  public isEmpty(): boolean {
    return this.topNode === null;
  }

  public get size(): number {
    return this._size;
  }

  public get maxDepth(): number {
    return this.maxDepthRecorded;
  }

  public clear(): void {
    this.topNode = null;
    this._size = 0;
  }

  public toArray(): T[] {
    const arr: T[] = [];
    let curr = this.topNode;
    while (curr !== null) {
      arr.push(curr.value);
      curr = curr.next;
    }
    return arr;
  }
}

/**
 * --------------------------------------------------------------------------
 * 2. QUEUE IMPLEMENTATION (FIFO - First In, First Out)
 * --------------------------------------------------------------------------
 * Fundamental for:
 * - Breadth-First Search (BFS) level-order directory traversal
 * - Multi-stage streaming pipeline job queue (Tier 0 -> Tier 1 -> Tier 2)
 * - Work-stealing hash workers buffer
 */
export interface QueueNode<T> {
  value: T;
  next: QueueNode<T> | null;
}

export class DedupQueue<T> {
  private head: QueueNode<T> | null = null;
  private tail: QueueNode<T> | null = null;
  private _size: number = 0;
  private totalEnqueued: number = 0;

  public enqueue(value: T): void {
    const newNode: QueueNode<T> = { value, next: null };
    if (this.tail === null) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this._size++;
    this.totalEnqueued++;
  }

  public dequeue(): T | undefined {
    if (this.head === null) return undefined;
    const val = this.head.value;
    this.head = this.head.next;
    if (this.head === null) {
      this.tail = null;
    }
    this._size--;
    return val;
  }

  public peek(): T | undefined {
    return this.head ? this.head.value : undefined;
  }

  public isEmpty(): boolean {
    return this.head === null;
  }

  public get size(): number {
    return this._size;
  }

  public get totalProcessed(): number {
    return this.totalEnqueued;
  }

  public clear(): void {
    this.head = null;
    this.tail = null;
    this._size = 0;
  }

  public toArray(): T[] {
    const arr: T[] = [];
    let curr = this.head;
    while (curr !== null) {
      arr.push(curr.value);
      curr = curr.next;
    }
    return arr;
  }
}

/**
 * --------------------------------------------------------------------------
 * 3. LINKED LIST IMPLEMENTATION (Singly & Doubly Linked Lists)
 * --------------------------------------------------------------------------
 * Fundamental for:
 * - Hash table bucket collision chains (separate chaining)
 * - Duplicate file cluster doubly-linked lists with O(1) removal
 * - LRU hash cache implementation
 */
export interface DoublyLinkedListNode<T> {
  id: string;
  value: T;
  prev: DoublyLinkedListNode<T> | null;
  next: DoublyLinkedListNode<T> | null;
}

export class DoublyLinkedList<T> {
  private head: DoublyLinkedListNode<T> | null = null;
  private tail: DoublyLinkedListNode<T> | null = null;
  private _size: number = 0;

  public insertHead(id: string, value: T): DoublyLinkedListNode<T> {
    const newNode: DoublyLinkedListNode<T> = {
      id,
      value,
      prev: null,
      next: this.head,
    };

    if (this.head === null) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.head.prev = newNode;
      this.head = newNode;
    }

    this._size++;
    return newNode;
  }

  public insertTail(id: string, value: T): DoublyLinkedListNode<T> {
    const newNode: DoublyLinkedListNode<T> = {
      id,
      value,
      prev: this.tail,
      next: null,
    };

    if (this.tail === null) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      this.tail = newNode;
    }

    this._size++;
    return newNode;
  }

  public removeNode(node: DoublyLinkedListNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
    this._size--;
  }

  public removeById(id: string): boolean {
    let curr = this.head;
    while (curr !== null) {
      if (curr.id === id) {
        this.removeNode(curr);
        return true;
      }
      curr = curr.next;
    }
    return false;
  }

  public find(predicate: (val: T) => boolean): DoublyLinkedListNode<T> | null {
    let curr = this.head;
    while (curr !== null) {
      if (predicate(curr.value)) return curr;
      curr = curr.next;
    }
    return null;
  }

  public get size(): number {
    return this._size;
  }

  public getHead(): DoublyLinkedListNode<T> | null {
    return this.head;
  }

  public getTail(): DoublyLinkedListNode<T> | null {
    return this.tail;
  }

  public toArray(): Array<{ id: string; value: T; hasPrev: boolean; hasNext: boolean }> {
    const result: Array<{ id: string; value: T; hasPrev: boolean; hasNext: boolean }> = [];
    let curr = this.head;
    while (curr !== null) {
      result.push({
        id: curr.id,
        value: curr.value,
        hasPrev: curr.prev !== null,
        hasNext: curr.next !== null,
      });
      curr = curr.next;
    }
    return result;
  }
}

/**
 * --------------------------------------------------------------------------
 * 4. BINARY SEARCH TREE (BST) FOR SORTED HASH CATALOG
 * --------------------------------------------------------------------------
 * Orders file SHA-256 digests lexicographically for binary range queries
 * and deterministic sorted manifest exports in O(log N) time.
 */
export interface BSTNode {
  hash: string;
  files: VirtualFile[];
  left: BSTNode | null;
  right: BSTNode | null;
}

export class HashBinarySearchTree {
  public root: BSTNode | null = null;
  private _count: number = 0;

  public insert(file: VirtualFile): void {
    const hash = file.fullHash || generateDeterministicHash(file.path);
    this.root = this.insertRec(this.root, hash, file);
    this._count++;
  }

  private insertRec(node: BSTNode | null, hash: string, file: VirtualFile): BSTNode {
    if (node === null) {
      return { hash, files: [file], left: null, right: null };
    }

    if (hash === node.hash) {
      node.files.push(file);
      return node;
    }

    if (hash < node.hash) {
      node.left = this.insertRec(node.left, hash, file);
    } else {
      node.right = this.insertRec(node.right, hash, file);
    }

    return node;
  }

  public search(hash: string): VirtualFile[] | null {
    let curr = this.root;
    while (curr !== null) {
      if (curr.hash === hash) return curr.files;
      if (hash < curr.hash) curr = curr.left;
      else curr = curr.right;
    }
    return null;
  }

  public inOrder(): Array<{ hash: string; files: VirtualFile[] }> {
    const result: Array<{ hash: string; files: VirtualFile[] }> = [];
    const traverse = (node: BSTNode | null) => {
      if (!node) return;
      traverse(node.left);
      result.push({ hash: node.hash, files: node.files });
      traverse(node.right);
    };
    traverse(this.root);
    return result;
  }

  public getHeight(node: BSTNode | null = this.root): number {
    if (!node) return 0;
    return 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
  }

  public get count(): number {
    return this._count;
  }
}

/**
 * --------------------------------------------------------------------------
 * 5. HIERARCHICAL DIRECTORY MERKLE TREE WITH DFS (STACK) & BFS (QUEUE)
 * --------------------------------------------------------------------------
 * Implements:
 * - Recursive Merkle hashing bottom-up
 * - Non-recursive Depth-First Search (DFS) using an explicit DedupStack
 * - Non-recursive Breadth-First Search (BFS) using an explicit DedupQueue
 * - Subtree clone detection for identical folder structures
 */
export interface TraversalStep {
  step: number;
  nodeId: string;
  nodeName: string;
  nodePath: string;
  type: 'directory' | 'file';
  depth: number;
  hash: string;
  dataStructureState: string[]; // Snapshot of Stack or Queue contents at this step
}

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

  public computeMerkleHashes(node: MerkleNode = this.root): string {
    if (node.type === 'file') {
      return node.hash || generateDeterministicHash(node.path);
    }

    if (!node.children || node.children.length === 0) {
      node.hash = generateDeterministicHash('empty_dir_' + node.name);
      return node.hash;
    }

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
   * Non-recursive Depth-First Search (DFS) using an explicit DedupStack.
   * Produces step-by-step trace showing the Stack pushing and popping frames.
   */
  public traverseDFSWithStack(): TraversalStep[] {
    const steps: TraversalStep[] = [];
    const stack = new DedupStack<{ node: MerkleNode; depth: number }>();
    
    stack.push({ node: this.root, depth: 0 });
    let stepCount = 1;

    while (!stack.isEmpty()) {
      const current = stack.pop()!;
      const node = current.node;
      const depth = current.depth;

      const stackSnapshot = stack.toArray().map(item => item.node.name);

      steps.push({
        step: stepCount++,
        nodeId: node.id,
        nodeName: node.name,
        nodePath: node.path,
        type: node.type,
        depth,
        hash: node.hash.slice(0, 10),
        dataStructureState: stackSnapshot,
      });

      // Push children in reverse order so leftmost child is popped first
      if (node.children && node.children.length > 0) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push({ node: node.children[i], depth: depth + 1 });
        }
      }
    }

    return steps;
  }

  /**
   * Non-recursive Breadth-First Search (BFS) using an explicit DedupQueue.
   * Produces step-by-step trace showing Queue enqueuing and dequeuing level-by-level.
   */
  public traverseBFSWithQueue(): TraversalStep[] {
    const steps: TraversalStep[] = [];
    const queue = new DedupQueue<{ node: MerkleNode; depth: number }>();

    queue.enqueue({ node: this.root, depth: 0 });
    let stepCount = 1;

    while (!queue.isEmpty()) {
      const current = queue.dequeue()!;
      const node = current.node;
      const depth = current.depth;

      const queueSnapshot = queue.toArray().map(item => item.node.name);

      steps.push({
        step: stepCount++,
        nodeId: node.id,
        nodeName: node.name,
        nodePath: node.path,
        type: node.type,
        depth,
        hash: node.hash.slice(0, 10),
        dataStructureState: queueSnapshot,
      });

      if (node.children) {
        for (const child of node.children) {
          queue.enqueue({ node: child, depth: depth + 1 });
        }
      }
    }

    return steps;
  }

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

    const duplicates = new Map<string, MerkleNode[]>();
    for (const [hash, nodes] of hashMap.entries()) {
      if (nodes.length > 1) {
        duplicates.set(hash, nodes);
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
 * 6. CUSTOM HASH TABLE WITH SEPARATE CHAINING (LINKED LIST BUCKETS)
 * --------------------------------------------------------------------------
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

    let curr: HashNode<K, V> | null = head;
    while (curr !== null) {
      if (curr.key === key) {
        curr.value = value;
        return;
      }
      curr = curr.next;
    }

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

  public getMetrics() {
    let maxChainLength = 0;
    let emptyBuckets = 0;

    for (let i = 0; i < this._capacity; i++) {
      let len = 0;
      let curr = this.buckets[i];
      while (curr !== null) {
        len++;
        curr = curr.next;
      }
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
 * 7. BITWISE BLOOM FILTER
 * --------------------------------------------------------------------------
 */
export class DedupBloomFilter {
  public readonly size: number;
  public readonly numHashes: number;
  private bitArray: Uint8Array;
  private count: number;

  constructor(sizeBits: number = 256, numHashes: number = 3) {
    this.size = sizeBits;
    this.numHashes = numHashes;
    this.bitArray = new Uint8Array(Math.ceil(sizeBits / 8));
    this.count = 0;
  }

  public getBitIndices(item: string): number[] {
    const h1 = fnv1a(item, 0x811c9dc5);
    const h2 = fnv1a(item, 0x9e3779b9) || 1;
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
        return false;
      }
    }
    return true;
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
    const exponent = -(this.numHashes * this.count) / this.size;
    const rate = Math.pow(1 - Math.exp(exponent), this.numHashes);
    return Math.min(1, Math.max(0, rate));
  }

  public get elementsCount(): number {
    return this.count;
  }
}
