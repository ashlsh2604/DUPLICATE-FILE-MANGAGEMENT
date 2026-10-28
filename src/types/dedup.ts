/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VirtualFile {
  id: string;
  path: string;
  name: string;
  size: number; // in bytes
  extension: string;
  modifiedAt: string;
  contentSample?: string;
  realFile?: File;
  
  // Pipeline evaluation state
  sizeBucketKey?: string;
  partialHash?: string; // Hash of head (4KB) + tail (4KB)
  fullHash?: string;    // Full SHA-256 hash (64 hex characters)
  md5Hash?: string;     // Simulated or real MD5 for comparison
  
  // Resolution state
  duplicateGroupId?: string;
  isOriginal?: boolean;
  markedAction?: 'keep' | 'delete' | 'symlink' | 'quarantine';
}

export interface DuplicateGroup {
  id: string;
  hash: string;
  size: number;
  files: VirtualFile[];
  originalFileId: string;
  potentialSavingsBytes: number;
}

export type PipelineStage = 
  | 'idle'
  | 'size_bucketing'    // Tier 0: Group by file size O(N)
  | 'partial_hashing'   // Tier 1: Sample head & tail bytes
  | 'full_crypto_hash'  // Tier 2: SHA-256 cryptographic hash
  | 'byte_verification' // Tier 3: Byte-level safety check (optional)
  | 'completed';

export interface PipelineStats {
  totalFiles: number;
  totalSizeBytes: number;
  processedFiles: number;
  
  // Pruning statistics
  sizeFilteredOut: number;     // Files pruned because size was unique
  partialFilteredOut: number;  // Files pruned because sample hash didn't match
  fullHashEvaluated: number;   // Files requiring full SHA-256 calculation
  
  // Output results
  duplicateGroupsCount: number;
  duplicateFilesCount: number;
  wastedSizeBytes: number;
  
  // Performance metrics
  bytesReadEstimate: number;
  bytesSavedEstimate: number; // Disk I/O avoided via tiered pruning
  elapsedMs: number;
}

export interface HashTableBucket {
  index: number;
  items: Array<{ key: string; fileId: string; fileName: string; hashPrefix: string }>;
}

export interface MerkleNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  hash: string; // SHA-256 of file content OR combined children hashes
  children?: MerkleNode[];
  isDuplicateSubtree?: boolean;
  duplicateOfPath?: string;
}

export interface BloomFilterMetric {
  size: number; // m bits
  numHashFunctions: number; // k
  elementsAdded: number; // n
  bitArray: Uint8Array;
  theoreticalFalsePositiveRate: number;
}

export type ViewTab = 'detector' | 'data_structures' | 'resolver' | 'benchmarks' | 'c_backend';

export type DatasetPreset = 'monorepo' | 'photographer' | 'office' | 'synthetic';
