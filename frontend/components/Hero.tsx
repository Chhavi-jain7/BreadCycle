'use client';

import React from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Leaf, 
  CheckCircle2, 
  RefreshCw,
  TrendingUp,
  Building2,
  Users
} from 'lucide-react';

interface HeroProps {
  stats?: {
    totalMealsRescued: number;
    totalKgRescued: number;
    co2SavedKg: number;
    recoverySuccessRate: number;
  };
  onOpenCreateDonation: () => void;
  onExploreFood: () => void;
}

export default function Hero({ stats, onOpenCreateDonation, onExploreFood }: HeroProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#f9f5ec] via-[#fdfbf7] to-[#fdfbf7] pt-10 pb-16 lg:pt-14 lg:pb-24 border-b border-[#ebdcc7]">
      {/* Subtle organic background patterns */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#164e3f_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Mission & Headline */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-50 border border-forest-200/80 text-forest-800 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-forest-600" />
              <span>Intelligent Food Rescue Network</span>
              <span className="w-1 h-1 rounded-full bg-forest-400" />
              <span className="text-forest-700 font-normal">Reported Details + Automated Checks</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-forest-950 tracking-tight leading-[1.12]">
              Good Food Deserves a <span className="text-wheat-600 italic">Second Chance.</span>
            </h1>

            <p className="text-base sm:text-lg text-stone-600 max-w-2xl leading-relaxed font-sans">
              When surplus food remains, BreadCycle connects donors with shelters, community kitchens, and individuals. Reported handling details are checked for consistency and visible to recipients, while clear cautions help everyone make informed decisions.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onOpenCreateDonation}
                className="px-6 py-3.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-wheat-100 font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 group border border-forest-800"
              >
                <span>Donate Surplus Food</span>
                <ArrowRight className="w-4 h-4 text-wheat-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onExploreFood}
                className="px-6 py-3.5 rounded-xl bg-white hover:bg-[#faf5ea] text-stone-800 font-medium text-sm shadow-sm border border-[#dec9ad] hover:border-wheat-500 transition-all duration-200 flex items-center gap-2"
              >
                <span>Find Available Food</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              <a
                href="#recovery-engine"
                className="text-xs font-semibold text-forest-800 hover:text-forest-950 hover:underline flex items-center gap-1 ml-1"
              >
                <RefreshCw className="w-3 h-3 text-wheat-600 animate-spin [animation-duration:8s]" />
                See How Recovery Works
              </a>
            </div>

            {/* Key trust indicators */}
            <div className="pt-4 border-t border-stone-200/60 flex flex-wrap items-center gap-6 text-xs text-stone-600">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Checks reported dates against handling windows</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <RefreshCw className="w-4 h-4 text-wheat-600" />
                <span>Zero-Overbooking Atomic Handover</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Leaf className="w-4 h-4 text-forest-600" />
                <span>100% Landfill Diversion Tracking</span>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Live Ticker & Flow Architecture Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer decorative card */}
              <div className="rounded-3xl bg-white border border-[#e4d6c1] shadow-xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold uppercase tracking-wider text-forest-900">
                      Live Food Rescue Telemetry
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                    Live Database Feed
                  </span>
                </div>

                {/* Impact Metrics Grid */}
                <div className="grid grid-cols-2 gap-3.5 my-5">
                  <div className="bg-[#faf6ee] p-3.5 rounded-2xl border border-[#ebdcc7]">
                    <span className="text-[11px] font-medium text-stone-600 block">
                      Total Rescued Meals
                    </span>
                    <span className="text-2xl font-bold font-serif text-forest-950 mt-1 block">
                      {(stats?.totalMealsRescued ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-700 flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" /> Real database queries
                    </span>
                  </div>

                  <div className="bg-[#faf6ee] p-3.5 rounded-2xl border border-[#ebdcc7]">
                    <span className="text-[11px] font-medium text-stone-600 block">
                      Landfill Diverted
                    </span>
                    <span className="text-2xl font-bold font-serif text-forest-950 mt-1 block">
                      {(stats?.totalKgRescued ?? 0).toLocaleString()} kg
                    </span>
                    <span className="text-[10px] text-stone-500 flex items-center gap-1 mt-1">
                      <Leaf className="w-3 h-3 text-forest-600" /> Wholesome food preserved
                    </span>
                  </div>

                  <div className="bg-[#faf6ee] p-3.5 rounded-2xl border border-[#ebdcc7]">
                    <span className="text-[11px] font-medium text-stone-600 block">
                      CO₂e Avoided
                    </span>
                    <span className="text-2xl font-bold font-serif text-forest-950 mt-1 block">
                      {(stats?.co2SavedKg ?? 0).toLocaleString()} kg
                    </span>
                    <span className="text-[10px] text-stone-500 flex items-center gap-1 mt-1">
                      Scientific 2.5x coefficient
                    </span>
                  </div>

                  <div className="bg-[#faf6ee] p-3.5 rounded-2xl border border-[#ebdcc7]">
                    <span className="text-[11px] font-medium text-stone-600 block">
                      Failed-Pickup Recovery
                    </span>
                    <span className="text-2xl font-bold font-serif text-forest-950 mt-1 block">
                      {stats?.recoverySuccessRate ?? 0}%
                    </span>
                    <span className="text-[10px] text-wheat-700 font-medium flex items-center gap-1 mt-1">
                      <RefreshCw className="w-3 h-3" /> Reallocation efficiency
                    </span>
                  </div>
                </div>

                {/* Real-time Rescue Route Mini-preview */}
                <div className="bg-forest-950 text-white rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-wheat-300 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-wheat-400" />
                      Active Smart Routing Cycle
                    </span>
                    <span className="text-[10px] bg-forest-800 text-wheat-200 px-2 py-0.5 rounded-full font-mono">
                      Safe Window: Active
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-forest-800 flex items-center justify-center text-[10px] font-bold text-wheat-300 shrink-0">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-stone-200">The Golden Crust Bakery listed surplus</p>
                        <p className="text-[10px] text-stone-400">40 portions fresh sourdough (donor-reported preparation and storage)</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-forest-800 flex items-center justify-center text-[10px] font-bold text-wheat-300 shrink-0">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-stone-200">Smart 5-Factor Ranking ranked Feeding Hope (Score: 94)</p>
                        <p className="text-[10px] text-stone-400">Proximity: 2.1km • Reliability: 96% • Capacity fit: 100%</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        ✓
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-emerald-300">A unique pickup code is issued per reservation</p>
                        <p className="text-[10px] text-emerald-400/80">Shown only to the authorized recipient and verified once at handover</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
