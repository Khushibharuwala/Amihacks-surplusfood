import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import { AlertTriangle, ShieldAlert, CheckCircle2, Lightbulb, RefreshCw } from 'lucide-react';

export const SmartAlertsBanner: React.FC = () => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<{ recommendations: any[] }>('/analytics/operational-recommendations');
      setRecommendations(data.recommendations || []);
    } catch (e) {
      console.error('Failed to load operational recommendations', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  if (loading || recommendations.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-bold text-xs text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-400" /> Real-Time Intelligent Operational Recommendations
        </span>
        <button
          onClick={loadRecommendations}
          className="text-slate-400 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recommendations.map((rec) => {
          let style = 'bg-slate-950/80 border-slate-800 text-slate-300';
          let icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;

          if (rec.urgency === 'HIGH') {
            style = 'bg-rose-950/40 border-rose-800/80 text-rose-200';
            icon = <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />;
          } else if (rec.urgency === 'MEDIUM') {
            style = 'bg-amber-950/40 border-amber-800/80 text-amber-200';
            icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
          }

          return (
            <div key={rec.id} className={`p-3.5 rounded-xl border text-xs space-y-1 ${style}`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {icon}
                <span>{rec.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">{rec.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
