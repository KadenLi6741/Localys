'use client';

/**
 * Allergen filtering state, shared app-wide.
 *
 * - Loads the signed-in user's allergies from Supabase (falls back to a
 *   localStorage cache when signed out / offline) and the curated per-store
 *   allergen tags.
 * - Resolves each business's allergens: curated (DB → bundled fallback) first,
 *   else best-effort detection from its menu item names.
 * - `hideEnabled` (persisted) drives the "Hide restaurants with my allergens"
 *   filter; `matchedAllergens()` drives the warning badges shown on cards.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { CURATED_STORE_ALLERGENS, detectAllergens, type AllergenKey } from '@/lib/allergens';
import {
  getCuratedStoreAllergens,
  getUserAllergies,
  setUserAllergies as persistUserAllergies,
} from '@/lib/supabase/allergens';
import type { LocalBusiness } from '@/lib/supabase/featured';

const ALLERGIES_CACHE_KEY = 'localy-allergies';
const HIDE_KEY = 'localy-allergen-hide';

interface AllergenContextValue {
  /** The user's selected allergen keys. */
  userAllergies: string[];
  /** Replace the user's allergies (persists to Supabase + local cache). */
  setUserAllergies: (keys: string[]) => Promise<void>;
  /** Whether to hide restaurants that contain the user's allergens. */
  hideEnabled: boolean;
  setHideEnabled: (on: boolean) => void;
  /** All allergens a business contains (curated → detected). */
  getBusinessAllergens: (business: Pick<LocalBusiness, 'slug' | 'name' | 'products'>) => string[];
  /** The subset of a business's allergens that the user is sensitive to. */
  matchedAllergens: (business: Pick<LocalBusiness, 'slug' | 'name' | 'products'>) => string[];
  loading: boolean;
}

const AllergenContext = createContext<AllergenContextValue | undefined>(undefined);

export function AllergenProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userAllergies, setAllergiesState] = useState<string[]>([]);
  const [curatedMap, setCuratedMap] = useState<Record<string, string[]>>(CURATED_STORE_ALLERGENS);
  const [hideEnabled, setHideEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore cached selections + hide preference on first mount.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(ALLERGIES_CACHE_KEY);
      if (cached) setAllergiesState(JSON.parse(cached));
      setHideEnabledState(localStorage.getItem(HIDE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  // Load curated store tags from Supabase (merged over the bundled fallback).
  useEffect(() => {
    let active = true;
    getCuratedStoreAllergens().then((dbMap) => {
      if (!active) return;
      if (Object.keys(dbMap).length) {
        setCuratedMap({ ...CURATED_STORE_ALLERGENS, ...dbMap });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Load the signed-in user's allergies (authoritative over the cache).
  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getUserAllergies(user.id).then((keys) => {
      if (!active) return;
      if (keys.length) {
        setAllergiesState(keys);
        try {
          localStorage.setItem(ALLERGIES_CACHE_KEY, JSON.stringify(keys));
        } catch {
          /* ignore */
        }
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const setUserAllergies = useCallback(
    async (keys: string[]) => {
      setAllergiesState(keys);
      try {
        localStorage.setItem(ALLERGIES_CACHE_KEY, JSON.stringify(keys));
      } catch {
        /* ignore */
      }
      if (user?.id) await persistUserAllergies(user.id, keys);
    },
    [user?.id],
  );

  const setHideEnabled = useCallback((on: boolean) => {
    setHideEnabledState(on);
    try {
      localStorage.setItem(HIDE_KEY, on ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const getBusinessAllergens = useCallback(
    (business: Pick<LocalBusiness, 'slug' | 'name' | 'products'>): string[] => {
      const curated = curatedMap[business.slug];
      if (curated && curated.length) return curated;
      // No curated tags → best-effort detection from menu item names.
      const texts: Array<string | undefined> = [business.name, ...business.products.map((p) => p.title)];
      return detectAllergens(texts);
    },
    [curatedMap],
  );

  const matchedAllergens = useCallback(
    (business: Pick<LocalBusiness, 'slug' | 'name' | 'products'>): string[] => {
      if (!userAllergies.length) return [];
      const set = new Set<AllergenKey | string>(getBusinessAllergens(business));
      return userAllergies.filter((k) => set.has(k));
    },
    [userAllergies, getBusinessAllergens],
  );

  const value = useMemo<AllergenContextValue>(
    () => ({
      userAllergies,
      setUserAllergies,
      hideEnabled,
      setHideEnabled,
      getBusinessAllergens,
      matchedAllergens,
      loading,
    }),
    [userAllergies, setUserAllergies, hideEnabled, setHideEnabled, getBusinessAllergens, matchedAllergens, loading],
  );

  return <AllergenContext.Provider value={value}>{children}</AllergenContext.Provider>;
}

export function useAllergens(): AllergenContextValue {
  const ctx = useContext(AllergenContext);
  if (!ctx) throw new Error('useAllergens must be used within an AllergenProvider');
  return ctx;
}
