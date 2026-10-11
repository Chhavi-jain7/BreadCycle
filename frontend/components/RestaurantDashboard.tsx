'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Utensils, 
  MapPin, 
  Barcode, 
  TrendingUp, 
  Calendar,
  ExternalLink,
  X
} from 'lucide-react';

function toDateTimeInput(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

interface RestaurantDashboardProps {
  currentUser: any;
  onOpenCreateDonation: () => void;
  onOpenHandoverModal: () => void;
}

export default function RestaurantDashboard({
  currentUser,
  onOpenCreateDonation,
  onOpenHandoverModal,
}: RestaurantDashboardProps) {
  const [donations, setDonations] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSafety, setEditingSafety] = useState<any>(null);
  const [safetyForm, setSafetyForm] = useState<any>(null);
  const [safetyMessage, setSafetyMessage] = useState<string | null>(null);
  const [savingSafety, setSavingSafety] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resDonations, resReservations] = await Promise.all([
        fetch(`/api/donations?restaurantId=${currentUser.id}&activeOnly=false`),
        fetch(`/api/reservations`),
      ]);
      const dataDonations = await resDonations.json();
      const dataReservations = await resReservations.json();
      setDonations(dataDonations.donations || []);
      setReservations(dataReservations.reservations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.id]);

  const totalListed = donations.reduce((sum, d) => sum + d.totalQuantity, 0);
  const totalRemaining = donations.reduce((sum, d) => sum + d.remainingQuantity, 0);
  const confirmedHandovers = reservations.filter((r) => r.status === 'CONFIRMED_PICKUP');
  const totalCollectedMeals = confirmedHandovers.reduce((sum, r) => sum + r.reservedQuantity, 0);
  const expiredLapsed = reservations.filter((r) => r.status === 'EXPIRED' || r.status === 'RECOVERED');

  const beginSafetyUpdate = (donation: any) => {
    setSafetyMessage(null);
    setEditingSafety(donation);
    setSafetyForm({
      prepTime: toDateTimeInput(donation.prepTime),
      pickupDeadline: toDateTimeInput(donation.pickupDeadline),
      expiryTime: toDateTimeInput(donation.expiryTime),
      storageType: donation.storageType,
      allergens: (donation.allergensList || []).join(', '),
      fssaiConfirmed: Boolean(donation.reportedSafetyDeclaration),
      allergensReviewed: Boolean(donation.allergensReviewed),
    });
  };

  const submitSafetyUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingSafety || !safetyForm) return;
    setSavingSafety(true);
    setSafetyMessage(null);
    try {
      const response = await fetch(`/api/donations/${editingSafety.id}/safety-info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prepTime: new Date(safetyForm.prepTime).toISOString(),
          pickupDeadline: new Date(safetyForm.pickupDeadline).toISOString(),
          expiryTime: new Date(safetyForm.expiryTime).toISOString(),
          storageType: safetyForm.storageType,
          allergens: safetyForm.allergens.split(',').map((value: string) => value.trim()).filter(Boolean),
          fssaiConfirmed: safetyForm.fssaiConfirmed,
          allergensReviewed: safetyForm.allergensReviewed,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update safety information.');
      setSafetyMessage(data.message);
      await fetchData();
      setEditingSafety(null);
    } catch (error) {
      setSafetyMessage(error instanceof Error ? error.message : 'Could not update safety information.');
    } finally {
      setSavingSafety(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Contextual Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#ebdcc7] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-forest-900">
              Kitchen Operations Portal
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-forest-950 mt-1">
            {currentUser?.restaurant?.businessName || currentUser?.name}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Reported license: <span className="font-mono text-stone-700">{currentUser?.restaurant?.fssaiLicense || 'Not provided'}</span> • {currentUser?.restaurant?.cuisineType || 'Commercial Kitchen'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onOpenHandoverModal}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-forest-900 bg-white hover:bg-forest-50 text-forest-900 text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Barcode className="w-4 h-4 text-forest-700" />
            <span>Verify Pickup Code</span>
          </button>

          <button
            onClick={onOpenCreateDonation}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-wheat-200 text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-wheat-400" />
            <span>New Surplus Donation</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 font-medium block">Total Surplus Listed</span>
          <span className="text-2xl font-serif font-bold text-stone-900 mt-1 block">
            {totalListed} <span className="text-xs font-sans text-stone-500">portions</span>
          </span>
          <span className="text-[10px] text-stone-400 mt-1 block">Across {donations.length} surplus batches</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 font-medium block">Verified Handed Over</span>
          <span className="text-2xl font-serif font-bold text-emerald-800 mt-1 block">
            {totalCollectedMeals} <span className="text-xs font-sans text-emerald-600">meals</span>
          </span>
          <span className="text-[10px] text-emerald-700 flex items-center gap-1 mt-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Handover codes confirmed
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 font-medium block">Active Available Now</span>
          <span className="text-2xl font-serif font-bold text-forest-950 mt-1 block">
            {totalRemaining} <span className="text-xs font-sans text-stone-500">portions</span>
          </span>
          <span className="text-[10px] text-stone-400 mt-1 block">Live on discovery feed</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 font-medium block">Recovered Missed Pickups</span>
          <span className="text-2xl font-serif font-bold text-amber-700 mt-1 block">
            {expiredLapsed.length} <span className="text-xs font-sans text-stone-500">salvaged</span>
          </span>
          <span className="text-[10px] text-amber-800 font-medium mt-1 block">
            Automated Reallocation
          </span>
        </div>
      </div>

      {/* My Active Listings Table */}
      <div className="bg-white rounded-3xl border border-[#ebdcc7] shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <h3 className="font-serif text-lg font-bold text-forest-950">
            Current Food Listings & Safety Status
          </h3>
          <span className="text-xs text-stone-500">
            {donations.length} record(s)
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf6ee] text-stone-700 border-b border-stone-200">
              <tr>
                <th className="p-3">Title & Category</th>
                <th className="p-3">Inventory</th>
                <th className="p-3">Thermal Storage</th>
                <th className="p-3">Pickup Deadline</th>
                <th className="p-3">Automated Safety Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {donations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-stone-400">
                    No active donations. Click &quot;New Surplus Donation&quot; to list one!
                  </td>
                </tr>
              ) : (
                donations.map((d) => (
                  <tr key={d.id} className="hover:bg-stone-50">
                    <td className="p-3">
                      <span className="font-bold text-stone-900 block">{d.title}</span>
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider">{d.category}</span>
                    </td>
                    <td className="p-3 font-semibold text-forest-900">
                      {d.remainingQuantity} / {d.totalQuantity} {d.unit}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-medium">
                        {d.storageType}
                      </span>
                    </td>
                    <td className="p-3 text-stone-600">
                      {new Date(d.pickupDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.safetyStatus === 'SAFE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {d.safetyStatus} · {d.safetyRiskLevel || 'LOW'}
                      </span>
                      {(d.safetyRiskReasons || []).length > 0 && (
                        <p className="mt-1 max-w-[220px] text-[10px] text-amber-800">
                          {d.safetyRiskReasons.join(' ')}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-stone-500">Donor-reported; automated checks only</p>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          onClick={() => beginSafetyUpdate(d)}
                          className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-semibold"
                        >
                          Update safety info
                        </button>
                        <button
                          onClick={onOpenHandoverModal}
                          className="px-2.5 py-1 rounded-lg bg-forest-900 hover:bg-forest-800 text-wheat-200 text-[11px] font-semibold"
                        >
                          Verify Handover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {safetyMessage && !editingSafety && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">{safetyMessage}</p>
      )}

      {editingSafety && safetyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
          <form onSubmit={submitSafetyUpdate} className="w-full max-w-xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-forest-950">Update safety information</h3>
                <p className="mt-1 text-xs text-stone-600">{editingSafety.title} · Review remains pending until an administrator decision.</p>
              </div>
              <button type="button" onClick={() => setEditingSafety(null)} aria-label="Close safety form" className="rounded-lg p-1 text-stone-500 hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            {safetyMessage && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-800">{safetyMessage}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['prepTime', 'Preparation time'],
                ['pickupDeadline', 'Pickup deadline'],
                ['expiryTime', 'Expiry time'],
              ] as const).map(([key, label]) => (
                <label key={key} className="text-xs font-medium text-stone-700">
                  {label}
                  <input
                    required
                    type="datetime-local"
                    value={safetyForm[key]}
                    onChange={(event) => setSafetyForm({ ...safetyForm, [key]: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-300 p-2"
                  />
                </label>
              ))}
              <label className="text-xs font-medium text-stone-700">
                Reported storage
                <select
                  value={safetyForm.storageType}
                  onChange={(event) => setSafetyForm({ ...safetyForm, storageType: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 p-2"
                >
                  <option value="ROOM_TEMP">Room temperature</option>
                  <option value="HOT_HOLDING_60C">Hot holding (≥60°C)</option>
                  <option value="CHILLED_4C">Chilled (≤5°C)</option>
                </select>
              </label>
              <label className="text-xs font-medium text-stone-700 sm:col-span-2">
                Known allergens (comma-separated; leave empty only if none are known)
                <input
                  value={safetyForm.allergens}
                  onChange={(event) => setSafetyForm({ ...safetyForm, allergens: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 p-2"
                />
              </label>
            </div>
            <label className="flex items-start gap-2 text-xs text-stone-700">
              <input type="checkbox" checked={safetyForm.allergensReviewed} onChange={(event) => setSafetyForm({ ...safetyForm, allergensReviewed: event.target.checked })} className="mt-0.5" />
              I checked the allergen list and packaging.
            </label>
            <label className="flex items-start gap-2 text-xs text-stone-700">
              <input type="checkbox" checked={safetyForm.fssaiConfirmed} onChange={(event) => setSafetyForm({ ...safetyForm, fssaiConfirmed: event.target.checked })} className="mt-0.5" />
              I have reviewed the reported preparation and storage details. Automated checks cannot independently inspect food or confirm actual temperatures.
            </label>
            <div className="flex items-center justify-between gap-3">
              <p className="max-w-sm text-[10px] text-stone-500">Unsafe or inconsistent listings remain paused pending administrator review.</p>
              <button disabled={savingSafety} className="rounded-xl bg-forest-900 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                {savingSafety ? 'Saving…' : 'Save and request review'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
