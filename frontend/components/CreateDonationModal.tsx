'use client';

import React, { useState } from 'react';
import { 
  X,
  AlertCircle, 
  Utensils, 
  Clock, 
  Flame, 
  Snowflake,
  MapPin
} from 'lucide-react';
import { COMMON_ALLERGENS } from '@/lib/fssai';

interface CreateDonationModalProps {
  currentUser: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateDonationModal({
  currentUser,
  onClose,
  onSuccess,
}: CreateDonationModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('BAKERY');
  const [totalQuantity, setTotalQuantity] = useState(25);
  const [unit, setUnit] = useState('PORTIONS');
  const [storageType, setStorageType] = useState('ROOM_TEMP');
  const [dietaryTags, setDietaryTags] = useState('VEG');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [allergensReviewed, setAllergensReviewed] = useState(false);
  const [pickupHours, setPickupHours] = useState(2.0);
  const [prepTime, setPrepTime] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  const [pickupAddress, setPickupAddress] = useState(
    currentUser?.restaurant?.address || currentUser?.address || 'Connaught Place, New Delhi'
  );
  const [fssaiConfirmed, setFssaiConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxPickupHours = category === 'COOKED_MEALS'
    ? storageType === 'HOT_HOLDING_60C'
      ? 6
      : storageType === 'CHILLED_4C'
        ? 8
        : 3
    : 8;

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const preparedAt = new Date(prepTime);
    const pickupDeadline = new Date(preparedAt.getTime() + pickupHours * 3600 * 1000);
    const expiryTime = new Date(pickupDeadline.getTime() + 2 * 3600 * 1000);

    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          totalQuantity,
          unit,
          prepTime: preparedAt.toISOString(),
          pickupDeadline: pickupDeadline.toISOString(),
          expiryTime: expiryTime.toISOString(),
          storageType,
          allergens: selectedAllergens,
          dietaryTags,
          pickupAddress,
          fssaiConfirmed,
          allergensReviewed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to list surplus food.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-[#ebdcc7] shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#faf6ee] border-b border-[#ebdcc7] flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-forest-900" />
            <h3 className="font-serif text-lg font-bold text-forest-950">
              List Surplus Food for Rescue
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-stone-800 block mb-1">
              Food Item Title:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sourdough Loaves & Croissant Assortment"
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-forest-700"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-800 block mb-1">
              Description & Packaging:
            </label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Freshly baked surplus from morning batches, packed in food-grade kraft containers."
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-forest-700"
            />
          </div>

          {/* Category & Quantity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-800 block mb-1">
                Category:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-white"
              >
                <option value="BAKERY">Bakery & Breads</option>
                <option value="COOKED_MEALS">Cooked Meals (Hot)</option>
                <option value="PACKAGED">Packaged Dry Surplus</option>
                <option value="PRODUCE">Fresh Produce</option>
                <option value="DAIRY">Dairy Surplus</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-800 block mb-1">
                Quantity:
              </label>
              <input
                type="number"
                min="1"
                max="500"
                required
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(parseInt(e.target.value, 10))}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-800 block mb-1">
                Unit:
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-white"
              >
                <option value="PORTIONS">Portions</option>
                <option value="KGS">Kilograms (kg)</option>
                <option value="BOXES">Boxes / Packs</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="food-prepared-at" className="text-xs font-semibold text-stone-800 block mb-1">
              Food preparation time (reported):
            </label>
            <input
              id="food-prepared-at"
              type="datetime-local"
              required
              value={prepTime}
              onChange={(event) => setPrepTime(event.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300"
            />
          </div>

          {/* Storage & Holding Condition */}
          <div>
            <label className="text-xs font-semibold text-stone-800 block mb-1">
              Reported Storage Condition:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStorageType('ROOM_TEMP')}
                className={`p-2.5 rounded-xl border text-left text-xs transition-colors flex items-center gap-2 ${
                  storageType === 'ROOM_TEMP'
                    ? 'border-forest-800 bg-forest-50 font-bold text-forest-950'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <Clock className="w-4 h-4 text-stone-500" />
                <span>Ambient (Max 3h)</span>
              </button>

              <button
                type="button"
                onClick={() => setStorageType('HOT_HOLDING_60C')}
                className={`p-2.5 rounded-xl border text-left text-xs transition-colors flex items-center gap-2 ${
                  storageType === 'HOT_HOLDING_60C'
                    ? 'border-amber-600 bg-amber-50 font-bold text-amber-950'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Hot Hold (≥60°C)</span>
              </button>

              <button
                type="button"
                onClick={() => setStorageType('CHILLED_4C')}
                className={`p-2.5 rounded-xl border text-left text-xs transition-colors flex items-center gap-2 ${
                  storageType === 'CHILLED_4C'
                    ? 'border-blue-600 bg-blue-50 font-bold text-blue-950'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <Snowflake className="w-4 h-4 text-blue-500" />
                <span>Chilled (≤5°C)</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-700">
            <label htmlFor="allergens-reviewed" className="flex cursor-pointer items-start gap-2">
              <input
                id="allergens-reviewed"
                type="checkbox"
                checked={allergensReviewed}
                onChange={(event) => setAllergensReviewed(event.target.checked)}
                className="mt-0.5 accent-forest-800"
              />
              <span>I checked the allergen list and packaging. If no listed allergens are known, I left the list empty.</span>
            </label>
          </div>

          {/* Pickup Window slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-stone-800 mb-1">
              <span>Collection Deadline Window:</span>
              <span className="font-mono text-forest-900">{pickupHours} hours after preparation</span>
            </div>
            <input
              type="range"
              min="0.5"
              max={maxPickupHours}
              step="0.5"
              value={pickupHours}
              onChange={(e) => setPickupHours(parseFloat(e.target.value))}
              className="w-full accent-forest-900 cursor-pointer"
            />
          </div>

          {/* Allergen Disclosure Checklist */}
          <div>
            <label className="text-xs font-semibold text-stone-800 block mb-1">
              Allergen Disclosure Checklist:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_ALLERGENS.map((a) => {
                const selected = selectedAllergens.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAllergen(a)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                      selected
                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {selected ? '✓ ' : '+ '}
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pickup Location */}
          <div>
            <label className="text-xs font-semibold text-stone-800 block mb-1">
              Kitchen / Pickup Address:
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full text-xs p-2.5 pl-8 rounded-xl border border-stone-300 focus:outline-none focus:border-forest-700"
              />
              <MapPin className="w-4 h-4 text-stone-400 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* Restaurant-reported handling declaration */}
          <div className="p-3 bg-forest-50/80 rounded-xl border border-forest-200 flex items-start gap-2.5 text-xs text-forest-950">
            <input
              type="checkbox"
              id="fssaiConfirm"
              checked={fssaiConfirmed}
              onChange={(e) => setFssaiConfirmed(e.target.checked)}
              className="mt-0.5 accent-forest-800 cursor-pointer"
            />
            <label htmlFor="fssaiConfirm" className="cursor-pointer text-[11px] leading-relaxed">
              <strong>Restaurant-reported handling information:</strong> I have checked the preparation time and storage details and believe this food is fit for collection. Automated checks compare the reported times with known category and handling windows, but cannot independently inspect food or verify actual temperatures.
            </label>
          </div>
          {!fssaiConfirmed && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
              You can still publish. The listing will show a safety-information caution and be added to the administrator review queue.
            </p>
          )}

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
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-wheat-200 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{loading ? 'Publishing...' : 'Publish Surplus Donation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
