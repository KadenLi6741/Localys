/**
 * Shared types for the Walmart-style Home feed + the gamification challenges.
 *
 * NOTE: All business/product/deal/video data is REAL and comes from Supabase via
 * `lib/supabase/featured.ts` (see getLocalBusinesses / getFeaturedVideos). The
 * old hardcoded placeholder businesses were removed — only the challenge data
 * (which is not business data) remains hardcoded here.
 */

/** The core card model used everywhere (deals, trending, ranked lists, …). */
export interface Product {
  id: string;
  title: string; // short name / headline (the menu item)
  description: string; // one-line shown under the price (usually the business name)
  businessId: string;
  businessName: string;
  price: number; // current price
  originalPrice?: number; // struck-through original when discounted
  discountPct?: number; // e.g. 30 → "30% off" badge
  image?: string; // real photo URL; falls back to a neutral placeholder
  rating: number; // 0–5
  reviewCount: number;
  href: string; // where the card links to (the real /profile/<username>)
}

export interface VideoCard {
  id: string;
  title: string;
  businessName: string;
  thumbnail?: string;
  views: string; // pre-formatted, e.g. "12.4k"
  href: string; // /video/[id]
  products: { id: string; title: string; price: number; image?: string; href: string }[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  current: number;
  goal: number;
  reward: number; // coins
  image?: string;
}

/* ------------------------------------------------------------------ */
/* Challenges (gamification — not business data)                       */
/* ------------------------------------------------------------------ */
export const dailyChallenges: Challenge[] = [
  { id: 'c1', title: 'Visit 3 local businesses', description: 'Check in today to earn coins', current: 1, goal: 3, reward: 50 },
  { id: 'c2', title: 'Like 5 videos', description: 'Support local creators', current: 3, goal: 5, reward: 20 },
];

export const monthlyChallenges: Challenge[] = [
  { id: 'm1', title: 'Try 10 new spots', description: 'Explore your neighbourhood', current: 4, goal: 10, reward: 300 },
  { id: 'm2', title: 'Spend at 8 businesses', description: 'Keep it local all month', current: 5, goal: 8, reward: 250 },
];
