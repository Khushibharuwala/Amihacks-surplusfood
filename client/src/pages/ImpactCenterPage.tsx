import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import type { AdminMetrics, Donation } from '../types';
import { BarChart3, CheckCircle2, Heart, RefreshCw, ShieldCheck, Utensils } from 'lucide-react';

export const ImpactCenterPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [allDonations, setAllDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadImpactData = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<{ metrics: AdminMetrics; activeDonations: Donation[] }>('/admin/dashboard');
      setMetrics(data.metrics);
      setAllDonations(data.activeDonations);
    } catch (e) {
      console.error('Failed to load impact analytics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImpactData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const totalAttempted = (metrics?.successfulDeliveries || 0) + (metrics?.expiredDonations || 0);
  const successRate = totalAttempted > 0 ? Math.round(((metrics?.successfulDeliveries || 0) / totalAttempted) * 100) : 100;

  // Food type breakdown calculation
  const categoryMap: Record<string, number> = {};
  allDonations.forEach((d) => {
    if (d.status === 'DELIVERED' || d.status !== 'EXPIRED') {
      categoryMap[d.food_type] = (categoryMap[d.food_type] || 0) + d.quantity_kg;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-400" /> Measured Social Impact Center
          </span>
          <h2 className="text-2xl font-bold text-slate-100">Rescue Impact & Waste Reduction Analytics</h2>
          <p className="text-xs text-slate-400 mt-1">
            Verified, real-time logistics analytics tracking food diverted from landfills to community shelters.
          </p>
        </div>

        <button
          onClick={loadImpactData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer self-start"
        >
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          <span>Refresh Impact Analytics</span>
        </button>
      </div>

      {/* METRICS CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-emerald-900/60 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase text-emerald-400">Total Food Rescued</span>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-300">{metrics?.foodRescuedKg} <span className="text-xs">kg</span></div>
          <span className="text-[10px] text-slate-500 block">Diverted from food waste</span>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-emerald-950/50 border border-emerald-700/60 p-5 rounded-2xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase text-emerald-400">Estimated Meals Supported</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-200">{metrics?.estimatedMeals}</div>
          <span className="text-[10px] text-slate-400 block">@ {metrics?.mealsPerKgFactor} meals/kg approximation</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Rescue Success Rate</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-300">{successRate}%</div>
          <span className="text-[10px] text-slate-500 block">Completed vs Expired ratio</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Active Rescue Partners</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-slate-100">{metrics?.activeNgos} NGOs</div>
          <span className="text-[10px] text-slate-500 block">{metrics?.activeDonors} Donors connected</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Successful Deliveries</span>
            <Utensils className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-slate-100">{metrics?.successfulDeliveries}</div>
          <span className="text-[10px] text-slate-500 block">Missions completed</span>
        </div>
      </div>

      {/* FOOD CATEGORIES BREAKDOWN TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Utensils className="w-5 h-5 text-emerald-400" />
          <span>Rescued Food Volume by Category</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(categoryMap).map(([category, weightKg]) => (
            <div key={category} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">{category} Food</span>
              <div className="text-2xl font-bold text-slate-100">{weightKg} kg</div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${Math.min(100, (weightKg / (metrics?.foodRescuedKg || 1)) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold block">
                ~{Math.round(weightKg * (metrics?.mealsPerKgFactor || 2.5))} meals
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
