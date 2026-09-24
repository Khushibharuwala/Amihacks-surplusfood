import React, { useState } from 'react';
import { fetchApi } from '../services/api';
import { X, CheckCircle, ArrowRight, RefreshCw, ShieldCheck, MapPin, Scale, Clock } from 'lucide-react';
import type { MatchResult } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const DemoWalkthroughModal: React.FC<Props> = ({ isOpen, onClose, onRefresh }) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [donationId, setDonationId] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleStep1CreateDonation = async () => {
    setLoading(true);
    try {
      addLog('Step 1: Creating surplus donation: 25 kg Cooked Rice (Safe until 8:30 PM)...');
      
      const safeTime = new Date();
      safeTime.setHours(20, 30, 0, 0);
      if (safeTime < new Date()) safeTime.setDate(safeTime.getDate() + 1);

      // Create donation as Donor 1 (Tasty Bites)
      const res = await fetchApi<{ donation: any; matchResult: MatchResult }>('/donor/donations', {
        method: 'POST',
        headers: { 'x-user-id': 'usr_donor1' },
        body: JSON.stringify({
          food_type: 'Cooked',
          description: '25 kg Freshly Cooked Rice & Curry',
          quantity_kg: 25,
          pickup_address: '742 Market St, San Francisco, CA',
          pickup_latitude: 37.7879,
          pickup_longitude: -122.4042,
          safe_until: safeTime.toISOString(),
        }),
      });

      setDonationId(res.donation.id);
      setMatchResult(res.matchResult);
      addLog(`Donation created ID: ${res.donation.id}`);
      addLog(`Matching engine automatically executed.`);
      setStep(2);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStep3DriverAccept = async () => {
    if (!matchResult?.driverId || !donationId) return;
    setLoading(true);
    try {
      addLog('Step 3: Driver (Rahul Express) receiving & accepting assignment...');
      
      // Get delivery ID
      const delRes = await fetchApi<{ assignedDeliveries: any[] }>('/driver/dashboard', {
        headers: { 'x-user-id': 'usr_drv1' },
      });

      const delivery = delRes.assignedDeliveries.find((d) => d.donation_id === donationId);
      if (delivery) {
        setDeliveryId(delivery.id);
        await fetchApi(`/driver/deliveries/${delivery.id}/status`, {
          method: 'POST',
          headers: { 'x-user-id': 'usr_drv1' },
          body: JSON.stringify({ next_status: 'ACCEPTED' }),
        });
        addLog('Driver accepted assignment successfully!');
      }
      setStep(4);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStep4StartPickup = async () => {
    if (!deliveryId) return;
    setLoading(true);
    try {
      addLog('Step 4: Driver marked Pickup Started...');
      await fetchApi(`/driver/deliveries/${deliveryId}/status`, {
        method: 'POST',
        headers: { 'x-user-id': 'usr_drv1' },
        body: JSON.stringify({ next_status: 'PICKUP_STARTED' }),
      });
      setStep(5);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStep5FoodPickedUp = async () => {
    if (!deliveryId) return;
    setLoading(true);
    try {
      addLog('Step 5: Food Picked Up from Donor...');
      await fetchApi(`/driver/deliveries/${deliveryId}/status`, {
        method: 'POST',
        headers: { 'x-user-id': 'usr_drv1' },
        body: JSON.stringify({ next_status: 'PICKED_UP' }),
      });
      setStep(6);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStep6DeliverAndFinish = async () => {
    if (!deliveryId) return;
    setLoading(true);
    try {
      addLog('Step 6: Food Delivered to Hope Community Kitchen!');
      await fetchApi(`/driver/deliveries/${deliveryId}/status`, {
        method: 'POST',
        headers: { 'x-user-id': 'usr_drv1' },
        body: JSON.stringify({ next_status: 'DELIVERED' }),
      });
      addLog('Workflow completed cleanly! Impact metrics updated.');
      onRefresh();
      setStep(7);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">Section 17 Acceptance Scenario Walkthrough</h3>
              <p className="text-xs text-slate-400">Step-by-step real-time rescue logistics simulation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step Stepper Progress */}
          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s < step
                    ? 'bg-emerald-500'
                    : s === step
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>

          {/* STEP 1: CREATE DONATION */}
          {step === 1 && (
            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <MapPin className="w-4 h-4" />
                <span>Step 1: Donor Posts Surplus Food</span>
              </div>
              <p className="text-sm text-slate-300">
                Tasty Bites Restaurant posts <span className="font-bold text-emerald-300">25 kg cooked rice</span> safe until 8:30 PM.
              </p>
              <button
                onClick={handleStep1CreateDonation}
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Post Food & Trigger Real-Time Matching Engine</span>
              </button>
            </div>
          )}

          {/* STEP 2: NGO EVALUATION & SELECTION */}
          {step === 2 && matchResult && (
            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Scale className="w-4 h-4" />
                <span>Step 2: Real-Time NGO Evaluation & Scoring</span>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">NGO Candidate Evaluations</h4>
                <div className="space-y-2">
                  {matchResult.evaluations.map((evalItem) => (
                    <div
                      key={evalItem.ngoId}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                        evalItem.eligible
                          ? evalItem.ngoId === matchResult.ngoId
                            ? 'bg-emerald-950/60 border-emerald-600/80 text-emerald-200'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                          : 'bg-rose-950/30 border-rose-900/60 text-rose-300 opacity-80'
                      }`}
                    >
                      <div>
                        <span className="font-bold">{evalItem.organizationName}</span>
                        {evalItem.eligible ? (
                          <span className="ml-2 text-emerald-400">
                            Score: {evalItem.score}/100 ({evalItem.distanceKm} km away)
                          </span>
                        ) : (
                          <span className="ml-2 text-rose-400">
                            Rejection: {evalItem.rejectionReason}
                          </span>
                        )}
                      </div>
                      {evalItem.ngoId === matchResult.ngoId ? (
                        <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                          SELECTED
                        </span>
                      ) : !evalItem.eligible ? (
                        <span className="bg-rose-900/80 text-rose-200 font-bold px-2 py-0.5 rounded text-[10px]">
                          REJECTED
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 text-xs text-slate-300 space-y-1">
                <p>✓ <span className="font-bold text-white">NGO Selected:</span> {matchResult.ngoName}</p>
                <p>✓ <span className="font-bold text-white">Driver Assigned:</span> {matchResult.driverName}</p>
                <p>✓ <span className="font-bold text-white">Estimated Travel Time:</span> {matchResult.estimatedMinutes} mins</p>
              </div>

              <button
                onClick={handleStep3DriverAccept}
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Proceed to Driver Acceptance</span>
              </button>
            </div>
          )}

          {/* STEP 4, 5, 6 OPERATIONAL FLOW */}
          {step >= 4 && step <= 6 && (
            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Clock className="w-4 h-4" />
                <span>Operational Delivery Stages</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg border text-center text-xs font-semibold ${step > 4 ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : step === 4 ? 'bg-amber-950 border-amber-600 text-amber-200 animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                  1. Pickup Started
                </div>
                <div className={`p-3 rounded-lg border text-center text-xs font-semibold ${step > 5 ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : step === 5 ? 'bg-amber-950 border-amber-600 text-amber-200 animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                  2. Food Picked Up
                </div>
                <div className={`p-3 rounded-lg border text-center text-xs font-semibold ${step > 6 ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : step === 6 ? 'bg-amber-950 border-amber-600 text-amber-200 animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                  3. Delivered to Shelter
                </div>
              </div>

              {step === 4 && (
                <button
                  onClick={handleStep4StartPickup}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>Mark Pickup Started</span>
                </button>
              )}

              {step === 5 && (
                <button
                  onClick={handleStep5FoodPickedUp}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>Mark Food Picked Up</span>
                </button>
              )}

              {step === 6 && (
                <button
                  onClick={handleStep6DeliverAndFinish}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>Complete Delivery & Update Impact Metrics</span>
                </button>
              )}
            </div>
          )}

          {/* STEP 7: COMPLETE */}
          {step === 7 && (
            <div className="bg-emerald-950/40 border border-emerald-700 p-6 rounded-xl text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="text-xl font-bold text-emerald-200">End-to-End Demo Workflow Completed!</h4>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Surplus food was matched, assigned, picked up, and delivered to Hope Community Kitchen successfully.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
              >
                Close Walkthrough
              </button>
            </div>
          )}

          {/* Live Action Logs Console */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 max-h-36 overflow-y-auto space-y-1">
            <div className="text-xs font-bold text-slate-300 font-sans mb-1">Execution Console Log:</div>
            {logs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
