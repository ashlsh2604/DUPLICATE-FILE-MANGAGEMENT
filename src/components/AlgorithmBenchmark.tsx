/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { formatBytes } from '../utils/crypto';
import {
  TrendingUp,
  Cpu,
  HardDrive,
  ShieldAlert,
  Zap,
  Info,
  Layers,
  Clock,
  Sparkles,
} from 'lucide-react';

export const AlgorithmBenchmark: React.FC = () => {
  // Simulator Parameters
  const [numFiles, setNumFiles] = useState<number>(5000);
  const [avgFileSizeMB, setAvgFileSizeMB] = useState<number>(8); // in MB
  const [sizeCollisionPct, setSizeCollisionPct] = useState<number>(20); // % files with same size
  const [duplicatePct, setDuplicatePct] = useState<number>(10); // % true duplicates

  // Calculated variables
  const avgFileSizeBytes = avgFileSizeMB * 1024 * 1024;
  const totalFilesystemBytes = numFiles * avgFileSizeBytes;

  // 1. Strategy A: Naive Pairwise Byte Comparison
  // Checks = N * (N - 1) / 2
  const naiveComparisons = (numFiles * (numFiles - 1)) / 2;
  // In the worst case, comparing files requires reading both files:
  const naiveBytesRead = Math.min(
    totalFilesystemBytes * 1.5,
    naiveComparisons * avgFileSizeBytes * 0.1
  );

  // 2. Strategy B: Single-Pass Direct SHA-256
  // Reads 100% of all bytes for all files once
  const singlePassBytesRead = totalFilesystemBytes;
  const singlePassHashes = numFiles;

  // 3. Strategy C: Multi-Tiered DedupCore Pipeline
  // Tier 0: 0 bytes read (only stat / file size metadata in memory)
  // Surviving candidates that share sizes:
  const tier1Candidates = Math.floor(numFiles * (sizeCollisionPct / 100));
  // Tier 1 reads head (4KB) + tail (4KB) = 8KB per candidate:
  const tier1BytesRead = tier1Candidates * 8192;
  // Tier 2 evaluates true duplicates + partial collisions:
  const tier2Candidates = Math.floor(numFiles * ((duplicatePct + 2) / 100));
  const tier2BytesRead = tier2Candidates * avgFileSizeBytes;
  const tieredTotalBytesRead = tier1BytesRead + tier2BytesRead;
  const ioReductionPct = Math.max(0, ((singlePassBytesRead - tieredTotalBytesRead) / singlePassBytesRead) * 100);

  // Speed estimation (assuming NVMe read speed of 2,500 MB/s and HDD of 120 MB/s)
  const nvmeSpeed = 2500 * 1024 * 1024; // 2.5 GB/s
  const hddSpeed = 120 * 1024 * 1024;   // 120 MB/s

  const singlePassTimeSecNVMe = singlePassBytesRead / nvmeSpeed;
  const tieredTimeSecNVMe = tieredTotalBytesRead / nvmeSpeed;

  const singlePassTimeSecHDD = singlePassBytesRead / hddSpeed;
  const tieredTimeSecHDD = tieredTotalBytesRead / hddSpeed;

  return (
    <div className="space-y-6">
      {/* Simulation Playground Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Algorithm Complexity & Disk I/O Benchmark Laboratory
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>Time & Space Complexity Simulation</span>
              <span aria-hidden="true">·</span>
              <span>I/O Bus Throughput</span>
              <span aria-hidden="true">·</span>
              <span>Asymptotic Scaling</span>
            </div>
          </div>
          <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-mono text-emerald-800">
            Total Dataset: {formatBytes(totalFilesystemBytes)} ({numFiles.toLocaleString()} files)
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-5">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-600">Total File Count (N):</span>
              <span className="font-mono font-bold text-slate-900">{numFiles.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="200"
              max="50000"
              step="500"
              value={numFiles}
              onChange={(e) => setNumFiles(Number(e.target.value))}
              className="w-full accent-slate-900"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>200</span>
              <span>50,000 files</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-600">Avg File Size:</span>
              <span className="font-mono font-bold text-slate-900">{avgFileSizeMB} MB</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={avgFileSizeMB}
              onChange={(e) => setAvgFileSizeMB(Number(e.target.value))}
              className="w-full accent-slate-900"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1 MB</span>
              <span>100 MB</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-600">Size Collision Rate:</span>
              <span className="font-mono font-bold text-slate-900">{sizeCollisionPct}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={sizeCollisionPct}
              onChange={(e) => setSizeCollisionPct(Number(e.target.value))}
              className="w-full accent-slate-900"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5%</span>
              <span>50%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-600">True Duplicates:</span>
              <span className="font-mono font-bold text-slate-900">{duplicatePct}%</span>
            </div>
            <input
              type="range"
              min="2"
              max="40"
              step="2"
              value={duplicatePct}
              onChange={(e) => setDuplicatePct(Number(e.target.value))}
              className="w-full accent-slate-900"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>2%</span>
              <span>40%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Strategy Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Strategy 1: Naive */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Strategy A</span>
              <span className="font-mono text-red-600 font-bold">O(N² · S)</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mt-1">
              Naive Pairwise Comparison
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Compares every file against every other file with byte-by-byte diffs.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Pairwise Checks:</span>
                <span className="font-mono font-bold text-rose-600">
                  {naiveComparisons > 1e6 ? `${(naiveComparisons / 1e6).toFixed(1)}M` : naiveComparisons.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Estimated Bus Reads:</span>
                <span className="font-mono text-slate-900">{formatBytes(naiveBytesRead)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Practical Feasibility:</span>
                <span className="text-rose-600 font-semibold">Unusable for Large Dirs</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Fails catastrophically when directory contains {'>'} 2,000 files.
          </div>
        </div>

        {/* Strategy 2: Single Pass Full Hash */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Strategy B</span>
              <span className="font-mono text-amber-600 font-bold">O(N · S)</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mt-1">
              Direct Single-Pass SHA-256
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Computes SHA-256 digest on all files unconditionally.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Hash Calculations:</span>
                <span className="font-mono font-bold text-slate-900">{singlePassHashes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Disk Bytes Read:</span>
                <span className="font-mono text-amber-600 font-semibold">{formatBytes(singlePassBytesRead)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">I/O Bottleneck:</span>
                <span className="text-amber-600 font-medium">100% Disk Read</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Wastes massive I/O reading unique files whose sizes never matched.
          </div>
        </div>

        {/* Strategy 3: Multi-Tiered DedupCore */}
        <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col justify-between border border-slate-800 shadow-md">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400 uppercase tracking-wider">Strategy C (DedupCore)</span>
              <span className="font-mono text-emerald-400 font-bold">O(N + K·s + D·S)</span>
            </div>
            <h3 className="text-sm font-semibold text-white mt-1">
              Multi-Tiered Pruning Pipeline
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Size Hash Map → 4KB Head/Tail Hash → SHA-256 on survivors.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Total Disk Read:</span>
                <span className="font-mono font-bold text-emerald-400">{formatBytes(tieredTotalBytesRead)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Disk I/O Reduction:</span>
                <span className="font-mono font-bold text-emerald-400">-{ioReductionPct.toFixed(1)}% avoided</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Full Hashes Required:</span>
                <span className="font-mono text-white">{tier2Candidates.toLocaleString()} files</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Optimal balance of linear speed and minimal storage wear.</span>
          </div>
        </div>
      </div>

      {/* Storage Hardware Throughput Comparison */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
          Hardware Storage Bus Runtime Estimates
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Comparing wall-clock execution on different physical media types based on read bus saturation:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-600" />
                <span>Mechanical HDD (~120 MB/s Sequential)</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <div className="text-[11px] text-slate-400">Strategy B (Single Pass)</div>
                <div className="font-mono font-bold text-rose-600 text-sm mt-0.5">
                  {singlePassTimeSecHDD < 60 
                    ? `${singlePassTimeSecHDD.toFixed(1)} s` 
                    : `${(singlePassTimeSecHDD / 60).toFixed(1)} min`}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <div className="text-[11px] text-slate-400">Strategy C (DedupCore)</div>
                <div className="font-mono font-bold text-emerald-600 text-sm mt-0.5">
                  {tieredTimeSecHDD < 60 
                    ? `${tieredTimeSecHDD.toFixed(1)} s` 
                    : `${(tieredTimeSecHDD / 60).toFixed(1)} min`}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>PCIe Gen4 NVMe SSD (~2,500 MB/s)</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <div className="text-[11px] text-slate-400">Strategy B (Single Pass)</div>
                <div className="font-mono font-bold text-slate-700 text-sm mt-0.5">
                  {singlePassTimeSecNVMe.toFixed(2)} s
                </div>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <div className="text-[11px] text-slate-400">Strategy C (DedupCore)</div>
                <div className="font-mono font-bold text-emerald-600 text-sm mt-0.5">
                  {tieredTimeSecNVMe.toFixed(2)} s
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hashing Algorithm Deep Dive & Collision Resistance Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">
            Cryptographic Hashing Algorithms: Why SHA-256?
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Understanding collision vulnerabilities, output bit lengths, and birthday attack bounds.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Algorithm</th>
                <th className="py-2.5 px-4">Digest Output</th>
                <th className="py-2.5 px-4">Birthday Bound</th>
                <th className="py-2.5 px-4">Collision Status</th>
                <th className="py-2.5 px-4">Suitability for Deduplication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-emerald-50/30">
                <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <span>SHA-256 (DedupCore)</span>
                </td>
                <td className="py-3 px-4 font-mono">256 bits (64 hex)</td>
                <td className="py-3 px-4 font-mono">2¹²⁸ items</td>
                <td className="py-3 px-4 text-emerald-700 font-semibold">
                  Zero Collisions Known (Unbroken)
                </td>
                <td className="py-3 px-4 text-slate-700">
                  Ideal. Collision probability is $2^{-256}$, lower than spontaneous hardware bit-flip.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800">MD5</td>
                <td className="py-3 px-4 font-mono">128 bits (32 hex)</td>
                <td className="py-3 px-4 font-mono">2⁶⁴ items</td>
                <td className="py-3 px-4 text-rose-600 font-semibold">
                  Severely Broken (Wang et al. 2004)
                </td>
                <td className="py-3 px-4 text-slate-600">
                  Unsafe. Intentional malicious collisions can be forged in seconds (e.g. Flame malware).
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800">SHA-1</td>
                <td className="py-3 px-4 font-mono">160 bits (40 hex)</td>
                <td className="py-3 px-4 font-mono">2⁸⁰ items</td>
                <td className="py-3 px-4 text-amber-700 font-semibold">
                  Broken (SHAttered attack 2017)
                </td>
                <td className="py-3 px-4 text-slate-600">
                  Deprecated by NIST. Two different PDFs forged with identical SHA-1.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800">CRC32</td>
                <td className="py-3 px-4 font-mono">32 bits (8 hex)</td>
                <td className="py-3 px-4 font-mono">2¹⁶ (65,536 items)</td>
                <td className="py-3 px-4 text-rose-600 font-semibold">
                  Trivial Collisions (Not Cryptographic)
                </td>
                <td className="py-3 px-4 text-slate-600">
                  Only suitable for transmission error checking, never for content deduplication.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800">BLAKE3 / xxHash64</td>
                <td className="py-3 px-4 font-mono">256 / 64 bits</td>
                <td className="py-3 px-4 font-mono">2¹²⁸ / 2³² items</td>
                <td className="py-3 px-4 text-slate-700">
                  Tree-hashing (Fast SIMD throughput)
                </td>
                <td className="py-3 px-4 text-slate-600">
                  High-speed complement for NVMe streaming pipelines.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
