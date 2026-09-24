import React, { useState } from 'react';
import { fetchApi } from '../services/api';
import { ShieldCheck, Camera, CheckCircle2, QrCode, RefreshCw, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  donationId: string;
  quantityKg: number;
  foodType: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const DonorPackageSealer: React.FC<Props> = ({
  isOpen,
  donationId,
  quantityKg,
  foodType,
  onClose,
  onSuccess,
}) => {
  const [numPackages, setNumPackages] = useState<number>(1);
  const [sealCode, setSealCode] = useState<string>(`SEAL-${Math.floor(10000 + Math.random() * 90000)}`);
  const [photoUrl, setPhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80'
  );
  const [submitting, setSubmitting] = useState(false);
  const [generatedPackages, setGeneratedPackages] = useState<any[] | null>(null);

  if (!isOpen) return null;

  const handleSealPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetchApi<{ packages: any[] }>('/packages/generate', {
        method: 'POST',
        body: JSON.stringify({
          donationId,
          numPackages,
          sealCode,
          donorPhotoUrl: photoUrl,
        }),
      });
      setGeneratedPackages(res.packages);
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to seal package');
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
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">Donor Food Package Sealer</h3>
              <p className="text-xs text-slate-400">Generate anti-tamper seal & record before-handover evidence photo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {!generatedPackages ? (
            <form onSubmit={handleSealPackage} className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Donation:</span>
                <p className="font-bold text-sm text-orange-400">{quantityKg} kg {foodType}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Number of Sealed Containers / Packages</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={numPackages}
                  onChange={(e) => setNumPackages(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Package Tamper-Evident Seal ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sealCode}
                    onChange={(e) => setSealCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-mono font-bold text-orange-400 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSealCode(`SEAL-${Math.floor(10000 + Math.random() * 90000)}`)}
                    className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-orange-400" /> Before-Handover Package Evidence Photo URL
                </label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                />
                {photoUrl && (
                  <div className="mt-2 w-full h-32 rounded-xl overflow-hidden border border-slate-800">
                    <img src={photoUrl} alt="Package Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

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
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>SEAL & GENERATE VERIFICATION BADGE</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-2xl text-emerald-300 space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-sm">Package Successfully Sealed & Registered!</h4>
                <p className="text-[11px] text-slate-300">Seal Code: <strong className="font-mono text-orange-400">{sealCode}</strong></p>
              </div>

              <div className="space-y-3">
                {generatedPackages.map((pkg) => (
                  <div key={pkg.package_id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-2">
                    <div className="flex justify-between items-center font-mono text-xs">
                      <span className="font-bold text-orange-400">{pkg.package_id}</span>
                      <span className="text-slate-400">{pkg.expected_quantity_kg} kg</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg w-fit mx-auto">
                      <QrCode className="w-20 h-20 text-slate-950" />
                    </div>
                    <p className="text-[10px] text-slate-500 text-center font-mono">Token: {pkg.qr_token.substring(0, 24)}...</p>
                  </div>
                ))}
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
              >
                Close Sealer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
