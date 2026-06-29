'use client';

/**
 * ProductsRow — a home-page product carousel wired to the real home data.
 * Purpose: Derives which real menu items to show (via a `select` function or a pre-composed `items`
 *   array) and renders them as a ProductCarousel. Shows nothing while loading or when empty — it
 *   never falls back to placeholder products.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { ProductCarousel } from './ProductCarousel';
import { useHomeData } from './HomeData';
import type { Product } from '@/lib/home-data';
import type { LocalBusiness } from '@/lib/supabase/featured';

/**
 * A product carousel wired to the real home data. `select` derives which real
 * menu items to show from the shared business set. Renders nothing while loading
 * or when there are no products (never shows placeholders).
 */
export function ProductsRow({
  title,
  seeAllHref,
  select,
  items: itemsProp,
}: {
  title: string;
  seeAllHref?: string;
  select?: (businesses: LocalBusiness[], products: Product[]) => Product[];
  items?: Product[]; // pre-composed (themed/deduped) products from useHomeFeed
}) {
  const { businesses, products, loading } = useHomeData();
  const items = itemsProp ?? (select ? select(businesses, products) : []);
  if (loading || items.length === 0) return null;
  return <ProductCarousel title={title} products={items} seeAllHref={seeAllHref} />;
}
