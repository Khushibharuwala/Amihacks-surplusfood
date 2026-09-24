import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import type { Donation, MatchResult } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { LiveCountdown } from '../components/LiveCountdown';
import { RescueTimeline } from '../components/RescueTimeline';
import { RescueMap } from '../components/RescueMap';
import { PackageQrGenerator } from '../components/PackageQrGenerator';
import { ChainOfCustodyTimeline } from '../components/ChainOfCustodyTimeline';
import { SmartDonationIntake } from '../components/SmartDonationIntake';
import { SmartAlertsBanner } from '../components/SmartAlertsBanner';
import { Utensils, MapPin, AlertCircle, RefreshCw, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export const DonorDashboard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [matchNotice, setMatchNotice] = useState<MatchResult | null>(null);
  const [retryId, setRetryId] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<{ profile: any; donations: Donation[] }>('/donor/dashboard');
      setProfile(data.profile);
      setDonations(data.donations);
    } catch (e) {
      console.error('Failed to load donor dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleRetryMatch = async (donationId: string) => {
    setRetryId(donationId);
    try {
      const res = await fetchApi<{ matchResult: MatchResult }>(`/donations/${donationId}/match`, {
        method: 'POST',
      });
      setMatchNotice(res.matchResult);
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Retry matching failed');
    } finally {
      setRetryId(null);
    }
  };

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
      <div className="bg-gradient-to-r from-emerald-900/60 via-slate-900 to-slate-900 border border-emerald-800/50 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
            Food Donor Portal
          </span>
          <h2 className="text-2xl font-bold text-slate-100">{profile?.organization_name}</h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>{profile?.address}</span>
          </p>
        </div>

        {/* Main CTA Button */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-slate-950" />
          <span>POST SURPLUS FOOD (AI INTAKE)</span>
        </button>
      </div>

      {/* Real-Time Intelligent Operational Recommendations Banner */}
      <SmartAlertsBanner />

      {/* Real-Time Match Result Banner */}
      {matchNotice && (
        <div
          className={`p-5 rounded-2xl border ${
            matchNotice.matched
              ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
              : 'bg-amber-950/60 border-amber-700 text-amber-200'
          } shadow-xl space-y-4`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base">
              {matchNotice.matched ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>MATCH FOUND ✓</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>⚠ RESCUE AT RISK: PENDING MATCH</span>
                </>
              )}
            </div>
            <RiskBadge riskLevel={matchNotice.riskLevel} riskReason={matchNotice.riskReason} />
          </div>

          <p className="text-sm">{matchNotice.message}</p>

          {/* WHY THIS MATCH? Reasons List */}
          {matchNotice.matched && matchNotice.reasons && (
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider block">
                WHY THIS MATCH? (Decision Engine Reasons)
              </span>
              {matchNotice.reasons.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}

          {/* Diagnostic Reasons if No Match */}
          {!matchNotice.matched && matchNotice.noMatchDiagnostics && (
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-amber-400 uppercase tracking-wider block">
                RESCUE DIAGNOSTICS & REASONS:
              </span>
              {matchNotice.noMatchDiagnostics.map((diag, i) => (
                <div key={i} className="flex items-center gap-2 text-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{diag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active & Historical Donations List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Utensils className="w-5 h-5 text-emerald-400" />
          <span>Your Posted Food Rescue Requests ({donations.length})</span>
        </h3>

        {donations.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-12 text-center text-slate-400">
            <Utensils className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-medium">No surplus food donations created yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Click &quot;POST SURPLUS FOOD&quot; above to initiate a real-time rescue mission.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {donations.map((don) => (
              <div
                key={don.id}
                className="bg-slate-800/80 border border-slate-700 hover:border-slate-600 rounded-2xl p-6 shadow-xl space-y-6 transition-all"
              >
                {/* Donation Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 font-bold text-base text-emerald-400">
                      {don.quantity_kg} kg
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-100 text-lg">{don.food_type} Surplus</h4>
                      <p className="text-xs text-slate-400">{don.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <LiveCountdown safeUntil={don.safe_until} />
                    <StatusBadge status={don.status} />
                    <PackageQrGenerator donationId={don.id} foodType={don.food_type} quantityKg={don.quantity_kg} />
                  </div>
                </div>

                {/* Logistics Route Map */}
                <RescueMap
                  donorName={profile?.organization_name}
                  donorAddress={don.pickup_address}
                  ngoName={don.ngo_name || 'Searching recipient shelter...'}
                  ngoAddress={don.ngo_address || 'TBD'}
                  driverName={don.driver_name || 'Assigning available driver...'}
                  vehicleType={don.vehicle_type || 'Dispatch Vehicle'}
                  distanceKm={don.distance_km || 3.2}
                  estimatedMinutes={don.estimated_minutes || 18}
                />

                {/* Status Timeline */}
                <RescueTimeline status={don.status} />

                {/* Secure Chain of Custody Audit Trail */}
                <ChainOfCustodyTimeline status={don.status} />

                {/* No-Match Diagnostic Experience if POSTED */}
                {don.status === 'POSTED' && (
                  <div className="bg-amber-950/40 border border-amber-800/80 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" /> ⚠ RESCUE AT RISK - NO FEASIBLE PARTNER YET
                      </span>
                      <button
                        onClick={() => handleRetryMatch(don.id)}
                        disabled={retryId === don.id}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        {retryId === don.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        <span>RETRY MATCHING</span>
                      </button>
                    </div>
                    <p className="text-xs text-amber-200/90">
                      Our real-time decision engine is scanning for available shelter storage capacity and online drivers.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI SMART DONATION INTAKE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl">
            <SmartDonationIntake
              defaultAddress={profile?.address || ''}
              onCancel={() => setShowModal(false)}
              onSuccess={(matchResult) => {
                setMatchNotice(matchResult);
                setShowModal(false);
                loadDashboard();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
