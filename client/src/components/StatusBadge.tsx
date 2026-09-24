import React from 'react';
import type { DonationStatus } from '../types';

interface Props {
  status: DonationStatus | string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  let colorStyle = 'bg-slate-700 text-slate-200 border-slate-600';

  switch (status) {
    case 'POSTED':
      colorStyle = 'bg-blue-900/60 text-blue-300 border-blue-700';
      break;
    case 'MATCHING':
      colorStyle = 'bg-indigo-900/60 text-indigo-300 border-indigo-700 animate-pulse';
      break;
    case 'MATCHED':
    case 'DRIVER_ASSIGNED':
      colorStyle = 'bg-amber-900/60 text-amber-300 border-amber-700';
      break;
    case 'PICKUP_STARTED':
    case 'PICKED_UP':
    case 'IN TRANSIT':
      colorStyle = 'bg-purple-900/60 text-purple-300 border-purple-700';
      break;
    case 'DELIVERED':
      colorStyle = 'bg-emerald-900/60 text-emerald-300 border-emerald-700';
      break;
    case 'EXPIRED':
      colorStyle = 'bg-rose-900/60 text-rose-300 border-rose-700';
      break;
    case 'CANCELLED':
      colorStyle = 'bg-gray-800 text-gray-400 border-gray-700';
      break;
  }

  const formatText = (s: string) => s.replace('_', ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorStyle}`}
    >
      {formatText(status)}
    </span>
  );
};
