/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  VirtualFile,
  DuplicateGroup,
  PipelineStats,
  PipelineStage,
  ViewTab,
  DatasetPreset,
} from './types/dedup';
import {
  getMonorepoPreset,
  getPhotographerPreset,
  getOfficePreset,
  generateSyntheticDataset,
} from './utils/presets';
import { DedupEngine } from './utils/engine';
import { TopNav } from './components/TopNav';
import { PipelineVisualizer } from './components/PipelineVisualizer';
import { DataStructureLab } from './components/DataStructureLab';
import { DuplicateResolver } from './components/DuplicateResolver';
import { AlgorithmBenchmark } from './components/AlgorithmBenchmark';
import { CBackendViewer } from './components/CBackendViewer';
import { RealFileUploaderModal } from './components/RealFileUploaderModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('detector');
  const [selectedPreset, setSelectedPreset] = useState<DatasetPreset>('monorepo');
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [currentStage, setCurrentStage] = useState<PipelineStage>('idle');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState<boolean>(false);

  // Pipeline metrics
  const [stats, setStats] = useState<PipelineStats>({
    totalFiles: 0,
    totalSizeBytes: 0,
    processedFiles: 0,
    sizeFilteredOut: 0,
    partialFilteredOut: 0,
    fullHashEvaluated: 0,
    duplicateGroupsCount: 0,
    duplicateFilesCount: 0,
    wastedSizeBytes: 0,
    bytesReadEstimate: 0,
    bytesSavedEstimate: 0,
    elapsedMs: 0,
  });

  // Load preset dataset
  const loadPreset = useCallback((preset: DatasetPreset) => {
    let initialFiles: VirtualFile[] = [];
    if (preset === 'monorepo') initialFiles = getMonorepoPreset();
    else if (preset === 'photographer') initialFiles = getPhotographerPreset();
    else if (preset === 'office') initialFiles = getOfficePreset();
    else if (preset === 'synthetic') initialFiles = generateSyntheticDataset(250, 30);

    // Reset file states
    initialFiles.forEach(f => {
      f.sizeBucketKey = undefined;
      f.duplicateGroupId = undefined;
      f.isOriginal = undefined;
      f.markedAction = undefined;
    });

    let totalBytes = 0;
    initialFiles.forEach(f => { totalBytes += f.size; });

    setFiles(initialFiles);
    setDuplicateGroups([]);
    setCurrentStage('idle');
    setSelectedPreset(preset);
    setStats({
      totalFiles: initialFiles.length,
      totalSizeBytes: totalBytes,
      processedFiles: 0,
      sizeFilteredOut: 0,
      partialFilteredOut: 0,
      fullHashEvaluated: 0,
      duplicateGroupsCount: 0,
      duplicateFilesCount: 0,
      wastedSizeBytes: 0,
      bytesReadEstimate: 0,
      bytesSavedEstimate: 0,
      elapsedMs: 0,
    });
  }, []);

  // Initialize on mount
  useEffect(() => {
    loadPreset('monorepo');
  }, [loadPreset]);

  // Step-by-step execution through hashing pipeline
  const handleStepForward = async () => {
    if (isProcessing) return;
    const startTime = performance.now();

    if (currentStage === 'idle') {
      // Step into Tier 0: Size Bucketing
      setIsProcessing(true);
      const { candidates, prunedFiles } = DedupEngine.executeTier0SizeBucketing(files);
      const updatedFiles = [...candidates, ...prunedFiles];

      setFiles(updatedFiles);
      setCurrentStage('size_bucketing');
      setStats(prev => ({
        ...prev,
        sizeFilteredOut: prunedFiles.length,
        elapsedMs: performance.now() - startTime,
      }));
      setIsProcessing(false);
    } else if (currentStage === 'size_bucketing') {
      // Step into Tier 1: Fast Partial / Sample Hashing
      setIsProcessing(true);
      const candidates = files.filter(f => !!f.sizeBucketKey);
      const { survivingCandidates, prunedFiles } = await DedupEngine.executeTier1PartialHashing(candidates);

      setCurrentStage('partial_hashing');
      setStats(prev => ({
        ...prev,
        partialFilteredOut: prunedFiles.length,
        elapsedMs: prev.elapsedMs + (performance.now() - startTime),
      }));
      setIsProcessing(false);
    } else if (currentStage === 'partial_hashing') {
      // Step into Tier 2: Full Cryptographic SHA-256 Hashing
      setIsProcessing(true);
      const candidates = files.filter(f => !!f.sizeBucketKey);
      const { duplicateGroups: groups } = await DedupEngine.executeTier2FullCryptoHash(candidates);

      setDuplicateGroups(groups);
      setCurrentStage('completed');

      const elapsed = stats.elapsedMs + (performance.now() - startTime);
      const finalStats = DedupEngine.calculatePipelineMetrics(
        files,
        stats.sizeFilteredOut,
        stats.partialFilteredOut,
        candidates.length,
        groups,
        elapsed
      );
      setStats(finalStats);
      setIsProcessing(false);
    }
  };

  // Full multi-tier pipeline run in one continuous flow
  const handleRunFullPipeline = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const startTime = performance.now();

    // 1. Tier 0: File Size Bucketing
    const { candidates, prunedFiles } = DedupEngine.executeTier0SizeBucketing(files);
    setCurrentStage('size_bucketing');

    // 2. Tier 1: Fast Partial Hashing
    const { survivingCandidates, prunedFiles: partialPruned } =
      await DedupEngine.executeTier1PartialHashing(candidates);
    setCurrentStage('partial_hashing');

    // 3. Tier 2: Full Cryptographic SHA-256 Hashing
    const { duplicateGroups: groups } =
      await DedupEngine.executeTier2FullCryptoHash(survivingCandidates);

    // Update files with results
    setDuplicateGroups(groups);
    setCurrentStage('completed');

    const totalElapsed = performance.now() - startTime;
    const finalStats = DedupEngine.calculatePipelineMetrics(
      files,
      prunedFiles.length,
      partialPruned.length,
      survivingCandidates.length,
      groups,
      totalElapsed
    );

    setStats(finalStats);
    setIsProcessing(false);
  };

  // Run scan using the native C engine via Express API
  const handleRunCBackendScan = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/c-backend/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numFiles: files.length, avgMB: 3 }),
      });
      const data = await res.json();
      if (data && data.stats) {
        setStats({
          totalFiles: data.stats.totalFiles,
          totalSizeBytes: data.stats.totalSizeBytes,
          processedFiles: data.stats.totalFiles,
          sizeFilteredOut: data.stats.sizeFilteredOut,
          partialFilteredOut: data.stats.partialFilteredOut,
          fullHashEvaluated: data.stats.fullHashEvaluated,
          duplicateGroupsCount: data.stats.duplicateGroupsCount,
          duplicateFilesCount: data.stats.duplicateFilesCount,
          wastedSizeBytes: data.stats.wastedSizeBytes,
          bytesReadEstimate: data.stats.bytesReadEstimate,
          bytesSavedEstimate: data.stats.bytesSavedEstimate,
          elapsedMs: data.stats.elapsedMs,
        });

        if (data.files && Array.isArray(data.files)) {
          setFiles(data.files);
        }
        setCurrentStage('completed');
      }
    } catch (err) {
      console.error('C backend scan error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset pipeline
  const handleResetPipeline = () => {
    loadPreset(selectedPreset);
  };

  // Update marked action for a file in Duplicate Resolver
  const handleUpdateFileAction = (
    groupId: string,
    fileId: string,
    action: 'keep' | 'delete' | 'symlink'
  ) => {
    setDuplicateGroups(prevGroups => {
      return prevGroups.map(group => {
        if (group.id !== groupId) return group;
        const updatedFiles = group.files.map(f => {
          if (f.id === fileId) {
            return { ...f, markedAction: action };
          }
          return f;
        });
        return { ...group, files: updatedFiles };
      });
    });

    setFiles(prevFiles => {
      return prevFiles.map(f => {
        if (f.id === fileId) {
          return { ...f, markedAction: action };
        }
        return f;
      });
    });
  };

  // Apply batch selection rule across all duplicate clusters
  const handleApplyBatchRule = (
    rule: 'oldest' | 'newest' | 'shortest_path' | 'symlink_all'
  ) => {
    setDuplicateGroups(prevGroups => {
      return prevGroups.map(group => {
        const sorted = [...group.files];
        if (rule === 'oldest') {
          sorted.sort((a, b) => new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime());
        } else if (rule === 'newest') {
          sorted.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
        } else if (rule === 'shortest_path') {
          sorted.sort((a, b) => a.path.length - b.path.length);
        }

        const original = sorted[0];
        const updatedFiles = group.files.map(f => {
          if (f.id === original.id) {
            return { ...f, isOriginal: true, markedAction: 'keep' as const };
          }
          return {
            ...f,
            isOriginal: false,
            markedAction: (rule === 'symlink_all' ? 'symlink' : 'delete') as 'delete' | 'symlink',
          };
        });

        return {
          ...group,
          originalFileId: original.id,
          files: updatedFiles,
        };
      });
    });
  };

  // Simulate resolution in sandbox (removes marked files and updates stats)
  const handleSimulateResolution = () => {
    // Identify all file IDs marked for deletion
    const deleteIds = new Set<string>();
    duplicateGroups.forEach(grp => {
      grp.files.forEach(f => {
        if (f.markedAction === 'delete') {
          deleteIds.add(f.id);
        }
      });
    });

    // Filter out deleted files
    const remainingFiles = files.filter(f => !deleteIds.has(f.id));
    setFiles(remainingFiles);

    // Update duplicate groups
    const remainingGroups: DuplicateGroup[] = [];
    duplicateGroups.forEach(grp => {
      const liveFiles = grp.files.filter(f => !deleteIds.has(f.id));
      if (liveFiles.length > 1) {
        remainingGroups.push({
          ...grp,
          files: liveFiles,
          potentialSavingsBytes: (liveFiles.length - 1) * grp.size,
        });
      }
    });

    setDuplicateGroups(remainingGroups);

    // Recompute stats
    let totalSize = 0;
    remainingFiles.forEach(f => { totalSize += f.size; });

    setStats(prev => ({
      ...prev,
      totalFiles: remainingFiles.length,
      totalSizeBytes: totalSize,
      duplicateGroupsCount: remainingGroups.length,
      duplicateFilesCount: remainingGroups.reduce((acc, g) => acc + (g.files.length - 1), 0),
      wastedSizeBytes: remainingGroups.reduce((acc, g) => acc + g.potentialSavingsBytes, 0),
    }));
  };

  // Custom synthetic dataset generator
  const handleGenerateCustom = (count: number, dupPct: number) => {
    const customFiles = generateSyntheticDataset(count, dupPct);
    setFiles(customFiles);
    setDuplicateGroups([]);
    setCurrentStage('idle');
    setSelectedPreset('synthetic');

    let totalBytes = 0;
    customFiles.forEach(f => { totalBytes += f.size; });

    setStats({
      totalFiles: customFiles.length,
      totalSizeBytes: totalBytes,
      processedFiles: 0,
      sizeFilteredOut: 0,
      partialFilteredOut: 0,
      fullHashEvaluated: 0,
      duplicateGroupsCount: 0,
      duplicateFilesCount: 0,
      wastedSizeBytes: 0,
      bytesReadEstimate: 0,
      bytesSavedEstimate: 0,
      elapsedMs: 0,
    });
  };

  // Real local directory loaded
  const handleRealFilesLoaded = (realFiles: VirtualFile[]) => {
    setFiles(realFiles);
    setDuplicateGroups([]);
    setCurrentStage('idle');

    let totalBytes = 0;
    realFiles.forEach(f => { totalBytes += f.size; });

    setStats({
      totalFiles: realFiles.length,
      totalSizeBytes: totalBytes,
      processedFiles: 0,
      sizeFilteredOut: 0,
      partialFilteredOut: 0,
      fullHashEvaluated: 0,
      duplicateGroupsCount: 0,
      duplicateFilesCount: 0,
      wastedSizeBytes: 0,
      bytesReadEstimate: 0,
      bytesSavedEstimate: 0,
      elapsedMs: 0,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Strict 3-Zone Top Bar Contract */}
      <TopNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenFolderPicker={() => setIsFolderPickerOpen(true)}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'detector' && (
          <PipelineVisualizer
            files={files}
            duplicateGroups={duplicateGroups}
            stats={stats}
            currentStage={currentStage}
            isProcessing={isProcessing}
            selectedPreset={selectedPreset}
            onSelectPreset={loadPreset}
            onRunFullPipeline={handleRunFullPipeline}
            onRunCBackend={handleRunCBackendScan}
            onStepForward={handleStepForward}
            onReset={handleResetPipeline}
            onViewDuplicates={() => setActiveTab('resolver')}
            onGenerateCustom={handleGenerateCustom}
          />
        )}

        {activeTab === 'data_structures' && (
          <DataStructureLab
            files={files}
            duplicateGroups={duplicateGroups}
          />
        )}

        {activeTab === 'resolver' && (
          <DuplicateResolver
            duplicateGroups={duplicateGroups}
            onUpdateFileAction={handleUpdateFileAction}
            onApplyBatchRule={handleApplyBatchRule}
            onSimulateResolution={handleSimulateResolution}
          />
        )}

        {activeTab === 'benchmarks' && (
          <AlgorithmBenchmark />
        )}

        {activeTab === 'c_backend' && (
          <CBackendViewer />
        )}
      </main>

      {/* Real Folder Uploader Modal */}
      <RealFileUploaderModal
        isOpen={isFolderPickerOpen}
        onClose={() => setIsFolderPickerOpen(false)}
        onFilesLoaded={handleRealFilesLoaded}
      />

      {/* Clean Systems Engineering Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">DedupCore</span>
          <span aria-hidden="true">·</span>
          <span>SHA-256 Content-Addressed Duplicate File Detection System</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
          <span>Hash: FIPS 180-4 SHA-256</span>
          <span aria-hidden="true">·</span>
          <span>Web Crypto API</span>
          <span aria-hidden="true">·</span>
          <span>Bloom Filter & Merkle Tree</span>
        </div>
      </footer>
    </div>
  );
}
