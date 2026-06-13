'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSearchHistory,
  deleteSearchHistoryEntry,
  clearSearchHistory,
  getAutoSuggestions,
} from '@/lib/supabase/searchHistory';
import type { SearchHistoryEntry, AutoSuggestResult } from '@/models/SearchHistory';

interface SearchOverlayProps {
  /** Current search input value */
  query: string;
  /** Current search mode */
  searchMode: 'businesses' | 'videos';
  /** Whether the search input is focused */
  isOpen: boolean;
  /** Called when user selects a history item or suggestion */
  onSelect: (value: string, type?: 'business' | 'category' | 'deal') => void;
  /** Called to close the overlay */
  onClose: () => void;
}

export function SearchOverlay({ query, searchMode, isOpen, onSelect, onClose }: SearchOverlayProps) {
  const { user } = useAuth();
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [suggestions, setSuggestions] = useState<AutoSuggestResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load search history when overlay opens
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;

    const loadHistory = async () => {
      setLoadingHistory(true);
      const { data } = await getSearchHistory(user.id, searchMode);
      if (!cancelled) {
        setHistory(data);
        setLoadingHistory(false);
      }
    };

    loadHistory();
    return () => { cancelled = true; };
  }, [isOpen, user, searchMode]);

  // Debounced auto-suggest as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      const { data } = await getAutoSuggestions(query.trim());
      setSuggestions(data);
      setLoadingSuggestions(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleDeleteEntry = useCallback(async (entryId: string) => {
    if (!user) return;
    await deleteSearchHistoryEntry(entryId, user.id);
    setHistory(prev => prev.filter(h => h.id !== entryId));
  }, [user]);

  const handleClearAll = useCallback(async () => {
    if (!user) return;
    await clearSearchHistory(user.id);
    setHistory([]);
  }, [user]);

  if (!isOpen) return null;

  const showSuggestions = query.trim().length >= 2 && suggestions.length > 0;
  const showHistory = !query.trim() && history.length > 0;

  if (!showSuggestions && !showHistory && !loadingSuggestions) return null;

  return (
    <div
      ref={overlayRef}
      className="absolute top-full left-0 right-0 z-50 mt-1 bg-[var(--surface-1)] border border-[var(--border-color)] rounded-lg shadow-xl overflow-hidden"
    >
      {/* Auto-Suggest Results */}
      {showSuggestions && (
        <div className="py-2">
          <p className="px-4 py-1 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
            Suggestions
          </p>
          {suggestions.map((s, i) => (
            <button
              key={`${s.type}-${s.value}-${i}`}
              onClick={() => {
                onSelect(s.type === 'business' ? s.label : s.value, s.type);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors text-left"
            >
              {/* Icon per type */}
              {s.type === 'business' && s.imageUrl ? (
                <img src={s.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  s.type === 'business' ? 'bg-blue-500/20 text-blue-500' :
                  s.type === 'category' ? 'bg-green-500/20 text-green-500' :
                  'bg-yellow-500/20 text-yellow-500'
                }`}>
                  {s.type === 'business' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                  {s.type === 'category' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  )}
                  {s.type === 'deal' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{s.label}</p>
                {s.detail && (
                  <p className="text-xs text-[var(--muted-foreground)]">{s.detail}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator for suggestions */}
      {query.trim().length >= 2 && loadingSuggestions && (
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary)]" />
          <span className="text-xs text-[var(--muted-foreground)]">Searching...</span>
        </div>
      )}

      {/* Search History */}
      {showHistory && (
        <div className="py-2">
          <div className="flex items-center justify-between px-4 py-1">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Recent Searches
            </p>
            <button
              onClick={handleClearAll}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              Clear all
            </button>
          </div>
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors group"
            >
              <svg className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <button
                onClick={() => {
                  onSelect(entry.search_query);
                  onClose();
                }}
                className="flex-1 text-left text-sm text-[var(--text-primary)] truncate"
              >
                {entry.search_query}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteEntry(entry.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--surface-1)] rounded transition-all"
                aria-label="Remove from history"
              >
                <svg className="w-3.5 h-3.5 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
