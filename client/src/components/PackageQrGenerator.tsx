import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchApi } from '../services/api';
import { QrCode, RefreshCw, ShieldCheck, Printer, Download } from 'lucide-react';

interface Props {
  donationId: string;
  foodType: string;
  quantityKg: number;
  autoOpen?: boolean;
}

export const PackageQrGenerator: React.FC<Props> = ({ donationId, foodType, quantityKg, autoOpen = false }) => {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [numPkgs, setNumPkgs] = useState<number>(1);
  const [isOpen, setIsOpen] = useState(autoOpen);

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

  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true);
      handleGenerateQr();
    }
  }, [autoOpen, donationId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSvg = (pkgId: string) => {
    const svgEl = document.getElementById(`qr-svg-${pkgId}`);
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${pkgId}-QR.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div>
      <button
        onClick={handleGenerateQr}
        disabled={loading}
        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
      >
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
        <span>GENERATE & PRINT UNIQUE QR CODE</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Food Package Unique QR Code & Seal</span>
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-emerald-400">{foodType} Surplus ({quantityKg} kg)</span>
              <div className="flex items-center gap-2">
                <label className="text-slate-400">Package Split:</label>
                <select
                  value={numPkgs}
                  onChange={(e) => setNumPkgs(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-semibold"
                >
                  <option value={1}>1 Package ({quantityKg} kg)</option>
                  <option value={2}>2 Packages ({quantityKg / 2} kg ea)</option>
                  <option value={3}>3 Packages ({Math.round((quantityKg / 3) * 10) / 10} kg ea)</option>
                </select>
              </div>
            </div>

            {/* QR Codes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-80 overflow-y-auto p-1">
              {packages.map((pkg) => (
                <div key={pkg.package_id} className="bg-white p-4 rounded-xl text-slate-950 text-center space-y-2 border border-slate-300 shadow-md">
                  <div className="text-[11px] font-black tracking-wider text-emerald-800 uppercase">
                    Surplus Food Security Seal
                  </div>
                  <div className="flex justify-center p-2 bg-slate-50 rounded-lg">
                    <QRCodeSVG id={`qr-svg-${pkg.package_id}`} value={pkg.qr_data} size={150} level="H" includeMargin={true} />
                  </div>
                  <div className="font-mono text-xs font-black text-slate-900">{pkg.package_id}</div>
                  <div className="text-[10px] text-slate-700 font-bold bg-slate-100 py-1 rounded">
                    Seal Code: {pkg.seal_code} • {pkg.expected_quantity_kg} kg
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadSvg(pkg.package_id)}
                    className="w-full py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Save SVG Image
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print QR Labels
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
              >
                Close & Attach to Packet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
