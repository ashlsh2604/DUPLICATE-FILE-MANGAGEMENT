/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { formatBytes } from '../utils/crypto';
import {
  Terminal,
  Cpu,
  FileCode,
  CheckCircle2,
  Play,
  RotateCcw,
  Copy,
  Check,
  FolderOpen,
  Zap,
  ShieldCheck,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CBackendInfo {
  status: string;
  version: string;
  compiler: string;
  arch: string;
  platform: string;
  binaryPath: string;
  features: string[];
}

export const CBackendViewer: React.FC = () => {
  const [backendInfo, setBackendInfo] = useState<CBackendInfo | null>(null);
  const [cSourceFiles, setCSourceFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string>('dedup_core.c');
  const [copiedCode, setCopiedCode] = useState(false);

  // Live C Benchmark State
  const [benchCount, setBenchCount] = useState<number>(3000);
  const [benchMB, setBenchMB] = useState<number>(5);
  const [isRunningBench, setIsRunningBench] = useState<boolean>(false);
  const [benchResult, setBenchResult] = useState<any | null>(null);

  // POSIX Scan State
  const [scanPath, setScanPath] = useState<string>('/app/applet');
  const [isRunningScan, setIsRunningScan] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<any | null>(null);

  useEffect(() => {
    // Fetch status
    fetch('/api/c-backend/status')
      .then(res => res.json())
      .then(data => setBackendInfo(data))
      .catch(err => console.error('Failed to probe C backend:', err));

    // Fetch source code
    fetch('/api/c-backend/source')
      .then(res => res.json())
      .then(data => {
        if (data.files) {
          setCSourceFiles(data.files);
        }
      })
      .catch(err => console.error('Failed to load C source:', err));
  }, []);

  const handleRunCBenchmark = async () => {
    try {
      setIsRunningBench(true);
      const res = await fetch('/api/c-backend/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numFiles: benchCount, avgMB: benchMB }),
      });
      const data = await res.json();
      setBenchResult(data);
    } catch (err) {
      console.error('C benchmark failed:', err);
    } finally {
      setIsRunningBench(false);
    }
  };

  const handleRunCScan = async () => {
    try {
      setIsRunningScan(true);
      const res = await fetch('/api/c-backend/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: scanPath }),
      });
      const data = await res.json();
      setScanResult(data);
    } catch (err) {
      console.error('C scan failed:', err);
    } finally {
      setIsRunningScan(false);
    }
  };

  const handleCopyCode = () => {
    const code = cSourceFiles[selectedFile] || '';
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* C Backend Architecture Card */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Native C Language Backend Engine</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  COMPILED ELF-64
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <span>Compiler: GCC 12.3.0</span>
                <span aria-hidden="true">·</span>
                <span>Flag: -O3 Optimization</span>
                <span aria-hidden="true">·</span>
                <span>Standard: C11 / POSIX.1-2008</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunCBenchmark}
              disabled={isRunningBench}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>{isRunningBench ? 'Running C Binary...' : 'Run Native C Benchmark'}</span>
            </button>
          </div>
        </div>

        {/* C Specs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
          <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Cryptographic Engine</div>
            <div className="text-sm font-semibold text-white mt-0.5">FIPS 180-4 SHA-256</div>
            <div className="text-[11px] text-slate-400 mt-1">64-byte block transforms in C</div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Hash Table Collision</div>
            <div className="text-sm font-semibold text-white mt-0.5">Separate Chaining</div>
            <div className="text-[11px] text-slate-400 mt-1">FNV-1a 32-bit index mapping</div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Directory Merkle Tree</div>
            <div className="text-sm font-semibold text-white mt-0.5">Subtree Deduplication</div>
            <div className="text-[11px] text-slate-400 mt-1">Recursive bottom-up digests</div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">I/O Streaming Buffer</div>
            <div className="text-sm font-semibold text-white mt-0.5">64 KB Native Chunks</div>
            <div className="text-[11px] text-slate-400 mt-1">Direct POSIX unbuffered reads</div>
          </div>
        </div>
      </div>

      {/* Live C Benchmark Interactive Runner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Live Native C Execution Benchmark
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Executes the compiled C binary on the server via child process and returns microsecond clock timings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">Files:</span>
              <select
                value={benchCount}
                onChange={(e) => setBenchCount(Number(e.target.value))}
                className="px-2 py-1 text-xs border border-slate-200 rounded font-mono font-medium"
              >
                <option value={1000}>1,000</option>
                <option value={2000}>2,000</option>
                <option value={3000}>3,000</option>
                <option value={5000}>5,000</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">Size:</span>
              <select
                value={benchMB}
                onChange={(e) => setBenchMB(Number(e.target.value))}
                className="px-2 py-1 text-xs border border-slate-200 rounded font-mono font-medium"
              >
                <option value={2}>2 MB</option>
                <option value={5}>5 MB</option>
                <option value={10}>10 MB</option>
              </select>
            </div>

            <button
              onClick={handleRunCBenchmark}
              disabled={isRunningBench}
              className="px-3.5 py-1 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isRunningBench ? 'Running...' : 'Run Benchmark'}
            </button>
          </div>
        </div>

        {benchResult && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>C Engine Execution Result ({benchResult.backend})</span>
              </span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                Elapsed: {benchResult.stats.elapsedMs.toFixed(3)} ms
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <div className="text-[11px] text-slate-400">Total Files Processed</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  {benchResult.stats.totalFiles.toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded border border-slate-200">
                <div className="text-[11px] text-slate-400">Tier 0 Pruned (Size)</div>
                <div className="font-mono font-bold text-emerald-600 mt-0.5">
                  {benchResult.stats.sizeFilteredOut}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded border border-slate-200">
                <div className="text-[11px] text-slate-400">Duplicate Clusters</div>
                <div className="font-mono font-bold text-amber-600 mt-0.5">
                  {benchResult.stats.duplicateGroupsCount} groups
                </div>
              </div>

              <div className="bg-white p-2.5 rounded border border-slate-200">
                <div className="text-[11px] text-slate-400">Disk I/O Avoided</div>
                <div className="font-mono font-bold text-emerald-600 mt-0.5">
                  {formatBytes(benchResult.stats.bytesSavedEstimate)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* POSIX Directory Traversal via C Engine */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              POSIX Filesystem Scanner in C (`&lt;dirent.h&gt;` & `&lt;sys/stat.h&gt;`)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Trigger a real recursive scan of the server filesystem using native C POSIX system calls.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg w-56"
              placeholder="/app/applet/backend"
            />
            <button
              onClick={handleRunCScan}
              disabled={isRunningScan}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isRunningScan ? 'Scanning in C...' : 'Scan Path with C'}
            </button>
          </div>
        </div>

        {scanResult && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>Scan Path: {scanPath}</span>
              <span className="font-mono text-emerald-700">
                Found {scanResult.stats.totalFiles} files in {scanResult.stats.elapsedMs.toFixed(2)} ms
              </span>
            </div>
            <div className="text-slate-600">
              Duplicates discovered: <span className="font-bold text-amber-700">{scanResult.stats.duplicateGroupsCount} groups</span> ({formatBytes(scanResult.stats.wastedSizeBytes)} wasted)
            </div>
          </div>
        )}
      </div>

      {/* C Source Code Inspector */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              C Source Code Inspector
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-0.5 bg-slate-200 rounded-lg text-xs">
              {['dedup_core.c', 'sha256.c', 'sha256.h', 'Makefile'].map((fn) => (
                <button
                  key={fn}
                  onClick={() => setSelectedFile(fn)}
                  className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors ${
                    selectedFile === fn
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {fn}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 transition-colors"
              title="Copy code to clipboard"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Code Body */}
        <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed">
          <pre className="whitespace-pre">
            {cSourceFiles[selectedFile] || '// Loading C source code...'}
          </pre>
        </div>
      </div>
    </div>
  );
};
