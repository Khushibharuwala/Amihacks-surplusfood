import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchApi } from '../services/api';
import { QrCode, RefreshCw, ShieldCheck, Printer } from 'lucide-react';

interface Props {
  donationId: string;
  foodType: string;
  quantityKg: number;
}

export const PackageQrGenerator: React.FC<Props> = ({ donationId, foodType, quantityKg }) => {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [numPkgs, setNumPkgs] = useState<number>(1);
  const [isOpen, setIsOpen] = useState(false);

  const handleGenerateQr = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<{ packages: any[] }>('/packages/generate', {
        method: 'POST',
        body: JSON.stringify({ donationId, numPackages: numPkgs }),
      });
      setPackages(data.packages);
      setIsOpen(true);
    } catch (e: any) {
      alert(e.message || 'Failed to generate QR codes');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <button
        onClick={handleGenerateQr}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
      >
        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
        <span>Generate Package QR</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Food Package Verification QR Codes</span>
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>{foodType} Surplus ({quantityKg} kg)</span>
              <div className="flex items-center gap-2">
                <label className="text-slate-400">Packages:</label>
                <select
                  value={numPkgs}
                  onChange={(e) => setNumPkgs(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
                >
                  <option value={1}>1 Package ({quantityKg} kg)</option>
                  <option value={2}>2 Packages ({quantityKg / 2} kg ea)</option>
                  <option value={3}>3 Packages ({Math.round((quantityKg / 3) * 10) / 10} kg ea)</option>
                </select>
              </div>
            </div>

            {/* QR Codes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto p-1">
              {packages.map((pkg) => (
                <div key={pkg.package_id} className="bg-white p-4 rounded-xl text-slate-950 text-center space-y-2 border border-slate-300 shadow-md">
                  <div className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase">
                    Food Rescue Package
                  </div>
                  <div className="flex justify-center p-2 bg-slate-50 rounded-lg">
                    <QRCodeSVG value={pkg.qr_data} size={140} level="H" includeMargin={true} />
                  </div>
                  <div className="font-mono text-xs font-black">{pkg.package_id}</div>
                  <div className="text-[10px] text-slate-600 font-semibold">
                    Expected: {pkg.expected_quantity_kg} kg • {foodType}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Labels
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
