'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Barcode, CheckCircle2, Clock, Copy, MapPin, TicketCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type Reservation = {
  id: string;
  reservedQuantity: number;
  status: string;
  expiresAt: string;
  donation: {
    title: string;
    unit: string;
    pickupAddress: string;
    pickupDeadline: string;
    restaurantUser?: { name: string; restaurant?: { businessName?: string } };
  };
};

export default function RecipientRecordsPage({
  user,
  view,
}: {
  user: { id: string; name: string; email: string; role: string };
  view: 'reservations' | 'pickups';
}) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadReservations = async () => {
    try {
      const response = await fetch('/api/reservations');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load your reservations.');
      setReservations(data.reservations || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load your reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, [user.id]);

  const showCode = async (id: string) => {
    setLoadingCode(id);
    setMessage('');
    try {
      const response = await fetch(`/api/reservations/${encodeURIComponent(id)}/pickup-code`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pickup code is unavailable.');
      setCodes((existing) => ({ ...existing, [id]: data.pickupCode }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Pickup code is unavailable.');
    } finally {
      setLoadingCode(null);
    }
  };

  const cancelReservation = async (id: string) => {
    setMessage('');
    try {
      const response = await fetch(`/api/reservations/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to cancel reservation.');
      await loadReservations();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to cancel reservation.');
    }
  };

  const shownReservations = view === 'pickups'
    ? reservations.filter((reservation) => reservation.status === 'PENDING')
    : reservations;
  const activeCount = reservations.filter((reservation) => reservation.status === 'PENDING').length;
  const completedCount = reservations.filter((reservation) => reservation.status === 'CONFIRMED_PICKUP').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
      <Navbar currentUser={user} />
      <main className="w-full max-w-5xl flex-1 mx-auto px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-forest-800 hover:underline">
          <ArrowLeft className="h-4 w-4" /> My dashboard
        </Link>
        <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-forest-700">Recipient Portal</p>
            <h1 className="mt-1 font-serif text-3xl font-bold text-forest-950">
              {view === 'pickups' ? 'My Pickups' : 'My Reservations'}
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              {view === 'pickups'
                ? 'Only reservations waiting to be collected appear here. Open a pickup to view its secure code.'
                : 'A complete history of your food reservations, including collection status and pickup details.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/recipient/discover" className="rounded-xl bg-forest-900 px-4 py-2.5 text-sm font-semibold text-wheat-200 hover:bg-forest-800">Discover food</Link>
            <Link href={view === 'pickups' ? '/recipient/reservations' : '/recipient/pickups'} className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
              {view === 'pickups' ? 'All reservations' : 'My pickups'}
            </Link>
          </div>
        </div>

        {!loading && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="block text-xl font-bold text-amber-900">{activeCount}</span>
              <span className="text-xs font-medium text-amber-800">Awaiting pickup</span>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="block text-xl font-bold text-emerald-900">{completedCount}</span>
              <span className="text-xs font-medium text-emerald-800">Collected</span>
            </div>
          </div>
        )}

        {message && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</p>}
        {loading ? (
          <p className="py-16 text-center text-sm text-stone-500">Loading your reservations…</p>
        ) : shownReservations.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[#ebdcc7] bg-white p-10 text-center">
            <TicketCheck className="mx-auto h-9 w-9 text-wheat-600" />
            <h2 className="mt-3 font-serif text-xl font-bold text-forest-950">{view === 'pickups' ? 'No active pickups' : 'No reservations yet'}</h2>
            <p className="mt-2 text-sm text-stone-600">Discover available surplus food and reserve a collection.</p>
            <Link href="/recipient/discover" className="mt-5 inline-flex rounded-xl bg-forest-900 px-4 py-2.5 text-sm font-semibold text-wheat-200">Browse food</Link>
          </div>
        ) : (
          <div className="mt-7 space-y-4">
            {shownReservations.map((reservation) => {
              const active = reservation.status === 'PENDING';
              const donor = reservation.donation.restaurantUser?.restaurant?.businessName || reservation.donation.restaurantUser?.name || 'Food donor';
              return (
                <article key={reservation.id} className="rounded-3xl border border-[#ebdcc7] bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-serif text-xl font-bold text-forest-950">{reservation.donation.title}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-amber-50 text-amber-900' : reservation.status === 'CONFIRMED_PICKUP' ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-700'}`}>
                          {reservation.status.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-stone-700">{donor} · {reservation.reservedQuantity} {reservation.donation.unit}</p>
                      <p className="flex items-start gap-2 text-sm text-stone-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-wheat-700" />{reservation.donation.pickupAddress}</p>
                      <p className="flex items-center gap-2 text-sm text-stone-600"><Clock className="h-4 w-4 text-wheat-700" />Pickup deadline {new Date(reservation.donation.pickupDeadline).toLocaleString()}</p>
                      {active && <p className="text-xs text-stone-500">Collection hold expires {new Date(reservation.expiresAt).toLocaleString()}.</p>}
                    </div>
                    {active && view === 'pickups' && (
                      <div className="w-full rounded-2xl border border-dashed border-wheat-500 bg-[#fffaf0] p-4 text-center md:w-64">
                        {codes[reservation.id] ? (
                          <>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Show this code to restaurant staff</span>
                            <code className="my-2 block text-2xl font-extrabold tracking-wider text-forest-900">{codes[reservation.id]}</code>
                            <button type="button" onClick={() => navigator.clipboard.writeText(codes[reservation.id])} className="inline-flex items-center gap-1 text-xs font-semibold text-forest-800 hover:underline">
                              <Copy className="h-3.5 w-3.5" /> Copy code
                            </button>
                          </>
                        ) : (
                          <button type="button" disabled={loadingCode === reservation.id} onClick={() => showCode(reservation.id)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest-900 px-4 py-2.5 text-sm font-semibold text-wheat-200 hover:bg-forest-800 disabled:opacity-60">
                            <Barcode className="h-4 w-4" /> {loadingCode === reservation.id ? 'Loading code…' : 'View Pickup Code'}
                          </button>
                        )}
                        <p className="mt-2 text-[11px] text-stone-600">Code is private and valid only for this reservation.</p>
                        <button type="button" onClick={() => cancelReservation(reservation.id)} className="mt-3 text-xs font-semibold text-rose-700 hover:underline">Cancel reservation</button>
                      </div>
                    )}
                    {active && view === 'reservations' && (
                      <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center md:w-64">
                        <p className="text-sm font-semibold text-amber-950">Ready for collection</p>
                        <p className="mt-1 text-xs text-amber-800">Your pickup code is available in My Pickups.</p>
                        <Link href="/recipient/pickups" className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-forest-900 px-4 py-2.5 text-sm font-semibold text-wheat-200 hover:bg-forest-800">
                          <Barcode className="h-4 w-4" /> View pickup
                        </Link>
                      </div>
                    )}
                    {reservation.status === 'CONFIRMED_PICKUP' && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Collected</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
