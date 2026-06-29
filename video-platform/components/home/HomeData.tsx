'use client';

/**
 * HomeData — shared data provider + feed composition for the entire home page.
 * Purpose: Fetches all seeded businesses + menu items ONCE and exposes them (plus a pre-composed,
 *   image-deduped, themed "feed") via context, so every home section renders from one source of truth.
 *   Centralising this guarantees no photo/business repeats across rows and the hero agrees with the rows.
 *   Also exports small selector helpers used by the ranked-list sections.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getLocalBusinesses, type LocalBusiness } from '@/lib/supabase/featured';
import type { Product } from '@/lib/home-data';

/**
 * A fully-composed home feed: themed, image-deduped, high-res-only rows. Built
 * ONCE per data load (shared via context) so every row + the hero agree on which
 * image was already used and no photo or business repeats excessively.
 */
export interface HomeFeed {
  heroBusinesses: LocalBusiness[];
  trending: Product[];
  flowers: Product[];
  pets: Product[];
  groceryConvenience: Product[];
  pharmacy: Product[];
  restaurants: LocalBusiness[];
  topRestaurants: LocalBusiness[];
  services: LocalBusiness[];
  localBusinesses: LocalBusiness[];
}

const EMPTY_FEED: HomeFeed = {
  heroBusinesses: [], trending: [], flowers: [], pets: [],
  groceryConvenience: [], pharmacy: [], restaurants: [], topRestaurants: [],
  services: [], localBusinesses: [],
};

interface HomeDataValue {
  businesses: LocalBusiness[];
  products: Product[]; // every available menu item, across all businesses
  feed: HomeFeed;
  loading: boolean;
}

const HomeDataContext = createContext<HomeDataValue>({
  businesses: [],
  products: [],
  feed: EMPTY_FEED,
  loading: true,
});

export const useHomeData = () => useContext(HomeDataContext);
export const useHomeFeed = (): HomeFeed => useContext(HomeDataContext).feed;

/**
 * Fetches all real seeded businesses + menu items ONCE and shares them with
 * every home section, so the whole page renders from one source of truth.
 */
export function HomeDataProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getLocalBusinesses()
      .then((b) => { if (active) { setBusinesses(b); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const products = useMemo(() => businesses.flatMap((b) => b.products), [businesses]);
  const feed = useMemo(() => buildFeed(businesses), [businesses]);

  return (
    <HomeDataContext.Provider value={{ businesses, products, feed, loading }}>
      {children}
    </HomeDataContext.Provider>
  );
}

/* ----------------------------- feed composition ----------------------------- */

type Theme = 'food' | 'flowers' | 'pets' | 'grocery' | 'pharmacy' | 'services' | 'other';
// Classifies a business into a themed row bucket based on its type/category.
function themeOf(b: LocalBusiness): Theme {
  if (b.type === 'food') return 'food';
  if (b.category === 'Flowers') return 'flowers';
  if (b.category === 'Pets') return 'pets';
  if (b.category === 'Pharmacy') return 'pharmacy';
  if (b.category === 'Grocery' || b.category === 'Convenience') return 'grocery';
  if (b.type === 'service') return 'services';
  return 'other';
}

/**
 * Build the whole home feed with a single shared `used` image set so no photo is
 * ever shown twice, low-res (`!hq`) photos are excluded, rows are grouped by theme,
 * and a repeated business gets a different image each time. "Trending" is reserved
 * first (cheapest hi-res item per business) so that row stays exactly the same.
 */
function buildFeed(businesses: LocalBusiness[]): HomeFeed {
  if (!businesses.length) return EMPTY_FEED;

  const used = new Set<string>();
  const cardCount = new Map<string, number>(); // business id → times shown as a card
  const byTheme = (t: Theme) => businesses.filter((b) => themeOf(b) === t);
  const hqProducts = (b: LocalBusiness) => b.products.filter((p) => p.hq && p.image);

  // Pull up to `perBiz` fresh hi-res items per business, round-robin, deduped.
  const itemRow = (list: LocalBusiness[], max: number, perBiz: number): Product[] => {
    const out: Product[] = [];
    for (let r = 0; r < perBiz; r++) {
      for (const b of list) {
        const p = hqProducts(b).find((p) => p.image && !used.has(p.image));
        if (p && p.image) { used.add(p.image); out.push(p); }
        if (out.length >= max) return out;
      }
    }
    return out;
  };

  // Business cards: each gets a fresh image (banner if unused, else an unused item
  // photo); each business shown as a card at most twice across the page.
  const bizRow = (list: LocalBusiness[], max: number): LocalBusiness[] => {
    const out: LocalBusiness[] = [];
    for (const b of list) {
      if ((cardCount.get(b.id) || 0) >= 2) continue;
      let img = b.image && !used.has(b.image) ? b.image : undefined;
      if (!img) img = hqProducts(b).find((p) => p.image && !used.has(p.image))?.image;
      if (!img) continue; // no fresh image → skip rather than repeat/placeholder
      used.add(img);
      cardCount.set(b.id, (cardCount.get(b.id) || 0) + 1);
      out.push({ ...b, image: img });
      if (out.length >= max) return out;
    }
    return out;
  };

  const food = byTheme('food');
  const foodByRating = food.slice().sort((a, c) => c.rating - a.rating);

  // 1) Trending — hi-res food items reserved first so they never appear in another row.
  const trending = itemRow(foodByRating, 14, 6);

  // 2) Top-restaurants — shares the global `used` set so banners/item photos
  //    never repeat against trending or any later row.
  const topRestaurants = buildTopRestaurants(food, used);

  // 3) Hero — prominent businesses; reserve their images next.
  const heroOrder = [...foodByRating, ...byTheme('flowers'), ...byTheme('pets'), ...businesses]
    .filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i);
  const heroBusinesses = bizRow(heroOrder, 8);

  // 4) Themed item rows (foodDeals removed).
  const flowers = itemRow(byTheme('flowers'), 12, 5);
  const pets = itemRow(byTheme('pets'), 12, 8);
  const groceryConvenience = itemRow(byTheme('grocery'), 16, 4);
  const pharmacy = itemRow(byTheme('pharmacy'), 12, 8);

  // 5) Business-card rows.
  const restaurants = bizRow(foodByRating, 12);
  const services = bizRow(byTheme('services'), 16);
  const localBusinesses = bizRow(businesses, 20);

  return {
    heroBusinesses, trending, flowers, pets,
    groceryConvenience, pharmacy, restaurants, topRestaurants, services, localBusinesses,
  };
}

/**
 * Build a "Top restaurants near you" row with 6–8 entries. Accepts the global
 * `used` set so images it picks are never shown again in any subsequent row.
 */
function buildTopRestaurants(food: LocalBusiness[], used: Set<string>): LocalBusiness[] {
  const out: LocalBusiness[] = [];

  const nameVariations: Record<string, string[]> = {
    "Amy's Fish & Chips": ['The Fish Shack', 'Lake & Vinegar'],
    'Holy Smoke Barbecue': ["Smoky's BBQ", 'Southern Smoke Grill'],
    'Pho Nga Son': ['Saigon Noodle Bar', 'Pho Ha Noi'],
  };

  // 1. Real restaurants (banner preferred, falls back to first fresh hq item photo)
  for (const b of food) {
    const img =
      typeof b.image === 'string' && !used.has(b.image)
        ? b.image
        : b.products.find(
            (p) => p.hq === true && typeof p.image === 'string' && !used.has(p.image as string)
          )?.image;
    if (!img) continue;
    used.add(img);
    out.push({ ...b, image: img });
  }

  // 2. Named variations — different menu photo, same store link
  for (const b of food) {
    if (out.length >= 8) break;
    for (const varName of (nameVariations[b.name] ?? [])) {
      if (out.length >= 8) break;
      const img = b.products.find(
        (p) => p.hq === true && typeof p.image === 'string' && !used.has(p.image as string)
      )?.image;
      if (!img) continue;
      used.add(img);
      out.push({ ...b, id: `${b.id}:${varName}`, name: varName, image: img });
    }
  }

  return out;
}

/* ----------------------------- selectors ----------------------------- */

/** Spread products across businesses (one per business, round-robin) for variety. */
export function spreadProducts(businesses: LocalBusiness[], perBusiness = 1, max = 16): Product[] {
  const out: Product[] = [];
  for (let i = 0; i < perBusiness; i++) {
    for (const b of businesses) {
      if (b.products[i]) out.push(b.products[i]);
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** Cheapest item from each business, ascending — "grab nearest options for cheap". */
export function cheapestPerBusiness(businesses: LocalBusiness[], max = 16): Product[] {
  return businesses
    .map((b) => b.products.slice().sort((a, c) => a.price - c.price)[0])
    .filter(Boolean)
    .sort((a, c) => a.price - c.price)
    .slice(0, max);
}

/** Businesses of a given type, ranked by rating then review count. */
export function rankBusinessesByType(businesses: LocalBusiness[], type: string): LocalBusiness[] {
  return businesses
    .filter((b) => b.type === type)
    .sort((a, c) => c.rating - a.rating || c.reviewCount - a.reviewCount || c.products.length - a.products.length);
}
