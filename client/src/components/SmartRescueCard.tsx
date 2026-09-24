import React from 'react';
import type { Donation } from '../types';
import { StatusBadge } from './StatusBadge';
import { RiskBadge } from './RiskBadge';
import { LiveCountdown } from './LiveCountdown';
import { MapPin, Truck, Heart, ArrowRight } from 'lucide-react';

interface Props {
  donation: Donation;
  onSelect: (donation: Donation) => void;
}

export const SmartRescueCard: React.FC<Props> = ({ donation, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(donation)}
      className="bg-slate-900 border border-slate-800 hover:border-orange-500/80 p-5 rounded-2xl shadow-xl space-y-4 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40 font-black text-xs">
              {donation.quantity_kg} kg
            </span>
            <span className="font-bold text-slate-100 text-sm truncate max-w-[150px]">
              {donation.food_type}
            </span>
          </div>
          <StatusBadge status={donation.status} />
        </div>

        {/* Food Image Banner */}
        {donation.image_url && (
          <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-800 relative shadow-sm">
            <img src={donation.image_url} alt={donation.food_type} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2.5">
              <span className="text-[11px] font-semibold text-slate-200 truncate">
                {donation.description}
              </span>
            </div>
          </div>
        )}

        {/* Route Details */}
        <div className="text-xs space-y-2 text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-850">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="truncate">Donor: <strong className="text-slate-100">{donation.donor_name || 'Donor Site'}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">Recipient: <strong className="text-slate-100">{donation.ngo_name || 'Searching recipient...'}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Driver: <strong className="text-amber-300">{donation.driver_name || 'Assigning driver...'}</strong></span>
          </div>
        </div>
      </div>

      {/* Footer Countdown & CTA */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <LiveCountdown safeUntil={donation.safe_until} />
          <RiskBadge riskLevel={donation.risk_level} riskReason={donation.risk_reason} />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(donation);
          }}
          className="w-full py-2.5 rounded-xl bg-slate-800 group-hover:bg-orange-600 text-slate-200 group-hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
        >
          <span>VIEW RESCUE DETAILS</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
