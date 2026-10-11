'use client';

import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  ShieldCheck, 
  Barcode,
  ArrowRight
} from 'lucide-react';

interface HandoverModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialCode?: string;
}

export default function HandoverModal({ onClose, onSuccess, initialCode = '' }: HandoverModalProps) {
  const [pickupCode, setPickupCode] = useState(initialCode);
  const [verifiedReservation, setVerifiedReservation] = useState<any>(null);
  const [quantityCollected, setQuantityCollected] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedData, setConfirmedData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(verifiedReservation ? '/api/reservations/confirm-pickup' : '/api/reservations/verify-pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupCode: pickupCode.trim().toUpperCase(),
          ...(verifiedReservation ? { quantityCollected: Number(quantityCollected) } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify handover code.');
      }

      if (!verifiedReservation) {
        setVerifiedReservation(data.reservation);
        setQuantityCollected(data.reservation.reservedQuantity);
      } else {
        setConfirmedData(data);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-[#ebdcc7] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#faf6ee] border-b border-[#ebdcc7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <h3 className="font-serif text-lg font-bold text-forest-950">
              Confirm Food Handover
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {confirmedData ? (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-bold text-forest-950">
                  Handover Authenticated!
                </h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  {confirmedData.message}
                </p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-left text-xs space-y-1 text-stone-700">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Pickup Code:</span>
                  <span className="font-mono font-bold text-forest-900">{pickupCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Handover Status:</span>
                  <span className="text-emerald-700 font-bold">CONFIRMED (Single-Use Redeemed)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Traceability:</span>
                  <span className="font-mono text-[10px] text-stone-600">Audit Log Recorded</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-wheat-200 text-xs font-semibold shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                Enter the recipient’s private pickup code. BreadCycle validates it against this restaurant’s active reservations before recording the handover.
              </p>

              <div>
                <label className="text-xs font-semibold text-stone-800 block mb-1">
                  Recipient Pickup Code:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={pickupCode}
                    readOnly={Boolean(verifiedReservation)}
                    onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                    placeholder="BC-XXXXXXXXXXXX"
                    maxLength={15}
                    minLength={15}
                    pattern="BC-[A-Fa-f0-9]{12}"
                    className="w-full text-center font-mono text-2xl font-bold uppercase tracking-widest py-3 rounded-xl border border-stone-300 focus:outline-none focus:border-forest-700 bg-[#fdfbf7]"
                  />
                  <Barcode className="w-5 h-5 text-stone-400 absolute right-3 top-3.5" />
                </div>
              </div>

              {verifiedReservation && (
                <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Pickup verified: {verifiedReservation.foodName}</p>
                  <p className="text-xs text-emerald-900">{verifiedReservation.recipientName} reserved {verifiedReservation.reservedQuantity} {verifiedReservation.unit}.</p>
                  <label className="block text-xs font-semibold text-stone-800">
                    Quantity collected
                    <input
                      type="number"
                      min={1}
                      max={verifiedReservation.reservedQuantity}
                      required
                      value={quantityCollected}
                      onChange={(event) => setQuantityCollected(Number(event.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              )}

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                <div className="flex items-center gap-1 font-semibold text-stone-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Single-Use Cryptographic Rule</span>
                </div>
                <p>
                  Each code can be redeemed once only. Eligible portions not collected are returned to available inventory; expired or unsafe food is never returned.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !pickupCode}
                  className="px-5 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-wheat-200 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>{loading ? 'Please wait…' : verifiedReservation ? 'Confirm Handover' : 'Verify Code'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
