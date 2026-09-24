import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import type { AdminMetrics, Donation } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { LiveCountdown } from '../components/LiveCountdown';
import { ShieldCheck, Utensils, Heart, Truck, CheckCircle2, Clock, AlertTriangle, RefreshCw, BarChart3, Filter } from 'lucide-react';

interface Props {
  onNavigateToRescues?: () => void;
  onNavigateToImpact?: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ onNavigateToRescues, onNavigateToImpact }) => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [activeDonations, setActiveDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<{
        metrics: AdminMetrics;
        activeDonations: Donation[];
      }>('/admin/dashboard');

      setMetrics(data.metrics);
      setActiveDonations(data.activeDonations);
    } catch (e) {
      console.error('Failed to load admin dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredDonations = activeDonations.filter((d) => {
    if (filter === 'ALL') return true;
    if (filter === 'CRITICAL') return d.status !== 'DELIVERED' && d.status !== 'EXPIRED';
    if (filter === 'IN_TRANSIT') return ['PICKUP_STARTED', 'PICKED_UP'].includes(d.status);
    if (filter === 'COMPLETED') return d.status === 'DELIVERED';
    if (filter === 'EXPIRED') return d.status === 'EXPIRED';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Operational Command Center
          </span>
          <h2 className="text-2xl font-bold text-slate-100">Rescue Logistics & Dispatch Operations</h2>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToRescues && (
            <button
              onClick={onNavigateToRescues}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Open Live Rescues Control
            </button>
          )}

          {onNavigateToImpact && (
            <button
              onClick={onNavigateToImpact}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              View Impact Analytics
            </button>
          )}

          <button
            onClick={loadDashboard}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* METRICS GRID CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Active Donations</span>
            <Utensils className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">{metrics?.activeDonations}</div>
          <span className="text-[10px] text-slate-500">Live in system</span>
        </div>

        <div className="bg-slate-900 border border-emerald-900/50 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase text-emerald-400">Food Rescued</span>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">{metrics?.foodRescuedKg} <span className="text-xs">kg</span></div>
          <span className="text-[10px] text-emerald-500/80">Diverted from waste</span>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-700/60 p-4 rounded-xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase text-emerald-400">Estimated Meals</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-200">{metrics?.estimatedMeals}</div>
          <span className="text-[10px] text-slate-400">@ {metrics?.mealsPerKgFactor} meals/kg</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Active NGOs</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">{metrics?.activeNgos}</div>
          <span className="text-[10px] text-slate-500">Shelters connected</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Available Drivers</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">{metrics?.availableDrivers}</div>
          <span className="text-[10px] text-slate-500">Volunteers online</span>
        </div>

        <div className="bg-slate-900 border border-rose-900/40 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase text-rose-400">Expired</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{metrics?.expiredDonations}</div>
          <span className="text-[10px] text-rose-500/80">Unmatched before expiry</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span>Operational Filter:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'CRITICAL', 'IN_TRANSIT', 'COMPLETED', 'EXPIRED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === f
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* LIVE DONATION LOGISTICS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span>Live Food Rescue Monitor ({filteredDonations.length})</span>
          </span>
        </h3>

        {filteredDonations.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No donations matching filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Food & Description</th>
                  <th className="py-3 px-3">Quantity</th>
                  <th className="py-3 px-3">Donor</th>
                  <th className="py-3 px-3">Recipient NGO</th>
                  <th className="py-3 px-3">Assigned Driver</th>
                  <th className="py-3 px-3">Match Score</th>
                  <th className="py-3 px-3">Remaining Window</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDonations.map((don) => (
                  <tr key={don.id} className="hover:bg-slate-800/50 transition-all">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-200 block">{don.food_type}</span>
                      <span className="text-slate-400 text-[11px]">{don.description}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-emerald-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        {don.quantity_kg} kg
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-medium">{don.donor_name}</td>
                    <td className="py-3 px-3">
                      {don.ngo_name ? (
                        <span className="text-rose-300 font-semibold">{don.ngo_name}</span>
                      ) : (
                        <span className="text-slate-500 italic">Unmatched</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {don.driver_name ? (
                        <span className="text-amber-300 font-semibold">{don.driver_name}</span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {don.match_score !== undefined && don.match_score !== null ? (
                        <span className="font-bold text-cyan-300">{don.match_score}/100</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <LiveCountdown safeUntil={don.safe_until} />
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={don.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
