'use client';

import React from 'react';
import { 
  UtensilsCrossed, 
  Cpu, 
  HeartHandshake, 
  Building2, 
  Users, 
  Bike,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function HowItWorks({ onActionClick }: { onActionClick: (role: string) => void }) {
  return (
    <section className="py-16 bg-[#fdfbf7] border-b border-[#e9dfcf]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-wheat-100 border border-wheat-300 text-wheat-900 text-xs font-semibold uppercase tracking-wider mb-3">
            Simple 3-Step Coordination
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
            How BreadCycle Operates
          </h2>
          <p className="mt-3 text-stone-600 text-sm sm:text-base leading-relaxed">
            Eliminating coordination friction, missed pickups, and food safety ambiguity through automated workflows.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ebdcc7] shadow-sm relative group hover:border-forest-600 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-forest-900 text-wheat-300 flex items-center justify-center font-serif text-xl font-bold mb-4 shadow-md">
              1
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Kitchen Lists Reported Surplus
            </h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Restaurants and bakeries report surplus, preparation time, storage conditions, and known allergens. BreadCycle displays these as donor-reported details and checks date and category consistency.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ebdcc7] shadow-sm relative group hover:border-forest-600 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-wheat-600 text-white flex items-center justify-center font-serif text-xl font-bold mb-4 shadow-md">
              2
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Smart 5-Factor Routing & Locks
            </h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Our matching engine ranks eligible community recipients by proximity, urgency, capacity fit, and reliability. Claimants receive single-use pickup codes with atomic inventory locks.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ebdcc7] shadow-sm relative group hover:border-forest-600 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-serif text-xl font-bold mb-4 shadow-md">
              3
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Verified Handover & Fallback Recovery
            </h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Kitchen staff authenticate single-use pickup codes on site. If a recipient misses the deadline, the system automatically checks safety and reallocates the portions before food is lost.
            </p>
          </div>
        </div>

        {/* Dedicated Stakeholder Portals Showcase */}
        <div className="border-t border-stone-200 pt-12">
          <div className="text-center mb-8">
            <h3 className="font-serif text-2xl font-bold text-forest-950">
              Tailored for Every Stakeholder
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Click any role to test its dedicated interface via the Persona Switcher.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => onActionClick('RESTAURANT')}
              className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-amber-400 cursor-pointer shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-5 h-5 text-amber-700" />
              </div>
              <h4 className="font-bold text-sm text-stone-900">Restaurants & Bakeries</h4>
              <p className="text-[11px] text-stone-500 mt-1">
                Zero waste, automated handovers, compliance logs, and tax receipt records.
              </p>
              <span className="text-[11px] font-semibold text-amber-800 mt-3 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Explore Donor Tools <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            <div
              onClick={() => onActionClick('NGO')}
              className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-emerald-400 cursor-pointer shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5 text-emerald-700" />
              </div>
              <h4 className="font-bold text-sm text-stone-900">Verified Shelters & NGOs</h4>
              <p className="text-[11px] text-stone-500 mt-1">
                Claim high-volume bulk allocations, manage pantry capacity, and dispatch couriers.
              </p>
              <span className="text-[11px] font-semibold text-emerald-800 mt-3 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Explore NGO Tools <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            <div
              onClick={() => onActionClick('INDIVIDUAL')}
              className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-blue-400 cursor-pointer shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5 text-blue-700" />
              </div>
              <h4 className="font-bold text-sm text-stone-900">Individuals & Families</h4>
              <p className="text-[11px] text-stone-500 mt-1">
                Discover nearby surplus, reserve family portions, and redeem single-use codes with dignity.
              </p>
              <span className="text-[11px] font-semibold text-blue-800 mt-3 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Explore Recipient View <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            <div
              onClick={() => onActionClick('VOLUNTEER')}
              className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-purple-400 cursor-pointer shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-900 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Bike className="w-5 h-5 text-purple-700" />
              </div>
              <h4 className="font-bold text-sm text-stone-900">Volunteer Couriers</h4>
              <p className="text-[11px] text-stone-500 mt-1">
                Accept local pickup runs, transport meals via bike or car, and complete handovers.
              </p>
              <span className="text-[11px] font-semibold text-purple-800 mt-3 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Explore Courier View <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
