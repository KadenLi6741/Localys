'use client';

import Link from 'next/link';
import { Heart, Store, Utensils } from 'lucide-react';
import type { CollectionWithEntries } from '@/lib/supabase/collections';

/** Best available cover image: explicit cover → first restaurant photo → first combo photo. */
function coverFor(c: CollectionWithEntries): string | undefined {
  if (c.cover_image_url) return c.cover_image_url;
  for (const e of c.collection_entries) {
    if (e.restaurant_image_url) return e.restaurant_image_url;
    if (e.combo_image_urls[0]) return e.combo_image_urls[0];
  }
  return undefined;
}

/**
 * A curated-list card used both on the /collections grid and in the homepage
 * carousel. Pass a width class via `className` for the carousel.
 */
export function CollectionCard({
  collection,
  className = '',
}: {
  collection: CollectionWithEntries;
  className?: string;
}) {
  const cover = coverFor(collection);
  const count = collection.collection_entries.length;

  return (
    <Link
      href={`/collections/${collection.id}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-[#f97316]/40 ${className}`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full w-full place-items-center">
            <Utensils className="h-8 w-8 text-[#f97316]" />
          </span>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
          <Store className="h-3 w-3" />
          {count} {count === 1 ? 'spot' : 'spots'}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-1 text-sm font-bold text-foreground">{collection.title}</p>
        {collection.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{collection.description}</p>
        ) : null}
        <div className="mt-2 flex items-center justify-between pt-1">
          <span className="truncate text-xs text-muted-foreground">
            {collection.author_name ? `by ${collection.author_name}` : 'Localy list'}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Heart className="h-3.5 w-3.5" />
            {collection.like_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
