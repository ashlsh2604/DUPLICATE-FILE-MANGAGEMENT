/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DuplicateGroup, VirtualFile } from '../types/dedup';
import { formatBytes } from '../utils/crypto';
import {
  generateBashScript,
  generatePowerShellScript,
  generateCSVReport,
  triggerDownload,
} from '../utils/scriptExporter';
import {
  Trash2,
  Link,
  ShieldCheck,
  Download,
  FileText,
  Terminal,
  Check,
  Copy,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DuplicateResolverProps {
  duplicateGroups: DuplicateGroup[];
  onUpdateFileAction: (groupId: string, fileId: string, action: 'keep' | 'delete' | 'symlink') => void;
  onApplyBatchRule: (rule: 'oldest' | 'newest' | 'shortest_path' | 'symlink_all') => void;
  onSimulateResolution: () => void;
}

export const DuplicateResolver: React.FC<DuplicateResolverProps> = ({
  duplicateGroups,
  onUpdateFileAction,
  onApplyBatchRule,
  onSimulateResolution,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [resolutionExecuted, setResolutionExecuted] = useState(false);

  // Calculate projected space reclaimed
  let totalReclaimedBytes = 0;
  let filesMarkedForDelete = 0;
  let filesMarkedForSymlink = 0;

  for (const group of duplicateGroups) {
    for (const file of group.files) {
      if (file.markedAction === 'delete') {
        totalReclaimedBytes += file.size;
        filesMarkedForDelete++;
      } else if (file.markedAction === 'symlink') {
        totalReclaimedBytes += file.size; // Symlink takes ~0 bytes
        filesMarkedForSymlink++;
      }
    }
  }

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownloadBash = () => {
    const script = generateBashScript(duplicateGroups, 'delete');
    triggerDownload(script, 'dedup_cleanup.sh', 'text/x-sh');
  };

  const handleDownloadPowerShell = () => {
    const script = generatePowerShellScript(duplicateGroups);
    triggerDownload(script, 'dedup_cleanup.ps1', 'text/plain');
  };

  const handleDownloadCSV = () => {
    const csv = generateCSVReport(duplicateGroups);
    triggerDownload(csv, 'duplicate_files_report.csv', 'text/csv');
  };

  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(duplicateGroups, null, 2);
    triggerDownload(jsonStr, 'duplicates_manifest.json', 'application/json');
  };

  const handleExecuteSimulation = () => {
    onSimulateResolution();
    setResolutionExecuted(true);
    setTimeout(() => setResolutionExecuted(false), 4000);
  };

  if (duplicateGroups.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
        <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-slate-900">
          No Duplicate Groups Found
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Every file in the loaded directory has a distinct cryptographic SHA-256 content signature. Return to the Pipeline tab to run a scan or load a dataset with duplicate files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reclaim Summary & Action Deck */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Storage Reclaim & Resolution Console
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{duplicateGroups.length} Identical Content Groups</span>
              <span aria-hidden="true">·</span>
              <span>SHA-256 Verified</span>
              <span aria-hidden="true">·</span>
              <span>Reclaimable: <strong className="text-emerald-700 font-mono">{formatBytes(totalReclaimedBytes)}</strong></span>
            </div>
          </div>

          {/* Export & Resolution Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadBash}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap"
              title="Download safe Bash cleanup script with dry-run support"
            >
              <Terminal className="w-3.5 h-3.5 text-slate-600" />
              <span>Export Bash (.sh)</span>
            </button>

            <button
              onClick={handleDownloadPowerShell}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap"
              title="Download PowerShell cleanup script"
            >
              <Terminal className="w-3.5 h-3.5 text-slate-600" />
              <span>Export PowerShell</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExecuteSimulation}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-xs whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate Reclaim in Sandbox</span>
            </button>
          </div>
        </div>

        {/* Batch Selection Rules Strip */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Smart Batch Rule:</span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
              <button
                onClick={() => onApplyBatchRule('oldest')}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 rounded-md hover:bg-white transition-colors"
                title="Preserve the earliest created file, delete newer copies"
              >
                Keep Oldest (Original)
              </button>
              <button
                onClick={() => onApplyBatchRule('newest')}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 rounded-md hover:bg-white transition-colors"
                title="Preserve newest copy, delete older copies"
              >
                Keep Newest
              </button>
              <button
                onClick={() => onApplyBatchRule('shortest_path')}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 rounded-md hover:bg-white transition-colors"
                title="Preserve file with shortest cleanest directory path"
              >
                Keep Shortest Path
              </button>
              <button
                onClick={() => onApplyBatchRule('symlink_all')}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 rounded-md hover:bg-white transition-colors"
                title="Replace duplicate copies with symbolic links to the original"
              >
                Symlink All Duplicates
              </button>
            </div>
          </div>

          <div className="text-slate-500 font-mono">
            {filesMarkedForDelete} to delete · {filesMarkedForSymlink} to symlink
          </div>
        </div>
      </div>

      {/* Confirmation Banner if Simulation Ran */}
      {resolutionExecuted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-900">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="font-semibold">Reclaim Simulation Successful</div>
            <div>
              Reclaimed <span className="font-mono font-bold">{formatBytes(totalReclaimedBytes)}</span> of virtual storage. Check your terminal to run the exported script on your actual system.
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Groups List */}
      <div className="space-y-4">
        {duplicateGroups.map((group, groupIdx) => {
          return (
            <div
              key={group.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
            >
              {/* Group Header */}
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">
                    Group #{groupIdx + 1}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-slate-600 font-medium">
                    {group.files.length} Identical Copies
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-mono text-slate-600">
                    {formatBytes(group.size)} each
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-emerald-700 font-semibold font-mono">
                    Saves {formatBytes(group.potentialSavingsBytes)}
                  </span>
                </div>

                {/* SHA-256 Digest Pill */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">SHA-256:</span>
                  <button
                    onClick={() => handleCopyHash(group.hash)}
                    className="flex items-center gap-1 font-mono text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-colors"
                    title="Click to copy full 256-bit hash"
                  >
                    <span>{group.hash.slice(0, 20)}...</span>
                    {copiedHash === group.hash ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Group Files List */}
              <div className="divide-y divide-slate-100">
                {group.files.map((file) => {
                  const action = file.markedAction || (file.isOriginal ? 'keep' : 'delete');
                  return (
                    <div
                      key={file.id}
                      className={`px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors ${
                        action === 'delete' ? 'bg-red-50/20' : action === 'symlink' ? 'bg-cyan-50/20' : 'bg-white'
                      }`}
                    >
                      {/* Left: Path and Meta */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="pt-0.5">
                          {action === 'keep' ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : action === 'symlink' ? (
                            <Link className="w-4 h-4 text-cyan-600 shrink-0" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-900 font-medium break-all">
                              {file.path}
                            </span>
                            {file.isOriginal && (
                              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded shrink-0">
                                ORIGINAL
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                            <span>Modified: {file.modifiedAt}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatBytes(file.size)}</span>
                            {file.contentSample && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono truncate max-w-xs">{file.contentSample}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Selector */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                        <button
                          onClick={() => onUpdateFileAction(group.id, file.id, 'keep')}
                          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                            action === 'keep'
                              ? 'bg-emerald-600 text-white font-medium shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => onUpdateFileAction(group.id, file.id, 'symlink')}
                          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                            action === 'symlink'
                              ? 'bg-cyan-600 text-white font-medium shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Symlink
                        </button>
                        <button
                          onClick={() => onUpdateFileAction(group.id, file.id, 'delete')}
                          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                            action === 'delete'
                              ? 'bg-rose-600 text-white font-medium shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
