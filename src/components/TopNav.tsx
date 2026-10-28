/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ViewTab } from '../types/dedup';
import { HardDrive, FolderOpen } from 'lucide-react';

interface TopNavProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onOpenFolderPicker: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onTabChange,
  onOpenFolderPicker,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
          <HardDrive className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-base font-bold tracking-tight text-slate-900">
          DedupCore
        </span>
      </div>

      {/* Zone 2: 4 single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
        <button
          onClick={() => onTabChange('detector')}
          className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
            activeTab === 'detector'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Pipeline & Scanner
        </button>
        <button
          onClick={() => onTabChange('data_structures')}
          className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
            activeTab === 'data_structures'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Data Structure Lab
        </button>
        <button
          onClick={() => onTabChange('resolver')}
          className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
            activeTab === 'resolver'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Resolve & Reclaim
        </button>
        <button
          onClick={() => onTabChange('benchmarks')}
          className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
            activeTab === 'benchmarks'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Complexity Benchmarks
        </button>
        <button
          onClick={() => onTabChange('c_backend')}
          className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 flex items-center gap-1.5 ${
            activeTab === 'c_backend'
              ? 'border-emerald-600 text-emerald-800 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>C Backend Engine</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenFolderPicker}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 shadow-sm"
        >
          <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
          <span>Scan Real Folder</span>
        </button>
      </div>
    </header>
  );
};
