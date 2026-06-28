'use client';

import { ProductCarousel } from './ProductCarousel';
import { useHomeData, spreadProducts, cheapestPerBusiness, rankBusinessesByType } from './HomeData';

/**
 * (H) Ranked-list carousels, all derived from REAL businesses/menu items:
 *  - Top restaurants        → menu items from food businesses (ranked)
 *  - Top home services      → service offerings from service businesses
 *  - Grab nearest for cheap → cheapest item from each business, ascending
 * A list renders only if it has real items.
 */
export function RankedLists() {
  const { businesses, loading } = useHomeData();
  if (loading) return null;

  const restaurants = spreadProducts(rankBusinessesByType(businesses, 'food'), 2, 16);
  const services = spreadProducts(rankBusinessesByType(businesses, 'service'), 3, 16);
  const cheap = cheapestPerBusiness(businesses, 16);

  const lists = [
    { id: 'r1', title: 'Top restaurants near you', items: restaurants },
    { id: 'r2', title: 'Home services for less', items: services },
    { id: 'r3', title: 'Grab nearest options for cheap', items: cheap },
  ].filter((l) => l.items.length > 0);

  if (lists.length === 0) return null;

  return (
    <div className="space-y-10">
      {lists.map((list) => (
        <ProductCarousel key={list.id} title={list.title} products={list.items} />
      ))}
    </div>
  );
}
