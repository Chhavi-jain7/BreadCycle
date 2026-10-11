'use client';

import React from 'react';
import Link from 'next/link';
import { HeartHandshake, ShieldCheck, Leaf, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-forest-950 text-stone-300 pt-16 pb-12 border-t border-forest-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-forest-900/60">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-forest-900 border border-forest-800 flex items-center justify-center text-wheat-400">
                <HeartHandshake className="w-5 h-5 text-wheat-400" />
              </div>
              <span className="font-serif font-bold text-2xl text-white tracking-tight">
                Bread<span className="text-wheat-500">Cycle</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
              Connecting food donors, verified shelters, volunteers, and individuals while making reported handling information and automated safety cautions visible.
            </p>
            <div className="flex items-center gap-2 text-xs text-wheat-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Donor-reported details with automated consistency checks</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Platform</h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <a href="#explore-food" className="hover:text-white transition-colors">
                  Explore Surplus
                </a>
              </li>
              <li>
                <a href="#recovery-engine" className="hover:text-white transition-colors">
                  Recovery Engine
                </a>
              </li>
              <li>
                <a href="#smart-matching" className="hover:text-white transition-colors">
                  Smart Matching
                </a>
              </li>
              <li>
                <a href="#impact-stats" className="hover:text-white transition-colors">
                  Impact Accounting
                </a>
              </li>
            </ul>
          </div>

          {/* Stakeholders */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Stakeholders</h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">
                  Restaurants & Bakeries
                </span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">
                  Humanitarian Shelters
                </span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">
                  Individual Recipients
                </span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">
                  Volunteer Couriers
                </span>
              </li>
            </ul>
          </div>

          {/* Standards & Regulatory */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Standards & Ethics</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Restaurants report preparation, storage, and allergen details. Automated checks compare timestamps and handling windows but cannot verify food condition or actual temperatures.
            </p>
            <div className="text-[11px] text-stone-500 font-mono">
              Tagline: Rescue Food. Restore Hope.
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} BreadCycle Platform. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built for social impact with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> & intelligent technology.
          </p>
        </div>
      </div>
    </footer>
  );
}
