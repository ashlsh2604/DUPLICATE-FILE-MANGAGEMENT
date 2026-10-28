/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { VirtualFile, MerkleNode, DuplicateGroup } from '../types/dedup';
import { DedupHashTable, DirectoryMerkleTree, DedupBloomFilter } from '../utils/dataStructures';
import { formatBytes } from '../utils/crypto';
import {
  Folder,
  FileCode,
  Network,
  Binary,
  Layers,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Sliders,
  CheckCircle,
  XCircle,
  HelpCircle,
  Copy,
} from 'lucide-react';

interface DataStructureLabProps {
  files: VirtualFile[];
  duplicateGroups: DuplicateGroup[];
}

export const DataStructureLab: React.FC<DataStructureLabProps> = ({
  files,
  duplicateGroups,
}) => {
  const [activeTab, setActiveTab] = useState<'hashtable' | 'merkle' | 'bloom'>('hashtable');

  // --- 1. Hash Table State ---
  const [tableCapacity, setTableCapacity] = useState<number>(32);
  const [selectedBucketIndex, setSelectedBucketIndex] = useState<number | null>(0);

  const { hashTable, bucketDistribution, htMetrics } = useMemo(() => {
    const ht = new DedupHashTable<string, VirtualFile>(tableCapacity);
    files.forEach(f => {
      // Key is full SHA-256 hash or fallback to path
      const key = f.fullHash || f.path;
      ht.set(key, f);
    });
    return {
      hashTable: ht,
      bucketDistribution: ht.getBucketDistribution(),
      htMetrics: ht.getMetrics(),
    };
  }, [files, tableCapacity]);

  // --- 2. Merkle Tree State ---
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ root: true });
  const [selectedMerkleNode, setSelectedMerkleNode] = useState<MerkleNode | null>(null);

  const { merkleTree, duplicateSubtrees } = useMemo(() => {
    const tree = new DirectoryMerkleTree();
    files.forEach(f => tree.insertFile(f));
    tree.computeMerkleHashes();
    const dups = tree.findDuplicateSubtrees();
    return { merkleTree: tree, duplicateSubtrees: dups };
  }, [files]);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- 3. Bloom Filter State ---
  const [filterBits, setFilterBits] = useState<number>(256);
  const [numHashes, setNumHashes] = useState<number>(3);
  const [queryInput, setQueryInput] = useState<string>('');
  const [queryResult, setQueryResult] = useState<{
    tested: boolean;
    mightContain: boolean;
    indices: number[];
  } | null>(null);

  const bloomFilter = useMemo(() => {
    const bf = new DedupBloomFilter(filterBits, numHashes);
    // Add all existing file hashes to bloom filter
    files.forEach(f => {
      if (f.fullHash) bf.add(f.fullHash);
    });
    return bf;
  }, [files, filterBits, numHashes]);

  const rawBits = useMemo(() => bloomFilter.getRawBits(), [bloomFilter]);

  const handleTestQuery = () => {
    if (!queryInput.trim()) return;
    const indices = bloomFilter.getBitIndices(queryInput.trim());
    const mightContain = bloomFilter.mightContain(queryInput.trim());
    setQueryResult({
      tested: true,
      mightContain,
      indices,
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Interactive Computer Science Data Structure Inspector
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span>Data Structure Internals</span>
            <span aria-hidden="true">·</span>
            <span>Collision Resolution</span>
            <span aria-hidden="true">·</span>
            <span>Cryptographic Merkle Invariants</span>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('hashtable')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'hashtable'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Hash Table & Chaining</span>
          </button>
          <button
            onClick={() => setActiveTab('merkle')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'merkle'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-emerald-500" />
            <span>Directory Merkle Tree</span>
          </button>
          <button
            onClick={() => setActiveTab('bloom')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'bloom'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Binary className="w-3.5 h-3.5 text-cyan-500" />
            <span>Bloom Filter Visualizer</span>
          </button>
        </div>
      </div>

      {/* TAB 1: HASH TABLE & SEPARATE CHAINING */}
      {activeTab === 'hashtable' && (
        <div className="space-y-6">
          {/* Controls & Metrics Header */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Table Capacity (M)</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {htMetrics.capacity}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Bucket array length</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Elements Stored (N)</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {htMetrics.size}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Total entries</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Load Factor (α = N/M)</div>
              <div className={`text-xl font-bold font-mono mt-1 ${
                htMetrics.loadFactor > 0.75 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {htMetrics.loadFactor}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Threshold: 0.75</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Max Chain Length</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {htMetrics.maxChainLength}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Deepest collision chain</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
              <div className="text-xs text-slate-500">Empty Buckets</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {htMetrics.emptyBuckets}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Unused slots</div>
            </div>
          </div>

          {/* Interactive Rehash Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Capacity Adjustment:</span>
              <div className="flex items-center gap-1.5">
                {[16, 32, 64, 128].map(cap => (
                  <button
                    key={cap}
                    onClick={() => setTableCapacity(cap)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                      tableCapacity === cap
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    M={cap}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Hash function: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">FNV1a(SHA-256) mod M</code> with linked-list collision chaining.
            </div>
          </div>

          {/* Bucket Array Grid & Chain Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Bucket Array Visualizer */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Bucket Array ($0 \dots {tableCapacity - 1}$)
                </h3>
                <span className="text-xs text-slate-400">Click a bucket to inspect chain</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-2">
                {bucketDistribution.map((bucket) => {
                  const isSelected = selectedBucketIndex === bucket.index;
                  const count = bucket.items.length;
                  return (
                    <button
                      key={bucket.index}
                      onClick={() => setSelectedBucketIndex(bucket.index)}
                      className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-between h-20 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                          : count === 0
                          ? 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                          : count > 2
                          ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[10px] font-mono text-slate-400">
                        [{bucket.index}]
                      </span>
                      <div className="my-auto">
                        <span className={`text-sm font-mono font-bold ${
                          count > 0 ? (count > 2 ? 'text-amber-700' : 'text-slate-900') : 'text-slate-300'
                        }`}>
                          {count}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            count > 2 ? 'bg-amber-500' : count > 0 ? 'bg-indigo-500' : 'bg-transparent'
                          }`}
                          style={{ width: `${Math.min(100, count * 33)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Bucket Chain Inspector */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    Bucket [{selectedBucketIndex}] Chain
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    Linked list collision items
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
                  {selectedBucketIndex !== null ? bucketDistribution[selectedBucketIndex]?.items.length : 0} nodes
                </span>
              </div>

              <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto max-h-[300px]">
                {selectedBucketIndex !== null && bucketDistribution[selectedBucketIndex]?.items.length > 0 ? (
                  bucketDistribution[selectedBucketIndex].items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-mono text-[10px]">Node #{idx + 1}</span>
                        <span className="font-mono text-[10px] text-indigo-600">
                          Hash: {item.hashPrefix}...
                        </span>
                      </div>
                      <div className="font-mono text-slate-800 break-all font-medium">
                        {item.fileName}
                      </div>
                      {idx < bucketDistribution[selectedBucketIndex!].items.length - 1 && (
                        <div className="pt-1 text-center text-slate-400 font-mono text-[10px]">
                          ↓ .next pointer
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Bucket is empty (0 collisions in this slot).
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIRECTORY MERKLE TREE */}
      {activeTab === 'merkle' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Tree View with Subtree Duplicates */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Hierarchical Content-Addressed Directory Merkle Tree
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Each directory's hash = SHA-256(child_names + child_hashes). Enables O(1) subtree duplicate detection!
                </div>
              </div>
              <div className="text-xs font-mono font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                {duplicateSubtrees.size} Cloned Subtrees Found
              </div>
            </div>

            {/* Subtree duplicate callout */}
            {duplicateSubtrees.size > 0 && (
              <div className="mb-4 p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Subtree Clones Identified via Merkle Root:</span>
                </div>
                {Array.from(duplicateSubtrees.entries()).map(([hash, nodes], idx) => (
                  <div key={idx} className="text-emerald-800 font-mono text-[11px] pl-5">
                    • Identical directory contents: <span className="font-semibold">{nodes.map(n => n.path).join(' ↔ ')}</span> (Root Hash: {hash.slice(0, 12)}...)
                  </div>
                ))}
              </div>
            )}

            {/* Tree Nodes Renderer */}
            <div className="space-y-1 font-mono text-xs max-h-[500px] overflow-y-auto pr-2">
              <MerkleNodeView
                node={merkleTree.root}
                depth={0}
                expandedNodes={expandedNodes}
                onToggle={toggleExpand}
                onSelect={(node) => setSelectedMerkleNode(node)}
                selectedId={selectedMerkleNode?.id}
              />
            </div>
          </div>

          {/* Right: Selected Node Cryptographic Invariant Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Merkle Node Cryptographic Inspector
              </h3>
              <div className="text-xs text-slate-500 mt-0.5">
                Inspect node digest & child rollups
              </div>
            </div>

            {selectedMerkleNode ? (
              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <div className="text-slate-400 text-[11px]">Node Name & Type</div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2 mt-0.5">
                    {selectedMerkleNode.type === 'directory' ? (
                      <Folder className="w-4 h-4 text-amber-500" />
                    ) : (
                      <FileCode className="w-4 h-4 text-slate-500" />
                    )}
                    <span>{selectedMerkleNode.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({selectedMerkleNode.type})
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 text-[11px]">Full Path</div>
                  <div className="font-mono text-slate-800 break-all bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                    {selectedMerkleNode.path}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 text-[11px]">Content / Subtree SHA-256 Digest</div>
                  <div className="font-mono text-indigo-700 break-all bg-indigo-50/50 p-2 rounded border border-indigo-200 mt-1">
                    {selectedMerkleNode.hash}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 text-[11px]">Recursive Subtree Size</div>
                  <div className="font-mono text-slate-800 font-semibold mt-0.5">
                    {formatBytes(selectedMerkleNode.size)}
                  </div>
                </div>

                {selectedMerkleNode.isDuplicateSubtree && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5 text-amber-600" />
                      <span>Cloned Directory Subtree Detected</span>
                    </div>
                    <div className="text-[11px]">
                      This entire folder has identical contents to:
                      <br />
                      <span className="font-mono font-medium">{selectedMerkleNode.duplicateOfPath}</span>
                    </div>
                  </div>
                )}

                {selectedMerkleNode.children && (
                  <div>
                    <div className="text-slate-400 text-[11px] mb-1">
                      Direct Children ({selectedMerkleNode.children.length})
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto bg-slate-50 p-2 rounded border border-slate-200">
                      {selectedMerkleNode.children.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-[11px]">
                          <span className="font-mono truncate">{c.name}</span>
                          <span className="font-mono text-slate-400 text-[10px]">
                            {c.hash.slice(0, 8)}...
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                Select any file or folder from the Merkle Tree to view its bottom-up hash calculation.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BLOOM FILTER VISUALIZER */}
      {activeTab === 'bloom' && (
        <div className="space-y-6">
          {/* Theoretical vs Empirical Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Bit Array Size (m)</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {filterBits} bits
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{filterBits / 8} bytes memory</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Hash Functions (k)</div>
              <div className="text-xl font-bold font-mono text-cyan-600 mt-1">
                {numHashes} independent hashes
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Kirsch-Mitzenmacher</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Elements Stored (n)</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {bloomFilter.elementsCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">File SHA-256 digests</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Theoretical False Positive Rate</div>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {(bloomFilter.getTheoreticalFalsePositiveRate() * 100).toFixed(2)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">P ≈ (1 - e^(-kn/m))^k</div>
            </div>
          </div>

          {/* Interactive Query Sandbox */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Interactive Bloom Filter Membership Query
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Test if a file hash exists in the pre-filter. If any of the $k$ bits is 0, it is 100% guaranteed NOT in the dataset without touching disk or primary index!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Enter file SHA-256 or name to query (e.g. paste from table or test unknown string)..."
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400"
              />
              <button
                onClick={handleTestQuery}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                Execute Query
              </button>
            </div>

            {/* Query Result Box */}
            {queryResult && (
              <div className={`p-4 rounded-lg border text-xs flex items-start gap-3 ${
                queryResult.mightContain
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              }`}>
                {queryResult.mightContain ? (
                  <CheckCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-sm">
                    {queryResult.mightContain ? 'POSSIBLY In Database (True Positive or False Positive)' : 'DEFINITELY NOT In Database (Guaranteed 0 False Negatives)'}
                  </div>
                  <div className="mt-1 font-mono text-[11px]">
                    Evaluated $k$ bit indices: [{queryResult.indices.join(', ')}]
                  </div>
                  <div className="mt-0.5 text-slate-600 text-[11px]">
                    {queryResult.mightContain 
                      ? 'All k bits were 1. Next step: confirm with full Hash Table lookup to eliminate possible false positive.'
                      : 'At least one tested bit was 0. The file is guaranteed absent. Fast negative return in O(k) time!'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 256-Bit Array Visual Grid */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Bit Array ($m = {filterBits}$) Visualizer
              </h3>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  <span className="text-slate-600">Bit Set (1)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 inline-block" />
                  <span className="text-slate-400">Bit Unset (0)</span>
                </span>
                {queryResult && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 ring-2 ring-indigo-400 inline-block" />
                    <span className="text-indigo-700 font-medium">Queried Index</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-8 sm:grid-cols-16 md:grid-cols-32 gap-1.5 p-3 bg-slate-900 rounded-lg">
              {rawBits.map((isSet, idx) => {
                const isQueried = queryResult?.indices.includes(idx);
                return (
                  <div
                    key={idx}
                    title={`Bit #${idx}: ${isSet ? '1 (SET)' : '0 (UNSET)'}`}
                    className={`h-5 rounded-xs flex items-center justify-center font-mono text-[8px] transition-all cursor-pointer ${
                      isQueried
                        ? 'bg-indigo-400 text-white font-bold ring-2 ring-white scale-110 z-10'
                        : isSet
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isSet ? '1' : '0'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Recursive Merkle Node Tree Viewer component.
 */
interface MerkleNodeViewProps {
  node: MerkleNode;
  depth: number;
  expandedNodes: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (node: MerkleNode) => void;
  selectedId?: string;
}

const MerkleNodeView: React.FC<MerkleNodeViewProps> = ({
  node,
  depth,
  expandedNodes,
  onToggle,
  onSelect,
  selectedId,
}) => {
  const isDir = node.type === 'directory';
  const isExpanded = !!expandedNodes[node.id];
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        onClick={() => {
          if (isDir) onToggle(node.id);
          onSelect(node);
        }}
        className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer select-none transition-colors ${
          isSelected
            ? 'bg-indigo-100 text-indigo-900 font-semibold'
            : 'hover:bg-slate-100 text-slate-700'
        }`}
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {isDir ? (
          <span className="w-3.5 h-3.5 text-slate-400">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        ) : (
          <span className="w-3.5 h-3.5" />
        )}

        {isDir ? (
          <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        ) : (
          <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}

        <span className="truncate">{node.name}</span>

        {node.isDuplicateSubtree && (
          <span className="text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.2 rounded ml-2">
            Cloned Subtree
          </span>
        )}

        <span className="text-[10px] text-slate-400 font-mono ml-auto pl-2 truncate">
          {node.hash.slice(0, 10)}...
        </span>
      </div>

      {isDir && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <MerkleNodeView
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
