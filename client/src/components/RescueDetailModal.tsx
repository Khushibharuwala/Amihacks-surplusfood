import React from 'react';
import type { Donation } from '../types';
import { StatusBadge } from './StatusBadge';
import { RiskBadge } from './RiskBadge';
import { LiveCountdown } from './LiveCountdown';
import { RescueTimeline } from './RescueTimeline';
import { RescueFeasibilityCard } from './RescueFeasibilityCard';
import { ChainOfCustodyTimeline } from './ChainOfCustodyTimeline';
import { Activity, MapPin, Truck, Heart, Navigation, X } from 'lucide-react';

interface Props {
  donation: Donation | null;
  onClose: () => void;
}

export const RescueDetailModal: React.FC<Props> = ({ donation, onClose }) => {
  if (!donation) return null;

  const codeId = donation.id.replace('don_', 'RS-').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-orange-400">RESCUE #{codeId}</span>
                <StatusBadge status={donation.status} />
              </div>
              <h3 className="font-bold text-lg text-slate-100">{donation.food_type} ({donation.quantity_kg} kg)</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Image Banner */}
          {donation.image_url && (
            <div className="w-full h-44 rounded-2xl overflow-hidden border border-slate-800 relative shadow-md">
              <img src={donation.image_url} alt={donation.food_type} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                <span className="font-semibold text-slate-200 text-xs">{donation.description}</span>
              </div>
            </div>
          )}

          {/* Participant Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Donor */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-orange-400" /> 1. Donor Site
              </span>
              <p className="font-bold text-slate-100">{donation.donor_name || 'Donor Site'}</p>
              <p className="text-[11px] text-slate-400">{donation.pickup_address}</p>
            </div>

            {/* Driver */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-amber-400" /> 2. Volunteer Driver
              </span>
              <p className="font-bold text-slate-100">{donation.driver_name || 'Assigning available driver...'}</p>
              <p className="text-[11px] text-slate-400">Vehicle: {donation.vehicle_type || 'Dispatch Vehicle'}</p>
            </div>

            {/* NGO */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-400" /> 3. Recipient Shelter
              </span>
              <p className="font-bold text-slate-100">{donation.ngo_name || 'Searching recipient shelter...'}</p>
              <p className="text-[11px] text-slate-400">{donation.ngo_address || 'TBD'}</p>
            </div>
          </div>

          {/* Time & Route Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Safe Rescue Window:</span>
                <LiveCountdown safeUntil={donation.safe_until} />
              </div>
              <RiskBadge riskLevel={donation.risk_level} riskReason={donation.risk_reason} />
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Route & Transit ETA:</span>
                <span className="font-bold text-cyan-300 text-sm">{donation.estimated_minutes || 18} mins ({donation.distance_km || 3.2} km)</span>
              </div>
              <Navigation className="w-5 h-5 text-cyan-400" />
            </div>
          </div>

          {/* Feasibility Assessment */}
          <RescueFeasibilityCard score={donation.match_score || 92} reasons={donation.match_reasons} />

          {/* Status Timeline */}
          <div className="space-y-2">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
              Rescue Mission Operational Progress:
            </span>
            <RescueTimeline status={donation.status} />
          </div>

          {/* Secure Chain of Custody */}
          <ChainOfCustodyTimeline status={donation.status} />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs shadow-md cursor-pointer"
          >
            Close Rescue Details
          </button>
        </div>
      </div>
    </div>
  );
};
