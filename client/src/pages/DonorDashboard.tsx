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

import { triggerConfetti } from '../utils/confetti';

export const DonorDashboard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [matchNotice, setMatchNotice] = useState<MatchResult | null>(null);
  const [retryId, setRetryId] = useState<string | null>(null);
  const [newlyPostedDonationId, setNewlyPostedDonationId] = useState<string | null>(null);

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

  const handleOpenCategoryIntake = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setShowModal(true);
  };

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
      {/* Playful Animated Vercel-Style Hero Banner */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl card-lift">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7 space-y-4">
            <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 font-bold text-xs border border-orange-500/30 uppercase tracking-widest inline-block">
              {profile?.organization_name || 'Food Donor Portal'}
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 font-display leading-tight">
              Extra Food, <span className="text-orange-500 block">Extra Hope ✨</span>
            </h1>

            <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
              Post surplus food in seconds — our AI decision engine matches it to a nearby shelter and dispatches a driver before it spoils.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedCategory(undefined);
                  setShowModal(true);
                }}
                className="px-6 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-black text-sm shadow-xl shadow-orange-500/30 transition-all transform hover:-translate-y-1 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-white animate-bounce" />
                <span>POST SURPLUS FOOD (AI INTAKE) ↓</span>
              </button>

              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-semibold">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>{profile?.address}</span>
              </span>
            </div>
          </div>

          {/* Floating Mascot & Doodles Illustration */}
          <div className="md:col-span-5 relative h-56 flex items-center justify-center">
            <span className="absolute top-2 left-4 text-3xl animate-float" style={{ animationDelay: '0.2s' }}>🍅</span>
            <span className="absolute top-4 right-6 text-2xl animate-float" style={{ animationDelay: '0.9s' }}>✨</span>
            <span className="absolute bottom-6 left-2 text-2xl animate-float" style={{ animationDelay: '1.4s' }}>🥗</span>
            <span className="absolute bottom-2 right-8 text-3xl animate-float" style={{ animationDelay: '0.5s' }}>💚</span>

            <div className="text-8xl select-none animate-bob filter drop-shadow-2xl">
              🍛
            </div>

            <div className="absolute top-2 right-0 bg-slate-800/90 border border-slate-700 p-3 rounded-2xl shadow-xl flex items-center gap-3 animate-float">
              <span className="text-2xl">🚚</span>
              <div>
                <strong className="text-xs text-slate-100 block">Fast Volunteer Dispatch</strong>
                <span className="text-[10px] text-orange-400 font-bold">Verified Recipients</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Category Chips Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 block mb-3 uppercase tracking-wider">
            Quick Donate by Food Category:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Cooked Meal', icon: '🍛', color: 'from-orange-500/20 to-amber-500/20 border-orange-500/40 text-orange-300' },
              { label: 'Bakery', icon: '🥖', color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-300' },
              { label: 'Produce', icon: '🥗', color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/40 text-emerald-300' },
              { label: 'Packaged', icon: '📦', color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300' },
              { label: 'Beverages', icon: '🥤', color: 'from-cyan-500/20 to-teal-500/20 border-cyan-500/40 text-cyan-300' },
              { label: 'Desserts', icon: '🍰', color: 'from-pink-500/20 to-rose-500/20 border-pink-500/40 text-pink-300' },
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleOpenCategoryIntake(chip.label)}
                className={`p-3 rounded-2xl bg-gradient-to-b ${chip.color} border hover:border-orange-400 transition-all transform hover:-translate-y-2 hover:scale-105 active:scale-95 text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-md group`}
              >
                <span className="text-3xl group-hover:scale-125 transition-transform duration-300">{chip.icon}</span>
                <span className="text-xs font-bold font-display">{chip.label}</span>
              </button>
            ))}
          </div>
        </div>
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
                  </div>
                </div>

                {/* Package Security & Unique QR Code Generator Callout Banner */}
                <div className="bg-emerald-950/80 border border-emerald-700/80 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-200 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-900/90 text-emerald-400 border border-emerald-700/70 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-100 text-sm block">Package Verification QR Code & Security Seal</span>
                      <span className="text-slate-300">Generate, print, or download your unique packet QR code. Driver scans this code at pickup to verify authenticity.</span>
                    </div>
                  </div>
                  <PackageQrGenerator
                    donationId={don.id}
                    foodType={don.food_type}
                    quantityKg={don.quantity_kg}
                    autoOpen={newlyPostedDonationId === don.id}
                  />
                </div>

                {/* Attractive Food Photo Banner */}
                {don.image_url && (
                  <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-700/80 relative shadow-md">
                    <img src={don.image_url} alt={don.food_type} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex items-end justify-between p-3">
                      <span className="text-xs font-bold text-white bg-orange-600 px-3 py-1 rounded-lg border border-orange-400 shadow-md">
                        {don.food_type} • {don.quantity_kg} kg
                      </span>
                      <span className="text-[11px] font-semibold text-slate-200 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700">
                        {don.description}
                      </span>
                    </div>
                  </div>
                )}

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
              initialCategory={selectedCategory}
              onCancel={() => setShowModal(false)}
              onSuccess={(matchResult, donation) => {
                triggerConfetti();
                setMatchNotice(matchResult);
                if (donation && donation.id) {
                  setNewlyPostedDonationId(donation.id);
                }
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
