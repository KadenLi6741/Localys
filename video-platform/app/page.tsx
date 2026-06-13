'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown, ChevronLeft, Star, MapPin, Store as StoreIcon } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

/* ============================ Categories ============================ */
// Icons are PNGs the user adds under /public/categories/. Each has an emoji
// fallback so the row never renders blank if a file is missing.
const CATEGORIES: { id: string; label: string; file: string; emoji: string; type?: string }[] = [
  { id: 'grocery', label: 'Grocery', file: 'grocery.png', emoji: '🍌', type: 'retail' },
  { id: 'fast-food', label: 'Fast Food', file: 'fastfood.png', emoji: '🍕', type: 'food' },
  { id: 'bakery', label: 'Bakery', file: 'bakery.png', emoji: '🥐', type: 'food' },
  { id: 'restaurants', label: 'Restaurants', file: 'restaurants.png', emoji: '🍲', type: 'food' },
  { id: 'flowers', label: 'Flower Shops', file: 'flowers.png', emoji: '🌸', type: 'retail' },
  { id: 'services', label: 'Services', file: 'services.png', emoji: '🛠️', type: 'service' },
  { id: 'cafes', label: 'Cafés', file: 'cafes.png', emoji: '☕', type: 'food' },
  { id: 'clothing', label: 'Clothing', file: 'clothing.png', emoji: '🧥', type: 'retail' },
  { id: 'toys', label: 'Toy Stores', file: 'toys.png', emoji: '🧸', type: 'retail' },
  { id: 'pet', label: 'Pet', file: 'pet.png', emoji: '🐾', type: 'retail' },
  { id: 'health', label: 'Health', file: 'health.png', emoji: '🩺', type: 'service' },
];

const DEALS = [
  { id: 'd1', title: '40% off your first pickup order', sub: 'Ends 06/29 · Terms apply' },
  { id: 'd2', title: 'BOGO coffee at local cafés', sub: 'Ends 07/19 · Terms apply' },
  { id: 'd3', title: 'Free add-on at participating shops', sub: 'Ends 06/29 · Terms apply' },
];

interface Biz {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_picture_url: string | null;
  type: string | null;
}

/* ============================ Category icon (PNG → emoji fallback) ============================ */
function CategoryIcon({ file, emoji, label }: { file: string; emoji: string; label: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-surface">
      {failed ? (
        <span className="text-2xl" aria-hidden="true">{emoji}</span>
      ) : (
        <Image
          src={`/categories/${file}`}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
          onError={() => setFailed(true)}
          unoptimized
        />
      )}
      <span className="sr-only">{label}</span>
    </span>
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

  // Filter by the active category's business type + the Pickup/Service mode.
  const filtered = useMemo(() => {
    let list = businesses;
    if (mode === 'service') list = list.filter((b) => b.type === 'service');
    const cat = CATEGORIES.find((c) => c.id === activeCategory);
    if (cat?.type) list = list.filter((b) => b.type === cat.type);
    return list;
  }, [businesses, mode, activeCategory]);

  const featured = filtered.slice(0, 8);
  const offers = filtered.slice(2, 10);
  const near = filtered.slice(0, 10);

  const scrollCats = (dir: 1 | -1) => {
    catRowRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-12">
      <div className="mx-auto max-w-[1200px] px-4 pt-5 lg:px-8">
        {/* ===== Top row: Pickup|Service toggle + location ===== */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setMode('pickup')}
              className={cn(
                'rounded-full px-5 py-1.5 text-body-sm font-bold transition-colors',
                mode === 'pickup' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-surface/60',
              )}
            >
              Pickup
            </button>
            <button
              type="button"
              onClick={() => setMode('service')}
              className={cn(
                'rounded-full px-5 py-1.5 text-body-sm font-bold transition-colors',
                mode === 'service' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-surface/60',
              )}
            >
              Service
            </button>
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
                <span className={cn('rounded-full', activeCategory === c.id && 'ring-2 ring-primary')}>
                  <CategoryIcon file={c.file} emoji={c.emoji} label={c.label} />
                </span>
                <span className={cn('text-caption font-semibold', activeCategory === c.id ? 'text-primary' : 'text-foreground')}>
                  {c.label}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollCats(1)}
            aria-label="Scroll categories"
            className="absolute right-0 top-6 hidden h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-surface/60 lg:flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* ===== Chip filters ===== */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['Offers', 'Distance', 'Rating', 'Sort'].map((chip) => (
            <button
              key={chip}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-border px-3.5 py-1.5 text-caption font-semibold text-foreground transition-colors hover:bg-surface/60"
            >
              {chip}
              {(chip === 'Distance' || chip === 'Rating' || chip === 'Sort') && <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          ))}
        </div>

        {/* ===== Deals carousel ===== */}
        <div className="mb-8 flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DEALS.map((d) => (
            <div
              key={d.id}
              className="flex min-w-[280px] flex-1 flex-col justify-between rounded-[12px] bg-primary p-4 text-primary-foreground"
            >
              <p className="text-body font-bold leading-snug">{d.title}</p>
              <p className="mt-1 text-caption opacity-90">{d.sub}</p>
              <span className="mt-3 w-fit rounded-full bg-primary-foreground/15 px-3 py-1 text-caption font-bold">
                Score the Deal
              </span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-[12px] border border-border bg-card">
                <div className="aspect-[4/3] rounded-t-[12px] bg-surface" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-3/4 rounded bg-surface" />
                  <div className="h-3 w-1/2 rounded bg-surface" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <StoreSection title="Featured on Localys" items={featured} mode={mode} onOpen={(b) => router.push(`/profile/${b.username || b.id}`)} />
            <StoreSection title="Today's offers" items={offers} mode={mode} offer onOpen={(b) => router.push(`/profile/${b.username || b.id}`)} />

            {/* Stores near you — circular logos */}
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-subheading font-bold text-foreground">Stores near you</h2>
              </div>
              <div className="flex gap-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {near.map((b) => (
                  <Link key={b.id} href={`/profile/${b.username || b.id}`} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center">
                    <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
                      {b.profile_picture_url ? (
                        <Image src={b.profile_picture_url} alt="" width={64} height={64} className="h-full w-full object-cover" unoptimized />
                      ) : (
                        <StoreIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                      )}
                    </span>
                    <span className="line-clamp-2 text-caption font-semibold text-foreground">{b.full_name || b.username}</span>
                  </Link>
                ))}
                {near.length === 0 && <p className="py-6 text-body-sm text-muted-foreground">No businesses yet.</p>}
              </div>
            </section>
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
  mode,
  offer,
  onOpen,
}: {
  title: string;
  items: Biz[];
  mode: 'pickup' | 'service';
  offer?: boolean;
  onOpen: (b: Biz) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => rowRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });

  if (items.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-subheading font-bold text-foreground">{title}</h2>
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
      <div ref={rowRef} className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onOpen(b)}
            className="w-64 shrink-0 overflow-hidden rounded-[12px] border border-border bg-card text-left transition-colors hover:border-primary"
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
                <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  Offer
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-body-sm font-bold text-foreground">{b.full_name || b.username}</p>
              <div className="mt-1 flex items-center gap-2 text-caption text-foreground">
                <span className="inline-flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
                  New
                </span>
                <span>·</span>
                <span>{mode === 'service' ? 'On-site service' : 'Pickup'}</span>
                {b.type && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{b.type}</span>
                  </>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
