'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import AdminConsole from '@/components/AdminConsole';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [checking, setChecking] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setDemoMode(data.demoMode === true);
      if (!data.user) {
        router.replace('/login');
      } else if (data.user.role !== 'ADMIN') {
        const destination = data.user.role === 'RESTAURANT'
          ? '/restaurant/dashboard'
          : data.user.role === 'NGO'
          ? '/ngo/dashboard'
          : data.user.role === 'VOLUNTEER'
          ? '/volunteer/dashboard'
          : '/dashboard';
        router.replace(destination);
      } else {
        setCurrentUser(data.user);
      }
    } catch (e) {
      console.error(e);
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  if (checking || !currentUser) {
    return <main className="min-h-screen grid place-items-center bg-[#fdfbf7] text-sm text-stone-500">Checking administrator access…</main>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
      <Navbar currentUser={currentUser} demoMode={demoMode} onUserSwitch={(u) => setCurrentUser(u)} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-semibold text-stone-600 hover:text-forest-900 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Main Platform</span>
          </Link>
          <span className="text-xs text-rose-800 font-bold bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
            Admin Dedicated Route (/admin)
          </span>
        </div>

        <AdminConsole currentUser={currentUser} />
      </main>

      <Footer />
    </div>
  );
}
