/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { VirtualFile } from '../types/dedup';
import { computeSHA256, computeRealPartialHash, formatBytes } from '../utils/crypto';
import {
  FolderOpen,
  UploadCloud,
  X,
  FileCheck,
  Loader2,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';

interface RealFileUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesLoaded: (files: VirtualFile[]) => void;
}

export const RealFileUploaderModal: React.FC<RealFileUploaderModalProps> = ({
  isOpen,
  onClose,
  onFilesLoaded,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; currentFileName: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processRealFileList = async (fileList: FileList | File[]) => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      const rawFiles = Array.from(fileList);

      if (rawFiles.length === 0) {
        setErrorMsg('No files detected in the selected directory.');
        setIsProcessing(false);
        return;
      }

      const total = rawFiles.length;
      const virtualFiles: VirtualFile[] = [];

      for (let i = 0; i < total; i++) {
        const file = rawFiles[i];
        setProgress({
          current: i + 1,
          total,
          currentFileName: file.name,
        });

        // Compute partial sample hash for fast pipeline initialization
        const partialHash = await computeRealPartialHash(file);
        
        // Full SHA-256 for smaller files, or deferred for very large files
        let fullHash: string | undefined = undefined;
        if (file.size < 50 * 1024 * 1024) { // Compute immediately if < 50MB
          const buffer = await file.arrayBuffer();
          fullHash = await computeSHA256(buffer);
        }

        const relativePath = (file as any).webkitRelativePath || `/${file.name}`;
        const ext = file.name.split('.').pop()?.toLowerCase() || '';

        virtualFiles.push({
          id: `real_${i}_${Date.now()}`,
          path: relativePath.startsWith('/') ? relativePath : `/${relativePath}`,
          name: file.name,
          size: file.size,
          extension: ext,
          modifiedAt: new Date(file.lastModified).toISOString().split('T')[0],
          contentSample: `Real local file (${formatBytes(file.size)})`,
          realFile: file,
          partialHash,
          fullHash,
          md5Hash: fullHash ? fullHash.slice(0, 32) : undefined,
        });
      }

      onFilesLoaded(virtualFiles);
      setIsProcessing(false);
      setProgress(null);
      onClose();
    } catch (err: any) {
      console.error('Failed to hash files:', err);
      setErrorMsg(`Error processing files: ${err.message || 'Permission denied or read error'}`);
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processRealFileList(e.dataTransfer.files);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Scan Real Folder or Files
            </h3>
            <p className="text-xs text-slate-500">
              Computed 100% locally in your browser using Web Crypto SHA-256
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isProcessing ? (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin mx-auto" />
            <div className="text-sm font-semibold text-slate-800">
              Hashing Files with Web Crypto SHA-256...
            </div>
            {progress && (
              <div className="space-y-1">
                <div className="text-xs text-slate-500">
                  {progress.current} of {progress.total} files processed
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs mx-auto">
                  {progress.currentFileName}
                </div>
                <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden mt-2">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-150"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-800">
              Drag & drop a folder or multiple files here
            </div>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Supports directory trees, nested packages, photos, or documents
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                // @ts-ignore
                webkitdirectory=""
                directory=""
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processRealFileList(e.target.files);
                  }
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
              >
                Select Directory
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200/60 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Zero server upload. All SHA-256 digests computed client-side.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
