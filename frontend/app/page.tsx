import Link from 'next/link';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
      <header className="border-b border-[#e9dfcf] bg-[#fdfbf7]/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="font-serif font-bold text-2xl text-forest-950">
            Bread<span className="text-wheat-600">Cycle</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-semibold text-forest-900 hover:bg-forest-50 rounded-xl">
              Login
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm font-semibold bg-forest-900 text-wheat-200 hover:bg-forest-800 rounded-xl">
              Register
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-7">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest-700">Rescue food. Restore hope.</p>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold leading-tight text-forest-950">
              Good food deserves a second chance.
            </h1>
            <p className="text-lg leading-relaxed text-stone-600 max-w-xl">
              BreadCycle connects surplus food from local kitchens with individuals and community organizations. Donor-reported handling details are visible, and automated checks flag missing or inconsistent information.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="px-6 py-3 rounded-xl bg-forest-900 text-wheat-200 font-semibold shadow-sm hover:bg-forest-800">
                Create an account
              </Link>
              <Link href="/login" className="px-6 py-3 rounded-xl border border-stone-300 bg-white text-forest-950 font-semibold hover:bg-stone-50">
                Login to BreadCycle
              </Link>
            </div>
          </div>
          <div className="bg-white rounded-[2rem] border border-[#ebdcc7] shadow-sm p-8 sm:p-10 space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-forest-900 text-wheat-300 flex items-center justify-center text-2xl">♡</div>
            <h2 className="font-serif text-2xl font-bold text-forest-950">A simple path from surplus to community</h2>
            <ol className="space-y-4 text-sm text-stone-600">
              <li><strong className="text-forest-900">01 · Share</strong> — Restaurants report surplus, preparation times, storage, and allergens.</li>
              <li><strong className="text-forest-900">02 · Discover</strong> — Individuals and verified NGOs see nearby food and any safety cautions.</li>
              <li><strong className="text-forest-900">03 · Collect</strong> — Reserve portions and receive a pickup code.</li>
            </ol>
            <p className="pt-4 border-t border-stone-100 text-xs text-stone-500">
              Secure accounts keep reservations, pickup codes, and administrative tools tied to the right person.
            </p>
            <p className="text-xs text-amber-900">
              Automated checks cannot inspect food or verify actual temperatures. They are signals—not a safety certification.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
