import React from 'react';

interface Props {
  safeUntil: string;
}

export const UrgencyBadge: React.FC<Props> = ({ safeUntil }) => {
  const now = new Date();
  const safeUntilDate = new Date(safeUntil);
  const diffMinutes = Math.floor((safeUntilDate.getTime() - now.getTime()) / 60000);

  if (diffMinutes <= 0) {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800">
        Expired
      </span>
    );
  }

  let label = 'Low';
  let badgeClass = 'bg-emerald-950 text-emerald-400 border-emerald-800';

  if (diffMinutes < 60) {
    label = 'Critical';
    badgeClass = 'bg-red-950 text-red-300 border-red-700 animate-pulse';
  } else if (diffMinutes < 120) {
    label = 'High';
    badgeClass = 'bg-orange-950 text-orange-300 border-orange-700';
  } else if (diffMinutes < 240) {
    label = 'Medium';
    badgeClass = 'bg-amber-950 text-amber-300 border-amber-700';
  }

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass}`}
      title={`Safe donation window expires in ${timeStr}`}
    >
      <span>{label}</span>
      <span className="opacity-75 font-normal">({timeStr} left)</span>
    </span>
  );
};
