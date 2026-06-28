'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getLocalBusinesses, type LocalBusiness } from '@/lib/supabase/featured';
import type { Product } from '@/lib/home-data';

interface HomeDataValue {
  businesses: LocalBusiness[];
  products: Product[]; // every available menu item, across all businesses
  loading: boolean;
}

const HomeDataContext = createContext<HomeDataValue>({
  businesses: [],
  products: [],
  loading: true,
});

export const useHomeData = () => useContext(HomeDataContext);

/**
 * Fetches all real seeded businesses + menu items ONCE and shares them with
 * every home section, so the whole page renders from one source of truth.
 */
export function HomeDataProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getLocalBusinesses()
      .then((b) => { if (active) { setBusinesses(b); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const products = useMemo(() => businesses.flatMap((b) => b.products), [businesses]);

  return (
    <HomeDataContext.Provider value={{ businesses, products, loading }}>
      {children}
    </HomeDataContext.Provider>
  );
}

/* ----------------------------- selectors ----------------------------- */

/** Spread products across businesses (one per business, round-robin) for variety. */
export function spreadProducts(businesses: LocalBusiness[], perBusiness = 1, max = 16): Product[] {
  const out: Product[] = [];
  for (let i = 0; i < perBusiness; i++) {
    for (const b of businesses) {
      if (b.products[i]) out.push(b.products[i]);
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** Cheapest item from each business, ascending — "grab nearest options for cheap". */
export function cheapestPerBusiness(businesses: LocalBusiness[], max = 16): Product[] {
  return businesses
    .map((b) => b.products.slice().sort((a, c) => a.price - c.price)[0])
    .filter(Boolean)
    .sort((a, c) => a.price - c.price)
    .slice(0, max);
}

/** Businesses of a given type, ranked by rating then review count. */
export function rankBusinessesByType(businesses: LocalBusiness[], type: string): LocalBusiness[] {
  return businesses
    .filter((b) => b.type === type)
    .sort((a, c) => c.rating - a.rating || c.reviewCount - a.reviewCount || c.products.length - a.products.length);
}
