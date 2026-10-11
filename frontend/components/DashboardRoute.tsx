'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlatformDashboard } from '@/components/PlatformDashboard';
import RecipientRecordsPage from '@/components/RecipientRecordsPage';

const roleRoutes: Record<string, string> = {
  INDIVIDUAL: '/dashboard',
  RESTAURANT: '/restaurant/dashboard',
  NGO: '/ngo/dashboard',
  ADMIN: '/admin/dashboard',
  VOLUNTEER: '/volunteer/dashboard',
};

export default function DashboardRoute({
  allowedRole,
  initialTab,
  recipientView,
}: {
  allowedRole?: string;
  initialTab?: 'DISCOVERY' | 'DASHBOARD';
  recipientView?: 'reservations' | 'pickups';
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(async (response) => {
        const data = await response.json();
        if (!data.user) {
          router.replace('/login');
          return;
        }
        if (allowedRole && data.user.role !== allowedRole) {
          router.replace(roleRoutes[data.user.role] || '/dashboard');
          return;
        }
        setUser(data.user);
        setAuthorized(true);
      })
      .catch(() => router.replace('/login'));
  }, [allowedRole, router]);

  if (!authorized) return <main className="min-h-screen grid place-items-center bg-[#fdfbf7] text-sm text-stone-500">Checking your account…</main>;
  if (recipientView && user) return <RecipientRecordsPage user={user} view={recipientView} />;
  return <PlatformDashboard initialTab={initialTab} />;
}
