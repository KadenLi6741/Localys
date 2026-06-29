'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { getLocalBusinesses, type LocalBusiness } from '@/lib/supabase/featured';
import { BusinessCard } from '@/components/home/BusinessCard';
import { ProductCard } from '@/components/home/ProductCard';
import type { Product } from '@/lib/home-data';
import { useAllergens } from '@/contexts/AllergenContext';
import { allergenLabel } from '@/lib/allergens';

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

  const { userAllergies, hideEnabled, setHideEnabled, matchedAllergens } = useAllergens();

  const categoryFiltered = useMemo(() => filterBusinesses(businesses, slug), [businesses, slug]);

  // Map each business → the user's allergens it contains (for badges + hiding).
  const bizMatches = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const b of categoryFiltered) m.set(b.id, matchedAllergens(b));
    return m;
  }, [categoryFiltered, matchedAllergens]);

  // When the hide filter is on, drop businesses that contain a user allergen.
  const filtered = useMemo(
    () => (hideEnabled ? categoryFiltered.filter((b) => (bizMatches.get(b.id) ?? []).length === 0) : categoryFiltered),
    [categoryFiltered, hideEnabled, bizMatches],
  );
  const hiddenCount = categoryFiltered.length - filtered.length;

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

        {/* Allergen filter — shown when the user has set allergies in Settings. */}
        {userAllergies.length > 0 && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" strokeWidth={2.5} />
                <span className="text-sm font-semibold text-black dark:text-white">Your allergens:</span>
                {userAllergies.map((k) => (
                  <span key={k} className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    {allergenLabel(k)}
                  </span>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-black dark:text-white">
                Hide restaurants with my allergens
                <input
                  type="checkbox"
                  checked={hideEnabled}
                  onChange={(e) => setHideEnabled(e.target.checked)}
                  className="h-4 w-4 accent-[#f97316]"
                />
              </label>
            </div>
            {hideEnabled && hiddenCount > 0 && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {hiddenCount} {hiddenCount === 1 ? 'business' : 'businesses'} hidden because they contain your allergens.
              </p>
            )}
            <p className="mt-2 text-[11px] leading-snug text-gray-400 dark:text-gray-500">
              Allergen info is a best-effort guide from menu data — always confirm with the restaurant before ordering.
            </p>
          </div>
        )}

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
              {products.map((p, i) => <ProductCard key={`${p.id}-${i}`} product={p} allergens={bizMatches.get(p.businessId) ?? []} />)}
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
