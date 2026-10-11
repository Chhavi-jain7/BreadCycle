'use client';

import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Copy, 
  Check,
  Building2,
  Lock
} from 'lucide-react';

interface ReserveModalProps {
  donation: any;
  currentUser: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReserveModal({
  donation,
  currentUser,
  onClose,
  onSuccess,
}: ReserveModalProps) {
  const isNgo = currentUser?.role === 'NGO';
  const maxPortions = isNgo
    ? Math.min(donation.remainingQuantity, currentUser?.ngo?.capacityMeals || 50)
    : Math.min(donation.remainingQuantity, 6); // Individual limit 6 portions

  const [quantity, setQuantity] = useState<number>(isNgo ? Math.min(10, maxPortions) : 2);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedReservation, setConfirmedReservation] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationId: donation.id,
          quantity,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete reservation.');
      }

      setConfirmedReservation({ ...data.reservation, pickupCode: data.pickupCode });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (confirmedReservation?.pickupCode) {
      navigator.clipboard.writeText(confirmedReservation.pickupCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-[#ebdcc7] shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#faf6ee] border-b border-[#ebdcc7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-forest-900" />
            <h3 className="font-serif text-lg font-bold text-forest-950">
              {confirmedReservation
                ? 'Reservation Confirmed!'
                : isNgo
                ? 'Claim Bulk Surplus Allocation'
                : 'Reserve Food Portions'}
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

          {confirmedReservation ? (
            /* Success confirmation with unique single-use pickup code */
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-serif text-xl font-bold text-forest-950">
                  {confirmedReservation.reservedQuantity} {donation.unit} Locked!
                </h4>
                <p className="text-xs text-stone-600 mt-1">
                  Present this single-use code to the restaurant staff during collection.
                </p>
              </div>

              {/* Huge Pickup Code Card */}
              <div className="bg-[#fdfbf7] p-4 rounded-2xl border-2 border-dashed border-wheat-400 max-w-xs mx-auto">
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500 block">
                  Single-Use Verification Code
                </span>
                <div className="font-mono text-3xl font-extrabold text-forest-900 tracking-wider my-1">
                  {confirmedReservation.pickupCode}
                </div>
                <button
                  onClick={copyCode}
                  className="mt-1 text-xs text-wheat-800 hover:text-wheat-950 font-semibold inline-flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-left text-xs space-y-1.5 text-stone-700">
                <div className="flex items-center gap-1.5 font-medium text-forest-950">
                  <MapPin className="w-3.5 h-3.5 text-wheat-600" />
                  <span>{donation.pickupAddress}</span>
                </div>
                <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  <span>
                    Must collect before{' '}
                    <strong>
                      {new Date(confirmedReservation.expiresAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>{' '}
                    to avoid automatic recovery redistribution.
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-forest-900 hover:bg-forest-800 text-wheat-200 text-xs font-semibold shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* Reservation Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-[#faf6ee] p-3 rounded-xl border border-[#ebdcc7] text-xs">
                <span className="font-bold text-stone-900 block">{donation.title}</span>
                <div className="text-[11px] text-stone-600 mt-0.5 flex items-center justify-between">
                  <span>Available: {donation.remainingQuantity} {donation.unit}</span>
                  <span className="text-emerald-700 font-semibold">Automated checks only</span>
                </div>
              </div>

              {/* Quantity Picker */}
              <div>
                <label className="text-xs font-semibold text-stone-800 block mb-1">
                  {isNgo ? 'Portions to Claim (Bulk Shelter Allocation):' : 'Number of Portions (Family Quota):'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max={maxPortions}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                    className="flex-1 accent-forest-800 cursor-pointer"
                  />
                  <span className="w-16 text-center font-mono text-sm font-bold bg-stone-100 py-1 px-2 rounded-lg border border-stone-200">
                    {quantity} {donation.unit}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  {isNgo
                    ? `NGO bulk quota permitted up to ${maxPortions} meals based on verified shelter capacity.`
                    : 'Individual quota limit capped at 6 portions to ensure equitable community access.'}
                </p>
              </div>

              {/* Instructions / Volunteer note */}
              {isNgo && (
                <div>
                  <label className="text-xs font-semibold text-stone-800 block mb-1">
                    Volunteer Dispatch / Collection Notes:
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Volunteer courier picking up via motorcycle with insulated carrier."
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-forest-600"
                  />
                </div>
              )}

              {/* Safety & Expiry Notice */}
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Server-Enforced Pickup Hold:</strong> Once reserved, your portions are held for 90 minutes. If uncollected, BreadCycle’s recovery engine automatically releases the food to avoid waste.
                </span>
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
                  disabled={loading || donation.remainingQuantity <= 0}
                  className="px-5 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-wheat-200 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{loading ? 'Securing Portions...' : 'Confirm & Generate Pickup Code'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
