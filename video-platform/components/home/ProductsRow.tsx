'use client';

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
}: {
  title: string;
  seeAllHref?: string;
  select: (businesses: LocalBusiness[], products: Product[]) => Product[];
}) {
  const { businesses, products, loading } = useHomeData();
  const items = select(businesses, products);
  if (loading || items.length === 0) return null;
  return <ProductCarousel title={title} products={items} seeAllHref={seeAllHref} />;
}
