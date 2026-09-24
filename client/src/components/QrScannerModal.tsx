import React, { useState } from 'react';
import { fetchApi } from '../services/api';
import { QrCode, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  mode: 'PICKUP' | 'DELIVERY';
  donationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const QrScannerModal: React.FC<Props> = ({ isOpen, mode, donationId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [qrInput, setQrInput] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async (payloadToVerify?: string) => {
    const dataStr = payloadToVerify || qrInput;
    if (!dataStr) {
      setErrorMsg('Please enter or scan a valid QR payload.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const endpoint = mode === 'PICKUP' ? '/packages/verify-pickup' : '/packages/verify-delivery';
      const res = await fetchApi<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ qrData: dataStr, donationId }),
      });

      setResult(res);
      if (res.valid) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed — package does not match assigned donation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateValidScan = async () => {
    try {
      setLoading(true);
      // Fetch actual package QR token for donation
      const pkgsData = await fetchApi<{ packages: any[] }>(`/packages/donation/${donationId}`);
      if (pkgsData.packages && pkgsData.packages.length > 0) {
        const firstPkg = pkgsData.packages[0];
        setQrInput(firstPkg.qr_data);
        await handleVerify(firstPkg.qr_data);
      } else {
        // Auto-generate packages first
        const genData = await fetchApi<{ packages: any[] }>('/packages/generate', {
          method: 'POST',
          body: JSON.stringify({ donationId }),
        });
        const firstPkg = genData.packages[0];
        setQrInput(firstPkg.qr_data);
        await handleVerify(firstPkg.qr_data);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateInvalidScan = async () => {
    const invalidQr = JSON.stringify({
      p: 'PKG-FAKE-999',
      d: 'don_fake_donation',
      t: 'sec_invalid_tampered_token',
      v: 1,
    });
    setQrInput(invalidQr);
    await handleVerify(invalidQr);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                {mode === 'PICKUP' ? 'Scan Pickup Package QR' : 'Verify Food Delivery QR'}
              </h3>
              <p className="text-[11px] text-slate-400">Anti-tamper chain of custody verification</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Success State */}
        {result?.valid && (
          <div className="bg-emerald-950/60 border border-emerald-700 p-5 rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="font-bold text-lg text-emerald-200">✓ Food Package Verified!</h4>
            <p className="text-xs text-slate-300">{result.message}</p>
            {result.package && (
              <div className="text-xs bg-slate-900 p-3 rounded-lg border border-slate-800 text-left space-y-1">
                <p>• Package ID: <strong className="font-mono text-white">{result.package.package_id}</strong></p>
                <p>• Expected Quantity: <strong className="text-emerald-300">{result.package.expected_quantity_kg} kg</strong></p>
                <p>• Status: <strong className="text-cyan-300">{result.package.status}</strong></p>
              </div>
            )}
          </div>
        )}

        {/* Failure Error State */}
        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-800 p-4 rounded-xl text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
            <h4 className="font-bold text-sm text-rose-200">Verification Failed!</h4>
            <p className="text-xs text-rose-300">{errorMsg}</p>
          </div>
        )}

        {!result?.valid && (
          <div className="space-y-4 text-xs">
            {/* 1-Click Demo QR Simulators */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 block uppercase text-[10px] tracking-wider">
                1-Click Demo QR Scan Simulators:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSimulateValidScan}
                  disabled={loading}
                  className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Scan Valid Package</span>
                </button>

                <button
                  onClick={handleSimulateInvalidScan}
                  disabled={loading}
                  className="py-2 px-3 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Scan Invalid / Tampered QR</span>
                </button>
              </div>
            </div>

            {/* Manual QR Data Input */}
            <div className="space-y-2">
              <label className="block text-slate-400 font-semibold">Or Paste QR Code Token Payload:</label>
              <textarea
                rows={2}
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder='{"p":"PKG-xxx","d":"don_xxx","t":"sec_tok_xxx"}'
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerify()}
                disabled={loading || !qrInput}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                <span>Verify Token</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
