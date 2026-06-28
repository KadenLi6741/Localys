"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Twitter, Youtube, Facebook, Instagram, ChevronDown, Globe } from "lucide-react";
import { Logo } from "@/components/Logo";

const slides = [
  {
    image: "/landing/hero-food.jpeg",
    title: ["DISCOVER LOCAL.", "SUPPORT LOCAL."],
    artist: "Pho Shop",
    role: "5051 Yonge St Unit #2",
  },
  {
    image: "/landing/hero-restaurant.png",
    title: ["DISCOVER LOCAL.", "SUPPORT LOCAL."],
    artist: "Andy's Pho",
    role: "5051 Yonge St Unit #2",
  },
  {
    image: "/landing/hero-flowers.jpg",
    title: ["DISCOVER LOCAL.", "SUPPORT LOCAL."],
    artist: "Dream Rose Florist",
    role: "14 Levendale Rd, Richmond Hill",
  },
];

// Every image in public/landing EXCEPT hero-restaurant and the two login-only photos.
const trending = [
  { img: "/landing/biz-ana-pastry.png", title: "Ana Pastry", artist: "26 Church St S", type: "Bakery & Pastries", since: "2009", locations: "2 locations", busy: true, price: "$$", distance: "0.4 km", vibe: "Cozy · Sweet" },
  { img: "/landing/biz-aneals.png", title: "Aneal's Taste of the Islands", artist: "10220 Yonge St", type: "Caribbean", since: "2003", locations: "1 location", busy: true, price: "$$", distance: "0.9 km", vibe: "Lively · Bold" },
  { img: "/landing/biz-advanced-printing.webp", title: "Advanced Printing", artist: "10330 Yonge St", type: "Print & Signage", since: "1998", locations: "3 locations", busy: false, price: "$$$", distance: "1.2 km", vibe: "Quick · Reliable" },
  { img: "/landing/biz-align.png", title: "Align Health & Wellness", artist: "22 Richmond St", type: "Chiropractic & Wellness", since: "2014", locations: "2 locations", busy: false, price: "$$$", distance: "1.5 km", vibe: "Calm · Serene" },
  { img: "/landing/biz-acuvega.jpg", title: "Acuvega Wellness Center", artist: "207-22 Richmond St", type: "Acupuncture & Spa", since: "2017", locations: "1 location", busy: false, price: "$$$", distance: "1.6 km", vibe: "Peaceful · Modern" },
  { img: "/landing/biz-arnold.png", title: "Arnold Crescent Animal Hospital", artist: "26 Arnold Cres", type: "Veterinary Care", since: "1995", locations: "1 location", busy: true, price: "$$", distance: "2.1 km", vibe: "Caring · Friendly" },
  { img: "/landing/Bookstore.webp", title: "Local Bookstore", artist: "Local & independent", type: "Books & Stationery", since: "2010", locations: "1 location", busy: false, price: "$$", distance: "0.7 km", vibe: "Quiet · Charming" },
  { img: "/landing/catering buisness.jpg", title: "Catering Co.", artist: "Local & independent", type: "Catering", since: "2012", locations: "2 locations", busy: true, price: "$$$", distance: "2.6 km", vibe: "Warm · Elegant" },
  { img: "/landing/landscaping company.webp", title: "Landscaping", artist: "Local & independent", type: "Landscaping & Lawn Care", since: "2008", locations: "4 locations", busy: false, price: "$$", distance: "3.4 km", vibe: "Fresh · Green" },
  { img: "/landing/hero-flowers.jpg", title: "Dream Rose Florist", artist: "14 Levendale Rd", type: "Florist", since: "2006", locations: "2 locations", busy: true, price: "$$", distance: "1.1 km", vibe: "Bright · Fragrant" },
  { img: "/landing/hero-food.jpeg", title: "Pho Shop", artist: "5051 Yonge St", type: "Vietnamese", since: "2011", locations: "3 locations", busy: true, price: "$", distance: "0.6 km", vibe: "Casual · Comforting" },
  { img: "/landing/creator-dining.jpg", title: "Local Dining", artist: "Food & drink", type: "Modern Bistro", since: "2013", locations: "1 location", busy: false, price: "$$", distance: "1.9 km", vibe: "Trendy · Social" },
];

// ----- Bottom-of-page content (edit these freely) -----
const stats = [
  { value: "11+", label: "categories of local businesses" },
  { value: "100%", label: "independent & locally owned" },
  { value: "Free", label: "to join as a shopper" },
];

const faqs = [
  { q: "How do I find local businesses near me?", a: "Open Localys and your feed fills with shops, cafés, and services near your location. Browse by video, or search by name and category to jump straight to a spot." },
  { q: "Is Localys free to use?", a: "Yes. Creating an account and browsing is completely free for shoppers — and you collect coins as you order, review, and engage." },
  { q: "How do I order — pickup or a service?", a: "Add items to your cart for pickup, or book a service appointment right from a business's page. You'll get updates as your order or booking is confirmed." },
  { q: "How do coins and rewards work?", a: "You earn coins for ordering, leaving reviews, and engaging with the community. Redeem them for deals and perks at participating local businesses." },
  { q: "How do I list my business on Localys?", a: "Tap “List your business” to set up your storefront in Localys Manager — add your menu, photos, and start taking orders and bookings." },
  { q: "What makes Localys different?", a: "Localys blends video discovery, community reviews, and ordering in one app — and keeps just 5%, so far more stays with the local owners you support." },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${index}`;
  const btnId = `faq-btn-${index}`;
  return (
    <div className="border-b border-border">
      <button
        id={btnId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold text-foreground transition hover:text-foreground/70"
      >
        <span>{q}</span>
        <ChevronDown aria-hidden className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        className={`grid overflow-hidden transition-all duration-200 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0">
          <p className="max-w-2xl pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function LandingScreen() {
  const [banner, setBanner] = useState(true);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, []);

  const current = slides[slide];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Promo banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-secondary"
          >
            <div className="relative flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
              <span className="text-accent">◆</span>
              <span className="font-semibold">Now available:</span>
              <span className="text-muted-foreground">Trusted By over 1000+ businesses&nbsp;</span>
              <a href="#" className="font-semibold underline-offset-4 hover:underline">Learn More</a>
              <button
                onClick={() => setBanner(false)}
                aria-label="Dismiss"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="px-3 pt-3">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-card">
          <AnimatePresence mode="sync">
            <motion.div
              key={slide}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
              className="absolute inset-0"
            >
              <img
                src={current.image}
                alt=""
                className="h-full w-full object-cover"
                width={1920}
                height={1080}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/30" />
            </motion.div>
          </AnimatePresence>

          {/* Nav */}
          <div className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
            <Logo href="/" className="text-primary" iconClassName="h-7 w-7" textClassName="text-xl" />
            <nav className="flex items-center gap-2 text-lg font-medium">
              <Link href="/login" className="rounded-full bg-primary px-11 py-3.5 text-primary-foreground transition hover:text-primary-foreground/70">Sign in</Link>
              <Link href="/signup" className="rounded-full bg-white/15 px-11 py-3.5 text-white ring-1 ring-white/40 transition hover:text-white/70">Create account</Link>
              <Link href="/onboarding" className="hidden px-3 text-white/80 hover:text-white sm:inline">For Small Businesses</Link>
            </nav>
          </div>

          {/* Hero content */}
          <div className="relative z-10 grid min-h-[578px] grid-rows-[1fr_auto] px-6 pb-4 sm:min-h-[610px] sm:px-12 sm:pb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="max-w-6xl pt-4"
              >
                <h1 className="font-display text-6xl uppercase leading-[1.0] tracking-tight text-primary sm:text-[7.5rem]">
                  {current.title[0]}<br />{current.title[1]}
                </h1>
                <p className="mt-8 max-w-xl text-base leading-loose text-primary/85 [word-spacing:0.08em] sm:text-lg">
                  Discover and support your community&apos;s collection of local businesses: popular spots, hidden gems, and exclusive deals you won&apos;t find anywhere else.
                </p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <Link href="/feed" className="rounded-full bg-primary px-12 py-4 text-lg font-semibold text-primary-foreground transition hover:scale-[1.02]">Browse local</Link>
                  <Link href="/onboarding" className="rounded-full bg-transparent px-12 py-4 text-lg font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/10">List your business</Link>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="relative flex items-end justify-center">
              <div className="flex items-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${i === slide ? "w-6 bg-primary" : "w-2 bg-primary/40"}`}
                  />
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute right-0 bottom-0 text-right text-primary"
                >
                  <div className="font-display text-lg tracking-wide">{current.artist}</div>
                  <div className="text-xs text-primary/70">{current.role}</div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="mt-2 bg-black px-6 py-6 text-center">
        <div className="mx-auto max-w-[946px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-white/50" size={22} />
            <input
              type="search"
              placeholder="Search for businesses, restaurants, services, deals"
              className="h-[72px] w-full rounded-full bg-white/10 pl-14 pr-6 text-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          <div className="mt-6 text-base font-semibold text-white">or</div>
          <Link href="/onboarding" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-14 py-5 text-lg font-semibold text-black transition hover:text-black/70">
            Create a business
          </Link>
        </div>
      </section>

      {/* Trending — sliding right-to-left */}
      <section className="mt-20 overflow-hidden">
        <h2 className="mb-8 text-center font-display text-2xl tracking-wide">See What&apos;s In Your Area</h2>
        <div className="group relative [mask-image:linear-gradient(to_right,transparent,#000_24%,#000_76%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,#000_24%,#000_76%,transparent)]">
          <div className="animate-marquee-x flex w-max">
            {[...trending, ...trending].map((t, i) => (
              <div key={i} className="mr-7 w-64 shrink-0 sm:w-72">
                <div className="group/card relative aspect-[8/7] overflow-hidden rounded-md bg-muted">
                  <img src={t.img} alt={t.title} loading="eager" className="h-full w-full object-cover transition duration-500 group-hover/card:scale-105" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="truncate text-base font-semibold">{t.title}</span>
                  <span
                    className={`flex shrink-0 items-center gap-1 text-xs font-medium ${
                      t.busy ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${t.busy ? "bg-amber-400" : "bg-emerald-400"}`} />
                    {t.busy ? "Busy now" : "Not busy"}
                  </span>
                </div>
                <div className="truncate text-sm text-muted-foreground">{t.artist}</div>
                <div className="mt-1 truncate text-xs font-semibold uppercase tracking-wide text-foreground/80">{t.type}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Since {t.since}</span>
                  <span aria-hidden>·</span>
                  <span>{t.locations}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t.price}</span>
                  <span aria-hidden>·</span>
                  <span>{t.distance} away</span>
                </div>
                <div className="mt-2 inline-flex rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-muted-foreground">
                  {t.vibe}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 text-center">
          <Link href="/feed" className="inline-block whitespace-nowrap rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition hover:scale-[1.02]">See all near you</Link>
        </div>
      </section>

      {/* Calling All Small Businesses */}
      <section className="mx-auto mt-28 grid max-w-7xl gap-10 px-6 md:grid-cols-2 md:items-center">
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-md"
        >
          <img src="/landing/creator-dining.jpg" alt="Friends dining at a local restaurant" loading="lazy" className="aspect-[4/3] w-full object-cover" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-display text-6xl uppercase leading-[0.95] tracking-tight sm:text-8xl">
            CALLING ALL<br />SMALL BUSINESSES
          </h2>
          <p className="mt-6 max-w-md text-sm leading-loose text-muted-foreground [word-spacing:0.08em]">
            Discover local businesses, connect with owners, and support your community — products, services, and experiences all in one place.
          </p>
          <Link href="/onboarding" className="mt-8 inline-block whitespace-nowrap rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition hover:scale-[1.02]">
            List your business — it&apos;s free
          </Link>
        </motion.div>
      </section>

      {/* Stats strip */}
      <section className="mx-auto mt-24 max-w-6xl px-6">
        <h2 className="text-center font-display text-4xl uppercase tracking-tight sm:text-5xl">Built to grow local</h2>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {stats.map(({ value, label }) => (
            <div key={label} className="rounded-2xl bg-white/[0.06] px-8 py-10">
              <div className="font-sans text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">{value}</div>
              <div className="mt-3 text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-24 max-w-3xl px-6">
        <h2 className="text-center font-display text-4xl uppercase tracking-tight sm:text-5xl">Frequently asked questions</h2>
        <div className="mt-10 border-t border-border">
          {faqs.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} index={i} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto mt-24 max-w-6xl px-6">
        <div className="flex flex-col items-center rounded-3xl border border-border bg-white/[0.03] px-6 py-16 text-center sm:px-12">
          <h2 className="font-display text-4xl uppercase leading-[1.05] tracking-tight sm:text-6xl">
            Support local.<br />Starting today.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-loose text-muted-foreground [word-spacing:0.08em]">
            Discover the businesses that make your neighbourhood yours — and get rewarded for it.
          </p>
          <form action="/signup" className="mt-8 flex w-full max-w-lg flex-col items-center gap-3 sm:flex-row">
            <label htmlFor="cta-email" className="sr-only">Email address</label>
            <input
              id="cta-email"
              type="email"
              name="email"
              placeholder="you@email.com"
              className="h-12 w-full flex-1 rounded-full border border-border bg-background px-5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <button type="submit" className="h-12 w-full shrink-0 whitespace-nowrap rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground transition hover:text-primary-foreground/70 sm:w-auto">
              Get started
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-24 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="max-w-xs">
              <Logo href="/" className="text-foreground" iconClassName="h-6 w-6" textClassName="text-xl" />
              <p className="mt-3 text-sm text-muted-foreground">Discover and support the small local businesses around you.</p>
              <button className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground">
                <Globe className="h-4 w-4" aria-hidden /> Canada | English
              </button>
            </div>
            <div className="grid grid-cols-2 gap-10">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Explore</h3>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li><Link href="/about" className="transition hover:text-foreground">About</Link></li>
                  <li><Link href="/onboarding" className="transition hover:text-foreground">For Businesses</Link></li>
                  <li><Link href="/contact" className="transition hover:text-foreground">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Legal</h3>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li><Link href="/terms" className="transition hover:text-foreground">Terms of Service</Link></li>
                  <li><Link href="/privacy" className="transition hover:text-foreground">Privacy Policy</Link></li>
                  <li><Link href="/sitemap" className="transition hover:text-foreground">Sitemap</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-border pt-8 sm:flex-row">
            <p className="text-xs text-muted-foreground">{new Date().getFullYear()} Localys. All rights reserved.</p>
            <div className="flex gap-6 text-muted-foreground">
              <a href="#" aria-label="Twitter" className="transition hover:text-foreground"><Twitter size={18} /></a>
              <a href="#" aria-label="YouTube" className="transition hover:text-foreground"><Youtube size={18} /></a>
              <a href="#" aria-label="Facebook" className="transition hover:text-foreground"><Facebook size={18} /></a>
              <a href="#" aria-label="Instagram" className="transition hover:text-foreground"><Instagram size={18} /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
