import Link from 'next/link';
import { Heart, HeartHandshake, Leaf, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-ivory-300 bg-[#fbf8ef] text-forest-950">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
        <div className="grid gap-8 border-b border-forest-900/10 pb-8 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-forest-800 text-wheat-300">
                <HeartHandshake aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="font-serif text-xl font-bold tracking-tight">
                Bread<span className="text-wheat-600">Cycle</span>
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">
              Connecting surplus food with people and communities — one rescued meal at a time.
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-forest-700">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Donor-reported details with automated consistency checks
            </p>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-forest-900">Explore</h2>
            <ul className="mt-3 space-y-2 text-sm text-stone-600">
              <li><Link href="/#about" className="transition-colors hover:text-forest-800">About BreadCycle</Link></li>
              <li><Link href="/#how-it-works" className="transition-colors hover:text-forest-800">How it works</Link></li>
              <li><Link href="/#impact" className="transition-colors hover:text-forest-800">Our impact</Link></li>
              <li><Link href="/#faq" className="transition-colors hover:text-forest-800">Food safety</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-forest-900">Be part of it</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Whether you share food or find it, there’s a place for you in the cycle.
            </p>
            <div className="mt-3 flex gap-3 text-sm font-semibold">
              <Link href="/register" className="text-forest-800 hover:text-forest-950">Create an account</Link>
              <Link href="/login" className="text-forest-800 hover:text-forest-950">Log in</Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-5 text-xs text-stone-500 sm:flex-row">
          <p>© {new Date().getFullYear()} BreadCycle. Rescue Food. Restore Hope.</p>
          <p className="inline-flex items-center gap-1.5">
            Made for communities with <Heart aria-hidden="true" className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
            <Leaf aria-hidden="true" className="h-3.5 w-3.5 text-forest-600" />
          </p>
        </div>
      </div>
    </footer>
  );
}
