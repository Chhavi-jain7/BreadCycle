'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  MapPin, 
  Users, 
  Barcode, 
  Truck,
  ArrowRight
} from 'lucide-react';

interface NgoDashboardProps {
  currentUser: any;
  onExploreFood: () => void;
}

export default function NgoDashboard({ currentUser, onExploreFood }: NgoDashboardProps) {
  const [reservations, setReservations] = useState<any[]>([]);
  const [pickupCodes, setPickupCodes] = useState<Record<string, string>>({});
  const [codeError, setCodeError] = useState('');
  const ngo = currentUser?.ngo;
  const isVerified = ngo?.verificationStatus === 'VERIFIED';

  useEffect(() => {
    fetch('/api/reservations')
      .then((res) => res.json())
      .then((data) => {
        if (data.reservations) setReservations(data.reservations);
      })
      .catch((e) => console.error(e));
  }, [currentUser?.id]);

  const activeClaims = reservations.filter((r) => r.status === 'PENDING');
  const pastClaims = reservations.filter((r) => r.status === 'CONFIRMED_PICKUP');
  const totalMealsClaimed = pastClaims.reduce((sum, r) => sum + (r.collectedQuantity || r.reservedQuantity), 0);

  const revealPickupCode = async (reservationId: string) => {
    setCodeError('');
    try {
      const response = await fetch(`/api/reservations/${encodeURIComponent(reservationId)}/pickup-code`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pickup code is unavailable.');
      setPickupCodes((existing) => ({ ...existing, [reservationId]: data.pickupCode }));
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : 'Pickup code is unavailable.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Verification Status */}
      <div className="bg-white p-6 rounded-3xl border border-[#ebdcc7] shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-forest-900">
                Community Kitchen & Shelter Portal
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-forest-950 mt-1">
              {ngo?.orgName || currentUser?.name}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Registration: <span className="font-mono text-stone-700">{ngo?.registrationNumber || 'Pending submission'}</span> • Daily Capacity: <span className="font-bold text-forest-900">{ngo?.capacityMeals ?? 100} meals</span> • Service Radius: {ngo?.serviceRadiusKm ?? 15} km
            </p>
          </div>

          <div>
            {isVerified ? (
              <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified Humanitarian Recipient</span>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2 shadow-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Verification Under Review</span>
              </div>
            )}
          </div>
        </div>

        {/* Verification Status Banner */}
        {!isVerified && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Administrative Verification in Progress</h4>
              <p className="mt-0.5 leading-relaxed text-stone-600">
                Your organization details are being reviewed by a BreadCycle administrator. You can browse surplus listings, but bulk claiming requires verified status.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 font-medium block">Active Claims in Transit</span>
          <span className="text-2xl font-serif font-bold text-forest-950 mt-1 block">
            {activeClaims.length} <span className="text-xs font-sans text-stone-500">batches</span>
          </span>
          <span className="text-[10px] text-amber-700 font-medium mt-1 block">
            Awaiting pickup / courier handover
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 font-medium block">Total Meals Distributed</span>
          <span className="text-2xl font-serif font-bold text-emerald-800 mt-1 block">
            {totalMealsClaimed} <span className="text-xs font-sans text-emerald-600">meals</span>
          </span>
          <span className="text-[10px] text-emerald-700 font-medium mt-1 block">
            Served through community kitchens
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 font-medium block">Service Capacity</span>
          <span className="text-2xl font-serif font-bold text-stone-900 mt-1 block">
            {ngo?.capacityMeals ?? 100} <span className="text-xs font-sans text-stone-500">meals/day</span>
          </span>
          <span className="text-[10px] text-stone-400 mt-1 block">
            Covers {ngo?.serviceRadiusKm ?? 15} km catchment radius
          </span>
        </div>
      </div>

      {/* Active Claims & Verification Codes */}
      <div className="bg-white rounded-3xl border border-[#ebdcc7] shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <h3 className="font-serif text-lg font-bold text-forest-950">
            Active Bulk Allocations & Pickup Verification Codes
          </h3>
          <button
            onClick={onExploreFood}
            className="text-xs font-semibold text-forest-800 hover:text-forest-950 flex items-center gap-1"
          >
            <span>Claim More Surplus</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {codeError && <p role="alert" className="mt-3 text-xs text-rose-700">{codeError}</p>}

        <div className="space-y-3 mt-4">
          {activeClaims.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">
              No active bulk claims. Browse the discovery map to claim surplus allocations!
            </p>
          ) : (
            activeClaims.map((claim) => (
              <div
                key={claim.id}
                className="bg-[#faf6ee] p-4 rounded-2xl border border-[#ebdcc7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <span className="font-bold text-stone-900 text-sm block">
                    {claim.donation?.title}
                  </span>
                  <div className="text-[11px] text-stone-600 flex flex-wrap items-center gap-2 mt-1">
                    <span>Quantity: {claim.reservedQuantity} portions</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-wheat-600" />
                      {claim.donation?.pickupAddress}
                    </span>
                    <span>•</span>
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires: {new Date(claim.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="bg-white px-4 py-2 rounded-xl border-2 border-dashed border-wheat-400 text-center shrink-0">
                  <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block">
                    Handover Code
                  </span>
                  {pickupCodes[claim.id] ? (
                    <span className="font-mono text-base font-extrabold text-forest-900">{pickupCodes[claim.id]}</span>
                  ) : (
                    <button type="button" onClick={() => revealPickupCode(claim.id)} className="text-xs font-semibold text-forest-800 hover:underline">View pickup code</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
