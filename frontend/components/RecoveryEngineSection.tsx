'use client';

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  AlertTriangle, 
  Sparkles,
  Search,
  Check
} from 'lucide-react';

export default function RecoveryEngineSection({ onActionComplete, allowBatch }: { onActionComplete?: () => void; allowBatch: boolean }) {
  const [loading, setLoading] = useState(false);
  const [recoveryData, setRecoveryData] = useState<any>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const fetchRecoveryState = async () => {
    try {
      const res = await fetch('/api/recovery');
      const data = await res.json();
      setRecoveryData(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecoveryState();
  }, []);

  const handleTriggerRecovery = async (reservationId?: string) => {
    setLoading(true);
    setSimulationResult(null);
    try {
      const res = await fetch('/api/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          reservationId
            ? { reservationId, reason: 'MISSED_DEADLINE' }
            : { runBatch: true }
        ),
      });
      const data = await res.json();
      setSimulationResult(data);
      await fetchRecoveryState();
      if (onActionComplete) onActionComplete();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pendingExpired = recoveryData?.pendingExpiredReservations || [];
  const events = recoveryData?.recoveryEvents || [];

  return (
    <section id="recovery-engine" className="py-16 bg-[#faf6ee] border-b border-[#e9dfcf]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-wheat-100 border border-wheat-300 text-wheat-900 text-xs font-semibold uppercase tracking-wider mb-3">
            <RefreshCw className="w-3.5 h-3.5 text-wheat-700" />
            Signature Platform Innovation
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
            Intelligent Failed-Pickup Recovery
          </h2>
          <p className="mt-3 text-stone-600 text-sm sm:text-base leading-relaxed">
            BreadCycle checks that a reservation has actually expired, re-evaluates reported handling windows, and reallocates only food that remains eligible under its configured safety rules.
          </p>
        </div>

        {/* 5-Step Pipeline Flow Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-10">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm relative">
            <div className="w-7 h-7 rounded-full bg-forest-900 text-wheat-300 flex items-center justify-center text-xs font-bold mb-2">
              1
            </div>
            <h4 className="text-xs font-bold text-stone-900">Enforced Hold</h4>
            <p className="text-[11px] text-stone-500 mt-1">
              Recipient claims portions with server-enforced countdown timer.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm relative">
            <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold mb-2">
              2
            </div>
            <h4 className="text-xs font-bold text-stone-900">No-Show Trigger</h4>
            <p className="text-[11px] text-stone-500 mt-1">
              If deadline elapses without verified handover code, reservation expires.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm relative">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold mb-2">
              3
            </div>
            <h4 className="text-xs font-bold text-stone-900">Atomic Release</h4>
            <p className="text-[11px] text-stone-500 mt-1">
              Quantity is restored atomically to prevent any overbooking or orphan food.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm relative">
            <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold mb-2">
              4
            </div>
            <h4 className="text-xs font-bold text-stone-900">Configured Safety Gate</h4>
            <p className="text-[11px] text-stone-500 mt-1">
              If safe holding window expired, food is retired safely. Never reallocate unsafe food.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm relative">
            <div className="w-7 h-7 rounded-full bg-forest-700 text-wheat-300 flex items-center justify-center text-xs font-bold mb-2">
              5
            </div>
            <h4 className="text-xs font-bold text-stone-900">Next-Best Match</h4>
            <p className="text-[11px] text-stone-500 mt-1">
              Smart algorithm alerts the closest high-capacity verified shelter immediately.
            </p>
          </div>
        </div>

        {/* Interactive Live Recovery Demo Box */}
        <div className="bg-white rounded-3xl border border-[#dec9ad] shadow-md p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="font-serif text-lg font-bold text-forest-950">
                  Live Recovery Test Sandbox
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Simulate missed pickups or execute the server-side recovery job in real-time.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {allowBatch && (
                <button
                  onClick={() => handleTriggerRecovery()}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-wheat-200 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Run Automated Recovery Job</span>
                </button>
              )}
            </div>
          </div>

          {/* Pending Expired Reservations Ready for 1-Click Recovery */}
          {pendingExpired.length > 0 && (
            <div className="my-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {pendingExpired.length} Lapsed Reservation(s) Ready for Recovery Demonstration:
                </span>
                <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-mono">
                  Server-side expired
                </span>
              </div>
              <div className="space-y-2 mt-3">
                {pendingExpired.map((res: any) => (
                  <div
                    key={res.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-amber-200/80 shadow-sm text-xs"
                  >
                    <div>
                      <span className="font-semibold text-stone-900">{res.donation?.title}</span>
                      <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                        <span>Original claimant: {res.user?.name}</span>
                        <span>•</span>
                        <span>Quantity: {res.reservedQuantity} {res.donation?.unit}</span>
                        <span>•</span>
                        <span className="text-rose-600 font-medium">Expired at: {new Date(res.expiresAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTriggerRecovery(res.id)}
                      disabled={loading}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                      <span>Execute Recovery & Reallocate</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Simulation Result Display */}
          {simulationResult && (
            <div className="my-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Recovery Execution Completed</span>
              </div>
              <p className="text-stone-700 mt-1 font-medium">{simulationResult.message}</p>

              {simulationResult.result && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white/80 p-3 rounded-xl border border-emerald-200 text-[11px]">
                  <div>
                    <span className="text-stone-500 block">Recovered Quantity:</span>
                    <span className="font-bold text-stone-900">
                      {simulationResult.result.recoveredQuantity} portions
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Automated handling-window check:</span>
                    <span className="font-bold text-emerald-700">
                      {simulationResult.result.isSafeToRedistribute ? 'Window checks pass' : 'Unsafe / Expired'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Next-Best Recipient:</span>
                    <span className="font-bold text-forest-900">
                      {simulationResult.result.reallocatedToUserName || 'Surplus Pool'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Recovery Audit Events Table */}
          <div className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-3">
              Historical Recovery Audit Log (Persisted Data)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-stone-200 rounded-xl overflow-hidden">
                <thead className="bg-[#f8f5ee] text-stone-700 border-b border-stone-200 font-medium">
                  <tr>
                    <th className="p-3">Surplus Food</th>
                    <th className="p-3">Recovered Qty</th>
                    <th className="p-3">Initial Claimant</th>
                    <th className="p-3">New Reallocated Recipient</th>
                    <th className="p-3">Match Score</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-stone-400">
                        No recovery events yet. Click the button above to run one!
                      </td>
                    </tr>
                  ) : (
                    events.map((ev: any) => (
                      <tr key={ev.id} className="hover:bg-stone-50">
                        <td className="p-3 font-semibold text-stone-900">
                          {ev.donation?.title || 'Surplus batch'}
                        </td>
                        <td className="p-3 font-medium">
                          {ev.recoveredQuantity} portions
                        </td>
                        <td className="p-3 text-stone-600">
                          {ev.originalReservation?.user?.name || 'Previous recipient'}
                        </td>
                        <td className="p-3 font-semibold text-forest-900">
                          {ev.newRecipientId ? (
                            <span className="inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-wheat-600" />
                              Reallocated Recipient
                            </span>
                          ) : (
                            <span className="text-stone-400">Open Network Pool</span>
                          )}
                        </td>
                        <td className="p-3">
                          {ev.matchingScore ? (
                            <span className="bg-forest-100 text-forest-800 px-1.5 py-0.5 rounded font-mono text-[10px]">
                              {ev.matchingScore}%
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              ev.status === 'REALLOCATED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ev.status === 'FAILED_SAFE_WINDOW_PASSED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
