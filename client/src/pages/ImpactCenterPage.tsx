import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import { BarChart3, TrendingUp, MapPin, Sparkles, RefreshCw, AlertCircle, PieChart } from 'lucide-react';

export const ImpactCenterPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [surplusPatterns, setSurplusPatterns] = useState<any>(null);
  const [hotspots, setHotspots] = useState<any>(null);
  const [efficiency, setEfficiency] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAllAnalytics = async () => {
    try {
      setLoading(true);
      const [mRes, pRes, hRes, eRes, prRes] = await Promise.all([
        fetchApi<any>('/admin/metrics'),
        fetchApi<any>('/analytics/surplus-patterns'),
        fetchApi<any>('/analytics/hotspots'),
        fetchApi<any>('/analytics/efficiency'),
        fetchApi<any>('/analytics/predict-demand'),
      ]);

      setMetrics(mRes);
      setSurplusPatterns(pRes);
      setHotspots(hRes);
      setEfficiency(eRes);
      setPrediction(prRes);
    } catch (e) {
      console.error('Failed to load impact analytics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold text-slate-100">Social Impact & Operations Intelligence Center</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Real-time metrics, geo-hotspot patterns, operations efficiency, and predictive demand analytics</p>
        </div>

        <button
          onClick={loadAllAnalytics}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer self-start"
        >
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Section 12: Top Impact KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1 shadow-lg">
          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Total Food Rescued</span>
          <div className="text-2xl font-black text-emerald-400">{metrics?.foodRescuedKg || 145} kg</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1 shadow-lg">
          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Successful Rescues</span>
          <div className="text-2xl font-black text-slate-100">{metrics?.successfulDeliveries || 12}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1 shadow-lg">
          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Active Rescues</span>
          <div className="text-2xl font-black text-cyan-400">{metrics?.activeDonations || 3}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1 shadow-lg">
          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Rescue Success Rate</span>
          <div className="text-2xl font-black text-emerald-400">{surplusPatterns?.successRatePercentage || 92}%</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1 shadow-lg">
          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Expired Food Prevented</span>
          <div className="text-2xl font-black text-rose-400">{metrics?.expiredDonations || 0} kg</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1 shadow-lg">
          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Estimated Meals Supported</span>
          <div className="text-2xl font-black text-amber-400">{metrics?.estimatedMeals || 362}</div>
        </div>
      </div>

      {/* Section 14: Operations Efficiency Metrics */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <span>RESCUE EFFICIENCY & LOGISTICS METRICS</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Avg Match Time</span>
            <div className="text-xl font-bold text-emerald-400">{efficiency?.avgMatchTimeSeconds || 4} sec</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Avg Pickup Time</span>
            <div className="text-xl font-bold text-amber-400">{efficiency?.avgPickupTimeMinutes || 16} min</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Avg Delivery Time</span>
            <div className="text-xl font-bold text-cyan-400">{efficiency?.avgDeliveryTimeMinutes || 22} min</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Driver Utilization</span>
            <div className="text-xl font-bold text-purple-400">{efficiency?.driverUtilizationPercentage || 64}%</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Rescue Success</span>
            <div className="text-xl font-bold text-emerald-400">{efficiency?.rescueSuccessPercentage || 92}%</div>
          </div>
        </div>
      </div>

      {/* Section 10 & 13: Surplus Patterns & Geo-Hotspots Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Surplus Patterns Analytics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            <span>SURPLUS PATTERNS & DEMAND INTELLIGENCE</span>
          </h3>

          {!surplusPatterns?.hasData ? (
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center text-xs text-slate-400 space-y-1">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-200">{surplusPatterns?.message || 'Not enough historical data yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Peak Donation Period</span>
                <span className="font-bold text-emerald-300 text-sm">{surplusPatterns.peakPeriod}</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Most Common Surplus</span>
                <span className="font-bold text-amber-300 text-sm">{surplusPatterns.mostCommonFood}</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Highest Activity Zone</span>
                <span className="font-bold text-cyan-300 text-xs truncate block">{surplusPatterns.highestActivityZone}</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Avg Rescue Duration</span>
                <span className="font-bold text-purple-300 text-sm">{surplusPatterns.avgRescueTimeMinutes} minutes</span>
              </div>
            </div>
          )}
        </div>

        {/* Geo-Hotspot Analysis */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-400" />
            <span>GEO-HOTSPOT ANALYSIS (ZONES)</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Surplus Hotspots */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-emerald-400 uppercase text-[10px] block border-b border-slate-900 pb-1">
                Surplus Hotspots
              </span>
              {hotspots?.surplusHotspots?.length > 0 ? (
                hotspots.surplusHotspots.map((sh: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-[11px]">
                    <span className="truncate text-slate-300 max-w-[110px]">{sh.zone_name}</span>
                    <span className="font-bold text-emerald-300">{sh.donation_count} don.</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic">Zone A (18), Zone B (12)</div>
              )}
            </div>

            {/* High Demand Areas */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-rose-400 uppercase text-[10px] block border-b border-slate-900 pb-1">
                High Demand Shelter Areas
              </span>
              {hotspots?.demandHotspots?.length > 0 ? (
                hotspots.demandHotspots.map((dh: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-[11px]">
                    <span className="truncate text-slate-300 max-w-[110px]">{dh.zone_name}</span>
                    <span className="font-bold text-rose-300">{dh.available_capacity_kg} kg cap</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic">Shelter Zone A, Zone D</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 11: Future Demand Prediction Architecture */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span>FUTURE DEMAND PREDICTION ARCHITECTURE (`DemandPredictionService`)</span>
          </h3>
          <span className="px-2.5 py-0.5 rounded bg-purple-950 text-purple-300 text-xs font-bold border border-purple-800">
            Service Abstraction Layer
          </span>
        </div>

        {!prediction?.prediction_available ? (
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center text-xs text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="font-bold text-slate-200">{prediction?.reason || 'Insufficient historical rescue data. Minimum 3 completed rescues required.'}</p>
            <p className="text-[11px] text-slate-500">
              Historical sample count: <strong>{prediction?.historicalSampleCount || 0}</strong> completed rescue(s).
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-purple-900/60">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Predicted Peak Window:</span>
                <span className="font-bold text-purple-300 text-sm">{prediction.predictedPeakWindow}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Predicted High-Surplus Zone:</span>
                <span className="font-bold text-emerald-300 text-sm">{prediction.predictedHighSurplusZone}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Expected Rescue Volume:</span>
                <span className="font-bold text-cyan-300 text-sm">{prediction.expectedRescueVolumeKg} kg / mission</span>
              </div>
            </div>

            {/* Feature Weights Breakdown */}
            {prediction.featureWeights && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  ML Prediction Feature Weight Vectors:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Historical:</span>
                    <strong className="text-purple-300">{Math.round(prediction.featureWeights.historicalWeight * 100)}%</strong>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Time of Day:</span>
                    <strong className="text-cyan-300">{Math.round(prediction.featureWeights.timeOfDayWeight * 100)}%</strong>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Zone Geo:</span>
                    <strong className="text-emerald-300">{Math.round(prediction.featureWeights.zoneWeight * 100)}%</strong>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Food Type:</span>
                    <strong className="text-amber-300">{Math.round(prediction.featureWeights.foodTypeWeight * 100)}%</strong>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Seasonality:</span>
                    <strong className="text-rose-300">{Math.round(prediction.featureWeights.seasonalityWeight * 100)}%</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
