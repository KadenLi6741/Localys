'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Thumb } from './Thumb';
import { useHomeData } from './HomeData';
import type { LocalBusiness } from '@/lib/supabase/featured';

/**
 * (A) Walmart-style top block: ONE large featured business that auto-shifts
 * every ~5s, surrounded by a grid of smaller business tiles. All REAL seeded
 * businesses — no mock deals. Businesses with photos are preferred for the hero.
 */
export function DealsHero() {
  const { businesses, loading } = useHomeData();

  // prefer businesses that actually have a photo for the big hero slide
  const ordered = useMemo(
    () => businesses.slice().sort((a, b) => Number(!!b.image) - Number(!!a.image)),
    [businesses]
  );
  const featured = ordered.slice(0, 4);
  const surrounding = ordered.slice(4, 8);

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || featured.length === 0) return;
    const id = setInterval(() => setI((n) => (n + 1) % featured.length), 5000);
    return () => clearInterval(id);
  }, [paused, featured.length]);

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
            <AnimatePresence mode="sync">
              <motion.div
                key={current.id}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
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
            return (
              <Link
                key={biz.id}
                href={biz.href}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
              >
                <Thumb src={biz.image} label={biz.name} alt={biz.name} className="h-14 w-14 shrink-0 rounded-xl" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-black dark:text-white">{biz.name}</span>
                  <span className="block truncate text-sm font-medium text-gray-500">
                    {biz.category}{p != null ? ` · from $${p.toFixed(2)}` : ''}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
