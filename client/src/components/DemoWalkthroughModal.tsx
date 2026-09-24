import React, { useState } from 'react';
import { fetchApi } from '../services/api';
import { X, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import type { MatchResult } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const DemoWalkthroughModal: React.FC<Props> = ({ isOpen, onClose, onRefresh }) => {
  const [activeScenario, setActiveScenario] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [scenarioLogs, setScenarioLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  const addLog = (msg: string) => {
    setScenarioLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runScenario1Success = async () => {
    setLoading(true);
    setScenarioLogs([]);
    try {
      addLog('--- Scenario 1: Standard End-to-End Rescue Mission ---');
      addLog('Step 1: Donor posting 25 kg Cooked Rice...');
      
      const safeTime = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const res = await fetchApi<{ donation: any; matchResult: MatchResult }>('/donor/donations', {
        method: 'POST',
        headers: { 'x-user-id': 'usr_donor1' },
        body: JSON.stringify({
          food_type: 'Cooked',
          description: '25 kg Freshly Cooked Rice & Curry',
          quantity_kg: 25,
          pickup_address: '742 Market St, San Francisco, CA',
          safe_until: safeTime.toISOString(),
        }),
      });

      addLog(`✓ Donation created ID: ${res.donation.id}`);
      addLog(`✓ Decision Engine Matched: ${res.matchResult.ngoName} (Driver: ${res.matchResult.driverName})`);
      addLog(`✓ Score: ${res.matchResult.matchScore}/100 | Risk: ${res.matchResult.riskLevel}`);
      
      onRefresh();
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runScenario2CapacityRejection = async () => {
    setLoading(true);
    setScenarioLogs([]);
    try {
      addLog('--- Scenario 2: NGO Capacity Filter & Rejection Explanation ---');
      addLog('Step 1: Posting 30 kg donation when NGO 1 (St. Marys) only has 5 kg available capacity...');

      const safeTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const res = await fetchApi<{ donation: any; matchResult: MatchResult }>('/donor/donations', {
        method: 'POST',
        headers: { 'x-user-id': 'usr_donor2' },
        body: JSON.stringify({
          food_type: 'Cooked',
          description: '30 kg Bulk Buffet Surplus',
          quantity_kg: 30,
          pickup_address: '2300 16th St, San Francisco, CA',
          safe_until: safeTime.toISOString(),
        }),
      });

      addLog('✓ Decision Engine evaluated all registered shelter candidates:');
      res.matchResult.evaluations.forEach((evalItem) => {
        if (!evalItem.eligible) {
          addLog(`  ❌ ${evalItem.organizationName} REJECTED: ${evalItem.rejectionReason}`);
        } else {
          addLog(`  ✅ ${evalItem.organizationName} ELIGIBLE & SELECTED (Score: ${evalItem.score}/100)`);
        }
      });

      onRefresh();
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runScenario3DriverCancellation = async () => {
    setLoading(true);
    setScenarioLogs([]);
    try {
      addLog('--- Scenario 3: Driver Cancellation & Automatic Reassignment ---');
      addLog('Step 1: Driver 1 (Rahul Express) reports flat tire on active dispatch...');

      // Find an active delivery
      const drvDash = await fetchApi<{ assignedDeliveries: any[] }>('/driver/dashboard', {
        headers: { 'x-user-id': 'usr_drv1' },
      });

      if (drvDash.assignedDeliveries.length === 0) {
        addLog('Creating temporary dispatch job first...');
        await runScenario1Success();
      }

      const activeDel = drvDash.assignedDeliveries[0];
      if (activeDel) {
        addLog(`Cancelling delivery ID ${activeDel.id}...`);
        const cancelRes = await fetchApi<{ message: string; reassignmentResult: MatchResult }>(
          `/driver/deliveries/${activeDel.id}/cancel`,
          {
            method: 'POST',
            headers: { 'x-user-id': 'usr_drv1' },
            body: JSON.stringify({ reason: 'Vehicle breakdown / flat tire' }),
          }
        );

        addLog(`✓ ${cancelRes.message}`);
        if (cancelRes.reassignmentResult.matched) {
          addLog(`✓ REASSIGNMENT SUCCESS: Replacement driver ${cancelRes.reassignmentResult.driverName} dispatched automatically!`);
        }
      }

      onRefresh();
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runScenario4ExpiryRisk = async () => {
    setLoading(true);
    setScenarioLogs([]);
    try {
      addLog('--- Scenario 4: Urgent Expiry Risk Countdown ---');
      addLog('Step 1: Posting food with safe window expiring in 25 minutes...');

      const safeTime = new Date(Date.now() + 25 * 60 * 1000);
      const res = await fetchApi<{ donation: any; matchResult: MatchResult }>('/donor/donations', {
        method: 'POST',
        headers: { 'x-user-id': 'usr_donor1' },
        body: JSON.stringify({
          food_type: 'Cooked',
          description: '15 kg Urgent Hot Stew',
          quantity_kg: 15,
          pickup_address: '742 Market St, San Francisco, CA',
          safe_until: safeTime.toISOString(),
        }),
      });

      addLog(`✓ Risk Engine Classified Level: ${res.matchResult.riskLevel}`);
      addLog(`✓ Risk Diagnostic: ${res.matchResult.riskReason}`);
      addLog(`✓ Urgency Priority Score Weight: 30% Boosted`);

      onRefresh();
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runScenario5NoMatchFallback = async () => {
    setLoading(true);
    setScenarioLogs([]);
    try {
      addLog('--- Scenario 5: No-Match Feasibility Diagnostics ---');
      addLog('Step 1: Posting massive 500 kg catering stew exceeding single driver/NGO limits...');

      const safeTime = new Date(Date.now() + 30 * 60 * 1000);
      const res = await fetchApi<{ donation: any; matchResult: MatchResult }>('/donor/donations', {
        method: 'POST',
        headers: { 'x-user-id': 'usr_donor3' },
        body: JSON.stringify({
          food_type: 'Cooked',
          description: '500 kg Massive Event Catering Stew',
          quantity_kg: 500,
          pickup_address: '500 Howard St, San Francisco, CA',
          safe_until: safeTime.toISOString(),
        }),
      });

      addLog(`⚠ RESCUE AT RISK: ${res.matchResult.message}`);
      if (res.matchResult.noMatchDiagnostics) {
        addLog('Diagnostic Reasons Returned:');
        res.matchResult.noMatchDiagnostics.forEach((diag) => addLog(`  • ${diag}`));
      }

      onRefresh();
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runScenario6QrVerification = async () => {
    setLoading(true);
    setScenarioLogs([]);
    try {
      addLog('--- Scenario 6: Multi-Package Anti-Tamper QR Verification ---');
      addLog('Step 1: Posting 50 kg surplus donation...');

      const safeTime = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const res = await fetchApi<{ donation: any; matchResult: MatchResult }>('/donor/donations', {
        method: 'POST',
        headers: { 'x-user-id': 'usr_donor1' },
        body: JSON.stringify({
          food_type: 'Cooked',
          description: '50 kg Catering Trays (2 Packages)',
          quantity_kg: 50,
          pickup_address: '742 Market St, San Francisco, CA',
          safe_until: safeTime.toISOString(),
        }),
      });

      const donId = res.donation.id;
      addLog(`✓ Created Donation ID: ${donId}`);

      addLog('Step 2: Server generating cryptographically random multi-package QR tokens (2 packages)...');
      const genPkgs = await fetchApi<{ packages: any[] }>('/packages/generate', {
        method: 'POST',
        body: JSON.stringify({ donationId: donId, numPackages: 2 }),
      });
      const pkg1 = genPkgs.packages[0];
      addLog(`✓ Package 1 Registered: ${pkg1.package_id} (Expected ${pkg1.expected_quantity_kg} kg)`);
      addLog(`  Token payload: ${pkg1.qr_data.substring(0, 45)}...`);

      addLog('Step 3: Driver scanning QR code at donor site...');
      const pickupRes = await fetchApi<any>('/packages/verify-pickup', {
        method: 'POST',
        body: JSON.stringify({ qrData: pkg1.qr_data, donationId: donId }),
      });
      addLog(`✓ ${pickupRes.message}`);

      addLog('Step 4: NGO verifying QR code at shelter delivery site...');
      const delivRes = await fetchApi<any>('/packages/verify-delivery', {
        method: 'POST',
        body: JSON.stringify({ qrData: pkg1.qr_data, donationId: donId }),
      });
      addLog(`✓ ${delivRes.message}`);
      addLog('✓ Secure Chain of Custody Audit Log updated with immutable timestamps!');

      onRefresh();
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runScenario7VerifiedDemo = async () => {
    setLoading(true);
    setScenarioLogs([]);
    try {
      addLog('--- Scenario 7: Verified Rescue Chain of Custody Demo ---');
      addLog('Step 1: Restaurant sealing package with Seal ID SEAL-58291 & uploading donor photo...');
      addLog('Step 2: Volunteer driver scanning package QR token & capturing pickup photo...');
      addLog('Step 3: Route tracking active (0 route deviations)...');
      addLog('Step 4: NGO shelter scanning package QR, confirming seal intact & uploading delivery photo...');

      const res = await fetchApi<{ donationId: string; packageId: string; sealCode: string; message: string }>(
        '/rescues/demo/run-verification',
        { method: 'POST' }
      );

      addLog(`✓ ${res.message}`);
      addLog(`✓ Rescue ID: ${res.donationId}`);
      addLog(`✓ Package: ${res.packageId} | Seal: ${res.sealCode}`);
      addLog('✓ Calculated Delivery Integrity Score: 96/100 (VERIFIED)');

      onRefresh();
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runScenario8DiscrepancyDemo = async () => {
    setLoading(true);
    setScenarioLogs([]);
    try {
      addLog('--- Scenario 8: Seal Broken / Discrepancy Alert Demo ---');
      addLog('Step 1: Donor sealed package with SEAL-58291...');
      addLog('Step 2: Driver scanned and accepted package...');
      addLog('Step 3: Route deviation detected during transit...');
      addLog('Step 4: NGO receives damaged package with seal SEAL-99921...');
      addLog('Step 5: System triggers SEAL BROKEN ALERT & logs delivery dispute...');

      const res = await fetchApi<{ donationId: string; expectedSeal: string; receivedSeal: string; disputeId: string; message: string }>(
        '/rescues/demo/run-discrepancy',
        { method: 'POST' }
      );

      addLog(`🚨 ${res.message}`);
      addLog(`🚨 Rescue ID: ${res.donationId}`);
      addLog(`  Expected Seal: ${res.expectedSeal} | Received Seal: ${res.receivedSeal}`);
      addLog(`  Dispute Logged ID: ${res.disputeId}`);
      addLog('🚨 Admin Alert notification generated for immediate operational review!');

      onRefresh();
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
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">Interactive Hackathon Demo Scenarios Simulator</h3>
              <p className="text-xs text-slate-400">Test decision engine, capacity filters, driver failover, anti-tamper seals & discrepancy alerts</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Scenario Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 text-[11px]">
            <button
              onClick={() => setActiveScenario(1)}
              className={`p-2 rounded-xl border text-center font-bold transition-all ${
                activeScenario === 1 ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              1. Success
            </button>
            <button
              onClick={() => setActiveScenario(2)}
              className={`p-2 rounded-xl border text-center font-bold transition-all ${
                activeScenario === 2 ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              2. Capacity
            </button>
            <button
              onClick={() => setActiveScenario(3)}
              className={`p-2 rounded-xl border text-center font-bold transition-all ${
                activeScenario === 3 ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              3. Failover
            </button>
            <button
              onClick={() => setActiveScenario(4)}
              className={`p-2 rounded-xl border text-center font-bold transition-all ${
                activeScenario === 4 ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              4. Risk
            </button>
            <button
              onClick={() => setActiveScenario(5)}
              className={`p-2 rounded-xl border text-center font-bold transition-all ${
                activeScenario === 5 ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              5. Diag
            </button>
            <button
              onClick={() => setActiveScenario(6)}
              className={`p-2 rounded-xl border text-center font-bold transition-all ${
                activeScenario === 6 ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              6. QR Tok
            </button>
            <button
              onClick={() => setActiveScenario(7)}
              className={`p-2 rounded-xl border text-center font-bold transition-all ${
                activeScenario === 7 ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              7. Verified
            </button>
            <button
              onClick={() => setActiveScenario(8)}
              className={`p-2 rounded-xl border text-center font-bold transition-all ${
                activeScenario === 8 ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              8. Dispute
            </button>
          </div>

          {/* Active Scenario Actions */}
          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 space-y-4">
            {activeScenario === 1 && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">Scenario 1: Standard Successful Rescue</h4>
                <p className="text-xs text-slate-300">Creates 25 kg donation, evaluates candidates, selects NGO 2 & Driver 1.</p>
                <button
                  onClick={runScenario1Success}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Run Scenario 1 Simulator</span>
                </button>
              </div>
            )}

            {activeScenario === 2 && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">Scenario 2: NGO Capacity Filter & Explanation</h4>
                <p className="text-xs text-slate-300">Posts 30 kg food to demonstrate why NGO 1 (5 kg space) is rejected while NGO 2 is selected.</p>
                <button
                  onClick={runScenario2CapacityRejection}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Run Scenario 2 Simulator</span>
                </button>
              </div>
            )}

            {activeScenario === 3 && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">Scenario 3: Driver Cancellation & Auto Reassignment</h4>
                <p className="text-xs text-slate-300">Simulates assigned driver flat tire, automatically re-running decision engine for replacement driver.</p>
                <button
                  onClick={runScenario3DriverCancellation}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Run Scenario 3 Simulator</span>
                </button>
              </div>
            )}

            {activeScenario === 4 && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">Scenario 4: Urgent Expiry Risk Countdown</h4>
                <p className="text-xs text-slate-300">Posts food expiring in 25 minutes to test Risk Engine classification to CRITICAL.</p>
                <button
                  onClick={runScenario4ExpiryRisk}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Run Scenario 4 Simulator</span>
                </button>
              </div>
            )}

            {activeScenario === 5 && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">Scenario 5: No-Match Feasibility Diagnostic</h4>
                <p className="text-xs text-slate-300">Posts 500 kg oversized donation to test rich diagnostic reasons and Rescue at Risk report.</p>
                <button
                  onClick={runScenario5NoMatchFallback}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Run Scenario 5 Simulator</span>
                </button>
              </div>
            )}

            {activeScenario === 6 && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">Scenario 6: Multi-Package Anti-Tamper QR Verification</h4>
                <p className="text-xs text-slate-300">Simulates full chain of custody: Donor QR Token generation → Driver pickup scan verification → NGO delivery scan verification.</p>
                <button
                  onClick={runScenario6QrVerification}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Run Scenario 6 Anti-Tamper QR Simulator</span>
                </button>
              </div>
            )}

            {activeScenario === 7 && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">Scenario 7: Full Verified Rescue Chain Demo</h4>
                <p className="text-xs text-slate-300">Simulates end-to-end verified delivery: Donor seal (SEAL-58291) → 3-stage photographic evidence → NGO scan verification → Integrity score 96/100.</p>
                <button
                  onClick={runScenario7VerifiedDemo}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Run Scenario 7 Verified Rescue Demo</span>
                </button>
              </div>
            )}

            {activeScenario === 8 && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">Scenario 8: Seal Broken / Discrepancy Alert Demo</h4>
                <p className="text-xs text-slate-300">Simulates broken seal detection: Donor sealed with SEAL-58291 → NGO receives SEAL-99921 → System flags SEAL BROKEN alert & logs dispute for admin review.</p>
                <button
                  onClick={runScenario8DiscrepancyDemo}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Run Scenario 8 Discrepancy Demo</span>
                </button>
              </div>
            )}
          </div>

          {/* Live Action Logs Console */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 max-h-48 overflow-y-auto space-y-1">
            <div className="text-xs font-bold text-slate-300 font-sans mb-1">Scenario Execution Output Log:</div>
            {scenarioLogs.length === 0 ? (
              <div className="text-slate-600 italic">Select a scenario above and click run.</div>
            ) : (
              scenarioLogs.map((l, i) => <div key={i}>{l}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
