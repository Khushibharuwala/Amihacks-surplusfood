import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  safeUntil: string;
}

export const LiveCountdown: React.FC<Props> = ({ safeUntil }) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('00:00:00');
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(safeUntil).getTime();
      const diffMs = target - now;

      if (diffMs <= 0) {
        setIsExpired(true);
        setTimeLeftStr('00:00:00');
        return;
      }

      setIsExpired(false);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      const hStr = String(hours).padStart(2, '0');
      const mStr = String(mins).padStart(2, '0');
      const sStr = String(secs).padStart(2, '0');

      setTimeLeftStr(`${hStr}:${mStr}:${sStr}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [safeUntil]);

  if (isExpired) {
    return (
      <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-rose-400 bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-800">
        <Clock className="w-3.5 h-3.5" />
        <span>00:00:00 (EXPIRED)</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-cyan-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 tracking-wider">
      <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
      <span>{timeLeftStr}</span>
    </div>
  );
};
