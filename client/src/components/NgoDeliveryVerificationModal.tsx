import React, { useState } from 'react';
import { fetchApi } from '../services/api';
import { ShieldCheck, Camera, CheckCircle2, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  donationId: string;
  expectedSeal?: string;
  foodType: string;
  quantityKg: number;
  donorName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const NgoDeliveryVerificationModal: React.FC<Props> = ({
  isOpen,
  donationId,
  expectedSeal = 'SEAL-58291',
  foodType,
  quantityKg,
  donorName,
  onClose,
  onSuccess,
}) => {
  const [sealIntact, setSealIntact] = useState<boolean>(true);
  const [quantityMatch, setQuantityMatch] = useState<boolean>(true);
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'
  );
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Mock QR data payload structure
      const mockQrData = JSON.stringify({
        p: `PKG-RESCUE-${donationId.substring(0, 6)}`,
        d: donationId,
        t: 'sec_tok_verified',
        s: expectedSeal,
        v: 2,
      });

      const res = await fetchApi<{ valid: boolean; disputeRaised: boolean; message: string }>('/packages/verify-delivery', {
        method: 'POST',
        body: JSON.stringify({
          qrData: mockQrData,
          donationId,
          deliveryPhotoUrl,
          sealIntact,
          quantityMatch,
          notes,
        }),
      });

      alert(res.message);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to submit delivery verification');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">NGO Shelter Delivery Receipt Verification</h3>
              <p className="text-xs text-slate-400">Verify package intact state, seal code & capture delivery photo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          <form onSubmit={handleSubmitVerification} className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Expected Package & Seal:</span>
                <span className="font-mono text-xs font-black text-orange-400 border border-orange-500/40 px-2 py-0.5 rounded bg-orange-500/10">
                  {expectedSeal}
                </span>
              </div>
              <p className="font-bold text-slate-100">{quantityKg} kg {foodType}</p>
              <p className="text-slate-400">From Donor: <strong className="text-slate-200">{donorName}</strong></p>
            </div>

            {/* Checkbox 1: Seal Intact */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="font-bold text-slate-200 block text-xs">Is the package tamper-evident seal intact?</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sealIntact"
                    checked={sealIntact === true}
                    onChange={() => setSealIntact(true)}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-emerald-400 font-bold">✓ Yes — Seal Intact ({expectedSeal})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sealIntact"
                    checked={sealIntact === false}
                    onChange={() => setSealIntact(false)}
                    className="text-rose-500 focus:ring-rose-500"
                  />
                  <span className="text-rose-400 font-bold">✕ No — Seal Broken / Tampered</span>
                </label>
              </div>
            </div>

            {/* Checkbox 2: Quantity Match */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="font-bold text-slate-200 block text-xs">Does the delivered quantity match the manifest ({quantityKg} kg)?</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="qtyMatch"
                    checked={quantityMatch === true}
                    onChange={() => setQuantityMatch(true)}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-emerald-400 font-bold">✓ Yes — Full Quantity Received</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="qtyMatch"
                    checked={quantityMatch === false}
                    onChange={() => setQuantityMatch(false)}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-amber-400 font-bold">✕ No — Discrepancy / Partial</span>
                </label>
              </div>
            </div>

            {/* Photo Evidence */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-purple-400" /> NGO Delivery Receipt Photo Evidence URL
              </label>
              <input
                type="text"
                value={deliveryPhotoUrl}
                onChange={(e) => setDeliveryPhotoUrl(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
              />
              {deliveryPhotoUrl && (
                <div className="mt-2 w-full h-32 rounded-xl overflow-hidden border border-slate-800">
                  <img src={deliveryPhotoUrl} alt="Delivery Photo Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Verification Notes / Inspection Comments</label>
              <textarea
                rows={2}
                placeholder="Package condition, temperature check notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            {!sealIntact && (
              <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-xl text-rose-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>DISCREPANCY DISPUTE ALERT WILL BE LOGGED</span>
                </div>
                <p className="text-[11px] text-rose-300">
                  Reporting a broken seal or package mismatch will automatically flag this rescue for immediate admin investigation.
                </p>
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                  !sealIntact
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{!sealIntact ? 'FLAG DISPUTE & SUBMIT' : 'CONFIRM DELIVERY & VERIFY'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
