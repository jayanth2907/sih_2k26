import React from 'react';
import { Shield, Radio, Info } from 'lucide-react';

export const MineOverviewLegend: React.FC = () => {
  return (
    <div className="bg-[#0D100F]/95 backdrop-blur-md border border-[#232A26] rounded-lg px-4 py-2 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
      {/* Risk vocabulary */}
      <div className="flex flex-wrap items-center gap-4 text-slate-300">
        <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Risk Vocabulary:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs shadow-rose-500/50" />
          <span className="text-rose-300 font-bold">CRITICAL</span> (85-100)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs shadow-orange-500/50" />
          <span className="text-orange-300 font-bold">HIGH</span> (70-84)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500/50" />
          <span className="text-amber-300 font-bold">MED</span> (40-69)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
          <span className="text-emerald-300 font-bold">LOW</span> (0-39)
        </span>
      </div>

      {/* Provenance breakdown */}
      <div className="flex flex-wrap items-center gap-3 text-slate-400 border-l border-[#1B211E] pl-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-xs bg-emerald-400" />
          <span>Source-Derived Real Mine</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-xs bg-purple-400" />
          <span>Simulated Fleet</span>
        </span>
      </div>
    </div>
  );
};
