import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import type { Donation, RescueRiskLevel } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { LiveCountdown } from '../components/LiveCountdown';
import { RescueTimeline } from '../components/RescueTimeline';
import { RescueMap } from '../components/RescueMap';
import { ShieldCheck, RefreshCw, Filter, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export const LiveRescuesPage: React.FC = () => {
  const [rescues, setRescues] = useState<Donation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadRescues = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<{ rescues: Donation[] }>('/rescues/live');
      setRescues(data.rescues);
    } catch (e) {
      console.error('Failed to load live rescues', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRescues();
    const interval = setInterval(loadRescues, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredRescues = rescues.filter((r) => {
    if (filterRisk === 'ALL') return true;
    if (filterRisk === 'CRITICAL') return r.risk_level === 'CRITICAL';
    if (filterRisk === 'HIGH') return r.risk_level === 'HIGH';
    if (filterRisk === 'MEDIUM') return r.risk_level === 'MEDIUM';
    if (filterRisk === 'LOW') return r.risk_level === 'LOW';
    if (filterRisk === 'IN_TRANSIT') return ['PICKUP_STARTED', 'PICKED_UP'].includes(r.status);
    if (filterRisk === 'DELIVERED') return r.status === 'DELIVERED';
    return true;
  });

  if (loading && rescues.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-800/40 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Live Operational Dispatch Center
          </span>
          <h2 className="text-2xl font-bold text-slate-100">Live Rescue Operations Command</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of active food rescue missions, risk calculations, route logistics, and state changes.
          </p>
        </div>

        <button
          onClick={loadRescues}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer self-start"
        >
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          <span>Refresh Live Operations</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span>Filter Rescues:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'IN_TRANSIT', 'DELIVERED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterRisk(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterRisk === f
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Live Rescue Cards List */}
      <div className="space-y-6">
        {filteredRescues.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
            No live rescues matching filter criteria.
          </div>
        ) : (
          filteredRescues.map((rescue) => {
            const isExpanded = expandedId === rescue.id;
            return (
              <div
                key={rescue.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 shadow-xl space-y-6 transition-all"
              >
                {/* Card Top Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-emerald-950 text-emerald-300 font-bold text-sm border border-emerald-800">
                        {rescue.quantity_kg} kg {rescue.food_type}
                      </span>
                      <RiskBadge riskLevel={rescue.risk_level as RescueRiskLevel} riskReason={rescue.risk_reason} />
                      <StatusBadge status={rescue.status} />
                    </div>
                    <h3 className="font-bold text-lg text-slate-100 mt-2">{rescue.description}</h3>
                    <p className="text-xs text-slate-400">
                      Donor: <strong className="text-white">{rescue.donor_name}</strong> ({rescue.pickup_address})
                    </p>
                  </div>

                  <div className="flex flex-col md:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Safe Time Remaining:</span>
                      <LiveCountdown safeUntil={rescue.safe_until} />
                    </div>

                    {rescue.match_score !== undefined && (
                      <span className="text-xs font-bold text-cyan-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        Match Score: {rescue.match_score}/100
                      </span>
                    )}
                  </div>
                </div>

                {/* Logistics Route Map Abstraction */}
                <RescueMap
                  donorName={rescue.donor_name}
                  donorAddress={rescue.pickup_address}
                  ngoName={rescue.ngo_name || 'Searching recipient shelter...'}
                  ngoAddress={rescue.ngo_address || 'TBD'}
                  driverName={rescue.driver_name || 'Searching driver...'}
                  vehicleType={rescue.vehicle_type || 'Dispatch Vehicle'}
                  distanceKm={rescue.distance_km || 3.2}
                  estimatedMinutes={rescue.estimated_minutes || 18}
                />

                {/* Live Status Timeline */}
                <RescueTimeline status={rescue.status} logs={rescue.timeline} />

                {/* "Why This Match?" Explanation Accordion */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : rescue.id)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider cursor-pointer"
                  >
                    <span>WHY THIS MATCH? (Explainable Decision Engine Reasons)</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-cyan-400" />}
                  </button>

                  {isExpanded && (
                    <div className="space-y-2 pt-2 border-t border-slate-900 text-xs text-slate-300">
                      {rescue.match_reasons && rescue.match_reasons.length > 0 ? (
                        rescue.match_reasons.map((reason, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{reason}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 italic">Matching process evaluation details active.</p>
                      )}
                      {rescue.risk_reason && (
                        <p className="text-amber-400 font-semibold pt-1 border-t border-slate-900/60">
                          Risk Diagnostic: {rescue.risk_reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
