import React from 'react';
import { Camera, CheckCircle2, AlertTriangle, ShieldCheck, MapPin, Truck, Heart } from 'lucide-react';

interface EvidenceItem {
  id?: string;
  evidence_type: 'DONOR_PHOTO' | 'DRIVER_PICKUP_PHOTO' | 'NGO_DELIVERY_PHOTO' | string;
  image_url: string;
  captured_by?: string;
  captured_role?: string;
  seal_code?: string;
  notes?: string;
  created_at?: string;
}

interface Props {
  evidenceList: EvidenceItem[];
  expectedSeal?: string;
}

export const EvidenceComparisonCard: React.FC<Props> = ({ evidenceList = [], expectedSeal }) => {
  const donorEv = evidenceList.find((e) => e.evidence_type === 'DONOR_PHOTO');
  const driverEv = evidenceList.find((e) => e.evidence_type === 'DRIVER_PICKUP_PHOTO');
  const ngoEv = evidenceList.find((e) => e.evidence_type === 'NGO_DELIVERY_PHOTO');

  const getSealMatchBadge = (evSeal?: string) => {
    if (!expectedSeal) return null;
    if (!evSeal || evSeal === expectedSeal) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>SEAL MATCH</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
        <AlertTriangle className="w-3 h-3 text-rose-400" />
        <span>MISMATCH</span>
      </span>
    );
  };

  return (
    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-orange-400" />
          <span className="font-bold text-xs text-slate-100 uppercase tracking-widest">
            Chain of Custody Visual Evidence Comparison
          </span>
        </div>
        {expectedSeal && (
          <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-mono font-black">
            SEAL ID: {expectedSeal}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Stage 1: Donor Photo */}
        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-orange-400 uppercase tracking-wider text-[11px] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-orange-400" /> 1. Donor Before-Handover
            </span>
            {donorEv && getSealMatchBadge(donorEv.seal_code)}
          </div>

          {donorEv?.image_url ? (
            <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-800 relative group shadow-sm">
              <img src={donorEv.image_url} alt="Donor Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2">
                <span className="text-[10px] font-mono text-slate-300">
                  {donorEv.created_at ? new Date(donorEv.created_at).toLocaleTimeString() : 'Recorded'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-36 rounded-xl bg-slate-950 border border-slate-850 flex flex-col items-center justify-center text-slate-500 p-4 text-center space-y-1">
              <Camera className="w-6 h-6 text-slate-600" />
              <span className="text-[11px] font-medium">Donor Evidence Pending</span>
            </div>
          )}

          <p className="text-[11px] text-slate-400 truncate">
            {donorEv?.notes || 'Photo captured prior to driver dispatch'}
          </p>
        </div>

        {/* Stage 2: Driver Pickup Photo */}
        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-amber-400" /> 2. Driver Pickup Scan
            </span>
            {driverEv && getSealMatchBadge(driverEv.seal_code)}
          </div>

          {driverEv?.image_url ? (
            <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-800 relative group shadow-sm">
              <img src={driverEv.image_url} alt="Driver Pickup Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2">
                <span className="text-[10px] font-mono text-slate-300">
                  {driverEv.created_at ? new Date(driverEv.created_at).toLocaleTimeString() : 'Recorded'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-36 rounded-xl bg-slate-950 border border-slate-850 flex flex-col items-center justify-center text-slate-500 p-4 text-center space-y-1">
              <Truck className="w-6 h-6 text-slate-600" />
              <span className="text-[11px] font-medium">Driver Pickup Evidence Pending</span>
            </div>
          )}

          <p className="text-[11px] text-slate-400 truncate">
            {driverEv?.notes || 'Driver handover evidence scan'}
          </p>
        </div>

        {/* Stage 3: NGO Delivery Photo */}
        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-rose-400 uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-400" /> 3. NGO Delivery Receipt
            </span>
            {ngoEv && getSealMatchBadge(ngoEv.seal_code)}
          </div>

          {ngoEv?.image_url ? (
            <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-800 relative group shadow-sm">
              <img src={ngoEv.image_url} alt="NGO Delivery Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2">
                <span className="text-[10px] font-mono text-slate-300">
                  {ngoEv.created_at ? new Date(ngoEv.created_at).toLocaleTimeString() : 'Recorded'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-36 rounded-xl bg-slate-950 border border-slate-850 flex flex-col items-center justify-center text-slate-500 p-4 text-center space-y-1">
              <ShieldCheck className="w-6 h-6 text-slate-600" />
              <span className="text-[11px] font-medium">NGO Delivery Evidence Pending</span>
            </div>
          )}

          <p className="text-[11px] text-slate-400 truncate">
            {ngoEv?.notes || 'Shelter receipt verification evidence'}
          </p>
        </div>
      </div>
    </div>
  );
};
