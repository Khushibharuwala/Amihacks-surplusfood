import React from 'react';
import type { DonationStatus, RescueLog } from '../types';
import { CheckCircle2, Clock, Truck, Heart, MapPin, PackageCheck } from 'lucide-react';

interface Props {
  status: DonationStatus | string;
  logs?: RescueLog[];
}

export const RescueTimeline: React.FC<Props> = ({ status, logs = [] }) => {
  const stages = [
    { key: 'POSTED', label: 'Donation Posted', icon: MapPin },
    { key: 'MATCHED', label: 'Partner Found', icon: Heart },
    { key: 'DRIVER_ASSIGNED', label: 'Driver Dispatched', icon: Truck },
    { key: 'PICKUP_STARTED', label: 'Pickup En Route', icon: Clock },
    { key: 'PICKED_UP', label: 'Food Picked Up', icon: CheckCircle2 },
    { key: 'DELIVERED', label: 'Delivered to Shelter', icon: PackageCheck },
  ];

  const getStageState = (stageKey: string) => {
    const order = ['POSTED', 'MATCHED', 'DRIVER_ASSIGNED', 'PICKUP_STARTED', 'PICKED_UP', 'DELIVERED'];
    const currentIndex = order.indexOf(status);
    const stageIndex = order.indexOf(stageKey);

    if (status === 'EXPIRED' || status === 'CANCELLED') {
      return stageIndex === 0 ? 'completed' : 'disabled';
    }

    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="space-y-4">
      {/* Horizontal Stage Tracker */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {stages.map((stg) => {
          const state = getStageState(stg.key);
          const Icon = stg.icon;

          let style = 'bg-slate-900 border-slate-800 text-slate-500';
          if (state === 'completed') {
            style = 'bg-emerald-950/60 border-emerald-700 text-emerald-300';
          } else if (state === 'active') {
            style = 'bg-amber-950/80 border-amber-600 text-amber-200 animate-pulse';
          }

          return (
            <div
              key={stg.key}
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${style}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{stg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Audit Log Events List */}
      {logs.length > 0 && (
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
          <span className="font-bold text-slate-300 block text-[11px] uppercase tracking-wider">
            Live Rescue Audit Timeline
          </span>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-2 border-b border-slate-900 pb-1 text-[11px]">
                <div>
                  <span className="font-bold text-slate-200">{log.actor_name} ({log.actor_role})</span>: {log.action} - <span className="text-slate-400">{log.details || log.status}</span>
                </div>
                <span className="text-slate-500 font-mono shrink-0">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
