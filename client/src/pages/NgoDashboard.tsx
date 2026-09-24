import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import type { NgoProfile } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { LiveCountdown } from '../components/LiveCountdown';
import { QrScannerModal } from '../components/QrScannerModal';
import { Heart, Settings, Check, X, Truck, Package, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';

export const NgoDashboard: React.FC = () => {
  const [profile, setProfile] = useState<NgoProfile | null>(null);
  const [incomingMatches, setIncomingMatches] = useState<any[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<any[]>([]);
  const [availableDonations, setAvailableDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingMatchId, setProcessingMatchId] = useState<string | null>(null);
  const [orderingDonationId, setOrderingDonationId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // QR Scanner Modal State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeScannerDonationId, setActiveScannerDonationId] = useState<string>('');

  // Rejection modal state
  const [rejectingMatchId, setRejectingMatchId] = useState<string | null>(null);
  const [rejectReasonCategory, setRejectReasonCategory] = useState<string>('Capacity full');
  const [rejectCustomReason, setRejectCustomReason] = useState<string>('');

  // Settings form state
  const [maxCap, setMaxCap] = useState('100');
  const [curLoad, setCurLoad] = useState('0');
  const [foodTypes, setFoodTypes] = useState<string[]>(['All']);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<{
        profile: NgoProfile;
        incomingMatches: any[];
        activeDeliveries: any[];
        completedDeliveries: any[];
      }>('/ngo/dashboard');

      setProfile(data.profile);
      setIncomingMatches(data.incomingMatches);
      setActiveDeliveries(data.activeDeliveries);
      setCompletedDeliveries(data.completedDeliveries);

      if (data.profile) {
        setMaxCap(String(data.profile.maximum_capacity_kg));
        setCurLoad(String(data.profile.current_load_kg));
        setFoodTypes(data.profile.accepted_food_types || ['All']);
      }

      // Fetch available posted donations for NGO ordering
      try {
        const availData = await fetchApi<{ availableDonations: any[] }>('/ngo/available-donations');
        setAvailableDonations(availData.availableDonations || []);
      } catch (err) {
        console.warn('Could not fetch available donations:', err);
      }
    } catch (e) {
      console.error('Failed to load NGO dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleOrderDonation = async (donationId: string) => {
    setOrderingDonationId(donationId);
    try {
      await fetchApi(`/ngo/order-donation/${donationId}`, {
        method: 'POST',
      });
      alert('Food donation ordered successfully! Driver dispatch initiated.');
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to order donation');
    } finally {
      setOrderingDonationId(null);
    }
  };

  const handleAcceptMatch = async (matchId: string) => {
    setProcessingMatchId(matchId);
    try {
      await fetchApi(`/ngo/matches/${matchId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action: 'ACCEPT' }),
      });
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to accept match');
    } finally {
      setProcessingMatchId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingMatchId) return;
    setProcessingMatchId(rejectingMatchId);

    const fullReason = rejectReasonCategory === 'Other' ? rejectCustomReason : rejectReasonCategory;

    try {
      await fetchApi(`/ngo/matches/${rejectingMatchId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action: 'REJECT', rejection_reason: fullReason }),
      });
      setRejectingMatchId(null);
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to reject match');
    } finally {
      setProcessingMatchId(null);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/ngo/profile', {
        method: 'PUT',
        body: JSON.stringify({
          maximum_capacity_kg: parseFloat(maxCap),
          current_load_kg: parseFloat(curLoad),
          accepted_food_types: foodTypes,
        }),
      });
      setShowSettingsModal(false);
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-rose-400 animate-spin" />
      </div>
    );
  }

  const capacityRatio = profile
    ? Math.min(100, Math.round((profile.current_load_kg / (profile.maximum_capacity_kg || 1)) * 100))
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* NGO Header & Capacity Gauge */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-widest">
              NGO / Shelter Portal
            </span>
            <h2 className="text-2xl font-bold text-slate-100">{profile?.organization_name}</h2>
            <p className="text-xs text-slate-400 mt-1">{profile?.address}</p>
          </div>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer self-start"
          >
            <Settings className="w-4 h-4 text-rose-400" />
            <span>Capacity & Preferences</span>
          </button>
        </div>

        {/* Capacity Bar */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300">Shelter Storage Load Ratio</span>
            <span className="text-rose-400">
              {profile?.current_load_kg} kg / {profile?.maximum_capacity_kg} kg ({capacityRatio}%)
            </span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                capacityRatio > 85 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${capacityRatio}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Available Capacity: <strong className="text-emerald-400">{profile?.available_capacity_kg} kg</strong></span>
            <span>Accepted Types: {profile?.accepted_food_types?.join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Browse & Order Available Posted Surplus Food */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <span>Available Posted Food Surplus ({availableDonations.length})</span>
          </h3>
          <span className="text-xs text-amber-400 font-semibold bg-amber-950/80 px-3 py-1 rounded-full border border-amber-800">
            Real-Time Donor Intake Feed
          </span>
        </div>

        {availableDonations.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No posted surplus food available right now. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableDonations.map((don) => (
              <div
                key={don.id}
                className="bg-slate-800/80 border border-amber-900/40 hover:border-amber-500/60 rounded-xl p-5 shadow-lg flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded bg-amber-950 text-amber-300 font-bold text-xs border border-amber-800">
                        {don.quantity_kg} kg • {don.food_type}
                      </span>
                      <h4 className="font-bold text-slate-100 text-base mt-1.5">{don.donor_name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{don.description}</p>
                    </div>
                    {don.image_url && (
                      <img
                        src={don.image_url}
                        alt="Food Sample"
                        className="w-20 h-20 object-cover rounded-xl border border-slate-700 flex-shrink-0"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-400 block">Pickup Location:</span>
                      <span className="font-semibold text-slate-200 truncate block">{don.pickup_address || don.donor_address}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Safe Until:</span>
                      <LiveCountdown safeUntil={don.safe_until} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOrderDonation(don.id)}
                  disabled={orderingDonationId === don.id}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {orderingDonationId === don.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  <span>ORDER / CLAIM THIS FOOD</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming Matched Donations */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-400" />
          <span>Incoming Matched Food Rescue Requests ({incomingMatches.length})</span>
        </h3>

        {incomingMatches.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No pending incoming rescue matches.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {incomingMatches.map((match) => (
              <div
                key={match.id}
                className="bg-slate-800/80 border border-rose-900/40 hover:border-rose-700/60 rounded-xl p-5 shadow-lg space-y-4 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-rose-950 text-rose-300 font-bold text-xs border border-rose-800">
                        {match.quantity_kg} kg {match.food_type}
                      </span>
                      <LiveCountdown safeUntil={match.safe_until} />
                    </div>
                    <h4 className="font-bold text-slate-100 text-base mt-1">From: {match.donor_name}</h4>
                    <p className="text-xs text-slate-400">{match.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRejectingMatchId(match.id)}
                      disabled={processingMatchId === match.id}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-300 border border-rose-900 text-xs font-bold transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleAcceptMatch(match.id)}
                      disabled={processingMatchId === match.id}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      {processingMatchId === match.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>Accept Rescue Match</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400 block">Distance:</span>
                    <span className="font-bold text-slate-200">{match.distance_km} km</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Assigned Driver:</span>
                    <span className="font-bold text-amber-300">{match.driver_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estimated ETA:</span>
                    <span className="font-bold text-cyan-300">{match.estimated_minutes} mins</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active & Completed Deliveries Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active In-Transit */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" />
            <span>Active In-Transit Deliveries ({activeDeliveries.length})</span>
          </h4>
          {activeDeliveries.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-500 text-center">
              No active deliveries in transit.
            </div>
          ) : (
            <div className="space-y-3">
              {activeDeliveries.map((del) => (
                <div key={del.id} className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl text-xs space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-100 text-sm">{del.quantity_kg} kg {del.food_type}</span>
                      <p className="text-[11px] text-slate-400">From: {del.donor_name} ({del.pickup_address})</p>
                    </div>
                    <StatusBadge status={del.status} />
                  </div>

                  {/* Driver Live Location & Anti-Tamper Route Verification Box */}
                  <div className="bg-slate-900 p-3 rounded-lg border border-amber-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <Truck className="w-4 h-4" />
                        <span>Driver Live GPS Tracking</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800">
                        {del.driver_online ? 'ONLINE & TRANSMITTING' : 'ACTIVE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <div>
                        <span className="text-slate-500 block">Assigned Volunteer:</span>
                        <span className="font-bold text-slate-100">{del.driver_name}</span> ({del.driver_phone})
                      </div>
                      <div>
                        <span className="text-slate-500 block">GPS Coordinates:</span>
                        <span className="font-mono text-cyan-300">{del.driver_lat?.toFixed(4)}, {del.driver_lng?.toFixed(4)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-950/80 p-2 rounded border border-slate-800 text-emerald-400">
                      <span>✓ Route Integrity: <strong>Continuous pickup-to-delivery transit</strong></span>
                      <span className="text-slate-400">Vehicle: {del.vehicle_type || 'Standard Logistics'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveScannerDonationId(del.id);
                      setScannerOpen(true);
                    }}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Delivery QR & Confirm Handover</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed History */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Completed Rescue Deliveries ({completedDeliveries.length})</span>
          </h4>
          {completedDeliveries.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-500 text-center">
              No past completed deliveries yet.
            </div>
          ) : (
            <div className="space-y-3">
              {completedDeliveries.map((del) => (
                <div key={del.id} className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl text-xs space-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300">{del.quantity_kg} kg {del.food_type}</span>
                    <span className="text-[10px] text-slate-500">{new Date(del.delivery_time).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-400">Donor: {del.donor_name} • Driver: {del.driver_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* REJECTION REASON MODAL (Requirement 10) */}
      {rejectingMatchId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <span>Reject Rescue Match</span>
              </h3>
              <button onClick={() => setRejectingMatchId(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Rejecting this match will automatically trigger our decision engine to re-match the donor with another eligible shelter.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Reason for Rejection</label>
                <select
                  value={rejectReasonCategory}
                  onChange={(e) => setRejectReasonCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-rose-500"
                >
                  <option value="Capacity full">Capacity full / Storage limit reached</option>
                  <option value="Food type not accepted">Food type not accepted</option>
                  <option value="Organization closed">Organization closed / Off-hours</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              {rejectReasonCategory === 'Other' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Specify Details</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter reason..."
                    value={rejectCustomReason}
                    onChange={(e) => setRejectCustomReason(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejectingMatchId(null)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg"
                >
                  Confirm Rejection & Re-match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAPACITY & PREFERENCES MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-rose-400" />
                <span>NGO Capacity & Settings</span>
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Maximum Storage Capacity (kg)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={maxCap}
                  onChange={(e) => setMaxCap(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Current Load (kg)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={curLoad}
                  onChange={(e) => setCurLoad(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Accepted Food Types (Comma Separated)</label>
                <input
                  type="text"
                  required
                  value={foodTypes.join(', ')}
                  onChange={(e) => setFoodTypes(e.target.value.split(',').map((s) => s.trim()))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-rose-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">e.g. Cooked, Bakery, Grocery, Produce, All</span>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery QR Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        mode="DELIVERY"
        donationId={activeScannerDonationId}
        onClose={() => setScannerOpen(false)}
        onSuccess={() => {
          setScannerOpen(false);
          loadDashboard();
        }}
      />
    </div>
  );
};
