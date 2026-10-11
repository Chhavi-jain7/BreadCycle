'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Barcode, 
  Calendar, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface RecipientPortalProps {
  currentUser: any;
  onExploreFood: () => void;
}

export default function RecipientPortal({ currentUser, onExploreFood }: RecipientPortalProps) {
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/reservations')
      .then((res) => res.json())
      .then((data) => {
        if (data.reservations) setReservations(data.reservations);
      })
      .catch((e) => console.error(e));
  }, [currentUser?.id]);

  const activeReservations = reservations.filter((r) => r.status === 'PENDING');
  const pastReservations = reservations.filter((r) => r.status === 'CONFIRMED_PICKUP');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#ebdcc7] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-forest-900">
              Community Recipient Portal
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-forest-950 mt-1">
            Welcome back, {currentUser?.name}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Reliability Score: <span className="font-bold text-forest-900">{currentUser?.reliabilityScore || 92}%</span> • Family Quota: Active (Up to 6 portions per order)
          </p>
        </div>

        <button
          onClick={onExploreFood}
          className="px-5 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-wheat-200 text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
        >
          <span>Find Available Food</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Active Pickup Codes & Reservations */}
      <div className="bg-white rounded-3xl border border-[#ebdcc7] shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <h3 className="font-serif text-lg font-bold text-forest-950 flex items-center gap-2">
            <Barcode className="w-5 h-5 text-wheat-600" />
            Active Pickup Codes ({activeReservations.length})
          </h3>
          <Link href="/recipient/pickups" className="text-xs font-semibold text-forest-800 hover:underline">Manage pickups</Link>
        </div>

        <div className="space-y-4 mt-4">
          {activeReservations.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 space-y-3">
              <p>You have no active reservations right now.</p>
              <button
                onClick={onExploreFood}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold"
              >
                Browse Surplus Map
              </button>
            </div>
          ) : (
            activeReservations.map((res) => (
              <div
                key={res.id}
                className="bg-[#faf6ee] p-5 rounded-2xl border border-[#ebdcc7] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base font-bold text-stone-900">
                      {res.donation?.title}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      {res.reservedQuantity} {res.donation?.unit}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-wheat-600 shrink-0" />
                    <span>{res.donation?.pickupAddress}</span>
                  </p>

                  <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Must collect before{' '}
                      {new Date(res.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                </div>

                <Link href="/recipient/pickups" className="rounded-xl bg-forest-900 px-4 py-2.5 text-xs font-semibold text-wheat-200 hover:bg-forest-800">
                  View pickup code
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Past Rescues */}
      {pastReservations.length > 0 && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
          <h3 className="font-serif text-base font-bold text-stone-900 pb-3 border-b border-stone-100">
            Past Successfully Collected Meals ({pastReservations.length})
          </h3>
          <div className="divide-y divide-stone-100 text-xs mt-2">
            {pastReservations.map((r) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-stone-900">{r.donation?.title}</span>
                  <span className="text-[11px] text-stone-400 block">
                    Collected {r.reservedQuantity} portions • Handover confirmed
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
