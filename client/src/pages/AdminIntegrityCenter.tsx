import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import { EvidenceComparisonCard } from '../components/EvidenceComparisonCard';
import { ChainOfCustodyTimeline } from '../components/ChainOfCustodyTimeline';
import { RescueFeasibilityCard } from '../components/RescueFeasibilityCard';
import { ShieldCheck, AlertTriangle, RefreshCw, Search, Activity } from 'lucide-react';

export const AdminIntegrityCenter: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRescue, setSelectedRescue] = useState<any>(null);
  const [custodyDetails, setCustodyDetails] = useState<any>(null);

  const loadIntegrityData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/packages/admin/integrity-center');
      setData(res);
    } catch (e) {
      console.error('Failed to load integrity center data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrityData();
    const interval = setInterval(loadIntegrityData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleInspectRescue = async (rescue: any) => {
    setSelectedRescue(rescue);
    try {
      const details = await fetchApi<any>(`/packages/donation/${rescue.id}`);
      setCustodyDetails(details);
    } catch (e) {
      console.error('Failed to fetch custody details', e);
    }
  };

  const handleResolveDispute = async (disputeId: string, action: 'RESOLVE' | 'ESCALATE') => {
    try {
      await fetchApi('/packages/admin/resolve-dispute', {
        method: 'POST',
        body: JSON.stringify({
          disputeId,
          action,
          resolution: action === 'RESOLVE' ? 'Admin reviewed photographic evidence and verified delivery integrity.' : 'Escalated for operational investigation.',
        }),
      });
      alert(`Dispute ${action === 'RESOLVE' ? 'Resolved' : 'Escalated'} successfully.`);
      loadIntegrityData();
      if (selectedRescue) {
        handleInspectRescue(selectedRescue);
      }
    } catch (e: any) {
      alert(e.message || 'Action failed');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-orange-400">
        <RefreshCw className="w-8 h-8 animate-spin mr-2" /> Loading Rescue Integrity Command Center...
      </div>
    );
  }

  const rescues = data?.rescues || [];
  const metrics = data?.metrics || { totalRescues: 0, verifiedRescues: 0, packageVerificationRate: 100, activeDisputesCount: 0 };

  const filteredRescues = rescues.filter((r: any) => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        r.food_type.toLowerCase().includes(q) ||
        r.donor_name?.toLowerCase().includes(q) ||
        r.ngo_name?.toLowerCase().includes(q) ||
        r.sealCode?.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    if (activeFilter === 'VERIFIED') return r.verificationStatus === 'VERIFIED' || r.integrityStatus === 'VERIFIED';
    if (activeFilter === 'DISPUTED') return r.activeDisputesCount > 0 || r.verificationStatus === 'SEAL_BROKEN' || r.verificationStatus === 'DISPUTED';
    if (activeFilter === 'AT_RISK') return r.integrityStatus === 'AT_RISK' || r.integrityStatus === 'ATTENTION_REQUIRED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner & Status Summary Counters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-orange-400" />
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">RESCUE INTEGRITY CONTROL CENTER</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">Real-time anti-tamper chain of custody monitoring, photographic evidence audit, and seal verification engine</p>
          </div>

          <button
            onClick={loadIntegrityData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer self-start"
          >
            <RefreshCw className={`w-4 h-4 text-orange-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Integrity Grid</span>
          </button>
        </div>

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Total Rescue Operations</span>
            <div className="text-2xl font-black text-slate-100">{metrics.totalRescues}</div>
          </div>

          <div className="bg-emerald-950/50 border border-emerald-800 p-4 rounded-xl space-y-1">
            <span className="text-emerald-300 font-bold uppercase tracking-wider block text-[10px]">Verified Deliveries</span>
            <div className="text-2xl font-black text-emerald-400">{metrics.verifiedRescues}</div>
          </div>

          <div className="bg-orange-950/50 border border-orange-800 p-4 rounded-xl space-y-1">
            <span className="text-orange-300 font-bold uppercase tracking-wider block text-[10px]">Package Seal Compliance Rate</span>
            <div className="text-2xl font-black text-orange-400">{metrics.packageVerificationRate}%</div>
          </div>

          <div className="bg-rose-950/50 border border-rose-800 p-4 rounded-xl space-y-1">
            <span className="text-rose-300 font-bold uppercase tracking-wider block text-[10px]">Active Disputes / Alerts</span>
            <div className="text-2xl font-black text-rose-400">{metrics.activeDisputesCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold w-full sm:w-auto">
          {['ALL', 'VERIFIED', 'DISPUTED', 'AT_RISK'].map((flt) => (
            <button
              key={flt}
              onClick={() => setActiveFilter(flt)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeFilter === flt ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {flt.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by rescue, seal ID, donor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Rescues Integrity Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-400" />
            <span>Chain of Custody Integrity Ledger ({filteredRescues.length})</span>
          </h3>
          <span className="text-xs text-slate-500">Click any rescue to inspect side-by-side evidence & custody timeline</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Rescue ID / Food</th>
                <th className="py-3 px-4">Seal ID</th>
                <th className="py-3 px-4">Participants</th>
                <th className="py-3 px-4">Evidence Status</th>
                <th className="py-3 px-4">Integrity Score</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredRescues.map((rescue: any) => (
                <tr key={rescue.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-100">{rescue.food_type} ({rescue.quantity_kg} kg)</div>
                    <div className="font-mono text-[10px] text-orange-400">#{rescue.id.replace('don_', 'RS-').toUpperCase()}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-orange-400">
                    <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30">
                      {rescue.sealCode}
                    </span>
                  </td>
                  <td className="py-3 px-4 space-y-0.5 text-[11px]">
                    <div>Donor: <strong className="text-slate-200">{rescue.donor_name}</strong></div>
                    <div>NGO: <strong className="text-slate-200">{rescue.ngo_name || 'Pending'}</strong></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded ${rescue.hasDonorPhoto ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-500'}`}>
                        Donor 📷
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${rescue.hasDriverPhoto ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-500'}`}>
                        Driver 📷
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${rescue.hasNgoPhoto ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-500'}`}>
                        NGO 📷
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-black text-sm ${rescue.integrityScore > 80 ? 'text-emerald-400' : rescue.integrityScore > 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {rescue.integrityScore}/100
                      </span>
                      {rescue.activeDisputesCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-bold text-[10px]">
                          🚨 DISPUTE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleInspectRescue(rescue)}
                      className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs cursor-pointer"
                    >
                      INSPECT CUSTODY
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECTOR DRAWER / MODAL */}
      {selectedRescue && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                    <span>Rescue Integrity Inspector</span>
                    <span className="font-mono text-xs text-orange-400">#{selectedRescue.id.replace('don_', 'RS-').toUpperCase()}</span>
                  </h3>
                  <p className="text-xs text-slate-400">Full digital chain of custody timeline, side-by-side evidence, & dispute resolution</p>
                </div>
              </div>
              <button onClick={() => setSelectedRescue(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Feasibility & Score */}
              <RescueFeasibilityCard score={selectedRescue.integrityScore} reasons={selectedRescue.integrityReasons} />

              {/* Side-by-Side Evidence Comparison */}
              <EvidenceComparisonCard
                evidenceList={custodyDetails?.evidencePhotos || []}
                expectedSeal={selectedRescue.sealCode}
              />

              {/* Chain of Custody Audit Trail */}
              <ChainOfCustodyTimeline
                status={selectedRescue.status}
                packages={custodyDetails?.packages || []}
                custodyEvents={custodyDetails?.custodyTimeline || []}
              />

              {/* Active Disputes Section if any */}
              {custodyDetails?.disputes?.length > 0 && (
                <div className="bg-rose-950/80 border border-rose-700 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-400" /> Active Delivery Dispute Reported
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-rose-900 text-rose-200 font-bold uppercase text-[10px]">
                      {custodyDetails.disputes[0].status}
                    </span>
                  </div>

                  <p className="text-rose-200">{custodyDetails.disputes[0].description}</p>
                  <div className="text-[11px] text-rose-300 space-y-1">
                    <div>Expected Seal: <strong className="font-mono">{custodyDetails.disputes[0].expected_seal}</strong></div>
                    <div>Received Seal: <strong className="font-mono">{custodyDetails.disputes[0].received_seal || 'Unknown'}</strong></div>
                  </div>

                  {custodyDetails.disputes[0].status === 'OPEN' && (
                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => handleResolveDispute(custodyDetails.disputes[0].id, 'RESOLVE')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        ✓ Confirm Evidence & Resolve Dispute
                      </button>
                      <button
                        onClick={() => handleResolveDispute(custodyDetails.disputes[0].id, 'ESCALATE')}
                        className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs"
                      >
                        ⚠ Escalate Issue to Operations Team
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedRescue(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
