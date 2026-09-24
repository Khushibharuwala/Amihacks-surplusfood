import React, { useState } from 'react';
import { fetchApi } from '../services/api';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  donationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const RouteStopReportModal: React.FC<Props> = ({ isOpen, donationId, onClose, onSuccess }) => {
  const [stopReason, setStopReason] = useState<string>('Traffic');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchApi('/navigation/stop-exception', {
        method: 'POST',
        body: JSON.stringify({
          donationId,
          stopReason,
          notes,
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to submit stop report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>Report Authorized Stop / Emergency</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Logging an authorized stop exception marks your location stop as legitimate, preventing false route deviation alerts.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Reason for Stop</label>
            <select
              value={stopReason}
              onChange={(e) => setStopReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="Traffic">Traffic Heavy Congestion</option>
              <option value="Police checkpoint">Police / Checkpoint Inspection</option>
              <option value="Vehicle issue">Vehicle Mechanical Issue / Tire Pressure</option>
              <option value="Emergency">Driver Emergency / Rest</option>
              <option value="Road closure">Road Closure / Detour</option>
              <option value="Other">Other Exception</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Optional Notes / Details</label>
            <textarea
              rows={3}
              placeholder="Provide brief context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Log Authorized Stop</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
