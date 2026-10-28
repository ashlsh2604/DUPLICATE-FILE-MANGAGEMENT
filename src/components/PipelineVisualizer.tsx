/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VirtualFile, DuplicateGroup, PipelineStats, PipelineStage, DatasetPreset } from '../types/dedup';
import { formatBytes } from '../utils/crypto';
import {
  Play,
  RotateCcw,
  StepForward,
  CheckCircle2,
  Filter,
  FileCode,
  HardDrive,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  Sparkles,
} from 'lucide-react';

interface PipelineVisualizerProps {
  files: VirtualFile[];
  duplicateGroups: DuplicateGroup[];
  stats: PipelineStats;
  currentStage: PipelineStage;
  isProcessing: boolean;
  selectedPreset: DatasetPreset;
  onSelectPreset: (preset: DatasetPreset) => void;
  onRunFullPipeline: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onViewDuplicates: () => void;
  onGenerateCustom: (count: number, dupPct: number) => void;
}

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({
  files,
  duplicateGroups,
  stats,
  currentStage,
  isProcessing,
  selectedPreset,
  onSelectPreset,
  onRunFullPipeline,
  onStepForward,
  onReset,
  onViewDuplicates,
  onGenerateCustom,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'candidates' | 'duplicates' | 'pruned'>('all');
  const [customCount, setCustomCount] = useState(250);
  const [customDupPct, setCustomDupPct] = useState(30);

  // Filter files for the inspection grid
  const filteredFiles = files.filter(f => {
    const matchesSearch = f.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'duplicates') return !!f.duplicateGroupId;
    if (filterType === 'candidates') return !!f.sizeBucketKey && !f.duplicateGroupId;
    if (filterType === 'pruned') return !f.sizeBucketKey && currentStage !== 'idle';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Workspace Control Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Preset Selector */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Filesystem Dataset Preset
            </div>
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => onSelectPreset('monorepo')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedPreset === 'monorepo'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monorepo & Node Modules
              </button>
              <button
                onClick={() => onSelectPreset('photographer')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedPreset === 'photographer'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Photographer RAWs (45MP)
              </button>
              <button
                onClick={() => onSelectPreset('office')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedPreset === 'office'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Office Downloads & PDFs
              </button>
              <button
                onClick={() => onSelectPreset('synthetic')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedPreset === 'synthetic'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Synthetic Generator
              </button>
            </div>
          </div>

          {/* Execution Controls */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onStepForward}
              disabled={isProcessing || currentStage === 'completed'}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-2xs whitespace-nowrap"
              title="Execute next hashing tier step-by-step"
            >
              <StepForward className="w-3.5 h-3.5 text-slate-600" />
              <span>Step Next Tier</span>
            </button>

            <button
              onClick={onRunFullPipeline}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
              <span>{currentStage === 'completed' ? 'Re-run Deduplication' : 'Run Full Pipeline'}</span>
            </button>

            <button
              onClick={onReset}
              disabled={isProcessing || currentStage === 'idle'}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
              title="Reset pipeline"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom Synthetic Sliders (if selected) */}
        {selectedPreset === 'synthetic' && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
                File Count: <span className="font-mono font-semibold text-slate-900">{customCount}</span>
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={customCount}
                onChange={(e) => setCustomCount(Number(e.target.value))}
                className="w-32 accent-slate-900"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
                Duplicate Ratio: <span className="font-mono font-semibold text-slate-900">{customDupPct}%</span>
              </label>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={customDupPct}
                onChange={(e) => setCustomDupPct(Number(e.target.value))}
                className="w-32 accent-slate-900"
              />
            </div>

            <button
              onClick={() => onGenerateCustom(customCount, customDupPct)}
              className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Generate New Dataset
            </button>
          </div>
        )}
      </div>

      {/* 4-Tier Interactive Funnel Pipeline */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Multi-Tiered Content-Addressed Hashing Pipeline
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span>Tiered Pruning Architecture</span>
              <span aria-hidden="true">·</span>
              <span>Linear Time $O(N)$ Best-Case</span>
              <span aria-hidden="true">·</span>
              <span>Zero Hash Collision Risk</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Current Phase</div>
            <div className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider mt-0.5">
              {currentStage === 'idle' && 'Idle (Awaiting Scan)'}
              {currentStage === 'size_bucketing' && 'Tier 0: Size Bucketing'}
              {currentStage === 'partial_hashing' && 'Tier 1: Sparse Sample Hashing'}
              {currentStage === 'full_crypto_hash' && 'Tier 2: SHA-256 Cryptographic Hash'}
              {currentStage === 'completed' && 'Execution Complete'}
            </div>
          </div>
        </div>

        {/* Pipeline Stage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mt-6">
          {/* Stage 0: Initial Ingestion */}
          <div className={`p-4 rounded-lg border transition-all ${
            currentStage === 'idle' 
              ? 'bg-slate-800/80 border-slate-700' 
              : 'bg-slate-800/40 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Stage 0</span>
              <HardDrive className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-sm font-semibold text-white mt-1">Raw Directory Ingest</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-white mt-2">
              {stats.totalFiles}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {formatBytes(stats.totalSizeBytes)} across tree
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
              Recursive path traversal via Trie
            </div>
          </div>

          {/* Stage 1: Tier 0 Size Bucketing */}
          <div className={`p-4 rounded-lg border transition-all ${
            currentStage === 'size_bucketing'
              ? 'bg-slate-800/90 border-emerald-500 shadow-sm'
              : currentStage === 'partial_hashing' || currentStage === 'full_crypto_hash' || currentStage === 'completed'
              ? 'bg-slate-800/40 border-slate-700'
              : 'bg-slate-800/20 border-slate-800/60 opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400">Tier 0 Filter</span>
              <Filter className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-semibold text-white mt-1">File Size Hash Map</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-2">
              -{stats.sizeFilteredOut}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Unique sizes pruned ($0$ bytes read)
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
              Surviving: <span className="font-mono text-slate-200">{stats.totalFiles - stats.sizeFilteredOut}</span> candidates
            </div>
          </div>

          {/* Stage 2: Tier 1 Fast Partial Hashing */}
          <div className={`p-4 rounded-lg border transition-all ${
            currentStage === 'partial_hashing'
              ? 'bg-slate-800/90 border-cyan-400 shadow-sm'
              : currentStage === 'full_crypto_hash' || currentStage === 'completed'
              ? 'bg-slate-800/40 border-slate-700'
              : 'bg-slate-800/20 border-slate-800/60 opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-400">Tier 1 Sample</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-sm font-semibold text-white mt-1">Head & Tail 4KB Sample</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-cyan-400 mt-2">
              -{stats.partialFilteredOut}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Pruned without reading full files
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
              Only <span className="font-mono text-slate-200">8 KB</span> read per candidate
            </div>
          </div>

          {/* Stage 3: Tier 2 Full SHA-256 */}
          <div className={`p-4 rounded-lg border transition-all ${
            currentStage === 'full_crypto_hash' || currentStage === 'completed'
              ? 'bg-slate-800/90 border-amber-400 shadow-sm'
              : 'bg-slate-800/20 border-slate-800/60 opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-amber-400">Tier 2 Hash</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-semibold text-white mt-1">Full SHA-256 Cryptographic</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-400 mt-2">
              {stats.duplicateGroupsCount}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Exact duplicate groups confirmed
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
              Total duplicates: <span className="font-mono text-slate-200">{stats.duplicateFilesCount}</span>
            </div>
          </div>
        </div>

        {/* Disk I/O Savings & Computational Efficiency Banner */}
        <div className="mt-5 p-3.5 bg-slate-800/60 border border-slate-700/70 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">
                Multi-Stage Disk I/O Optimization Impact
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Avoided reading <span className="font-mono font-semibold text-emerald-400">{formatBytes(stats.bytesSavedEstimate)}</span> of unnecessary disk content compared to naive single-pass hashing.
              </div>
            </div>
          </div>

          {currentStage === 'completed' && (
            <button
              onClick={onViewDuplicates}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors whitespace-nowrap self-start md:self-auto"
            >
              <span>Review Duplicate Groups</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Total Scanned Files</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {stats.totalFiles}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Size: <span className="font-mono text-slate-700">{formatBytes(stats.totalSizeBytes)}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Duplicate Clusters Found</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 mt-1">
            {stats.duplicateGroupsCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            <span className="font-mono text-slate-700">{stats.duplicateFilesCount}</span> redundant files
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Wasted Reclaimable Space</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-1">
            {formatBytes(stats.wastedSizeBytes)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {stats.totalSizeBytes > 0 
              ? `${((stats.wastedSizeBytes / stats.totalSizeBytes) * 100).toFixed(1)}% of total storage` 
              : '0%'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Execution Wall Clock</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {stats.elapsedMs < 1000 ? `${Math.round(stats.elapsedMs)} ms` : `${(stats.elapsedMs / 1000).toFixed(2)} s`}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Read: <span className="font-mono text-slate-700">{formatBytes(stats.bytesReadEstimate)}</span>
          </div>
        </div>
      </div>

      {/* Filesystem Table & Hash Stream Inspector */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by path or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-56 focus:outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({files.length})
              </button>
              <button
                onClick={() => setFilterType('duplicates')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterType === 'duplicates' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Duplicates ({files.filter(f => !!f.duplicateGroupId).length})
              </button>
              <button
                onClick={() => setFilterType('pruned')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterType === 'pruned' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pruned
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Showing {filteredFiles.length} files
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold z-10">
              <tr>
                <th className="py-2.5 px-4">File Path</th>
                <th className="py-2.5 px-4 text-right">Size</th>
                <th className="py-2.5 px-4">Tier 0 Size Bucket</th>
                <th className="py-2.5 px-4">Tier 1 Partial Hash</th>
                <th className="py-2.5 px-4 font-mono">Full SHA-256 Digest</th>
                <th className="py-2.5 px-4 text-center">Pipeline State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No files matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const isDuplicate = !!file.duplicateGroupId;
                  const isPruned = !file.sizeBucketKey && currentStage !== 'idle';
                  
                  return (
                    <tr
                      key={file.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDuplicate ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-2 px-4 max-w-xs truncate" title={file.path}>
                        <div className="flex items-center gap-2">
                          <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-slate-800 truncate">{file.path}</span>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {formatBytes(file.size)}
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap font-mono text-slate-500">
                        {file.sizeBucketKey ? (
                          <span className="text-emerald-700 font-medium">Collision ({file.size} B)</span>
                        ) : currentStage !== 'idle' ? (
                          <span className="text-slate-400">Unique (Pruned)</span>
                        ) : (
                          <span className="text-slate-300">Pending</span>
                        )}
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap font-mono text-slate-500">
                        {file.partialHash ? (
                          <span className="text-cyan-700">{file.partialHash.slice(0, 10)}...</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap font-mono">
                        {file.fullHash ? (
                          <span className={isDuplicate ? 'text-amber-700 font-semibold' : 'text-slate-600'}>
                            {file.fullHash.slice(0, 16)}...
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center whitespace-nowrap">
                        {isDuplicate ? (
                          <span className="text-xs font-medium text-amber-700">
                            Duplicate {file.isOriginal ? '(Original)' : '(Clone)'}
                          </span>
                        ) : isPruned ? (
                          <span className="text-xs text-slate-400">Pruned</span>
                        ) : file.sizeBucketKey ? (
                          <span className="text-xs text-emerald-700 font-medium">Candidate</span>
                        ) : (
                          <span className="text-xs text-slate-400">Unprocessed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
