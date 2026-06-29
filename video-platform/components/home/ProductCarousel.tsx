/**
 * ProductCarousel — a titled CarouselRow pre-filled with ProductCards.
 * Purpose: Convenience wrapper so home sections can render a labelled, scrollable row of products
 *   from a single array prop, instead of wiring up CarouselRow + ProductCard each time.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { CarouselRow } from './CarouselRow';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/home-data';

/**
 * Thin wrapper: a titled CarouselRow filled with ProductCards.
 * Powers sections B (Deals & more), E (Trending), G (Other businesses) and
 * every H (Ranked list).
 */
export function ProductCarousel({
  title,
  products,
  seeAllHref,
}: {
  title: string;
  products: Product[];
  seeAllHref?: string;
}) {
  return (
    <CarouselRow title={title} seeAllHref={seeAllHref}>
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </CarouselRow>
  );
}
