'use client';

import { useEffect, useState } from 'react';
import { CarouselRow } from './CarouselRow';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { getPostedCollections, type CollectionWithEntries } from '@/lib/supabase/collections';

/**
 * Homepage row of community-curated lists posted by users. Renders nothing while
 * loading or when no list has been posted (demo-safe — empty on any error).
 */
export function CuratedCollections() {
  const [lists, setLists] = useState<CollectionWithEntries[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getPostedCollections(12).then((c) => { if (active) { setLists(c); setLoaded(true); } });
    return () => { active = false; };
  }, []);

  if (!loaded || lists.length === 0) return null;

  return (
    <CarouselRow title="Local picks & combos" seeAllHref="/collections">
      {lists.map((c) => (
        <CollectionCard key={c.id} collection={c} className="w-[220px] shrink-0 sm:w-[260px]" />
      ))}
    </CarouselRow>
  );
}
