'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown, ChevronLeft, Star, MapPin, Store as StoreIcon, Heart, Clock, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

/* ============================ Categories ============================ */
// Icons are PNGs in /public/categories/ (case-sensitive filenames). No emoji —
// if a file is missing the icon falls back to a neutral letter tile (never an
// emoji), so the row stays on-brand. NOTE: as of this branch the PNGs are not
// committed (only README.txt), so the letter fallback shows until they're added.
const CATEGORIES: { id: string; label: string; file: string; type?: string }[] = [
  { id: 'grocery', label: 'Grocery', file: 'grocery.png', type: 'retail' },
  { id: 'fast-food', label: 'Fast Food', file: 'Fast-food.png', type: 'food' },
  { id: 'bakery', label: 'Bakery', file: 'bakery.png', type: 'food' },
  { id: 'restaurants', label: 'Restaurants', file: 'restaurants.png', type: 'food' },
  { id: 'flowers', label: 'Flower Shops', file: 'flower.png', type: 'retail' },
  { id: 'services', label: 'Services', file: 'service.png', type: 'service' },
  { id: 'cafes', label: 'Cafés', file: 'cafe.png', type: 'food' },
  { id: 'clothing', label: 'Clothing', file: 'clothing.png', type: 'retail' },
  { id: 'toys', label: 'Toy Stores', file: 'toys.png', type: 'retail' },
  { id: 'pet', label: 'Pet', file: 'pet.png', type: 'retail' },
  { id: 'health', label: 'Health', file: 'health.png', type: 'service' },
];

// Promo deals — the ONE place colour is allowed (intentional exception to the
// otherwise black/white minimal UI). Per-card colours are hardcoded on purpose;
// each has a label, a deadline subline, a CTA label, and bg/fg colours.
const DEALS = [
  { id: 'd1', title: 'BOGO at The Carbon Bar BBQ', sub: 'Ends 07/19 · Terms apply', cta: 'Score the Deal', bg: '#1f8f4e', fg: '#ffffff' },
  { id: 'd2', title: '40% off at Nomè Izakaya', sub: 'Ends 07/19 · Terms apply', cta: 'Order Now', bg: '#efe1c2', fg: '#1a1a1a' },
  { id: 'd3', title: 'Malatang Combo at Haidilao Hot Pot', sub: 'Ends 06/29 · Terms apply', cta: 'See details', bg: '#d9472f', fg: '#ffffff' },
  { id: 'd4', title: 'Feed the crew for less this week', sub: 'Ends 07/05 · Terms apply', cta: 'Feed the Crew', bg: '#2563a8', fg: '#ffffff' },
];

interface Biz {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_picture_url: string | null;
  type: string | null;
}

/* ============================ Display meta ============================ */
// No live geo/ratings yet, so derive stable demo values from the id. Deterministic
// (same id → same numbers) so cards don't reshuffle between renders. Display-only —
// not persisted and never sent back to Supabase.
function storeMeta(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return {
    rating: (3.8 + ((h >> 3) % 13) / 10).toFixed(1), // 3.8–5.0
    reviews: 40 + ((h >> 5) % 960), // 40–999
    distanceKm: (0.3 + (h % 47) / 10).toFixed(1), // 0.3–5.0 km
    pickupMin: 5 + (h % 16), // 5–20 min
  };
}

/* ============================ Category icon (PNG → neutral letter fallback) ============================ */
function CategoryIcon({ file, label }: { file: string; label: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-surface">
      {failed ? (
        // Neutral fallback (no emoji) — shows the category initial if the PNG 404s.
        <span className="text-body font-bold text-muted-foreground" aria-hidden="true">{label.charAt(0)}</span>
      ) : (
        <Image
          src={`/categories/${file}`}
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 object-contain"
          onError={() => setFailed(true)}
          unoptimized
        />
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* ============================ Scroll reveal ============================ */
// Reference motion (ANIMATIONS.md): each block fades + rises into view once.
// Toggles a CSS class via IntersectionObserver (no React state) — cheap + lint-clean.
function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn('reveal', className)}>
      {children}
    </div>
  );
}

/* ============================ Filter popover ============================ */
// Shared dropdown shell for the Distance / Rating / Sort filters: white rounded
// card, bold title + X close, content, and a Reset / black Apply footer.
function FilterPopover({
  title,
  onClose,
  onReset,
  children,
}: {
  title: string;
  onClose: () => void;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="shadow-soft absolute left-0 top-14 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-[16px] border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-subheading font-bold text-foreground">{title}</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-foreground transition-colors hover:bg-surface">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {children}
      <div className="mt-5 flex items-center justify-end gap-3">
        <button type="button" onClick={onReset} className="text-body-sm font-semibold text-foreground hover:underline">
          Reset
        </button>
        <button type="button" onClick={onClose} className="rounded-full bg-foreground px-5 py-2 text-body-sm font-bold text-background transition-colors hover:bg-foreground/90">
          Apply
        </button>
      </div>
    </div>
  );
}

/* ============================ Deals carousel ============================ */
// Colourful deal cards (image on the right), a white pill CTA, auto-advancing
// right→left on a gentle loop, pausing on hover, with manual white circular
// arrows. The only place colour is used heavily.
function DealsCarousel({ images }: { images: string[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const CARD_STEP = 480; // px advanced per tick / arrow click

  const scrollByCard = (dir: 1 | -1) => {
    rowRef.current?.scrollBy({ left: dir * CARD_STEP, behavior: 'smooth' });
  };

  // Gentle auto-advance; loops back to the start at the end. Paused on hover.
  useEffect(() => {
    if (paused) return;
    const el = rowRef.current;
    if (!el) return;
    const id = window.setInterval(() => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: CARD_STEP, behavior: 'smooth' });
      }
    }, 3200);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div className="relative mb-8">
      <div
        ref={rowRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="flex gap-4 overflow-x-auto px-0.5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {DEALS.map((d, i) => (
          <div
            key={d.id}
            style={{ backgroundColor: d.bg, color: d.fg }}
            className="shadow-soft relative flex h-52 w-[360px] shrink-0 overflow-hidden rounded-[20px] sm:h-56 sm:w-[460px]"
          >
            {/* Left: title + subline + white pill CTA */}
            <div className="flex w-3/5 flex-col justify-between p-5">
              <div>
                <p className="text-subheading font-bold leading-tight">{d.title}</p>
                <p className="mt-1.5 text-body-sm opacity-80">{d.sub}</p>
              </div>
              <button
                type="button"
                className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-white px-7 py-3 text-body-sm font-bold text-black shadow-sm transition-transform hover:scale-[1.03]"
              >
                {d.cta}
              </button>
            </div>
            {/* Right: food / business image filling the panel */}
            <div className="relative w-2/5">
              {images[i % Math.max(images.length, 1)] ? (
                <Image src={images[i % images.length]} alt="" fill className="object-cover" unoptimized />
              ) : (
                <div className="h-full w-full bg-black/10" aria-hidden="true" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Manual white circular arrows */}
      <button
        type="button"
        onClick={() => scrollByCard(-1)}
        aria-label="Previous deals"
        className="absolute left-1 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 sm:flex"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => scrollByCard(1)}
        aria-label="Next deals"
        className="absolute right-1 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 sm:flex"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ============================ Page ============================ */
export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomeStorefront />
    </ProtectedRoute>
  );
}

function HomeStorefront() {
  const router = useRouter();
  const [mode, setMode] = useState<'pickup' | 'service'>('pickup');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [loading, setLoading] = useState(true);
  const catRowRef = useRef<HTMLDivElement>(null);

  // Filter-chip state. Distance/offers are presentational; Rating + Sort genuinely
  // filter/sort the lists (using the deterministic demo meta).
  const [openFilter, setOpenFilter] = useState<'distance' | 'rating' | 'sort' | ''>('');
  const [distance, setDistance] = useState(5); // km, shown in the Distance slider
  const [offersOnly, setOffersOnly] = useState(false);
  const [minRating, setMinRating] = useState(0); // 0 = Any; otherwise e.g. 4.5
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'arrival'>('recommended');
  const [nearCount, setNearCount] = useState(10); // "Show more" reveals additional stores

  // Session favourites (heart). Frontend-only; toggling never touches the backend.
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const toggleFav = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, username, full_name, profile_picture_url, type')
      .in('type', ['food', 'retail', 'service'])
      .limit(40)
      .then(({ data }) => {
        if (!cancelled) {
          setBusinesses((data ?? []) as Biz[]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter by category type + Pickup/Service mode + the Rating filter, then sort.
  const filtered = useMemo(() => {
    let list = businesses;
    if (mode === 'service') list = list.filter((b) => b.type === 'service');
    const cat = CATEGORIES.find((c) => c.id === activeCategory);
    if (cat?.type) list = list.filter((b) => b.type === cat.type);
    if (minRating > 0) list = list.filter((b) => Number(storeMeta(b.id).rating) >= minRating);

    if (sortBy === 'rating') {
      list = [...list].sort((a, b) => Number(storeMeta(b.id).rating) - Number(storeMeta(a.id).rating));
    } else if (sortBy === 'arrival') {
      list = [...list].sort((a, b) => storeMeta(a.id).pickupMin - storeMeta(b.id).pickupMin);
    }
    return list;
  }, [businesses, mode, activeCategory, minRating, sortBy]);

  const featured = filtered.slice(0, 8);
  const offers = filtered.slice(2, 10);
  const near = filtered.slice(0, nearCount);
  const hasMoreNear = filtered.length > nearCount;

  const scrollCats = (dir: 1 | -1) => {
    catRowRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-12">
      <div className="mx-auto max-w-[1200px] px-4 pt-5 lg:px-8">
        {/* ===== Top row: Pickup|Service toggle + location ===== */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Rounded pill toggle — neutral active fill (soft card pill on a grey
              track), never orange. Styled like the rounded search bar. */}
          <div className="inline-flex items-center rounded-full border border-border bg-surface p-1">
            {(['pickup', 'service'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  'rounded-full px-5 py-1.5 text-body-sm font-bold transition-colors',
                  mode === m
                    ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'pickup' ? 'Pickup' : 'Service'}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-sm font-semibold text-foreground transition-colors hover:bg-surface/60"
          >
            <MapPin className="h-4 w-4 text-foreground" aria-hidden="true" />
            Set location · Now
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* ===== Category row (emoji/PNG) ===== */}
        <div className="relative mb-4">
          <div ref={catRowRef} className="flex gap-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(activeCategory === c.id ? '' : c.id)}
                className="flex shrink-0 flex-col items-center gap-1.5"
              >
                <span className={cn('rounded-full', activeCategory === c.id && 'ring-2 ring-foreground')}>
                  <CategoryIcon file={c.file} label={c.label} />
                </span>
                <span className={cn('text-caption', activeCategory === c.id ? 'font-bold text-foreground' : 'font-semibold text-foreground')}>
                  {c.label}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollCats(-1)}
            aria-label="Scroll categories left"
            className="absolute left-0 top-5 hidden h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.22)] transition-transform hover:scale-105 lg:flex"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollCats(1)}
            aria-label="Scroll categories right"
            className="absolute right-0 top-5 hidden h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.22)] transition-transform hover:scale-105 lg:flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* ===== Chip filters (oval, elevated, airy, horizontal scroll) ===== */}
        <div className="relative mb-6">
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Offers — toggle */}
            <button
              type="button"
              onClick={() => setOffersOnly((v) => !v)}
              aria-pressed={offersOnly}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-body-sm font-semibold transition-colors',
                offersOnly ? 'bg-foreground text-background' : 'bg-surface text-foreground hover:bg-secondary',
              )}
            >
              Offers
            </button>

            {/* Distance — slider dropdown */}
            <button
              type="button"
              onClick={() => setOpenFilter(openFilter === 'distance' ? '' : 'distance')}
              aria-expanded={openFilter === 'distance'}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-body-sm font-semibold transition-colors',
                openFilter === 'distance' ? 'bg-foreground text-background' : 'bg-surface text-foreground hover:bg-secondary',
              )}
            >
              Within {distance} km
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Rating — working dropdown that filters */}
            <button
              type="button"
              onClick={() => setOpenFilter(openFilter === 'rating' ? '' : 'rating')}
              aria-expanded={openFilter === 'rating'}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-body-sm font-semibold transition-colors',
                minRating > 0 || openFilter === 'rating' ? 'bg-foreground text-background' : 'bg-surface text-foreground hover:bg-secondary',
              )}
            >
              <Star className="h-4 w-4" aria-hidden="true" />
              {minRating > 0 ? `${minRating.toFixed(1)}+` : 'Rating'}
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Sort — working dropdown */}
            <button
              type="button"
              onClick={() => setOpenFilter(openFilter === 'sort' ? '' : 'sort')}
              aria-expanded={openFilter === 'sort'}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-body-sm font-semibold transition-colors',
                sortBy !== 'recommended' || openFilter === 'sort' ? 'bg-foreground text-background' : 'bg-surface text-foreground hover:bg-secondary',
              )}
            >
              Sort
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Click-away backdrop for any open filter */}
          {openFilter && <div className="fixed inset-0 z-30" onClick={() => setOpenFilter('')} aria-hidden="true" />}

          {openFilter === 'distance' && (
            <FilterPopover title="Distance" onClose={() => setOpenFilter('')} onReset={() => setDistance(25)}>
              <p className="mb-2 text-body-sm font-semibold text-primary">Within {distance} km</p>
              <input type="range" min={1} max={25} step={1} value={distance} onChange={(e) => setDistance(Number(e.target.value))} className="range-orange" aria-label="Maximum distance in kilometres" />
              <div className="mt-1 flex justify-between text-caption text-muted-foreground"><span>1 km</span><span>25 km</span></div>
            </FilterPopover>
          )}

          {openFilter === 'rating' && (
            <FilterPopover title="Rating" onClose={() => setOpenFilter('')} onReset={() => setMinRating(0)}>
              <p className="mb-2 text-body-sm font-semibold text-primary">{minRating > 0 ? `Over ${minRating.toFixed(1)}` : 'Any rating'}</p>
              <input type="range" min={0} max={5} step={0.5} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="range-orange" aria-label="Minimum rating" />
              <div className="mt-1 flex justify-between text-caption text-muted-foreground"><span>Any</span><span>3+</span><span>4+</span><span>4.5+</span><span>5</span></div>
            </FilterPopover>
          )}

          {openFilter === 'sort' && (
            <FilterPopover title="Sort" onClose={() => setOpenFilter('')} onReset={() => setSortBy('recommended')}>
              <div className="flex flex-col">
                {([['recommended', 'Recommended'], ['rating', 'Rating'], ['arrival', 'Earliest arrival']] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setSortBy(val)} className="flex items-center gap-3 py-2.5 text-left">
                    <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border-2', sortBy === val ? 'border-foreground' : 'border-border')}>
                      {sortBy === val && <span className="h-2.5 w-2.5 rounded-full bg-foreground" aria-hidden="true" />}
                    </span>
                    <span className="text-body-sm font-semibold text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </FilterPopover>
          )}
        </div>

        {/* ===== Deals carousel (the one colourful area) ===== */}
        <Reveal>
          <DealsCarousel images={businesses.map((b) => b.profile_picture_url ?? '').filter(Boolean)} />
        </Reveal>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-[16px] border border-border bg-card">
                <div className="aspect-[4/3] rounded-t-[16px] bg-surface" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-3/4 rounded bg-surface" />
                  <div className="h-3 w-1/2 rounded bg-surface" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <Reveal>
              <FeaturedSection
                items={featured}
                favorites={favorites}
                onToggleFav={toggleFav}
                onOpen={(b) => router.push(`/profile/${b.username || b.id}`)}
              />
            </Reveal>
            <Reveal>
              <StoreSection title="Today's offers" items={offers} offer onOpen={(b) => router.push(`/profile/${b.username || b.id}`)} />
            </Reveal>

            {/* Stores near you — circular logos */}
            <Reveal>
            <section className="mt-12">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-heading-sm font-bold text-foreground">Stores near you</h2>
              </div>
              <div className="flex gap-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {near.map((b) => {
                  const m = storeMeta(b.id);
                  return (
                    <Link key={b.id} href={`/profile/${b.username || b.id}`} className="flex w-24 shrink-0 flex-col items-center gap-1.5 text-center">
                      <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
                        {b.profile_picture_url ? (
                          <Image src={b.profile_picture_url} alt="" width={64} height={64} className="h-full w-full object-cover" unoptimized />
                        ) : (
                          <StoreIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                        )}
                      </span>
                      <span className="line-clamp-2 text-caption font-semibold text-foreground">{b.full_name || b.username}</span>
                      <span className="text-caption text-foreground">{m.distanceKm} km · {m.pickupMin} min</span>
                    </Link>
                  );
                })}
                {near.length === 0 && <p className="py-6 text-body-sm text-muted-foreground">No businesses yet.</p>}
              </div>
              {hasMoreNear && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setNearCount((n) => n + 10)}
                    className="rounded-full border border-border bg-card px-6 py-2.5 text-body-sm font-bold text-foreground transition-colors hover:bg-surface"
                  >
                    Show more
                  </button>
                </div>
              )}
            </section>
            </Reveal>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================ Store section (horizontal cards) ============================ */
function StoreSection({
  title,
  items,
  offer,
  onOpen,
}: {
  title: string;
  items: Biz[];
  offer?: boolean;
  onOpen: (b: Biz) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => rowRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-heading-sm font-bold text-foreground">{title}</h2>
        <div className="flex items-center gap-2">
          <button type="button" className="text-body-sm font-semibold text-foreground hover:underline">See all</button>
          <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" className="hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-surface/60 lg:flex">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" className="hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-surface/60 lg:flex">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div ref={rowRef} className="flex gap-4 overflow-x-auto px-0.5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((b) => {
          const meta = storeMeta(b.id);
          return (
          <button
            key={b.id}
            type="button"
            onClick={() => onOpen(b)}
            className="shadow-soft w-64 shrink-0 overflow-hidden rounded-[24px] border border-border bg-card text-left transition-colors hover:border-foreground/30"
          >
            <div className="relative aspect-[4/3] bg-surface">
              {b.profile_picture_url ? (
                <Image src={b.profile_picture_url} alt="" fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <StoreIcon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
              {offer && (
                <span className="absolute left-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                  Offer
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-body-sm font-bold text-foreground">{b.full_name || b.username}</p>
              <div className="mt-1 flex items-center gap-1.5 text-caption text-foreground">
                <span className="inline-flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
                  {meta.rating}
                </span>
                <span className="text-muted-foreground">({meta.reviews})</span>
                <span aria-hidden="true">·</span>
                <span>{meta.distanceKm} km</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {meta.pickupMin} min
                </span>
              </div>
            </div>
          </button>
          );
        })}
      </div>
    </section>
  );
}

/* ============================ Featured section (oval logo + heart + rating) ============================ */
function FeaturedSection({
  items,
  favorites,
  onToggleFav,
  onOpen,
}: {
  items: Biz[];
  favorites: Set<string>;
  onToggleFav: (id: string) => void;
  onOpen: (b: Biz) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => rowRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-heading-sm font-bold text-foreground">Featured on Localys</h2>
        <div className="flex items-center gap-2">
          <button type="button" className="text-body-sm font-semibold text-foreground hover:underline">See all</button>
          <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" className="hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-surface/60 lg:flex">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" className="hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-surface/60 lg:flex">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div ref={rowRef} className="flex gap-4 overflow-x-auto px-0.5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((b) => {
          const meta = storeMeta(b.id);
          const name = b.full_name || b.username || 'Store';
          const fav = favorites.has(b.id);
          // Soft, heavily-rounded card — image + text live inside one rounded box
          return (
            <div key={b.id} className="shadow-soft w-64 shrink-0 overflow-hidden rounded-[24px] border border-border bg-card">
              {/* Store image (tap → store) */}
              <button
                type="button"
                onClick={() => onOpen(b)}
                aria-label={`Open ${name}`}
                className="block w-full"
              >
                <div className="relative aspect-[4/3] bg-surface">
                  {b.profile_picture_url ? (
                    <Image src={b.profile_picture_url} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <StoreIcon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )}
                </div>
              </button>
              <div className="p-3">
                {/* Name + heart */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(b)}
                    className="truncate text-body-sm font-bold text-foreground hover:underline"
                  >
                    {name}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleFav(b.id)}
                    aria-label={fav ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
                    aria-pressed={fav}
                    className="ml-auto shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Heart className={cn('h-4 w-4', fav && 'fill-primary text-primary')} aria-hidden="true" />
                  </button>
                </div>
                {/* Rating · reviews · distance */}
                <p className="mt-0.5 flex items-center gap-1 text-caption text-foreground">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
                  {meta.rating}
                  <span className="text-muted-foreground">({meta.reviews})</span>
                  <span aria-hidden="true">·</span>
                  {meta.distanceKm} km
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
