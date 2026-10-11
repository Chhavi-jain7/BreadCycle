import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  Heart,
  HeartHandshake,
  Home as HomeIcon,
  Leaf,
  Search,
  ShieldCheck,
  Store,
  Truck,
  UsersRound,
  Utensils,
} from 'lucide-react';
import Footer from '@/components/Footer';

const impactPoints = [
  { icon: Leaf, title: 'Less Food Waste', description: 'Every meal counts', color: 'bg-green-100 text-forest-700' },
  { icon: Heart, title: 'Stronger Communities', description: 'Food reaches people', color: 'bg-amber-100 text-amber-700' },
  { icon: UsersRound, title: 'Verified Recipients', description: 'Safer and trusted', color: 'bg-teal-100 text-teal-700' },
  { icon: Leaf, title: 'Greener Tomorrow', description: 'A sustainable future', color: 'bg-lime-100 text-lime-700' },
];

const roles = [
  { icon: Store, label: 'Restaurants', color: 'bg-orange-100 text-orange-700' },
  { icon: UsersRound, label: 'Individuals', color: 'bg-emerald-100 text-emerald-700' },
  { icon: HeartHandshake, label: 'NGOs', color: 'bg-violet-100 text-violet-700' },
  { icon: HomeIcon, label: 'Community Kitchens', color: 'bg-sky-100 text-sky-700' },
];

const steps = [
  { icon: Utensils, title: '1. Share', description: 'Restaurants list surplus food.', color: 'bg-green-100 text-forest-700' },
  { icon: Search, title: '2. Discover', description: 'Recipients find nearby food.', color: 'bg-amber-100 text-amber-700' },
  { icon: ShieldCheck, title: '3. Collect', description: 'Reserve and get verified.', color: 'bg-violet-100 text-violet-700' },
  { icon: Truck, title: '4. Deliver', description: 'Safe and timely handover.', color: 'bg-sky-100 text-sky-700' },
  { icon: Leaf, title: '5. Create Impact', description: 'Track meals and reduce waste.', color: 'bg-lime-100 text-lime-700' },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-ivory-50 text-forest-950">
      <header className="relative z-20 border-b border-ivory-300/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-[1380px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="BreadCycle home" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-forest-800 text-wheat-300 shadow-sm">
              <Leaf aria-hidden="true" className="h-6 w-6" />
            </span>
            <span className="leading-tight">
              <span className="block font-serif text-[23px] font-bold tracking-tight text-forest-950">
                Bread<span className="text-wheat-600">Cycle</span>
              </span>
              <span className="block text-[10px] font-medium tracking-wide text-forest-700">Rescue Food. Restore Hope.</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium text-stone-600 md:flex">
            <a href="#home" className="border-b-2 border-forest-600 py-2 text-forest-800">Home</a>
            <a href="#about" className="py-2 transition-colors hover:text-forest-800">About</a>
            <a href="#how-it-works" className="py-2 transition-colors hover:text-forest-800">How It Works</a>
            <a href="#impact" className="py-2 transition-colors hover:text-forest-800">Impact</a>
            <a href="#faq" className="py-2 transition-colors hover:text-forest-800">FAQ</a>
          </nav>

          <div className="flex shrink-0 items-center gap-2.5">
            <Link href="/login" className="rounded-full border border-forest-300 px-5 py-2 text-sm font-semibold text-forest-800 transition-colors hover:bg-forest-50">
              Login
            </Link>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-900">
              <UsersRound aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Register</span>
              <span className="sm:hidden">Join</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="relative isolate bg-[linear-gradient(112deg,#fbfaf3_0%,#fffdf7_51%,#f5f2e8_100%)]">
          <div aria-hidden="true" className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-lime-100/40 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-wheat-100/70 blur-3xl" />
          <div className="relative mx-auto grid max-w-[1380px] items-center gap-10 px-5 pb-12 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:px-12 lg:pb-16 lg:pt-14">
            <div id="about" className="relative z-10">
              <div className="mb-5 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-green-200 bg-white/75 px-4 py-2 text-xs font-semibold text-forest-700 shadow-sm">
                <span className="inline-flex items-center gap-1.5"><Leaf aria-hidden="true" className="h-3.5 w-3.5" /> Reduce Food Waste</span>
                <span aria-hidden="true" className="text-wheat-500">•</span>
                <span>Support Communities</span>
                <span aria-hidden="true" className="text-wheat-500">•</span>
                <span>Build a Greener Future</span>
              </div>
              <h1 className="max-w-2xl font-serif text-[clamp(3rem,6vw,5.35rem)] font-bold leading-[0.99] tracking-[-0.045em] text-[#172d2d]">
                Good food deserves a{' '}
                <span className="bg-gradient-to-r from-[#80ad69] to-[#08765b] bg-clip-text text-transparent">second chance.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#496260] sm:text-lg sm:leading-8">
                BreadCycle connects surplus food from restaurants, hotels and food businesses with individuals, NGOs, shelters and community kitchens — so good food doesn’t go to waste, and reaches people who need it most.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/register" className="group inline-flex items-center gap-2.5 rounded-full bg-forest-800 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-forest-900 hover:shadow-lg">
                  <Leaf aria-hidden="true" className="h-4 w-4 text-wheat-200" />
                  Create an Account
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/login" className="rounded-full border border-forest-300 bg-white/70 px-6 py-3.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-white">
                  Login to BreadCycle
                </Link>
              </div>

              <div id="impact" className="mt-8 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-forest-900/10 pt-6 sm:grid-cols-4">
                {impactPoints.map(({ icon: Icon, title, description, color }) => (
                  <div key={title} className="min-w-0">
                    <span className={`mb-2 inline-grid h-10 w-10 place-items-center rounded-full ${color}`}>
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <h2 className="text-xs font-bold text-forest-950">{title}</h2>
                    <p className="mt-1 text-[11px] leading-4 text-stone-500">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-w-0 pb-11 lg:pb-8">
              <div className="relative h-[330px] overflow-hidden rounded-[2rem] bg-[#d8dfc9] shadow-[0_24px_70px_-28px_rgba(22,52,42,0.38)] sm:h-[430px] lg:h-[480px]">
                <img
                  src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1500&q=85"
                  alt="Freshly prepared food ready to be shared with the community"
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#102b23]/45 via-transparent to-[#102b23]/10" />
                <div className="absolute left-5 top-5 max-w-[190px] -rotate-3 rounded-2xl bg-[#fff9df] px-4 py-3 text-forest-800 shadow-lg sm:left-8 sm:top-8">
                  <p className="font-serif text-sm font-bold italic leading-snug sm:text-base">“From surplus<br />to smiles”</p>
                  <Heart aria-hidden="true" className="ml-auto mt-1 h-4 w-4 fill-wheat-400 text-wheat-500" />
                </div>
                <div className="absolute bottom-7 left-5 max-w-xs text-white sm:bottom-9 sm:left-8">
                  <p className="font-serif text-2xl font-bold sm:text-3xl">Good food.<br />A better tomorrow.</p>
                  <p className="mt-2 text-sm text-white/85">Small actions make a big difference.</p>
                </div>
                <div className="absolute bottom-5 right-5 hidden rounded-full border border-white/30 bg-white/90 px-3 py-2 text-xs font-semibold text-forest-800 shadow-lg backdrop-blur sm:flex sm:items-center sm:gap-2">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 text-forest-600" />
                  Community powered
                </div>
              </div>

              <div className="absolute -bottom-1 left-1/2 grid w-[min(94%,560px)] -translate-x-1/2 grid-cols-4 gap-1 rounded-full border border-white/70 bg-white/95 px-2 py-2 shadow-[0_14px_40px_-16px_rgba(22,52,42,0.35)] backdrop-blur sm:bottom-0 sm:px-4 sm:py-3">
                {roles.map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                    <span className={`grid h-9 w-9 place-items-center rounded-full sm:h-11 sm:w-11 ${color}`}>
                      <Icon aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                    <span className="text-[9px] font-semibold leading-tight text-[#38504d] sm:text-[11px]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto max-w-[1380px]">
            <div className="mx-auto mb-9 max-w-xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-600">Good food, moving forward</p>
              <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-forest-950 sm:text-4xl">How BreadCycle Works</h2>
              <span aria-hidden="true" className="mx-auto mt-3 block h-1 w-10 rounded-full bg-gradient-to-r from-forest-600 to-wheat-400" />
            </div>

            <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {steps.map(({ icon: Icon, title, description, color }, index) => (
                <li key={title} className="relative flex flex-col items-center rounded-2xl px-4 py-5 text-center transition-colors hover:bg-ivory-100">
                  {index < steps.length - 1 && <ArrowRight aria-hidden="true" className="absolute -right-3 top-9 hidden h-4 w-4 text-stone-400 lg:block" />}
                  <span className={`mb-3 grid h-12 w-12 place-items-center rounded-full ${color}`}>
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <h3 className="text-sm font-bold text-forest-950">{title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-stone-500">{description}</p>
                </li>
              ))}
            </ol>

            <div id="faq" className="mt-9 flex flex-col items-center justify-between gap-4 rounded-2xl border border-ivory-300 bg-ivory-50 px-5 py-5 text-center sm:flex-row sm:px-7 sm:text-left">
              <div>
                <h3 className="font-serif text-lg font-bold text-forest-900">Food safety matters at every step.</h3>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-stone-600">
                  Handling details are donor-reported and checked for inconsistencies. Automated checks can flag risks, but cannot inspect food or certify actual conditions.
                </p>
              </div>
              <Link href="/register" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-900">
                Join the community <ArrowDown aria-hidden="true" className="h-4 w-4 -rotate-90" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
