/**
 * types.ts — shared data shapes for the store (restaurant/shop) page and its
 * sub-components. Kept in one place so the page, the item cards, and the info
 * modal all agree on the structure of a menu, an item, and a deal.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

/** A promotional badge attached to a menu item (e.g. "20% off", "Buy 1 Get 1"). */
export interface StoreDeal {
  type: 'percent' | 'dollar_off' | 'bogo' | 'free_delivery' | 'bundle' | 'first_order';
  label: string;
  value?: number;
  threshold?: number;
}

/** A single purchasable menu item shown on the store page. */
export interface StoreItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  category: string;
  likePct?: number;
  likeCount?: number;
  deal?: StoreDeal;
}

/** The full menu + storefront metadata rendered by the store page. */
export interface StoreMenu {
  slug: string;
  banner?: string | null;
  rating: number;
  ratingCount: string;
  address: string;
  availability: string;
  hoursLabel: string;
  deliveryTime: string;
  phone?: string;
  businessHours?: Record<string, { open?: string; close?: string; closed?: boolean }>;
  reviews: { name: string; stars: number; date: string; text: string }[];
  categories: string[];
  featuredIds: string[];
  pickedIds: string[];
  items: StoreItem[];
}
