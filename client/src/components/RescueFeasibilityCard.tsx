import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  score?: number;
  reasons?: string[];
  evaluations?: any[];
  compact?: boolean;
}

export const RescueFeasibilityCard: React.FC<Props> = ({
  score = 92,
  reasons = [
    'Shelter capacity verified',
    'Food category compatible',
    'Volunteer driver available nearby',
    'Route travel time within safe window',
  ],
  compact = false,
}) => {
  let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  let scoreColor = 'text-emerald-400';
  let labelText = 'HIGH FEASIBILITY';

  if (score < 50) {
    badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    scoreColor = 'text-rose-400';
    labelText = 'LOW FEASIBILITY';
  } else if (score < 75) {
    badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    scoreColor = 'text-amber-400';
    labelText = 'MEDIUM FEASIBILITY';
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${badgeColor}`}>
        <ShieldCheck className="w-4 h-4" />
        <span>{score}/100</span>
        <span className="text-[10px] uppercase">{labelText}</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-xs text-slate-200 uppercase tracking-widest">
            Rescue Feasibility Score
          </span>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border font-black text-xs ${badgeColor}`}>
          {labelText}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center p-3 rounded-xl bg-slate-900 border border-slate-800 shrink-0 min-w-[75px]">
          <div className={`text-3xl font-black ${scoreColor}`}>{score}</div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">/ 100</span>
        </div>

        <div className="space-y-1.5 text-xs">
          {reasons.slice(0, 4).map((r, idx) => (
            <div key={idx} className="flex items-center gap-2 text-slate-300 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
