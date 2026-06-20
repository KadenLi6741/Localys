'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown, ChevronLeft, Star, MapPin, Store as StoreIcon, Heart, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

/* ============================ Categories ============================ */
// Colourful EMOJI on soft vibrant-colour tiles (Phase 3). The `icon` field holds
// the emoji for now; swapping to a PNG later is a one-line change per category
// (add `iconSrc` and render an <Image> in CategoryIcon). `color` keys the vibrant
// palette tokens in globals.css (--v-<color>-bg).
const CATEGORIES: { id: string; label: string; icon: string; color: string; type?: string }[] = [
  { id: 'grocery', label: 'Grocery', icon: '🛒', color: 'green', type: 'retail' },
  { id: 'fast-food', label: 'Fast Food', icon: '🍔', color: 'red', type: 'food' },
  { id: 'bakery', label: 'Bakery', icon: '🥐', color: 'amber', type: 'food' },
  { id: 'restaurants', label: 'Restaurants', icon: '🍽️', color: 'orange', type: 'food' },
  { id: 'flowers', label: 'Flower Shops', icon: '💐', color: 'pink', type: 'retail' },
  { id: 'services', label: 'Services', icon: '🛠️', color: 'blue', type: 'service' },
  { id: 'cafes', label: 'Cafés', icon: '☕', color: 'amber', type: 'food' },
  { id: 'clothing', label: 'Clothing', icon: '👕', color: 'purple', type: 'retail' },
  { id: 'toys', label: 'Toy Stores', icon: '🧸', color: 'pink', type: 'retail' },
  { id: 'pet', label: 'Pet', icon: '🐾', color: 'teal', type: 'retail' },
  { id: 'health', label: 'Health', icon: '❤️', color: 'red', type: 'service' },
];

// Promo deals — cycle through EXACTLY four deal colours (green/brown/amber/cream),
// each with its own thematic emoji used when no distinct business image exists.
const DEALS = [
  { id: 'd1', title: 'BOGO at The Carbon Bar BBQ', sub: 'Ends 07/19 · Terms apply', cta: 'Score the Deal', color: 'green', emoji: '🍖' },
  { id: 'd2', title: '40% off at Nomè Izakaya', sub: 'Ends 07/19 · Terms apply', cta: 'Order Now', color: 'brown', emoji: '🍶' },
  { id: 'd3', title: 'Malatang Combo at Haidilao Hot Pot', sub: 'Ends 06/29 · Terms apply', cta: 'See details', color: 'amber', emoji: '🍲' },
  { id: 'd4', title: 'Feed the crew for less this week', sub: 'Ends 07/05 · Terms apply', cta: 'Feed the Crew', color: 'cream', emoji: '🍱' },
  { id: 'd5', title: 'Sweet treats, 25% off at local cafés', sub: 'Ends 07/12 · Terms apply', cta: 'See details', color: 'green', emoji: '🧁' },
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

/* ============================ Category icon (emoji on vibrant tile) ============================ */
function CategoryIcon({ icon, color, label }: { icon: string; color: string; label: string }) {
  return (
    <span
      className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
      style={{ backgroundColor: `var(--v-${color}-bg)` }}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* ============================ Scroll reveal ============================ */
// Each block fades + rises into view once (IntersectionObserver, no React state).
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
// Shared dropdown shell for the Distance / Rating / Sort filters.
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
        <button type="button" onClick={onClose} className="rounded-full bg-primary px-5 py-2 text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">
          Apply
        </button>
      </div>
    </div>
  );
}

/* ============================ Deals carousel ============================ */
// Big colourful deal cards (vibrant palette hue per card) with a white oval CTA.
// Continuous right→left marquee via requestAnimationFrame on a duplicated track
// (seamless wrap); pauses on hover; white circular arrows nudge it manually;
// respects prefers-reduced-motion. Each card gets its OWN image (by deal index)
// or a thematic emoji fallback — clipped to the card, never bleeding/duplicated.
function DealsCarousel({ images }: { images: string[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const loop = [...DEALS, ...DEALS]; // duplicate the track for a seamless loop

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return; // no auto-scroll
    let raf = 0;
    const tick = () => {
      if (!pausedRef.current) {
        el.scrollLeft += 0.5; // gentle continuous drift (content moves left)
        const half = el.scrollWidth / 2;
        if (half > 0 && el.scrollLeft >= half) el.scrollLeft -= half; // wrap seamlessly
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const nudge = (dir: 1 | -1) => rowRef.current?.scrollBy({ left: dir * 380, behavior: 'smooth' });

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div ref={rowRef} className="flex gap-4 overflow-x-auto px-0.5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loop.map((d, i) => {
          const img = images[i % DEALS.length]; // each distinct deal → its own image slot
          return (
            <div
              key={`${d.id}-${i}`}
              style={{ backgroundColor: `var(--deal-${d.color})`, color: `var(--deal-${d.color}-fg)` }}
              className="shadow-soft relative flex h-56 w-[380px] shrink-0 overflow-hidden rounded-[24px] transition-transform duration-300 hover:-translate-y-1 sm:h-60 sm:w-[480px]"
            >
              {/* Left: title + subline + white OVAL CTA */}
              <div className="flex w-3/5 flex-col justify-between p-5">
                <div>
                  <p className="text-subheading font-bold leading-tight">{d.title}</p>
                  <p className="mt-1.5 text-body-sm opacity-80">{d.sub}</p>
                </div>
                {/* True horizontal oval pill; border+shadow keep it visible on the cream card */}
                <button
                  type="button"
                  className="inline-flex h-11 min-w-[180px] items-center justify-center rounded-full border border-black/10 bg-white px-8 text-body-sm font-bold text-black shadow-sm transition-transform hover:scale-[1.03]"
                >
                  {d.cta}
                </button>
              </div>
              {/* Right: own image (contained/clipped) or thematic emoji */}
              <div className="relative w-2/5 overflow-hidden">
                {img ? (
                  <Image src={img} alt="" fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-black/5 text-6xl" aria-hidden="true">
                    {d.emoji}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => nudge(-1)}
        aria-label="Previous deals"
        className="absolute left-1 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 sm:flex"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => nudge(1)}
        aria-label="Next deals"
        className="absolute right-1 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 sm:flex"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ============================ Store card + row ============================ */
// One reusable store card: circular logo, name + heart, ★rating · (reviews) ·
// distance · time. Used by both "Featured on Localys" and "Today's offers".
function StoreCard({
  b,
  offer,
  fav,
  onToggleFav,
  onOpen,
}: {
  b: Biz;
  offer?: boolean;
  fav?: boolean;
  onToggleFav?: (id: string) => void;
  onOpen: (b: Biz) => void;
}) {
  const meta = storeMeta(b.id);
  const name = b.full_name || b.username || 'Store';
  return (
    <div className="shadow-soft w-56 shrink-0 rounded-[20px] border border-border bg-card p-4 text-center">
      <div className="relative mx-auto w-fit">
        {offer && (
          <span className="absolute -left-1 -top-1 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            Offer
          </span>
        )}
        <button
          type="button"
          onClick={() => onOpen(b)}
          aria-label={`Open ${name}`}
          className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-surface"
        >
          {b.profile_picture_url ? (
            <Image src={b.profile_picture_url} alt="" width={96} height={96} className="h-full w-full object-cover" unoptimized />
          ) : (
            <StoreIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        <button type="button" onClick={() => onOpen(b)} className="truncate text-body-sm font-bold text-foreground hover:underline">
          {name}
        </button>
        {onToggleFav && (
          <button
            type="button"
            onClick={() => onToggleFav(b.id)}
            aria-pressed={fav}
            aria-label={fav ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-primary"
          >
            <Heart className={cn('h-4 w-4', fav && 'fill-primary text-primary')} aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 text-caption text-foreground">
        <span className="inline-flex items-center gap-0.5">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
          {meta.rating}
        </span>
        <span className="text-muted-foreground">({meta.reviews})</span>
        <span aria-hidden="true">·</span>
        {meta.distanceKm} km
        <span aria-hidden="true">·</span>
        {meta.pickupMin} min
      </p>
    </div>
  );
}

function StoreRow({
  title,
  items,
  favorites,
  onToggleFav,
  onOpen,
  offer,
}: {
  title: string;
  items: Biz[];
  favorites?: Set<string>;
  onToggleFav?: (id: string) => void;
  onOpen: (b: Biz) => void;
  offer?: boolean;
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
        {items.map((b) => (
          <StoreCard key={b.id} b={b} offer={offer} fav={favorites?.has(b.id)} onToggleFav={onToggleFav} onOpen={onOpen} />
        ))}
      </div>
    </section>
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
  const [distance, setDistance] = useState(5);
  const [offersOnly, setOffersOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'arrival'>('recommended');
  const [nearCount, setNearCount] = useState(10);

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

  // Category type + Pickup/Service mode + the Rating filter, then sort.
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

  const open = (b: Biz) => router.push(`/profile/${b.username || b.id}`);
  const scrollCats = (dir: 1 | -1) => catRowRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-12">
      <div className="mx-auto max-w-[1280px] px-4 pt-6 lg:px-8">
        {/* ===== Pickup|Service toggle + location ===== */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Rounded pill toggle — neutral active fill (never orange). */}
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

        {/* ===== Category row (emoji tiles) ===== */}
        <div className="relative mb-6">
          <div ref={catRowRef} className="flex gap-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(activeCategory === c.id ? '' : c.id)}
                className="flex shrink-0 flex-col items-center gap-1.5"
              >
                <span className={cn('rounded-full', activeCategory === c.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}>
                  <CategoryIcon icon={c.icon} color={c.color} label={c.label} />
                </span>
                <span className={cn('text-caption font-semibold', activeCategory === c.id ? 'text-primary' : 'text-foreground')}>
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

        {/* ===== Filter pills ===== */}
        <div className="relative mb-8">
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                    <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border-2', sortBy === val ? 'border-primary' : 'border-border')}>
                      {sortBy === val && <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />}
                    </span>
                    <span className="text-body-sm font-semibold text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </FilterPopover>
          )}
        </div>

        {/* ===== Deals carousel ===== */}
        <Reveal>
          <DealsCarousel images={businesses.map((b) => b.profile_picture_url ?? '').filter(Boolean)} />
        </Reveal>

        {loading ? (
          <div className="mt-12 flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-56 shrink-0 animate-pulse rounded-[20px] border border-border bg-card p-4">
                <div className="mx-auto h-24 w-24 rounded-full bg-surface" />
                <div className="mx-auto mt-3 h-4 w-2/3 rounded bg-surface" />
                <div className="mx-auto mt-2 h-3 w-1/2 rounded bg-surface" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <Reveal>
              <StoreRow title="Featured on Localys" items={featured} favorites={favorites} onToggleFav={toggleFav} onOpen={open} />
            </Reveal>
            <Reveal>
              <StoreRow title="Today's offers" items={offers} favorites={favorites} onToggleFav={toggleFav} offer onOpen={open} />
            </Reveal>

            {/* Stores near you — compact circular logos + Show more */}
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
                  <div className="mt-6 flex justify-center">
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
