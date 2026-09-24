import React from 'react';
import { RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';

export const RescueCardSkeleton: React.FC = () => (
  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 animate-pulse">
    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
      <div className="h-6 bg-slate-800 rounded w-28" />
      <div className="h-5 bg-slate-800 rounded w-20" />
    </div>
    <div className="h-32 bg-slate-800 rounded-xl" />
    <div className="space-y-2">
      <div className="h-4 bg-slate-800 rounded w-3/4" />
      <div className="h-3 bg-slate-800 rounded w-1/2" />
    </div>
    <div className="h-10 bg-slate-800 rounded-xl pt-2" />
  </div>
);

export const MatchingProgressLoader: React.FC<{ message?: string }> = ({ message = 'Finding the optimal food rescue partner...' }) => (
  <div className="bg-slate-950 p-6 rounded-2xl border border-orange-500/40 space-y-4 text-xs shadow-2xl">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
      </div>
      <div>
        <h4 className="font-bold text-sm text-slate-100">{message}</h4>
        <p className="text-[11px] text-slate-400">Evaluating multi-candidate logistics constraints in real-time</p>
      </div>
    </div>

    <div className="space-y-2 bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-[11px]">
      <div className="flex items-center gap-2 text-emerald-400">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Evaluating recipient shelter storage capacity & accepted food categories...</span>
      </div>
      <div className="flex items-center gap-2 text-emerald-400">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Calculating shortest travel distance & transit time...</span>
      </div>
      <div className="flex items-center gap-2 text-amber-400 animate-pulse">
        <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
        <span>Matching nearest available volunteer driver vehicle...</span>
      </div>
      <div className="flex items-center gap-2 text-slate-500">
        <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" />
        <span>Verifying safe donation window feasibility...</span>
      </div>
    </div>
  </div>
);

export const LoadingSkeleton: React.FC<{ type?: 'card' | 'matching'; count?: number }> = ({ type = 'card', count = 3 }) => {
  if (type === 'matching') return <MatchingProgressLoader />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <RescueCardSkeleton key={i} />
      ))}
    </div>
  );
};
