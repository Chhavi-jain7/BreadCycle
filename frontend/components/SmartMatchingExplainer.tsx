'use client';

import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Clock, 
  Package, 
  Award, 
  Navigation, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';

export default function SmartMatchingExplainer() {
  const [donations, setDonations] = useState<any[]>([]);
  const [selectedDonationId, setSelectedDonationId] = useState<string>('');
  const [matchResults, setMatchResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/donations?activeOnly=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.donations && data.donations.length > 0) {
          setDonations(data.donations);
          setSelectedDonationId(data.donations[0].id);
          runRankForDonation(data.donations[0].id);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const runRankForDonation = async (donationId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/matching/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationId }),
      });
      const data = await res.json();
      setMatchResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDonationChange = (id: string) => {
    setSelectedDonationId(id);
    runRankForDonation(id);
  };

  return (
    <section id="smart-matching" className="py-16 bg-white border-b border-[#e9dfcf]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <Compass className="w-3.5 h-3.5 text-forest-600" />
            5-Factor Scoring Model
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
            Intelligent Rescue Routing Engine
          </h2>
          <p className="mt-3 text-stone-600 text-sm sm:text-base leading-relaxed">
            Surplus food cannot wait. Our algorithm evaluates safety constraints first, then scores and ranks recipient candidates based on distance, time urgency, logistical capacity, historical reliability, and travel feasibility.
          </p>
        </div>

        {/* 5 Scoring Factors Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-12">
          <div className="bg-[#faf6ee] p-4 rounded-2xl border border-[#ebdcc7] text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-xl bg-forest-900 text-wheat-300 flex items-center justify-center text-xs font-bold">
                <Navigation className="w-4 h-4 text-wheat-400" />
              </span>
              <span className="text-sm font-bold font-mono text-forest-900">30%</span>
            </div>
            <h4 className="text-xs font-bold text-stone-900">Distance Suitability</h4>
            <p className="text-[11px] text-stone-500 mt-1">
              Haversine great-circle calculation vs candidate max service boundary.
            </p>
          </div>

          <div className="bg-[#faf6ee] p-4 rounded-2xl border border-[#ebdcc7] text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-xl bg-forest-900 text-wheat-300 flex items-center justify-center text-xs font-bold">
                <Clock className="w-4 h-4 text-wheat-400" />
              </span>
              <span className="text-sm font-bold font-mono text-forest-900">25%</span>
            </div>
            <h4 className="text-xs font-bold text-stone-900">Pickup Urgency</h4>
            <p className="text-[11px] text-stone-500 mt-1">
              Remaining time under the configured handling-window check or pickup deadline.
            </p>
          </div>

          <div className="bg-[#faf6ee] p-4 rounded-2xl border border-[#ebdcc7] text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-xl bg-forest-900 text-wheat-300 flex items-center justify-center text-xs font-bold">
                <Package className="w-4 h-4 text-wheat-400" />
              </span>
              <span className="text-sm font-bold font-mono text-forest-900">20%</span>
            </div>
            <h4 className="text-xs font-bold text-stone-900">Capacity & Volume Fit</h4>
            <p className="text-[11px] text-stone-500 mt-1">
              Evaluates shelter meal capacity vs individual portion batch suitability.
            </p>
          </div>

          <div className="bg-[#faf6ee] p-4 rounded-2xl border border-[#ebdcc7] text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-xl bg-forest-900 text-wheat-300 flex items-center justify-center text-xs font-bold">
                <Award className="w-4 h-4 text-wheat-400" />
              </span>
              <span className="text-sm font-bold font-mono text-forest-900">15%</span>
            </div>
            <h4 className="text-xs font-bold text-stone-900">Pickup Reliability</h4>
            <p className="text-[11px] text-stone-500 mt-1">
              Historical on-time completion rate with a neutral 75% default for newcomers.
            </p>
          </div>

          <div className="bg-[#faf6ee] p-4 rounded-2xl border border-[#ebdcc7] text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-xl bg-forest-900 text-wheat-300 flex items-center justify-center text-xs font-bold">
                <Zap className="w-4 h-4 text-wheat-400" />
              </span>
              <span className="text-sm font-bold font-mono text-forest-900">10%</span>
            </div>
            <h4 className="text-xs font-bold text-stone-900">Arrival ETA Feasibility</h4>
            <p className="text-[11px] text-stone-500 mt-1">
              Calculates travel time buffer to ensure claimant arrives well before close.
            </p>
          </div>
        </div>

        {/* Live Interactive Ranking Sandbox */}
        <div className="bg-[#fdfbf7] p-6 sm:p-8 rounded-3xl border border-[#dec9ad] shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
            <div>
              <h3 className="font-serif text-lg font-bold text-forest-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-wheat-600" />
                Live Matching Simulator
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Select an active donation to see how the engine ranks registered recipients in real-time.
              </p>
            </div>

            {/* Donation selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="donation-select" className="text-xs font-medium text-stone-600">Donation:</label>
              <select
                id="donation-select"
                aria-label="Select active donation for matching simulation"
                value={selectedDonationId}
                onChange={(e) => handleDonationChange(e.target.value)}
                className="text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800 font-medium focus:outline-none"
              >
                {donations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.remainingQuantity} {d.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Matches Output List */}
          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="text-xs text-stone-500 py-6 text-center">Calculating composite scores...</p>
            ) : matchResults?.rankedMatches?.length === 0 ? (
              <p className="text-xs text-stone-500 py-6 text-center">No eligible recipients within radius.</p>
            ) : (
              matchResults?.rankedMatches?.map((m: any, idx: number) => (
                <div
                  key={m.recipient.id}
                  className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-forest-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-forest-100 text-forest-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900">{m.recipient.name}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full border bg-stone-50 text-stone-700 font-medium">
                          {m.recipient.role}
                        </span>
                        {m.recipient.verificationStatus === 'VERIFIED' && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified NGO
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {m.breakdown.explanations.map((exp: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] bg-[#faf6ee] border border-[#ebdcc7] text-stone-700 px-2 py-0.5 rounded-md"
                          >
                            ✓ {exp}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Score breakdown pills */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="text-right text-[11px] text-stone-500 hidden sm:block">
                      <div>Dist: {m.breakdown.distanceScore}/100 • Urg: {m.breakdown.urgencyScore}/100</div>
                      <div>Cap: {m.breakdown.capacityScore}/100 • Rel: {m.breakdown.reliabilityScore}/100</div>
                    </div>
                    <div className="bg-forest-900 text-wheat-300 px-3.5 py-2 rounded-xl text-center">
                      <span className="text-xs font-bold block">{m.breakdown.totalScore}/100</span>
                      <span className="text-[9px] uppercase tracking-wider text-wheat-400">Match Rank</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
