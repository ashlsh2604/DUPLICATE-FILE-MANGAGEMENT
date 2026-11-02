/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { VirtualFile, MerkleNode, DuplicateGroup } from '../types/dedup';
import {
  DedupStack,
  DedupQueue,
  DoublyLinkedList,
  HashBinarySearchTree,
  DirectoryMerkleTree,
  DedupHashTable,
  DedupBloomFilter,
  TraversalStep,
} from '../utils/dataStructures';
import { formatBytes } from '../utils/crypto';
import {
  Folder,
  FileCode,
  Network,
  Binary,
  Layers,
  ChevronRight,
  ChevronDown,
  Sliders,
  CheckCircle,
  XCircle,
  Copy,
  Plus,
  Minus,
  RotateCcw,
  Play,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  StepForward,
  Cpu,
  Trash2,
  Undo2,
  GitCommit,
  Sparkles,
} from 'lucide-react';

interface DataStructureLabProps {
  files: VirtualFile[];
  duplicateGroups: DuplicateGroup[];
}

export const DataStructureLab: React.FC<DataStructureLabProps> = ({
  files,
  duplicateGroups,
}) => {
  const [activeTab, setActiveTab] = useState<'stack' | 'queue' | 'tree' | 'linkedlist' | 'hashtable' | 'bloom'>('tree');

  // =========================================================================
  // 1. STACK STATE (LIFO)
  // =========================================================================
  const [customStackInput, setCustomStackInput] = useState('/packages/frontend/src/components');
  const [stackItems, setStackItems] = useState<string[]>([
    '/root',
    '/root/packages',
    '/root/packages/frontend',
    '/root/packages/frontend/src',
  ]);
  const [lastPoppedStack, setLastPoppedStack] = useState<string | null>(null);

  // Undo Stack Simulation
  const [undoHistory, setUndoHistory] = useState<Array<{ id: string; action: string; file: string; timestamp: string }>>([
    { id: 'u1', action: 'Delete Duplicate', file: '/dist_backup/bundle.js (2.4 MB)', timestamp: '10:14:02' },
    { id: 'u2', action: 'Symlink Clone', file: '/marketing/assets/logo.svg -> /public/logo.svg', timestamp: '10:14:15' },
    { id: 'u3', action: 'Delete Duplicate', file: '/packages/admin/node_modules/lodash/lodash.js (544 KB)', timestamp: '10:14:28' },
  ]);

  const handlePushStack = () => {
    if (!customStackInput.trim()) return;
    setStackItems(prev => [customStackInput.trim(), ...prev]);
    setCustomStackInput('');
    setLastPoppedStack(null);
  };

  const handlePopStack = () => {
    if (stackItems.length === 0) return;
    const popped = stackItems[0];
    setStackItems(prev => prev.slice(1));
    setLastPoppedStack(popped);
  };

  const handleUndoPop = () => {
    if (undoHistory.length === 0) return;
    setUndoHistory(prev => prev.slice(0, prev.length - 1));
  };

  const handleAddUndoAction = (action: string, file: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setUndoHistory(prev => [...prev, { id: `u_${Date.now()}`, action, file, timestamp: timeStr }]);
  };

  // =========================================================================
  // 2. QUEUE STATE (FIFO)
  // =========================================================================
  const [customQueueInput, setCustomQueueInput] = useState('/media/raw/photo_0412.nef');
  const [queueItems, setQueueItems] = useState<string[]>([
    '/documents/fy26_audit_report.pdf',
    '/packages/backend/data/dump.json',
    '/backups/archive_v1.zip',
    '/dist/main.bundle.js',
  ]);
  const [lastDequeued, setLastDequeued] = useState<string | null>(null);

  const handleEnqueue = () => {
    if (!customQueueInput.trim()) return;
    setQueueItems(prev => [...prev, customQueueInput.trim()]);
    setCustomQueueInput('');
    setLastDequeued(null);
  };

  const handleDequeue = () => {
    if (queueItems.length === 0) return;
    const dequeued = queueItems[0];
    setQueueItems(prev => prev.slice(1));
    setLastDequeued(dequeued);
  };

  // =========================================================================
  // 3. TREE STATE (MERKLE + BST + TRAVERSALS)
  // =========================================================================
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ root: true });
  const [selectedMerkleNode, setSelectedMerkleNode] = useState<MerkleNode | null>(null);
  const [treeTraversalMode, setTreeTraversalMode] = useState<'dfs' | 'bfs'>('dfs');
  const [traversalStepIdx, setTraversalStepIdx] = useState<number>(0);
  const [isAutoPlayingTraversal, setIsAutoPlayingTraversal] = useState<boolean>(false);
  const [bstSearchHash, setBstSearchHash] = useState<string>('');
  const [bstSearchResult, setBstSearchResult] = useState<VirtualFile[] | null | 'not_found'>(null);

  const { merkleTree, duplicateSubtrees, dfsSteps, bfsSteps, bst } = useMemo(() => {
    const tree = new DirectoryMerkleTree();
    const treeBst = new HashBinarySearchTree();

    files.forEach(f => {
      tree.insertFile(f);
      treeBst.insert(f);
    });

    tree.computeMerkleHashes();
    const dups = tree.findDuplicateSubtrees();
    const dfs = tree.traverseDFSWithStack();
    const bfs = tree.traverseBFSWithQueue();

    return {
      merkleTree: tree,
      duplicateSubtrees: dups,
      dfsSteps: dfs,
      bfsSteps: bfs,
      bst: treeBst,
    };
  }, [files]);

  const activeSteps = treeTraversalMode === 'dfs' ? dfsSteps : bfsSteps;
  const currentStep = activeSteps[traversalStepIdx] || activeSteps[0];

  const handleSearchBST = () => {
    if (!bstSearchHash.trim()) return;
    const res = bst.search(bstSearchHash.trim());
    setBstSearchResult(res ? res : 'not_found');
  };

  // Auto-play traversal
  React.useEffect(() => {
    let timer: any;
    if (isAutoPlayingTraversal) {
      timer = setInterval(() => {
        setTraversalStepIdx(prev => {
          if (prev >= activeSteps.length - 1) {
            setIsAutoPlayingTraversal(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    }
    return () => clearInterval(timer);
  }, [isAutoPlayingTraversal, activeSteps.length]);

  // =========================================================================
  // 4. LINKED LIST STATE (SINGLY & DOUBLY)
  // =========================================================================
  const [selectedClusterIndex, setSelectedClusterIndex] = useState<number>(0);

  // Build interactive Doubly-Linked List from duplicate groups
  const sampleClusterFiles = duplicateGroups.length > 0 && duplicateGroups[selectedClusterIndex]
    ? duplicateGroups[selectedClusterIndex].files
    : files.slice(0, 4);

  const [clusterListItems, setClusterListItems] = useState<Array<{ id: string; path: string; isOriginal: boolean }>>(() => {
    return sampleClusterFiles.map(f => ({
      id: f.id,
      path: f.path,
      isOriginal: !!f.isOriginal,
    }));
  });

  const handlePromoteToHead = (id: string) => {
    setClusterListItems(prev => {
      const target = prev.find(item => item.id === id);
      if (!target) return prev;
      const filtered = prev.filter(item => item.id !== id);
      return [{ ...target, isOriginal: true }, ...filtered.map(item => ({ ...item, isOriginal: false }))];
    });
  };

  const handleRemoveListNode = (id: string) => {
    setClusterListItems(prev => prev.filter(item => item.id !== id));
  };

  // =========================================================================
  // 5. HASH TABLE STATE
  // =========================================================================
  const [tableCapacity, setTableCapacity] = useState<number>(32);
  const [selectedBucketIndex, setSelectedBucketIndex] = useState<number | null>(0);

  const { bucketDistribution, htMetrics } = useMemo(() => {
    const ht = new DedupHashTable<string, VirtualFile>(tableCapacity);
    files.forEach(f => {
      const key = f.fullHash || f.path;
      ht.set(key, f);
    });
    return {
      bucketDistribution: ht.getBucketDistribution(),
      htMetrics: ht.getMetrics(),
    };
  }, [files, tableCapacity]);

  // =========================================================================
  // 6. BLOOM FILTER STATE
  // =========================================================================
  const [filterBits] = useState<number>(256);
  const [numHashes] = useState<number>(3);
  const [queryInput, setQueryInput] = useState<string>('');
  const [queryResult, setQueryResult] = useState<{
    tested: boolean;
    mightContain: boolean;
    indices: number[];
  } | null>(null);

  const bloomFilter = useMemo(() => {
    const bf = new DedupBloomFilter(filterBits, numHashes);
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
    setQueryResult({ tested: true, mightContain, indices });
  };

  return (
    <div className="space-y-6">
      {/* Top Selector Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Interactive Computer Science Data Structure Laboratory
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span>Core Data Structures</span>
            <span aria-hidden="true">·</span>
            <span>Stack (LIFO)</span>
            <span aria-hidden="true">·</span>
            <span>Queue (FIFO)</span>
            <span aria-hidden="true">·</span>
            <span>Tree (Merkle & BST)</span>
            <span aria-hidden="true">·</span>
            <span>Linked List</span>
          </div>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'tree' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tree</span>
          </button>

          <button
            onClick={() => setActiveTab('stack')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'stack' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Stack (LIFO)</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'queue' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
            <span>Queue (FIFO)</span>
          </button>

          <button
            onClick={() => setActiveTab('linkedlist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'linkedlist' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5 text-cyan-600" />
            <span>Linked List</span>
          </button>

          <button
            onClick={() => setActiveTab('hashtable')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'hashtable' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-purple-600" />
            <span>Hash Table</span>
          </button>

          <button
            onClick={() => setActiveTab('bloom')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'bloom' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Binary className="w-3.5 h-3.5 text-rose-600" />
            <span>Bloom Filter</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. STACK TAB (LIFO - LAST IN, FIRST OUT)                            */}
      {/* =================================================================== */}
      {activeTab === 'stack' && (
        <div className="space-y-6">
          {/* Theory & Role Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                  Data Structure: Stack (LIFO)
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Stack Role in Duplicate File Detection
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  In systems programming and deduplication engines, the <strong>Stack ($O(1)$ push / pop)</strong> is vital for:
                  <br />
                  1. <strong>Non-Recursive Depth-First Traversal (DFS)</strong>: Avoids operating system C call-stack overflow when scanning nested directories millions of levels deep.
                  <br />
                  2. <strong>Undo/Redo File Resolution Actions</strong>: Recording each file deletion or symlink operation so administrators can safely revert actions in reverse order.
                </p>
              </div>
              <div className="bg-indigo-950 border border-indigo-800/80 p-3 rounded-lg text-right hidden sm:block shrink-0">
                <div className="text-[11px] text-indigo-300">Active Stack Height</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{stackItems.length} frames</div>
                <div className="text-[10px] text-indigo-400">Time: O(1) Push / Pop</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interactive Stack Visualizer */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Interactive Stack Frame Explorer
                  </h4>
                  <p className="text-xs text-slate-500">Push & pop items to visualize the $LIFO$ stack boundary.</p>
                </div>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded">
                  Top: {stackItems.length > 0 ? 'Frame #1' : 'Empty'}
                </span>
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter path to push on stack..."
                  value={customStackInput}
                  onChange={(e) => setCustomStackInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
                <button
                  onClick={handlePushStack}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Push (O(1))</span>
                </button>
                <button
                  onClick={handlePopStack}
                  disabled={stackItems.length === 0}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Pop (O(1))</span>
                </button>
              </div>

              {lastPoppedStack && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                  <span>Popped from Top: <code className="font-mono font-bold">{lastPoppedStack}</code></span>
                  <span className="text-[10px] text-amber-700 font-mono">LIFO Popped</span>
                </div>
              )}

              {/* Visual Stack Tower */}
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-col">
                {stackItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Stack is completely empty (Underflow on pop).
                  </div>
                ) : (
                  stackItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border font-mono text-xs flex items-center justify-between transition-all ${
                        idx === 0
                          ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-400/30'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {idx === 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] uppercase font-bold shrink-0">
                            TOP (SP)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] w-6 shrink-0 font-normal">
                            #{stackItems.length - idx}
                          </span>
                        )}
                        <span className="truncate">{item}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 pl-2">
                        {idx === 0 ? '← Next to Pop' : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Application: Deduplication Resolution Undo-Redo Stack */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Application: Resolution Action History (Undo Stack)
                  </h4>
                  <p className="text-xs text-slate-500">Each filesystem cleanup action is pushed onto the $LIFO$ undo stack.</p>
                </div>
                <button
                  onClick={handleUndoPop}
                  disabled={undoHistory.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-40 transition-colors shadow-2xs"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Undo Last (Pop)</span>
                </button>
              </div>

              {/* Sample Actions to Push */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-600">Simulate Resolution Operations:</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => handleAddUndoAction('Deleted Duplicate', '/packages/admin/public/logo.svg')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    + Delete Duplicate Logo
                  </button>
                  <button
                    onClick={() => handleAddUndoAction('Created Symlink', '/build/dist/app.js -> /src/app.js')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    + Symlink App Bundle
                  </button>
                  <button
                    onClick={() => handleAddUndoAction('Quarantined', '/downloads/invoice_dup.pdf')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    + Quarantine Invoice
                  </button>
                </div>
              </div>

              {/* Undo Stack Visualizer */}
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[260px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                {undoHistory.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No actions in undo stack. Clean state.
                  </div>
                ) : (
                  [...undoHistory].reverse().map((action, idx) => (
                    <div
                      key={action.id}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                        idx === 0
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] uppercase font-bold">
                              TOP
                            </span>
                          )}
                          <span className="font-semibold">{action.action}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{action.timestamp}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-600 mt-0.5 break-all">
                          {action.file}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {idx === 0 ? 'Undo Target' : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. QUEUE TAB (FIFO - FIRST IN, FIRST OUT)                           */}
      {/* =================================================================== */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Theory Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Data Structure: Queue (FIFO)
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Queue Role in Duplicate File Detection
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  The <strong>Queue ($O(1)$ enqueue / dequeue)</strong> governs:
                  <br />
                  1. <strong>Breadth-First Search (BFS) Directory Scanning</strong>: Processes folders layer-by-layer (Level 0, Level 1, Level 2), finding shallow top-level duplicates first.
                  <br />
                  2. <strong>Hashing Pipeline Job Queue</strong>: Streaming candidate files through multi-tier workers (Tier 0 Size Queue $\to$ Tier 1 Partial Hash Queue $\to$ Tier 2 SHA-256 Worker Queue) without memory starvation.
                </p>
              </div>
              <div className="bg-amber-950 border border-amber-800/80 p-3 rounded-lg text-right hidden sm:block shrink-0">
                <div className="text-[11px] text-amber-300">Active Queue Length</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{queueItems.length} items</div>
                <div className="text-[10px] text-amber-400">Head (Front) to Tail (Rear)</div>
              </div>
            </div>
          </div>

          {/* Interactive Queue Workbench */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Interactive Pipeline Queue Simulator (FIFO)
                </h4>
                <p className="text-xs text-slate-500">Enqueue items at the Rear (Tail) and dequeue items at the Front (Head).</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold">
                  Size: {queueItems.length}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter file path to enqueue..."
                value={customQueueInput}
                onChange={(e) => setCustomQueueInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-amber-500"
              />
              <button
                onClick={handleEnqueue}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enqueue (Tail)</span>
              </button>
              <button
                onClick={handleDequeue}
                disabled={queueItems.length === 0}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Dequeue (Head)</span>
              </button>
            </div>

            {lastDequeued && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
                <span>Dequeued from Head: <code className="font-mono font-bold">{lastDequeued}</code></span>
                <span className="text-[10px] text-emerald-700 font-mono">Sent to SHA-256 Worker</span>
              </div>
            )}

            {/* Horizontal Queue Track */}
            <div className="p-4 bg-slate-900 rounded-xl overflow-x-auto">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <ArrowLeft className="w-3.5 h-3.5" /> HEAD (Exit / Dequeue)
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  TAIL (Entry / Enqueue) <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="flex items-center gap-3 min-w-max py-2">
                {queueItems.length === 0 ? (
                  <div className="w-full text-center py-6 text-slate-500 text-xs">
                    Queue is empty. Enqueue candidate files to observe FIFO pipeline streaming.
                  </div>
                ) : (
                  queueItems.map((item, idx) => (
                    <React.Fragment key={idx}>
                      <div
                        className={`p-3 rounded-lg border font-mono text-xs w-56 shrink-0 transition-all ${
                          idx === 0
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/20 shadow-md'
                            : idx === queueItems.length - 1
                            ? 'bg-amber-950 border-amber-500 text-amber-200 ring-2 ring-amber-500/20 shadow-md'
                            : 'bg-slate-800 border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold">
                            {idx === 0 ? '● FRONT (HEAD)' : idx === queueItems.length - 1 ? '▲ REAR (TAIL)' : `Slot #${idx + 1}`}
                          </span>
                          <span className="text-[9px] text-slate-400">FIFO</span>
                        </div>
                        <div className="truncate font-semibold">{item.split('/').pop()}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{item}</div>
                      </div>
                      {idx < queueItems.length - 1 && (
                        <ArrowLeft className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                    </React.Fragment>
                  ))
                )}
              </div>
            </div>

            {/* Pipeline Stage Architecture Diagram */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-xs font-semibold text-slate-800 mb-2">
                Real-Time 3-Tier Queue Flow Diagram:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded border border-slate-200">
                  <div className="font-bold text-slate-700">Tier 0 Size Queue</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Enqueues files as directory reader discovers them. Grouped into size buckets in $O(1)$ time.
                  </div>
                </div>
                <div className="p-3 bg-white rounded border border-slate-200">
                  <div className="font-bold text-cyan-700">Tier 1 Partial Hash Queue</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Dequeues candidates sharing exact file sizes and feeds them into sparse 4KB sample hashers.
                  </div>
                </div>
                <div className="p-3 bg-white rounded border border-slate-200">
                  <div className="font-bold text-emerald-700">Tier 2 Cryptographic Queue</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Final queue dispatched to multi-core Web Crypto / C SHA-256 workers to confirm duplicates.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. TREE TAB (MERKLE TREE + BST + TRAVERSAL COMPARATOR)              */}
      {/* =================================================================== */}
      {activeTab === 'tree' && (
        <div className="space-y-6">
          {/* Merkle + BST Theory Header */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Data Structure: Tree (Hierarchical Merkle & Binary Search Tree)
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Tree Traversals & Cryptographic Subtree Invariants
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  1. <strong>Directory Merkle Tree</strong>: Every directory's hash is computed recursively from its children hashes: Hash(D) = SHA256(child_name + child_hash). Entire duplicate directories are detected in O(1)!
                  <br />
                  2. <strong>Stack vs Queue Traversal</strong>: Watch DFS (powered by Stack) vs BFS (powered by Queue) walk the tree in real time.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded text-xs font-mono font-semibold">
                  BST Height: {bst.getHeight()}
                </span>
                <span className="px-2.5 py-1 bg-slate-800 text-slate-200 rounded text-xs font-mono">
                  {duplicateSubtrees.size} Cloned Subtrees
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Traversal Player (Stack DFS vs Queue BFS) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Interactive Traversal Simulator: Stack (DFS) vs Queue (BFS)
                </h4>
                <p className="text-xs text-slate-500">
                  Observe how a <strong>Stack</strong> guides Depth-First Search and a <strong>Queue</strong> guides Breadth-First Search.
                </p>
              </div>

              {/* Mode & Step Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
                  <button
                    onClick={() => { setTreeTraversalMode('dfs'); setTraversalStepIdx(0); }}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      treeTraversalMode === 'dfs' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                    }`}
                  >
                    DFS (Stack LIFO)
                  </button>
                  <button
                    onClick={() => { setTreeTraversalMode('bfs'); setTraversalStepIdx(0); }}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      treeTraversalMode === 'bfs' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                    }`}
                  >
                    BFS (Queue FIFO)
                  </button>
                </div>

                <button
                  onClick={() => setIsAutoPlayingTraversal(!isAutoPlayingTraversal)}
                  className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                  <span>{isAutoPlayingTraversal ? 'Pause' : 'Auto Play'}</span>
                </button>

                <button
                  onClick={() => setTraversalStepIdx(prev => Math.min(activeSteps.length - 1, prev + 1))}
                  disabled={traversalStepIdx >= activeSteps.length - 1}
                  className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 rounded disabled:opacity-40"
                  title="Step Forward"
                >
                  <StepForward className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setTraversalStepIdx(0)}
                  className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 rounded"
                  title="Reset Traversal"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Traversal State Card */}
            {currentStep && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] text-slate-400">Current Visited Node (Step #{currentStep.step} / {activeSteps.length})</div>
                  <div className="font-bold text-slate-900 font-mono text-sm mt-0.5 flex items-center gap-1.5">
                    {currentStep.type === 'directory' ? <Folder className="w-4 h-4 text-amber-500" /> : <FileCode className="w-4 h-4 text-slate-500" />}
                    <span>{currentStep.nodeName}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{currentStep.nodePath}</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] text-slate-400">
                    {treeTraversalMode === 'dfs' ? 'Active LIFO Stack Frames' : 'Active FIFO Queue Contents'}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentStep.dataStructureState.length === 0 ? (
                      <span className="text-slate-400 italic">Empty</span>
                    ) : (
                      currentStep.dataStructureState.slice(0, 5).map((name, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-700">
                          {name}
                        </span>
                      ))
                    )}
                    {currentStep.dataStructureState.length > 5 && (
                      <span className="text-[10px] text-slate-400 font-mono">+{currentStep.dataStructureState.length - 5} more</span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] text-slate-400">Merkle SHA-256 Digest</div>
                  <div className="font-mono text-indigo-700 font-semibold mt-1">
                    {currentStep.hash}...
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Tree Depth: {currentStep.depth}</div>
                </div>
              </div>
            )}
          </div>

          {/* Directory Merkle Tree Nodes & Subtrees */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Directory Merkle Tree Hierarchy
                  </h4>
                  <p className="text-xs text-slate-500">Click any node to inspect its bottom-up cryptographic rollup.</p>
                </div>
                <div className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                  {duplicateSubtrees.size} Cloned Directories Found
                </div>
              </div>

              <div className="space-y-1 font-mono text-xs max-h-[460px] overflow-y-auto pr-2">
                <MerkleNodeView
                  node={merkleTree.root}
                  depth={0}
                  expandedNodes={expandedNodes}
                  onToggle={(id) => setExpandedNodes(p => ({ ...p, [id]: !p[id] }))}
                  onSelect={(node) => setSelectedMerkleNode(node)}
                  selectedId={selectedMerkleNode?.id || currentStep?.nodeId}
                />
              </div>
            </div>

            {/* Right: Merkle Cryptographic Inspector & BST Search */}
            <div className="space-y-6">
              {/* Selected Node Invariant */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col">
                <div className="pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Merkle Node Invariant
                  </h4>
                  <div className="text-xs text-slate-500 mt-0.5">Bottom-up hash computation</div>
                </div>

                {selectedMerkleNode ? (
                  <div className="mt-4 space-y-3 text-xs">
                    <div>
                      <div className="text-slate-400 text-[11px]">Node Name</div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                        {selectedMerkleNode.type === 'directory' ? <Folder className="w-4 h-4 text-amber-500" /> : <FileCode className="w-4 h-4 text-slate-500" />}
                        <span>{selectedMerkleNode.name}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-400 text-[11px]">Path</div>
                      <div className="font-mono text-slate-800 break-all bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                        {selectedMerkleNode.path}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-400 text-[11px]">Merkle SHA-256 Digest</div>
                      <div className="font-mono text-indigo-700 break-all bg-indigo-50/50 p-2 rounded border border-indigo-200 mt-1 font-semibold">
                        {selectedMerkleNode.hash}
                      </div>
                    </div>

                    {selectedMerkleNode.isDuplicateSubtree && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                        <div className="font-bold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Identical Subtree Detected</span>
                        </div>
                        <div className="text-[11px] mt-1">
                          Cloned directory matching: <br />
                          <span className="font-mono font-medium">{selectedMerkleNode.duplicateOfPath}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Select any file or folder from the tree to view its recursive cryptographic rollup.
                  </div>
                )}
              </div>

              {/* Binary Search Tree (BST) Hash Query */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Hash Binary Search Tree (BST) Query
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 mb-3">
                  Binary search over SHA-256 digests in $O(\log N)$ time.
                </p>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter SHA-256 or prefix to search..."
                      value={bstSearchHash}
                      onChange={(e) => setBstSearchHash(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                    />
                    <button
                      onClick={handleSearchBST}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      BST Search
                    </button>
                  </div>

                  {bstSearchResult && (
                    <div className="p-3 rounded-lg border text-xs">
                      {bstSearchResult === 'not_found' ? (
                        <div className="text-rose-600 font-semibold">Hash not found in BST ($O(\log N)$ search completed).</div>
                      ) : (
                        <div className="text-emerald-800 space-y-1">
                          <div className="font-bold">Match Found in BST: {bstSearchResult.length} file(s)</div>
                          {bstSearchResult.map(f => (
                            <div key={f.id} className="font-mono text-[11px] truncate">
                              • {f.path} ({formatBytes(f.size)})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. LINKED LIST TAB (SINGLY & DOUBLY LINKED LISTS)                   */}
      {/* =================================================================== */}
      {activeTab === 'linkedlist' && (
        <div className="space-y-6">
          {/* Linked List Theory Header */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Data Structure: Linked List (Singly & Doubly Linked)
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Linked Lists in Hash Tables and Duplicate Clusters
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  1. <strong>Singly-Linked List</strong>: Resolves hash collisions in hash tables via <strong>Separate Chaining</strong> (`head -&gt; node1 -&gt; node2 -&gt; NULL`).
                  <br />
                  2. <strong>Doubly-Linked List</strong>: Models duplicate file groups with bidirectional pointers (`prev &lt;-&gt; next`). Allows instant $O(1)$ removal of safe files without re-indexing!
                </p>
              </div>
              <div className="bg-cyan-950 border border-cyan-800/80 p-3 rounded-lg text-right hidden sm:block shrink-0">
                <div className="text-[11px] text-cyan-300">Cluster Node Count</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{clusterListItems.length} nodes</div>
                <div className="text-[10px] text-cyan-400">O(1) Node Insertion & Removal</div>
              </div>
            </div>
          </div>

          {/* Interactive Doubly-Linked Duplicate Cluster Visualizer */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Duplicate File Cluster: Doubly-Linked List Explorer
                </h4>
                <p className="text-xs text-slate-500">
                  Each duplicate file cluster forms a doubly-linked chain. Click <strong>"Promote to Head"</strong> or <strong>"Remove"</strong> to witness $O(1)$ pointer relinking.
                </p>
              </div>

              {duplicateGroups.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Select Group:</span>
                  <select
                    value={selectedClusterIndex}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setSelectedClusterIndex(idx);
                      if (duplicateGroups[idx]) {
                        setClusterListItems(duplicateGroups[idx].files.map(f => ({
                          id: f.id,
                          path: f.path,
                          isOriginal: !!f.isOriginal,
                        })));
                      }
                    }}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded font-mono font-medium"
                  >
                    {duplicateGroups.map((g, i) => (
                      <option key={g.id} value={i}>Group #{i + 1} ({g.files.length} files)</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Visual Node Chain */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto">
              <div className="flex items-center gap-4 min-w-max py-2">
                {clusterListItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs w-full">
                    All duplicate files in this cluster have been removed. Cluster resolved!
                  </div>
                ) : (
                  clusterListItems.map((node, idx) => (
                    <React.Fragment key={node.id}>
                      <div
                        className={`p-4 rounded-xl border font-mono text-xs w-64 shrink-0 transition-all ${
                          node.isOriginal
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            node.isOriginal ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {node.isOriginal ? 'HEAD (ORIGINAL)' : `NODE #${idx + 1}`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {idx === 0 ? 'head' : idx === clusterListItems.length - 1 ? 'tail' : ''}
                          </span>
                        </div>

                        <div className="font-semibold truncate mb-1" title={node.path}>
                          {node.path.split('/').pop()}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mb-3" title={node.path}>
                          {node.path}
                        </div>

                        {/* Node Actions */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                          {!node.isOriginal && (
                            <button
                              onClick={() => handlePromoteToHead(node.id)}
                              className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] font-bold transition-colors"
                            >
                              Make Head
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveListNode(node.id)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-bold transition-colors ml-auto flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>

                      {idx < clusterListItems.length - 1 && (
                        <div className="flex flex-col items-center justify-center shrink-0 text-slate-400 font-mono text-[10px]">
                          <span className="flex items-center gap-1 font-bold text-cyan-600">
                            &lt;-- prev / next --&gt;
                          </span>
                        </div>
                      )}
                    </React.Fragment>
                  ))
                )}
              </div>
            </div>

            {/* Separate Chaining Explanation */}
            <div className="p-4 bg-white border border-slate-200 rounded-lg text-xs space-y-2">
              <div className="font-semibold text-slate-800">
                Singly-Linked List in Hash Table Separate Chaining:
              </div>
              <p className="text-slate-600 leading-relaxed">
                When two different file SHA-256 hashes collide on the same bucket index (h = hash mod M), they form a singly-linked list. Inserting a new collision is O(1) by prepending to the bucket's head pointer:
                <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800 ml-1">
                  new_node-&gt;next = bucket[h]; bucket[h] = new_node;
                </code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. HASH TABLE TAB                                                   */}
      {/* =================================================================== */}
      {activeTab === 'hashtable' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Table Capacity (M)</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{htMetrics.capacity}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Bucket array length</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Elements Stored (N)</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{htMetrics.size}</div>
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
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{htMetrics.maxChainLength}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Deepest collision chain</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
              <div className="text-xs text-slate-500">Empty Buckets</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{htMetrics.emptyBuckets}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Unused slots</div>
            </div>
          </div>

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
                      tableCapacity === cap ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      <span className="text-[10px] font-mono text-slate-400">[{bucket.index}]</span>
                      <div className="my-auto">
                        <span className={`text-sm font-mono font-bold ${
                          count > 0 ? (count > 2 ? 'text-amber-700' : 'text-slate-900') : 'text-slate-300'
                        }`}>
                          {count}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${count > 2 ? 'bg-amber-500' : count > 0 ? 'bg-indigo-500' : 'bg-transparent'}`}
                          style={{ width: `${Math.min(100, count * 33)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    Bucket [{selectedBucketIndex}] Chain
                  </h3>
                  <div className="text-[11px] text-slate-400">Linked list collision items</div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
                  {selectedBucketIndex !== null ? bucketDistribution[selectedBucketIndex]?.items.length : 0} nodes
                </span>
              </div>

              <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto max-h-[300px]">
                {selectedBucketIndex !== null && bucketDistribution[selectedBucketIndex]?.items.length > 0 ? (
                  bucketDistribution[selectedBucketIndex].items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-mono text-[10px]">Node #{idx + 1}</span>
                        <span className="font-mono text-[10px] text-indigo-600">Hash: {item.hashPrefix}...</span>
                      </div>
                      <div className="font-mono text-slate-800 break-all font-medium">{item.fileName}</div>
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

      {/* =================================================================== */}
      {/* 6. BLOOM FILTER TAB                                                 */}
      {/* =================================================================== */}
      {activeTab === 'bloom' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Bit Array Size (m)</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{filterBits} bits</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{filterBits / 8} bytes memory</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Hash Functions (k)</div>
              <div className="text-xl font-bold font-mono text-cyan-600 mt-1">{numHashes} independent hashes</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Kirsch-Mitzenmacher</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Elements Stored (n)</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{bloomFilter.elementsCount}</div>
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

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Interactive Bloom Filter Membership Query
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Test if a file hash exists in the pre-filter. If any of the $k$ bits is 0, it is 100% guaranteed NOT in the dataset!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Enter file SHA-256 or name to query..."
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
                    {queryResult.mightContain ? 'POSSIBLY In Database' : 'DEFINITELY NOT In Database (Guaranteed 0 False Negatives)'}
                  </div>
                  <div className="mt-1 font-mono text-[11px]">
                    Evaluated $k$ bit indices: [{queryResult.indices.join(', ')}]
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Bit Array ($m = {filterBits}$) Visualizer
              </h3>
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
