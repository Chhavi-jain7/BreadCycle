'use client';

import React, { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HandHeart, Eye, EyeOff, Store, UserRound } from 'lucide-react';
import Footer from '@/components/Footer';

type AuthMode = 'login' | 'register';
type PublicRole = 'INDIVIDUAL' | 'RESTAURANT' | 'NGO';

const publicRoles: { value: PublicRole; title: string; description: string; Icon: typeof UserRound }[] = [
  { value: 'INDIVIDUAL', title: 'Individual Recipient', description: 'Discover and reserve surplus food for personal use.', Icon: UserRound },
  { value: 'RESTAURANT', title: 'Restaurant / Food Donor', description: 'Share surplus food and manage collection handovers.', Icon: Store },
  { value: 'NGO', title: 'NGO / Community Kitchen', description: 'Coordinate eligible food distributions in bulk.', Icon: HandHeart },
];

function dashboardPath(role: string) {
  switch (role) {
    case 'RESTAURANT':
      return '/restaurant/dashboard';
    case 'NGO':
      return '/ngo/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    case 'VOLUNTEER':
      return '/volunteer/dashboard';
    default:
      return '/dashboard';
  }
}

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<PublicRole | ''>('');
  const [businessName, setBusinessName] = useState('');
  const [fssaiLicense, setFssaiLicense] = useState('');
  const [address, setAddress] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === 'register';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (isRegister && !role) {
      setError('Choose the account type that best describes you.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, password,
          ...(isRegister ? { role, phone, businessName, fssaiLicense, address, registrationNumber } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to authenticate.');
      router.replace(dashboardPath(data.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
      <header className="border-b border-[#e9dfcf]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center">
          <Link href="/" className="font-serif font-bold text-2xl text-forest-950">
            Bread<span className="text-wheat-600">Cycle</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <section className="w-full max-w-md bg-white border border-[#ebdcc7] rounded-3xl shadow-sm p-7 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-wider text-forest-700">
            {isRegister ? 'Join BreadCycle' : 'Welcome back'}
          </p>
          <h1 className="font-serif text-3xl font-bold text-forest-950 mt-2">
            {isRegister ? 'Create your account' : 'Login'}
          </h1>
          <p className="text-sm text-stone-500 mt-2">
            {isRegister ? 'Choose how you would like to help rescue surplus food.' : 'Sign in to access your BreadCycle dashboard.'}
          </p>

          <form onSubmit={submit} className="space-y-4 mt-7">
            {isRegister && (
              <label className="block text-sm font-medium text-stone-700">
                Name
                <input
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-3 text-sm focus:outline-none focus:border-forest-700"
                />
              </label>
            )}
            {isRegister && (
              <>
                <fieldset>
                  <legend className="text-sm font-semibold text-stone-800 mb-2">Choose your role <span className="text-rose-700">*</span></legend>
                  <div className="space-y-2">
                    {publicRoles.map(({ value, title, description, Icon }) => (
                      <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${role === value ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700' : 'border-stone-200 hover:border-forest-400'}`}>
                        <input
                          type="radio"
                          name="role"
                          value={value}
                          checked={role === value}
                          onChange={() => setRole(value)}
                          className="mt-1 accent-forest-800"
                          required
                        />
                        <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-forest-800" />
                        <span>
                          <span className="block text-sm font-semibold text-forest-950">{title}</span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-stone-600">{description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {role && role !== 'INDIVIDUAL' && (
                  <div className="space-y-4 rounded-2xl border border-wheat-300 bg-[#fffaf0] p-4">
                    <p className="text-xs font-semibold text-forest-900">{role === 'NGO' ? 'Organization details' : 'Donor details'}</p>
                    <label className="block text-sm font-medium text-stone-700">
                      {role === 'NGO' ? 'Organization name' : 'Business name'}
                      <input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} maxLength={120} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-3 text-sm focus:border-forest-700 focus:outline-none" />
                    </label>
                    {role === 'RESTAURANT' ? (
                      <>
                        <label className="block text-sm font-medium text-stone-700">
                          Food safety license / registration
                          <input required value={fssaiLicense} onChange={(event) => setFssaiLicense(event.target.value)} maxLength={100} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-3 text-sm focus:border-forest-700 focus:outline-none" />
                        </label>
                        <label className="block text-sm font-medium text-stone-700">
                          Pickup address
                          <input required value={address} onChange={(event) => setAddress(event.target.value)} maxLength={250} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-3 text-sm focus:border-forest-700 focus:outline-none" />
                        </label>
                      </>
                    ) : (
                      <label className="block text-sm font-medium text-stone-700">
                        Organization registration number
                        <input required value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} maxLength={100} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-3 text-sm focus:border-forest-700 focus:outline-none" />
                      </label>
                    )}
                  </div>
                )}
                <label className="block text-sm font-medium text-stone-700">
                  Phone number <span className="font-normal text-stone-500">(optional)</span>
                  <input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={32} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-3 text-sm focus:border-forest-700 focus:outline-none" />
                </label>
              </>
            )}
            <label className="block text-sm font-medium text-stone-700">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-3 text-sm focus:outline-none focus:border-forest-700"
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Password
              <div className="relative mt-1.5">
                <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={isRegister ? 8 : undefined}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3.5 py-3 pr-12 text-sm focus:outline-none focus:border-forest-700"
              />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-3 text-stone-500 hover:text-forest-800">
                  {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                </button>
              </div>
              {isRegister && <span className="mt-1 block text-xs text-stone-500">Use at least 8 characters.</span>}
            </label>
            {isRegister && (
              <label className="block text-sm font-medium text-stone-700">
                Confirm password
                <div className="relative mt-1.5">
                  <input type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-stone-300 px-3.5 py-3 pr-12 text-sm focus:border-forest-700 focus:outline-none" />
                  <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} className="absolute inset-y-0 right-3 text-stone-500 hover:text-forest-800">
                    {showConfirmPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            )}
            {isRegister && role === 'NGO' && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">NGO accounts are reviewed by an administrator. Bulk claiming stays disabled until verification is approved.</p>}
            {error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-forest-900 px-4 py-3 text-sm font-semibold text-wheat-200 hover:bg-forest-800 disabled:opacity-60"
            >
              {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Login'}
            </button>
          </form>
          <p className="text-sm text-stone-600 text-center mt-6">
            {isRegister ? 'Already registered?' : 'New to BreadCycle?'}{' '}
            <Link className="font-semibold text-forest-800 hover:underline" href={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Login' : 'Register'}
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
