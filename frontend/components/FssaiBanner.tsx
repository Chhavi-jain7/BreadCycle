'use client';

import React from 'react';
import { AlertOctagon, Clock, FileCheck, Info, ShieldCheck, Snowflake, Thermometer } from 'lucide-react';

export default function FssaiBanner() {
  return (
    <section id="fssai-safety" className="py-16 bg-[#faf6ee] border-b border-[#e9dfcf]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Automated Safety Signals
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
              Transparent Food-Handling Information
            </h2>

            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
              BreadCycle cannot independently inspect food or verify a restaurant&apos;s handling practices. We make reported information visible, compare it against configurable consistency checks, and route concerns for review.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-stone-200">
                <Thermometer className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-stone-900">Reported Storage Conditions</h4>
                  <p className="text-stone-600 mt-0.5">
                    Restaurants report whether food was held hot, chilled, or at room temperature. These selections are not verified by a sensor or independent inspection.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-stone-200">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-stone-900">Allergens & Preparation Times</h4>
                  <p className="text-stone-600 mt-0.5">
                    Donors report known allergens and preparation, pickup, and expiry times. Missing or inconsistent details are shown as cautions or sent for review.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-stone-200">
                <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-stone-900">Review, Updates & Pickup Alerts</h4>
                  <p className="text-stone-600 mt-0.5">
                    Restaurants can correct reported details; administrators can request updates, approve eligible listings, or block them. Affected recipients are notified when pending pickups are paused.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl border border-[#dec9ad] shadow-lg p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <span className="text-xs font-bold uppercase tracking-wider text-forest-950 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-wheat-600" />
                  Checks the Platform Can Perform
                </span>
                <span className="text-[11px] font-mono bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                  Not an inspection
                </span>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3.5">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <h3 className="font-bold text-amber-950">Reported hot holding</h3>
                    <p className="text-stone-600 mt-1">
                      Configured category and storage windows are compared with the reported timestamps; actual holding temperatures are not confirmed.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-start gap-3.5">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
                    <Snowflake className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <h3 className="font-bold text-blue-950">Reported chilled storage</h3>
                    <p className="text-stone-600 mt-1">
                      Category and storage selections are checked for consistency. The platform has no live cold-chain or handover temperature sensor.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3.5">
                  <div className="p-2 bg-stone-700 text-white rounded-xl shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <h3 className="font-bold text-stone-900">Reported preparation and expiry</h3>
                    <p className="text-stone-600 mt-1">
                      The backend checks ordering and configured handling windows. Expired or inconsistent listings are paused; missing declarations can remain available with a visible caution.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-forest-50 rounded-xl border border-forest-200 text-[11px] text-forest-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-forest-700 shrink-0" />
                <span>
                  These operational signals cannot detect contamination, poor hygiene, or inaccurate reports. They are not regulatory certification, lab testing, or a substitute for safe handling practices and local food-safety guidance.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
