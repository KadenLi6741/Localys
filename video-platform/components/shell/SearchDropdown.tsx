'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles } from 'lucide-react';
import { getLocalBusinesses, type LocalBusiness } from '@/lib/supabase/featured';
import { getBusinessSummary, getBusinessTags } from '@/lib/businessSummaries';
import { rankCandidates, type SearchCandidate } from '@/lib/semanticSearch';
import { FilterPanel, DEFAULT_FILTERS, type Filters } from './FilterPanel';

const FOOD_CATS = new Set(['Restaurants', 'Bakery', 'Café', 'Grocery']);
const SERVICE_CATS = new Set(['Services']);

function mapCategory(cat: string): 'food' | 'service' | 'retail' {
  if (FOOD_CATS.has(cat)) return 'food';
  if (SERVICE_CATS.has(cat)) return 'service';
  return 'retail';
}

/** A business enriched for display + ranking. */
interface Enriched extends LocalBusiness {
  summary?: string;
  tags: string[];
}

/**
 * Header search: focusing the input drops a panel with live business suggestions.
 *
 * Search is SEMANTIC — the query + candidate businesses (name, AI summary, tags,
 * a few item names) go to /api/ai-search where Gemini ranks them by intent
 * ("burger" → burger places, "spicy" → likely-spicy food). A fast keyword/tag
 * fallback (see lib/semanticSearch) runs whenever Gemini is missing, slow, or
 * errors, so results ALWAYS appear and never hang. Filters (category, price,
 * deals) are applied client-side over the same candidates.
 */
export function SearchDropdown() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const [businesses, setBusinesses] = useState<Enriched[]>([]);
  const [resultIds, setResultIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Load + enrich the candidate businesses once (cached for the session).
  useEffect(() => {
    let active = true;
    getLocalBusinesses()
      .then((list) => {
        if (!active) return;
        setBusinesses(
          list.map((b) => ({
            ...b,
            summary: getBusinessSummary(b.name),
            tags: getBusinessTags(b.name),
          }))
        );
      })
      .catch(() => {
        /* leave empty — search simply returns nothing rather than crashing */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Apply non-text filters (category / price / deals) to the candidate set.
  const filtered = useMemo(() => {
    return businesses.filter((b) => {
      if (filters.category && b.type !== mapCategory(filters.category)) return false;
      if (filters.minRating > 0 && b.rating < filters.minRating) return false;
      if (
        filters.maxPrice < DEFAULT_FILTERS.maxPrice &&
        !b.products.some((p) => p.price <= filters.maxPrice)
      )
        return false;
      if (filters.dealsOnly && !b.products.some((p) => p.deal)) return false;
      return true;
    });
  }, [businesses, filters]);

  const hasActiveFilters =
    filters.category !== '' ||
    filters.minRating > 0 ||
    filters.maxPrice < DEFAULT_FILTERS.maxPrice ||
    filters.dealsOnly;

  // Semantic (or keyword-fallback) ranking, debounced 300ms.
  useEffect(() => {
    const q = query.trim();

    if (q.length === 0) {
      // No query: list the filtered candidates (only when a filter is active).
      setResultIds(hasActiveFilters ? filtered.map((b) => b.id) : []);
      setLoading(false);
      setAiPowered(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      const candidates: SearchCandidate[] = filtered.map((b) => ({
        id: b.id,
        name: b.name,
        summary: b.summary,
        category: b.category,
        type: b.type,
        tags: b.tags,
        items: b.products.slice(0, 8).map((p) => p.title),
      }));

      const { ids, source } = await rankCandidates(q, candidates);
      if (cancelled) return;
      setResultIds(ids);
      setAiPowered(source === 'ai');
      setLoading(false);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, filtered, hasActiveFilters]);

  // Resolve ranked ids → businesses, preserving rank order.
  const results = useMemo(() => {
    const byId = new Map(filtered.map((b) => [b.id, b]));
    return resultIds.map((id) => byId.get(id)).filter((b): b is Enriched => Boolean(b));
  }, [resultIds, filtered]);

  const go = (b: Enriched) => {
    setOpen(false);
    router.push(b.href || `/profile/${b.username || b.id}`);
  };

  const showResults = loading || query.trim().length > 0 || hasActiveFilters;

  return (
    <div ref={wrapRef} className="relative flex min-w-0 flex-1 items-center">
      <Search className="pointer-events-none absolute left-4 z-10 h-5 w-5 text-black dark:text-white" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search food, deals, or try “spicy”…"
        aria-label="Search"
        aria-expanded={open}
        className="w-full rounded-full border border-border bg-card py-2.5 pl-11 pr-4 text-sm text-black dark:text-white placeholder:text-muted-foreground transition focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 text-black shadow-xl dark:border-gray-700 dark:bg-[#1A1A18] dark:text-white">
          {/* Business results */}
          {showResults && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-black dark:text-white">
                  Businesses
                </p>
                {aiPowered && !loading && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#f97316]">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI results
                  </span>
                )}
              </div>

              {loading ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">Searching…</p>
              ) : results.length > 0 ? (
                <ul className="space-y-1">
                  {results.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => go(b)}
                        className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-muted"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-sm font-bold text-black dark:text-white">
                          {b.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (b.name || '?').charAt(0).toUpperCase()
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-black dark:text-white">
                            {b.name}
                          </span>
                          {b.summary ? (
                            <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                              {b.summary}
                            </span>
                          ) : (
                            <span className="block truncate text-xs text-muted-foreground">
                              {b.category}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  {query.trim()
                    ? `No businesses match “${query.trim()}”.`
                    : 'No businesses match these filters.'}
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
