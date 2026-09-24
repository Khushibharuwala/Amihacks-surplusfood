import React from 'react';
import type { RescueLog } from '../types';
import { ShieldCheck, QrCode, Truck, Heart, MapPin, CheckCircle2 } from 'lucide-react';

interface Props {
  status: string;
  packages?: any[];
  custodyEvents?: any[];
  timelineLogs?: RescueLog[];
}

export const ChainOfCustodyTimeline: React.FC<Props> = ({ status, packages = [], custodyEvents = [] }) => {
  const steps = [
    { key: 'CREATED', label: 'Restaurant Prepared', icon: MapPin },
    { key: 'QR_GENERATED', label: 'Package QR Generated', icon: QrCode },
    { key: 'DRIVER_ASSIGNED', label: 'Driver Dispatched', icon: Truck },
    { key: 'VERIFIED_PICKUP', label: 'Pickup QR Verified', icon: ShieldCheck },
    { key: 'IN_TRANSIT', label: 'Locked In Transit', icon: Truck },
    { key: 'VERIFIED_DELIVERY', label: 'NGO QR Verified', icon: Heart },
    { key: 'DELIVERED', label: 'Delivery Confirmed', icon: CheckCircle2 },
  ];

  const getStepState = (stepKey: string) => {
    const isQrGen = packages.length > 0;
    const isPickupVer = packages.some((p) => p.verified_at_pickup === 1);
    const isDeliveryVer = packages.some((p) => p.verified_at_delivery === 1);

    if (stepKey === 'CREATED') return 'completed';
    if (stepKey === 'QR_GENERATED') return isQrGen ? 'completed' : 'pending';
    if (stepKey === 'DRIVER_ASSIGNED') return ['DRIVER_ASSIGNED', 'PICKUP_STARTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(status) ? 'completed' : 'pending';
    if (stepKey === 'VERIFIED_PICKUP') return isPickupVer ? 'completed' : (status === 'DRIVER_ASSIGNED' || status === 'PICKUP_STARTED' ? 'active' : 'pending');
    if (stepKey === 'IN_TRANSIT') return ['IN_TRANSIT', 'DELIVERED'].includes(status) ? 'completed' : 'pending';
    if (stepKey === 'VERIFIED_DELIVERY') return isDeliveryVer ? 'completed' : (status === 'IN_TRANSIT' ? 'active' : 'pending');
    if (stepKey === 'DELIVERED') return status === 'DELIVERED' ? 'completed' : 'pending';
    return 'pending';
  };

  return (
    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
      <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
        <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Secure Chain of Custody Audit Trail
        </span>
        <span className="text-emerald-400 font-semibold">
          {packages.length} Food Package(s) Registered
        </span>
      </div>

      {/* Visual Horizontal Timeline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {steps.map((stg) => {
          const state = getStepState(stg.key);
          const Icon = stg.icon;

          let style = 'bg-slate-900 border-slate-800 text-slate-500';
          if (state === 'completed') {
            style = 'bg-emerald-950/70 border-emerald-700 text-emerald-300';
          } else if (state === 'active') {
            style = 'bg-amber-950/80 border-amber-600 text-amber-200 animate-pulse';
          }

          return (
            <div key={stg.key} className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold ${style}`}>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-[11px]">{stg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Verification Events Log */}
      {custodyEvents.length > 0 && (
        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 text-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Verification Event History:
          </span>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {custodyEvents.map((ev: any) => (
              <div key={ev.id} className="flex items-center justify-between text-[11px] border-b border-slate-900 pb-1">
                <span className={`font-semibold ${ev.result === 'SUCCESS' ? 'text-emerald-300' : 'text-rose-400'}`}>
                  [{ev.event_type}] {ev.package_id || ''} - {ev.result}
                </span>
                <span className="text-slate-500 font-mono text-[10px]">
                  {new Date(ev.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
