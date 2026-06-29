'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { haversineDistance } from '@/lib/utils/geo';
import { useDeliveryLocation } from '@/contexts/DeliveryLocationContext';
import { FilterPanel, DEFAULT_FILTERS, type Filters } from './FilterPanel';

interface Suggestion {
  id: string;
  username?: string | null;
  full_name?: string | null;
  type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const FOOD_CATS = new Set(['Restaurants', 'Bakery', 'Café', 'Grocery']);
const SERVICE_CATS = new Set(['Services']);

function mapCategory(cat: string): string {
  if (FOOD_CATS.has(cat)) return 'food';
  if (SERVICE_CATS.has(cat)) return 'service';
  return 'retail';
}

/**
 * Header search: focusing the input drops a panel with live business/username
 * suggestions filtered by query + active filters. Selecting a suggestion opens
 * that business profile. Filters: category, max distance, max price, deals only.
 */
export function SearchDropdown() {
  const router = useRouter();
  const { location } = useDeliveryLocation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Live search + filter logic, debounced 300ms.
  useEffect(() => {
    const q = query.trim();
    const hasActiveFilters =
      filters.category !== '' ||
      filters.maxPrice < DEFAULT_FILTERS.maxPrice ||
      filters.dealsOnly ||
      filters.maxDistanceKm < DEFAULT_FILTERS.maxDistanceKm;

    if (q.length === 0 && !hasActiveFilters) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const t = setTimeout(async () => {
      // Category → Supabase type
      const types = filters.category
        ? [mapCategory(filters.category)]
        : ['food', 'retail', 'service'];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let dbQ: any = supabase
        .from('profiles')
        .select('id, username, full_name, type, latitude, longitude')
        .in('type', types);

      if (q) {
        // Sanitize before interpolating into the PostgREST `.or()` filter: strip
        // characters that are syntactically meaningful there (commas, parens, and
        // the % wildcard) so odd input can't break the query or error out.
        const safeQ = q.replace(/[%,()*\\]/g, ' ').trim();
        if (safeQ) {
          dbQ = dbQ.or(`username.ilike.%${safeQ}%,full_name.ilike.%${safeQ}%`);
        }
      }

      const { data } = await dbQ.limit(30);
      let suggestions = (data as Suggestion[]) ?? [];

      // Distance filter (client-side haversine — requires user location)
      if (location && filters.maxDistanceKm < 50) {
        suggestions = suggestions.filter((s) => {
          if (s.latitude == null || s.longitude == null) return true;
          return (
            haversineDistance(location.lat, location.lng, s.latitude, s.longitude) <=
            filters.maxDistanceKm
          );
        });
      }

      // Max price — keep businesses that have at least one item ≤ maxPrice
      if (filters.maxPrice < DEFAULT_FILTERS.maxPrice && suggestions.length > 0) {
        const ids = suggestions.map((s) => s.id);
        const { data: items } = await supabase
          .from('menu_items')
          .select('user_id')
          .in('user_id', ids)
          .lte('price', filters.maxPrice)
          .limit(500);
        const bizWithItems = new Set(
          (items ?? []).map((i: { user_id: string }) => i.user_id)
        );
        if (bizWithItems.size > 0) {
          suggestions = suggestions.filter((s) => bizWithItems.has(s.id));
        }
      }

      // Deals only — keep businesses with at least one active promo code
      if (filters.dealsOnly && suggestions.length > 0) {
        const ids = suggestions.map((s) => s.id);
        const { data: promos } = await supabase
          .from('promo_codes')
          .select('seller_id')
          .in('seller_id', ids)
          .eq('is_active', true);
        const withDeals = new Set(
          (promos ?? []).map((p: { seller_id: string }) => p.seller_id)
        );
        if (withDeals.size > 0) {
          suggestions = suggestions.filter((s) => withDeals.has(s.id));
        }
      }

      setResults(suggestions);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, filters, location]);

  const go = (s: Suggestion) => {
    setOpen(false);
    router.push(`/profile/${s.username || s.id}`);
  };

  const showResults = loading || results.length > 0 || query.trim().length > 0;

  return (
    <div ref={wrapRef} className="relative flex min-w-0 flex-1 items-center">
      <Search className="pointer-events-none absolute left-4 z-10 h-5 w-5 text-black dark:text-white" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search local businesses, deals, food…"
        aria-label="Search"
        aria-expanded={open}
        className="w-full rounded-full border border-border bg-card py-2.5 pl-11 pr-4 text-sm text-black dark:text-white placeholder:text-muted-foreground transition focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 text-black shadow-xl dark:border-gray-700 dark:bg-[#1A1A18] dark:text-white">
          {/* Business results */}
          {showResults && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-black dark:text-white">
                Businesses
              </p>
              {loading ? (
                <p className="px-1 py-2 text-sm text-black dark:text-white">Searching…</p>
              ) : results.length > 0 ? (
                <ul className="space-y-1">
                  {results.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => go(s)}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-muted"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold text-black dark:text-white">
                          {(s.full_name || s.username || '?').charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-black dark:text-white">
                            {s.full_name || s.username}
                          </span>
                          {s.username && (
                            <span className="block truncate text-xs text-muted-foreground">
                              @{s.username}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-1 py-2 text-sm text-black dark:text-white">
                  No businesses match &quot;{query.trim()}&quot;.
                </p>
              )}
            </div>
          )}

          {/* Filters */}
          <div className={`pt-4 ${showResults ? 'border-t border-border' : ''}`}>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-black dark:text-white">
              Filters
            </p>
            <FilterPanel
              value={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
