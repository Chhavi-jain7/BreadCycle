'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  HeartHandshake, 
  Bell, 
  ChevronDown, 
  ShieldCheck, 
  UserCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  X,
  ExternalLink,
  Barcode,
} from 'lucide-react';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  restaurant?: any;
  ngo?: any;
  volunteer?: any;
}

interface Persona {
  email: string;
  name: string;
  role: string;
  organization?: string;
  description: string;
  avatarBadge: string;
}

export default function Navbar({ 
  currentUser, 
  onUserSwitch,
  demoMode = false,
}: { 
  currentUser: UserSession | null; 
  onUserSwitch?: (user: UserSession) => void;
  demoMode?: boolean;
}) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Load demo personas & notifications
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.demoPersonas) setPersonas(data.demoPersonas.filter((persona: Persona) => persona.role !== 'ADMIN'));
      })
      .catch((err) => console.error(err));

    fetchNotifications();
  }, [currentUser?.id]);

  const fetchNotifications = () => {
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) setNotifications(data.notifications);
      })
      .catch((err) => console.error(err));
  };

  const handleSelectPersona = async (email: string) => {
    if (!demoMode) return;
    setSwitching(true);
    try {
      const res = await fetch('/api/auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success && onUserSwitch) {
        onUserSwitch(data.user);
      }
      setIsSwitcherOpen(false);
      fetchNotifications();
      // Reload page to refresh all active dashboard queries
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(false);
    }
  };

  const markNotificationsRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const dashboardHref = currentUser?.role === 'RESTAURANT'
    ? '/restaurant/dashboard'
    : currentUser?.role === 'NGO'
      ? '/ngo/dashboard'
      : currentUser?.role === 'ADMIN'
        ? '/admin/dashboard'
        : currentUser?.role === 'VOLUNTEER'
          ? '/volunteer/dashboard'
          : '/dashboard';

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'RESTAURANT':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'NGO':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'INDIVIDUAL':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'VOLUNTEER':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'ADMIN':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#fdfbf7]/90 backdrop-blur-md border-b border-[#e9dfcf] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <Link href={currentUser ? dashboardHref : '/'} className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-forest-900 flex items-center justify-center text-wheat-300 shadow-md group-hover:scale-105 transition-transform duration-200">
                <HeartHandshake className="w-6 h-6 text-wheat-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-xl text-forest-950 tracking-tight leading-none">
                  Bread<span className="text-wheat-600">Cycle</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-forest-700 font-medium">
                  Rescue Food. Restore Hope.
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-4 text-sm font-medium text-stone-700">
            {currentUser?.role === 'INDIVIDUAL' ? (
              <>
                <Link href="/recipient/discover" className="px-3 py-1.5 rounded-lg hover:text-forest-900 hover:bg-forest-50 transition-colors">Discover Food</Link>
                <Link href="/recipient/reservations" className="px-3 py-1.5 rounded-lg hover:text-forest-900 hover:bg-forest-50 transition-colors">Reservations</Link>
                <Link href="/recipient/pickups" className="px-3 py-1.5 rounded-lg hover:text-forest-900 hover:bg-forest-50 transition-colors flex items-center gap-1.5 text-forest-900 font-semibold">
                  <Barcode className="w-3.5 h-3.5 text-forest-700" /> My Pickups
                </Link>
              </>
            ) : (
              <>
                <Link href="/#explore-food" className="px-3 py-1.5 rounded-lg hover:text-forest-900 hover:bg-forest-50 transition-colors">Explore Surplus</Link>
                <Link href="/#recovery-engine" className="px-3 py-1.5 rounded-lg hover:text-forest-900 hover:bg-forest-50 transition-colors flex items-center gap-1.5 text-forest-900 font-semibold">
                  <RefreshCw className="w-3.5 h-3.5 text-forest-700" /> Recovery Engine
                </Link>
                <Link href="/#smart-matching" className="px-3 py-1.5 rounded-lg hover:text-forest-900 hover:bg-forest-50 transition-colors">Smart Matching</Link>
                <Link href="/#fssai-safety" className="px-3 py-1.5 rounded-lg hover:text-forest-900 hover:bg-forest-50 transition-colors flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-forest-600" /> Safety Info
                </Link>
                <Link href="/#impact-stats" className="px-3 py-1.5 rounded-lg hover:text-forest-900 hover:bg-forest-50 transition-colors">Impact</Link>
              </>
            )}
            {demoMode && currentUser?.role === 'ADMIN' && (
              <Link href="/admin/dashboard" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                Admin Console
              </Link>
            )}
          </div>

          {/* Right Actions: Persona Switcher & Notifications */}
          <div className="flex items-center space-x-3">
            {demoMode && currentUser?.role === 'ADMIN' && <div className="hidden sm:block text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              Demo Mode
            </div>}
            {currentUser?.role === 'ADMIN' && (
              <Link href="/admin/dashboard" className="hidden sm:inline text-xs font-semibold text-rose-800 hover:underline">
                Admin dashboard
              </Link>
            )}
            {/* Quick Persona Switcher is deliberately hidden unless the backend explicitly enables Demo Mode. */}
            {demoMode && currentUser?.role === 'ADMIN' && (
              <div className="relative">
                <button
                  onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#e4d6c1] bg-white hover:bg-[#faf6ee] text-xs font-medium text-stone-800 shadow-sm transition-all focus:outline-none"
                  title="Switch role for demo testing"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-stone-900 hidden sm:inline">Demo Persona:</span>
                  <span className="truncate max-w-[120px] sm:max-w-[160px]">{currentUser?.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getRoleBadge(currentUser?.role)}`}>
                    {currentUser?.role}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                </button>
                {isSwitcherOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-[#e2d5bf] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-stone-100">
                      <p className="text-xs font-semibold text-forest-950 uppercase tracking-wider">Demo Mode · Switch persona</p>
                      <p className="text-[11px] text-stone-500">Admin access is never granted by persona switching; sign in with admin credentials.</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto py-1 divide-y divide-stone-50">
                      {personas.map((p) => {
                        const isCurrent = currentUser?.email === p.email;
                        return (
                          <button
                            key={p.email}
                            onClick={() => handleSelectPersona(p.email)}
                            disabled={switching}
                            className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start justify-between gap-2 text-xs ${
                              isCurrent ? 'bg-forest-50 border border-forest-200' : 'hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-stone-900">{p.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded border bg-white border-stone-200">{p.role}</span>
                              </div>
                              {p.organization && <p className="text-[11px] font-medium text-forest-800">{p.organization}</p>}
                              <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{p.description}</p>
                            </div>
                            {isCurrent && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {currentUser && (
              <button onClick={handleLogout} className="px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50">
                Logout
              </button>
            )}

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  if (!isNotificationsOpen && unreadCount > 0) {
                    markNotificationsRead();
                  }
                }}
                className="relative p-2 rounded-xl border border-[#e4d6c1] bg-white hover:bg-[#faf6ee] text-stone-700 transition-colors focus:outline-none"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-[#e2d5bf] shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-xs font-semibold text-stone-900">
                      Notifications ({notifications.length})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markNotificationsRead}
                        className="text-[11px] text-forest-700 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 mt-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-stone-500 py-4 text-center">
                        No notifications at the moment.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="py-2.5 px-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-900">{n.title}</span>
                            <span className="text-[10px] text-stone-400">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-stone-600 text-[11px] mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-stone-700 hover:bg-stone-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 space-y-1 bg-[#fdfbf7] border-b border-stone-200">
          {currentUser?.role === 'INDIVIDUAL' ? (
            <>
              <Link href="/recipient/discover" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100">Discover Food</Link>
              <Link href="/recipient/reservations" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100">My Reservations</Link>
              <Link href="/recipient/pickups" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-semibold text-forest-900 hover:bg-stone-100">My Pickups</Link>
            </>
          ) : (
            <>
              <Link href="/#explore-food" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100">Explore Surplus</Link>
              <Link href="/#recovery-engine" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-semibold text-forest-900 hover:bg-stone-100">Failed-Pickup Recovery Engine</Link>
              <Link href="/#smart-matching" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100">Smart Matching</Link>
              <Link href="/#fssai-safety" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100">Food Safety Information</Link>
              <Link href="/#impact-stats" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100">Impact Statistics</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
