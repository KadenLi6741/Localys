'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Search, Check, Plus } from 'lucide-react';
import { getLocalBusinesses, type LocalBusiness } from '@/lib/supabase/featured';

export interface PickedRestaurant {
  store_slug: string;
  restaurant_name: string;
  restaurant_image_url: string | null;
}

/**
 * Modal to search the real seeded businesses and add one (or more) to a list.
 * Restaurants already in the list are shown as added (disabled).
 */
export function RestaurantPicker({
  existingSlugs,
  onPick,
  onClose,
}: {
  existingSlugs: string[];
  onPick: (r: PickedRestaurant) => void;
  onClose: () => void;
}) {
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const existing = useMemo(() => new Set(existingSlugs), [existingSlugs]);

  useEffect(() => {
    let active = true;
    getLocalBusinesses()
      .then((b) => { if (active) { setBusinesses(b); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? businesses.filter((b) => b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q))
      : businesses;
    return list.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [businesses, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-popover text-popover-foreground shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-bold text-foreground">Add a restaurant</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground transition hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurants & businesses"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No matches.</p>
          ) : (
            results.map((b) => {
              const added = existing.has(b.slug);
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={added}
                  onClick={() =>
                    onPick({ store_slug: b.slug, restaurant_name: b.name, restaurant_image_url: b.image ?? null })
                  }
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                    added ? 'opacity-50' : 'hover:bg-muted'
                  }`}
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {b.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{b.category}</p>
                  </div>
                  {added ? (
                    <Check className="h-5 w-5 shrink-0 text-[#f97316]" />
                  ) : (
                    <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
