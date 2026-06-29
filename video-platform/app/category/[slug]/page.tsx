'use client';

/**
 * Category page (/category/[slug]) — businesses/items within one department (e.g. Restaurants, Pets).
 * Purpose: Lists the businesses and products that belong to the chosen department slug, reusing the home
 *   BusinessCard/ProductCard components. Reached from the "Shop by department" shortcuts.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getLocalBusinesses, type LocalBusiness } from '@/lib/supabase/featured';
import { BusinessCard } from '@/components/home/BusinessCard';
import { ProductCard } from '@/components/home/ProductCard';
import type { Product } from '@/lib/home-data';

const SLUG_LABELS: Record<string, string> = {
  restaurants:    'Restaurants',
  grocery:        'Grocery',
  beauty:         'Beauty',
  'personal-care':'Personal Care',
  health:         'Health',
  flowers:        'Flowers',
  pets:           'Pets',
  'home-services':'Home Services',
  others:         'Others',
};

function filterBusinesses(businesses: LocalBusiness[], slug: string): LocalBusiness[] {
  switch (slug) {
    case 'restaurants':    return businesses.filter((b) => b.type === 'food');
    case 'grocery':        return businesses.filter((b) => ['Grocery', 'Convenience'].includes(b.category));
    case 'beauty':         return businesses.filter((b) => b.category === 'Beauty');
    case 'personal-care':  return businesses.filter((b) => b.category === 'Personal Care');
    case 'health':         return businesses.filter((b) => ['Health', 'Pharmacy'].includes(b.category));
    case 'flowers':        return businesses.filter((b) => b.category === 'Flowers');
    case 'pets':           return businesses.filter((b) => b.category === 'Pets');
    case 'home-services':  return businesses.filter((b) => b.type === 'service');
    case 'others': {
      const copy = [...businesses];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, 5);
    }
    default:
      return businesses.filter((b) => b.category.toLowerCase() === slug.toLowerCase());
  }
}

/** De-duplicate items by image URL; exclude low-res. */
function buildProducts(businesses: LocalBusiness[]): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const b of businesses) {
    for (const p of b.products) {
      if (!p.image || !p.hq) continue;
      if (seen.has(p.image)) continue;
      seen.add(p.image);
      out.push(p);
      if (out.length >= 24) return out;
    }
  }
  return out;
}

export default function CategoryPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const label = SLUG_LABELS[slug] ?? slug;
  const isOthers = slug === 'others';

  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);

  useEffect(() => {
    let active = true;
    getLocalBusinesses().then((b) => {
      if (active) { setBusinesses(b); setLoading(false); }
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => filterBusinesses(businesses, slug), [businesses, slug]);
  const products = useMemo(() => isOthers ? [] : buildProducts(filtered), [filtered, isOthers]);

  return (
    <div className="min-h-screen bg-gray-50 text-black dark:bg-[#1A1A18] dark:text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/home"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 transition hover:ring-[#f97316] dark:bg-gray-800 dark:ring-gray-700"
          >
            <ChevronLeft className="h-5 w-5 text-black dark:text-white" />
          </Link>
          <h1 className="text-2xl font-extrabold text-black dark:text-white">{label}</h1>
        </div>

        {loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No results found.</p>
        )}

        {/* Others: show random businesses as cards */}
        {isOthers && !loading && filtered.length > 0 && (
          <div>
            <h2 className="mb-4 text-base font-bold text-black dark:text-white">Businesses near you</h2>
            <div className="flex flex-wrap gap-4">
              {filtered.map((b, i) => <BusinessCard key={`${b.id}-${i}`} business={b} />)}
            </div>
          </div>
        )}

        {/* All other categories: products grid */}
        {!isOthers && !loading && products.length > 0 && (
          <div>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {products.length} item{products.length === 1 ? '' : 's'} from {filtered.length} business{filtered.length === 1 ? '' : 'es'}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {products.map((p, i) => <ProductCard key={`${p.id}-${i}`} product={p} />)}
            </div>
          </div>
        )}

        {/* Fallback: if no hq products, show businesses */}
        {!isOthers && !loading && products.length === 0 && filtered.length > 0 && (
          <div>
            <h2 className="mb-4 text-base font-bold text-black dark:text-white">Businesses</h2>
            <div className="flex flex-wrap gap-4">
              {filtered.map((b, i) => <BusinessCard key={`${b.id}-${i}`} business={b} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
