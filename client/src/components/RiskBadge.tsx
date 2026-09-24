import React from 'react';
import type { RescueRiskLevel } from '../types';
import { AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  riskLevel?: RescueRiskLevel | string;
  riskReason?: string;
  showIcon?: boolean;
}

export const RiskBadge: React.FC<Props> = ({ riskLevel = 'LOW', riskReason, showIcon = true }) => {
  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
  let Icon = ShieldCheck;

  switch (riskLevel) {
    case 'CRITICAL':
      badgeStyle = 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse';
      Icon = AlertTriangle;
      break;
    case 'HIGH':
      badgeStyle = 'bg-orange-950 text-orange-300 border-orange-700';
      Icon = AlertCircle;
      break;
    case 'MEDIUM':
      badgeStyle = 'bg-amber-950 text-amber-300 border-amber-700';
      Icon = AlertCircle;
      break;
    case 'LOW':
      badgeStyle = 'bg-emerald-950 text-emerald-300 border-emerald-800';
      Icon = ShieldCheck;
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyle}`}
      title={riskReason || `Rescue Risk Level: ${riskLevel}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>RESCUE RISK: {riskLevel}</span>
    </span>
  );
};
