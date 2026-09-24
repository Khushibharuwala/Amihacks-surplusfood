import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import type { DriverProfile } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { UrgencyBadge } from '../components/UrgencyBadge';
import { Truck, MapPin, CheckCircle, Navigation, Clock, Package, Play, RefreshCw } from 'lucide-react';

export const DriverDashboard: React.FC = () => {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [assignedDeliveries, setAssignedDeliveries] = useState<any[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingDeliveryId, setProcessingDeliveryId] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<{
        profile: DriverProfile;
        assignedDeliveries: any[];
        completedDeliveries: any[];
      }>('/driver/dashboard');

      setProfile(data.profile);
      setAssignedDeliveries(data.assignedDeliveries);
      setCompletedDeliveries(data.completedDeliveries);
    } catch (e) {
      console.error('Failed to load driver dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      await fetchApi('/driver/status', {
        method: 'PUT',
        body: JSON.stringify({ is_available: !profile.is_available }),
      });
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleUpdateDeliveryStatus = async (deliveryId: string, nextStatus: string) => {
    setProcessingDeliveryId(deliveryId);
    try {
      await fetchApi(`/driver/deliveries/${deliveryId}/status`, {
        method: 'POST',
        body: JSON.stringify({ next_status: nextStatus }),
      });
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to update delivery status');
    } finally {
      setProcessingDeliveryId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Driver Header & Availability Toggle */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
            Volunteer Driver Portal
          </span>
          <h2 className="text-2xl font-bold text-slate-100">{profile?.vehicle_type}</h2>
          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
            <span>Vehicle Capacity: <strong className="text-white">{profile?.vehicle_capacity_kg} kg</strong></span>
            <span>Location: <strong className="text-slate-300">{profile?.latitude}, {profile?.longitude}</strong></span>
          </div>
        </div>

        {/* Availability Toggle Switch */}
        <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-300">
            {profile?.is_available ? 'ONLINE / AVAILABLE' : 'OFFLINE'}
          </span>
          <button
            onClick={handleToggleAvailability}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all ${
              profile?.is_available ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>
      </div>

      {/* Assigned Pickups & Deliveries */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Truck className="w-5 h-5 text-amber-400" />
          <span>Assigned Rescue Pickups ({assignedDeliveries.length})</span>
        </h3>

        {assignedDeliveries.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No active pickup assignments currently allocated.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {assignedDeliveries.map((del) => (
              <div
                key={del.id}
                className="bg-slate-800/80 border border-amber-900/40 rounded-2xl p-6 shadow-xl space-y-6"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-amber-950 text-amber-300 font-bold text-sm border border-amber-800">
                      {del.quantity_kg} kg {del.food_type}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-100 text-base">{del.description}</h4>
                      <p className="text-xs text-slate-400">Donor: {del.donor_name} ({del.donor_phone})</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UrgencyBadge safeUntil={del.safe_until} />
                    <StatusBadge status={del.status} />
                  </div>
                </div>

                {/* Route Logistics Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Pickup Site */}
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" /> 1. Pickup Location
                    </span>
                    <p className="font-semibold text-slate-100">{del.pickup_address}</p>
                    <p className="text-slate-400">Dist from driver: <strong className="text-amber-300">{del.driver_to_pickup_km} km</strong></p>
                  </div>

                  {/* Destination NGO */}
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-rose-400" /> 2. Destination Shelter
                    </span>
                    <p className="font-semibold text-slate-100">{del.ngo_name}</p>
                    <p className="text-slate-400">{del.ngo_address}</p>
                    <p className="text-slate-400">Transit distance: <strong className="text-emerald-300">{del.pickup_to_ngo_km} km</strong></p>
                  </div>
                </div>

                {/* Logistics Estimates Bar */}
                <div className="flex items-center justify-between text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>Total Est. Travel Time: <strong className="text-cyan-300">{del.estimated_minutes} mins</strong></span>
                  </div>
                  <div className="text-slate-400">
                    Total Route Distance: <strong className="text-slate-200">{del.total_distance_km} km</strong>
                  </div>
                </div>

                {/* Operational Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  {del.status === 'ASSIGNED' && (
                    <button
                      onClick={() => handleUpdateDeliveryStatus(del.id, 'ACCEPTED')}
                      disabled={processingDeliveryId === del.id}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg flex items-center gap-2"
                    >
                      {processingDeliveryId === del.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      <span>Accept Assignment</span>
                    </button>
                  )}

                  {del.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleUpdateDeliveryStatus(del.id, 'PICKUP_STARTED')}
                      disabled={processingDeliveryId === del.id}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg flex items-center gap-2"
                    >
                      {processingDeliveryId === del.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      <span>Start Pickup Transit</span>
                    </button>
                  )}

                  {del.status === 'PICKUP_STARTED' && (
                    <button
                      onClick={() => handleUpdateDeliveryStatus(del.id, 'PICKED_UP')}
                      disabled={processingDeliveryId === del.id}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg flex items-center gap-2"
                    >
                      {processingDeliveryId === del.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                      <span>Mark Food Picked Up</span>
                    </button>
                  )}

                  {del.status === 'PICKED_UP' && (
                    <button
                      onClick={() => handleUpdateDeliveryStatus(del.id, 'DELIVERED')}
                      disabled={processingDeliveryId === del.id}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center gap-2"
                    >
                      {processingDeliveryId === del.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      <span>Mark Delivery Completed</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed History */}
      <div className="space-y-3">
        <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Your Completed Deliveries ({completedDeliveries.length})</span>
        </h4>
        {completedDeliveries.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-500 text-center">
            No completed delivery history yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {completedDeliveries.map((del) => (
              <div key={del.id} className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300">{del.quantity_kg} kg {del.food_type}</span>
                  <span className="text-[10px] text-slate-500">{new Date(del.delivery_time).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-400">From {del.donor_name} to {del.ngo_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
