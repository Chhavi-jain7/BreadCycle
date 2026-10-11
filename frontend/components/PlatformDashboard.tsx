'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import DonationCard from '@/components/DonationCard';
import MapDiscovery from '@/components/MapDiscovery';
import RecoveryEngineSection from '@/components/RecoveryEngineSection';
import SmartMatchingExplainer from '@/components/SmartMatchingExplainer';
import FssaiBanner from '@/components/FssaiBanner';
import ImpactMetrics from '@/components/ImpactMetrics';
import HowItWorks from '@/components/HowItWorks';
import Footer from '@/components/Footer';
import ReserveModal from '@/components/ReserveModal';
import HandoverModal from '@/components/HandoverModal';
import CreateDonationModal from '@/components/CreateDonationModal';

import RestaurantDashboard from '@/components/RestaurantDashboard';
import NgoDashboard from '@/components/NgoDashboard';
import RecipientPortal from '@/components/RecipientPortal';
import VolunteerDashboard from '@/components/VolunteerDashboard';
import AdminConsole from '@/components/AdminConsole';

import { 
  Filter, 
  Map as MapIcon, 
  Grid, 
  Search, 
  Sparkles, 
  Plus, 
  ShieldCheck, 
  Barcode,
  LayoutDashboard,
  Compass
} from 'lucide-react';

export function PlatformDashboard({ initialTab = 'DASHBOARD' }: { initialTab?: 'DISCOVERY' | 'DASHBOARD' }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [donations, setDonations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'GRID' | 'MAP'>('GRID');
  const [activeTab, setActiveTab] = useState<'DISCOVERY' | 'DASHBOARD'>(initialTab);

  // Modals
  const [selectedDonationForReserve, setSelectedDonationForReserve] = useState<any>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isCreateDonationModalOpen, setIsCreateDonationModalOpen] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setDemoMode(data.demoMode === true);
      if (data.user) setCurrentUser(data.user);
      else router.replace('/login');
    } catch (e) {
      console.error(e);
      router.replace('/login');
    }
  };

  const fetchDonations = async () => {
    try {
      let url = '/api/donations?activeOnly=false';
      if (selectedCategory !== 'ALL') url += `&category=${selectedCategory}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      const data = await res.json();
      setDonations(data.donations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/impact/stats');
      const data = await res.json();
      if (data.impact) setStats(data.impact);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetchDonations();
    fetchStats();
  }, [selectedCategory, searchQuery, currentUser?.id]);

  const handleAdminBlock = async (donation: any) => {
    const isCurrentlyBlocked = donation.safetyStatus === 'BLOCKED';
    const action = isCurrentlyBlocked ? 'UNBLOCK' : 'BLOCK';

    try {
      const res = await fetch('/api/admin/safety-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationId: donation.id,
          action,
          reason: 'Emergency Administrative safety protocol.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchDonations();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefreshAll = () => {
    fetchDonations();
    fetchStats();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
      {/* Sticky Navigation */}
      <Navbar
        currentUser={currentUser}
        demoMode={demoMode}
        onUserSwitch={(user) => {
          setCurrentUser(user);
          handleRefreshAll();
        }}
      />

      {/* Hero Section */}
      <Hero
        stats={stats}
        onOpenCreateDonation={() => setIsCreateDonationModalOpen(true)}
        onExploreFood={() => {
          setActiveTab('DISCOVERY');
          const el = document.getElementById('explore-food');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        {/* View Mode Toggle Pill Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-[#ebdcc7] shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('DASHBOARD')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'DASHBOARD'
                  ? 'bg-forest-900 text-wheat-200 shadow-sm'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>
                {currentUser?.role === 'RESTAURANT'
                  ? 'Restaurant Operations'
                  : currentUser?.role === 'NGO'
                  ? 'Shelter Hub'
                  : currentUser?.role === 'VOLUNTEER'
                  ? 'Courier Dispatch'
                  : currentUser?.role === 'ADMIN'
                  ? 'Admin Safety Console'
                  : 'My Recipient Portal'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('DISCOVERY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'DISCOVERY'
                  ? 'bg-forest-900 text-wheat-200 shadow-sm'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Surplus Food Discovery Feed</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">
              Active Role:{' '}
              <strong className="text-forest-950 font-semibold">{currentUser?.name}</strong> (
              {currentUser?.role})
            </span>
          </div>
        </div>

        {/* Dynamic Tab 1: Role-Specific Operational Workspace */}
        {activeTab === 'DASHBOARD' && (
          <div className="animate-in fade-in duration-200">
            {currentUser?.role === 'RESTAURANT' && (
              <RestaurantDashboard
                currentUser={currentUser}
                onOpenCreateDonation={() => setIsCreateDonationModalOpen(true)}
                onOpenHandoverModal={() => setIsHandoverModalOpen(true)}
              />
            )}

            {currentUser?.role === 'NGO' && (
              <NgoDashboard
                currentUser={currentUser}
                onExploreFood={() => setActiveTab('DISCOVERY')}
              />
            )}

            {currentUser?.role === 'INDIVIDUAL' && (
              <RecipientPortal
                currentUser={currentUser}
                onExploreFood={() => setActiveTab('DISCOVERY')}
              />
            )}

            {currentUser?.role === 'VOLUNTEER' && (
              <VolunteerDashboard currentUser={currentUser} />
            )}

            {currentUser?.role === 'ADMIN' && (
              <AdminConsole currentUser={currentUser} onRefreshData={handleRefreshAll} />
            )}
          </div>
        )}

        {/* Discovery Feed Section */}
        <section id="explore-food" className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-wheat-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-forest-900">
                  Surplus Food Feed
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-1">
                Available Surplus Near You
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Surplus listings with donor-reported handling details and automated timestamp checks.
              </p>
            </div>

            {/* View Mode & Quick Handover button */}
            <div className="flex items-center gap-2 self-stretch md:self-auto">
              <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    viewMode === 'GRID' ? 'bg-white text-forest-950 shadow-sm' : 'text-stone-500'
                  }`}
                  title="Card Grid View"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('MAP')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    viewMode === 'MAP' ? 'bg-white text-forest-950 shadow-sm' : 'text-stone-500'
                  }`}
                  title="Interactive Map View"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Map</span>
                </button>
              </div>

              {currentUser?.role === 'RESTAURANT' && (
                <button
                  onClick={() => setIsCreateDonationModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-forest-900 hover:bg-forest-800 text-wheat-200 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>List Food</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Category Filter Pills */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search food by name, kitchen, or locality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-forest-700 shadow-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['ALL', 'BAKERY', 'COOKED_MEALS', 'PACKAGED', 'DAIRY'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-2 rounded-xl font-medium shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-forest-900 text-wheat-200 shadow-sm'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {cat === 'ALL'
                    ? 'All Surplus'
                    : cat === 'COOKED_MEALS'
                    ? 'Cooked (Hot)'
                    : cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Map View Mode */}
          {viewMode === 'MAP' && (
            <div className="space-y-4">
              <MapDiscovery
                donations={donations}
                onSelectDonation={(id) => {
                  const target = donations.find((d) => d.id === id);
                  if (target) setSelectedDonationForReserve(target);
                }}
              />
              <p className="text-[11px] text-stone-500 text-center">
                Click any marker on the map to view kitchen details and reserve portions. Privacy circles protect recipient shelter locations.
              </p>
            </div>
          )}

          {/* Card Grid View Mode */}
          {viewMode === 'GRID' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full py-12 text-center text-xs text-stone-400">
                  Loading verified surplus donations...
                </div>
              ) : donations.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-3">
                  <p className="text-sm font-semibold text-stone-700">No surplus donations found</p>
                  <p className="text-xs text-stone-500">
                    Try adjusting your category filter or search keywords.
                  </p>
                </div>
              ) : (
                donations.map((donation) => (
                  <DonationCard
                    key={donation.id}
                    donation={donation}
                    currentRole={currentUser?.role}
                    onReserve={(d) => setSelectedDonationForReserve(d)}
                    onHandover={() => setIsHandoverModalOpen(true)}
                    onAdminBlock={handleAdminBlock}
                  />
                ))
              )}
            </div>
          )}
        </section>
      </main>

      {/* Signature Features & Explanations */}
      {(currentUser?.role === 'RESTAURANT' || currentUser?.role === 'ADMIN') && (
        <RecoveryEngineSection onActionComplete={handleRefreshAll} allowBatch={currentUser?.role === 'ADMIN'} />
      )}
      <SmartMatchingExplainer />
      <FssaiBanner />
      <ImpactMetrics />
      <HowItWorks
        onActionClick={(role) => {
          if (!demoMode) {
            router.push('/register');
            return;
          }
          // Switch persona to corresponding demo role
          const targetEmails: Record<string, string> = {
            RESTAURANT: 'bakery@breadcycle.demo',
            NGO: 'feedinghope@breadcycle.demo',
            INDIVIDUAL: 'priya@breadcycle.demo',
            VOLUNTEER: 'arjun@breadcycle.demo',
          };
          const email = targetEmails[role];
          if (email) {
            fetch('/api/auth/switch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.success) {
                  setCurrentUser(data.user);
                  setActiveTab('DASHBOARD');
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }
              });
          }
        }}
      />

      {/* Footer */}
      <Footer />

      {/* Modals */}
      {selectedDonationForReserve && (
        <ReserveModal
          donation={selectedDonationForReserve}
          currentUser={currentUser}
          onClose={() => setSelectedDonationForReserve(null)}
          onSuccess={() => {
            fetchDonations();
            fetchStats();
          }}
        />
      )}

      {isHandoverModalOpen && (
        <HandoverModal
          onClose={() => setIsHandoverModalOpen(false)}
          onSuccess={() => {
            fetchDonations();
            fetchStats();
          }}
        />
      )}

      {isCreateDonationModalOpen && (
        <CreateDonationModal
          currentUser={currentUser}
          onClose={() => setIsCreateDonationModalOpen(false)}
          onSuccess={() => {
            fetchDonations();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}
