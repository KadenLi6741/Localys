'use client';

import { CarouselRow } from './CarouselRow';
import { BusinessCard } from './BusinessCard';
import { useHomeData } from './HomeData';
import type { LocalBusiness } from '@/lib/supabase/featured';

/**
 * A carousel of real business cards. `select` chooses/orders which businesses
 * to show. Renders nothing while loading or when empty.
 */
export function BusinessesRow({
  title,
  seeAllHref,
  select = (b) => b,
}: {
  title: string;
  seeAllHref?: string;
  select?: (businesses: LocalBusiness[]) => LocalBusiness[];
}) {
  const { businesses, loading } = useHomeData();
  const list = select(businesses);
  if (loading || list.length === 0) return null;
  return (
    <CarouselRow title={title} seeAllHref={seeAllHref}>
      {list.map((b) => <BusinessCard key={b.id} business={b} />)}
    </CarouselRow>
  );
}
