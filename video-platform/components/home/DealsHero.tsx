'use client';

/**
 * DealsHero — the large auto-rotating "Featured near you" hero block at the top of the home page.
 * Purpose: Spotlights local businesses: one big slide auto-advances every ~5s (pauses on hover),
 *   flanked by smaller business tiles with quick-add buttons. Uses the shared feed's reserved hero
 *   set so its photos are unique and never repeat in rows below.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
import { Thumb } from './Thumb';
import { useHomeData, useHomeFeed } from './HomeData';
import type { LocalBusiness } from '@/lib/supabase/featured';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

/** How long each hero slide stays before auto-advancing (ms). Easy to tune. */
const CAROUSEL_INTERVAL_MS = 5000;

/**
 * Duration of the "Featured near you" slide/intro animation (seconds). Lower =
 * faster & snappier on load. Single source of truth — tune here.
 */
const FEATURED_ANIM_DURATION_S = 0.28;

/**
 * (A) Walmart-style top block: ONE large featured business that auto-shifts
 * every ~5s, surrounded by a grid of smaller business tiles. Uses the shared
 * feed's reserved hero set, so its photos are unique and not repeated below.
 */
export function DealsHero() {
  const { loading } = useHomeData();
  const { heroBusinesses } = useHomeFeed();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [addedId, setAddedId] = useState<string | null>(null);

  const featured = heroBusinesses.slice(0, 4);
  const surrounding = heroBusinesses.slice(4, 8);

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  // Keep a ref to featured.length so the interval callback always sees the
  // current length without needing to restart the timer when data loads.
  const featuredLenRef = useRef(featured.length);
  featuredLenRef.current = featured.length;

  // Quick-add a business's cheapest item to the cart from a hero tile, with brief "Added" feedback.
  const handleAdd = (e: React.MouseEvent, biz: LocalBusiness) => {
    e.preventDefault();
    const cheapest = biz.products.length
      ? biz.products.slice().sort((a, b) => a.price - b.price)[0]
      : null;
    if (!cheapest) return;
    addToCart({
      itemId: cheapest.id,
      itemName: cheapest.title,
      itemPrice: cheapest.price,
      itemImage: cheapest.image,
      sellerId: biz.id,
      buyerId: user?.id ?? 'guest',
      quantity: 1,
    });
    setAddedId(biz.id);
    window.setTimeout(() => setAddedId(null), 1200);
  };

  // Restart the interval only when paused changes — not when more data loads —
  // so the timing stays consistent once the carousel first appears.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const len = featuredLenRef.current;
      if (len > 0) setI((n) => (n + 1) % len);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused]);

  if (loading || featured.length === 0) return null;

  const current = featured[i % featured.length];
  const fromPrice = (b: LocalBusiness) =>
    b.products.length ? b.products.slice().sort((x, y) => x.price - y.price)[0].price : null;
  const price = fromPrice(current);

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-[#f97316] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Local</span>
        <h2 className="text-xl font-bold text-black dark:text-white sm:text-2xl">Featured near you</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Big featured shifting business */}
        <div
          className="relative overflow-hidden rounded-3xl bg-gray-100 dark:bg-gray-800 lg:col-span-2"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="relative aspect-[16/9] w-full lg:aspect-[2/1]">
            {/* initial (default true) lets the first slide animate in immediately on load. */}
            <AnimatePresence mode="sync">
              <motion.div
                key={current.id}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: FEATURED_ANIM_DURATION_S, ease: [0.65, 0, 0.35, 1] }}
                className="absolute inset-0"
              >
                <Link href={current.href} className="block h-full w-full">
                  <Thumb src={current.image} label={current.name} alt={current.name} className="h-full w-full" />
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="absolute bottom-0 left-0 p-6 sm:p-8">
                    <span className="inline-block rounded-full bg-[#f97316] px-3 py-1 text-sm font-bold text-white">
                      {current.category}{price != null ? ` · from $${price.toFixed(2)}` : ''}
                    </span>
                    <h3 className="mt-3 text-2xl font-extrabold text-white sm:text-4xl">{current.name}</h3>
                  </div>
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute bottom-3 right-4 z-10 flex items-center gap-2">
            {featured.map((_, n) => (
              <button
                key={n}
                type="button"
                aria-label={`Featured business ${n + 1}`}
                onClick={() => setI(n)}
                className={`h-2 rounded-full transition-all ${n === i % featured.length ? 'w-6 bg-[#f97316]' : 'w-2 bg-white/70'}`}
              />
            ))}
          </div>
        </div>

        {/* Surrounding business tiles */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          {surrounding.map((biz) => {
            const p = fromPrice(biz);
            const isAdded = addedId === biz.id;
            return (
              <div key={biz.id} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
                <Link href={biz.href} className="shrink-0">
                  <Thumb src={biz.image} label={biz.name} alt={biz.name} className="h-14 w-14 rounded-xl" />
                </Link>
                <span className="min-w-0 flex-1">
                  <Link href={biz.href} className="block truncate font-semibold text-black dark:text-white hover:underline">{biz.name}</Link>
                  <span className="block truncate text-sm font-medium text-gray-500">
                    {biz.category}{p != null ? ` · from $${p.toFixed(2)}` : ''}
                  </span>
                </span>
                {biz.products.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => handleAdd(e, biz)}
                    className={`ml-auto shrink-0 inline-flex items-center gap-1 rounded-full border border-[#f97316] px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                      isAdded ? 'add-to-cart-pulse bg-[#f97316] text-white' : 'text-[#f97316] hover:bg-[#f97316] hover:text-white'
                    }`}
                  >
                    {isAdded ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />}
                    {isAdded ? 'Added' : 'Add'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
