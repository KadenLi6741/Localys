'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { FilterPanel, DEFAULT_FILTERS, type Filters } from './FilterPanel';

interface Suggestion {
  id: string;
  username?: string | null;
  full_name?: string | null;
  type?: string | null;
}

/**
 * Header search: focusing the input drops a panel with live business/username
 * suggestions (substring match) + the reusable FilterPanel. Selecting a
 * suggestion opens that business profile. Replaces the deleted /search page.
 */
export function SearchDropdown() {
  const router = useRouter();
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

  // Live substring search on businesses (username + full_name), debounced.
  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, type')
        .in('type', ['food', 'retail', 'service'])
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(6);
      setResults((data as Suggestion[]) ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const go = (s: Suggestion) => {
    setOpen(false);
    router.push(`/profile/${s.username || s.id}`);
  };

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
        className="w-full rounded-full border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-sm text-black placeholder-gray-500 transition focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {/* Suggestions */}
          {query.trim().length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-black dark:text-white">Businesses</p>
              {loading ? (
                <p className="px-1 py-2 text-sm text-black dark:text-white">Searching…</p>
              ) : results.length > 0 ? (
                <ul className="space-y-1">
                  {results.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => go(s)}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 text-sm font-bold text-black dark:bg-gray-800 dark:text-white">
                          {(s.full_name || s.username || '?').charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-black dark:text-white">{s.full_name || s.username}</span>
                          {s.username && <span className="block truncate text-xs text-black dark:text-white">@{s.username}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-1 py-2 text-sm text-black dark:text-white">No businesses match “{query.trim()}”.</p>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-black dark:text-white">Filters</p>
            <FilterPanel value={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />
          </div>
        </div>
      )}
    </div>
  );
}
