import React from 'react';
import { MapPin, Truck, Heart, ArrowRight } from 'lucide-react';

interface Props {
  donorName?: string;
  donorAddress?: string;
  ngoName?: string;
  ngoAddress?: string;
  driverName?: string;
  vehicleType?: string;
  distanceKm?: number;
  estimatedMinutes?: number;
}

export const RescueMap: React.FC<Props> = ({
  donorName = 'Food Donor Site',
  donorAddress = 'Pickup Address',
  ngoName = 'Recipient Shelter',
  ngoAddress = 'Shelter Address',
  driverName = 'Assigned Driver',
  vehicleType = 'Dispatch Vehicle',
  distanceKm = 3.2,
  estimatedMinutes = 18,
}) => {
  return (
    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
      <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
        <span className="font-bold text-slate-300 uppercase tracking-wider">
          Logistics Route Diagram
        </span>
        <span className="text-cyan-400 font-semibold">
          Total Transit: ~{estimatedMinutes} mins ({distanceKm} km)
        </span>
      </div>

      {/* Visual Route Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Step 1: Donor */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-emerald-800/60 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
            <MapPin className="w-4 h-4" />
            <span>1. DONOR PICKUP</span>
          </div>
          <p className="font-bold text-slate-100 text-xs truncate">{donorName}</p>
          <p className="text-[11px] text-slate-400 truncate">{donorAddress}</p>
        </div>

        {/* Step 2: Driver Transit */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-amber-800/60 space-y-1 text-center">
          <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-bold">
            <Truck className="w-4 h-4" />
            <span>2. VOLUNTEER DISPATCH</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 text-slate-500" />
          </div>
          <p className="font-bold text-slate-100 text-xs truncate">{driverName}</p>
          <p className="text-[11px] text-amber-300 font-semibold">{vehicleType}</p>
        </div>

        {/* Step 3: NGO Shelter */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-rose-800/60 space-y-1">
          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
            <Heart className="w-4 h-4" />
            <span>3. DESTINATION SHELTER</span>
          </div>
          <p className="font-bold text-slate-100 text-xs truncate">{ngoName}</p>
          <p className="text-[11px] text-slate-400 truncate">{ngoAddress}</p>
        </div>
      </div>
    </div>
  );
};
