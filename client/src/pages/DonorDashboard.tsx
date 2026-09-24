import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import type { Donation, MatchResult } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { UrgencyBadge } from '../components/UrgencyBadge';
import { PlusCircle, Utensils, Clock, MapPin, Truck, Heart, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export const DonorDashboard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [matchNotice, setMatchNotice] = useState<MatchResult | null>(null);

  // Form state
  const [foodType, setFoodType] = useState('Cooked');
  const [description, setDescription] = useState('');
  const [quantityKg, setQuantityKg] = useState('20');
  const [pickupAddress, setPickupAddress] = useState('');
  const [safeUntilHours, setSafeUntilHours] = useState('4');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<{ profile: any; donations: Donation[] }>('/donor/dashboard');
      setProfile(data.profile);
      setDonations(data.donations);
      if (data.profile?.address) {
        setPickupAddress(data.profile.address);
      }
    } catch (e) {
      console.error('Failed to load donor dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSubmitDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMatchNotice(null);

    try {
      const now = new Date();
      const safeTime = new Date(now.getTime() + parseFloat(safeUntilHours) * 60 * 60 * 1000);

      const res = await fetchApi<{ message: string; donation: Donation; matchResult: MatchResult }>(
        '/donor/donations',
        {
          method: 'POST',
          body: JSON.stringify({
            food_type: foodType,
            description,
            quantity_kg: parseFloat(quantityKg),
            pickup_address: pickupAddress || profile?.address,
            safe_until: safeTime.toISOString(),
          }),
        }
      );

      setMatchNotice(res.matchResult);
      setShowModal(false);
      setDescription('');
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to submit donation');
    } finally {
      setSubmitting(false);
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
      <div className="bg-gradient-to-r from-emerald-900/60 to-slate-900 border border-emerald-800/50 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
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
          <PlusCircle className="w-5 h-5" />
          <span>POST SURPLUS FOOD</span>
        </button>
      </div>

      {/* Real-time Match Result Banner if recently submitted */}
      {matchNotice && (
        <div
          className={`p-5 rounded-xl border ${
            matchNotice.matched
              ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
              : 'bg-amber-950/60 border-amber-700 text-amber-200'
          } shadow-lg space-y-3`}
        >
          <div className="flex items-center gap-2 font-bold text-base">
            {matchNotice.matched ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>MATCH FOUND ✓</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span>MATCHING STATUS: PENDING</span>
              </>
            )}
          </div>
          <p className="text-sm">{matchNotice.message}</p>

          {matchNotice.matched && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-400 block">Recipient:</span>
                <span className="font-bold text-white">{matchNotice.ngoName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Distance:</span>
                <span className="font-bold text-emerald-300">{matchNotice.distanceKm} km</span>
              </div>
              <div>
                <span className="text-slate-400 block">Assigned Driver:</span>
                <span className="font-bold text-amber-300">{matchNotice.driverName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Estimated Pickup:</span>
                <span className="font-bold text-cyan-300">{matchNotice.estimatedMinutes} minutes</span>
              </div>
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
              Click &quot;POST SURPLUS FOOD&quot; above to initiate a real-time rescue match.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {donations.map((don) => (
              <div
                key={don.id}
                className="bg-slate-800/70 border border-slate-700 hover:border-slate-600 rounded-xl p-5 shadow-sm space-y-4 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 font-bold text-sm text-emerald-400">
                      {don.quantity_kg} kg
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-100 text-base">{don.food_type} Surplus</h4>
                      <p className="text-xs text-slate-400">{don.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UrgencyBadge safeUntil={don.safe_until} />
                    <StatusBadge status={don.status} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                    <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Matched NGO</span>
                      <span className="font-semibold text-slate-200">
                        {don.ngo_name || 'Searching eligible partner...'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                    <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Driver</span>
                      <span className="font-semibold text-slate-200">
                        {don.driver_name || 'Assigning available driver...'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                    <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Est. Pickup ETA</span>
                      <span className="font-semibold text-slate-200">
                        {don.estimated_minutes ? `${don.estimated_minutes} mins` : 'Calculating route...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POST DONATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-emerald-400" />
                <span>Post Surplus Food</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDonation} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Food Type</label>
                  <select
                    value={foodType}
                    onChange={(e) => setFoodType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Cooked">Cooked Meal / Buffet</option>
                    <option value="Grocery">Packaged Grocery</option>
                    <option value="Produce">Fresh Fruits & Veggies</option>
                    <option value="Bakery">Bakery & Bread</option>
                    <option value="Dairy">Dairy & Chilled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity (kg)</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={quantityKg}
                    onChange={(e) => setQuantityKg(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 25 kg Freshly Cooked Rice & Veg Curry"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Pickup Address</label>
                <input
                  type="text"
                  required
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Safe Donation Window (Hours from now)
                </label>
                <select
                  value={safeUntilHours}
                  onChange={(e) => setSafeUntilHours(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="2">2 Hours (Urgent)</option>
                  <option value="4">4 Hours (Standard)</option>
                  <option value="6">6 Hours</option>
                  <option value="12">12 Hours</option>
                  <option value="24">24 Hours</option>
                </select>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>Submit Donation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
