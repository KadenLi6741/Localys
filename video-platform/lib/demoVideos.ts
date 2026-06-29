/**
 * Local video files (public/videos) linked to their businesses.
 *
 * Matched by filename to a store in data/store-menus.json. These power BOTH the
 * "Featured in Videos" home section (hover-play cards) and the Discover feed
 * (buildFeedVideos prepends them so they're watchable full-screen). No Supabase.
 */
import storeMenus from '@/data/store-menus.json';
import { getAliasItems, type AliasItem } from '@/lib/businessAliases';

export interface DemoVideo {
  /** Stable id, always prefixed `local:` so the feed can tell it from a DB video. */
  id: string;
  /** Encoded /videos path. */
  src: string;
  businessName: string;
  /** Slug → /profile/<slug> (resolved via lib/demoStores). */
  businessSlug: string;
  /** Key into data/store-menus.json for the item rail. */
  manifestKey: string;
  /** Department label for the feed overlay. */
  category: string;
  caption: string;
}

/**
 * One entry per file in public/videos. Holy Smoke Barbecue has TWO distinct clips
 * (Holy Smoke.mp4 + Hoy Smoke.mp4) — both are kept as separate videos, both tied to
 * the Holy Smoke store, and both appear as their own card + feed entry. Pho Xe Lua's
 * card uses the local Pho Ngan clip (same restaurant; its real clip lives in Supabase).
 */
export const DEMO_VIDEOS: DemoVideo[] = [
  {
    id: 'local:jays-burger',
    src: '/videos/jays-burger-video.mp4',
    businessName: "Jay's Burger",
    businessSlug: 'jays-burger',
    manifestKey: "Jay's Burger",
    category: 'Restaurants',
    caption: 'Fresh smashed burgers, made to order.',
  },
  {
    id: 'local:sharp-fade-barbershop',
    src: '/videos/sharp-fade-barbershop.mp4',
    businessName: 'Sharp Fade Barbershop',
    businessSlug: 'sharp-fade-barbershop',
    manifestKey: 'Sharp Fade Barbershop',
    category: 'Grooming',
    caption: 'Clean fades and sharp lineups.',
  },
  {
    id: 'local:k1-floral-studio',
    src: '/videos/florist.mp4',
    businessName: 'K1 Floral Studio',
    businessSlug: 'k1-floral-studio',
    manifestKey: 'K1 Floral Studio',
    category: 'Flowers',
    caption: 'Handcrafted bouquets for every occasion.',
  },
  {
    id: 'local:holy-smoke-barbecue',
    src: '/videos/holy-smoke.mp4',
    businessName: 'Holy Smoke Barbecue',
    businessSlug: 'holy-smoke-barbecue',
    manifestKey: 'Holy Smoke Barbecue',
    category: 'Restaurants',
    caption: 'Low and slow, smoked over hardwood.',
  },
  {
    id: 'local:holy-smoke-barbecue-2',
    src: '/videos/hoy-smoke.mp4',
    businessName: 'Holy Smoke Barbecue',
    businessSlug: 'holy-smoke-barbecue',
    manifestKey: 'Holy Smoke Barbecue',
    category: 'Restaurants',
    caption: 'More from the pit — fresh off the smoker.',
  },
  {
    id: 'local:pho-xe-lua',
    src: '/videos/pho-ngan.mp4',
    businessName: 'Pho Xe Lua Vietnamese Cuisine',
    businessSlug: 'pho-nga-son',
    manifestKey: 'Pho Nga Son',
    category: 'Restaurants',
    caption: 'A big thank you from Andy!',
  },
];

/** Cards for the "Featured in Videos" section — every linked video gets a card. */
export const FEATURED_VIDEOS: DemoVideo[] = DEMO_VIDEOS;

interface ManifestStore { rating?: number; banner?: string | null; reviewCount?: number }
const MENUS = storeMenus as Record<string, ManifestStore>;

/** Discover-feed shape: matches the `Video` interface used in components/HomeContent. */
export interface FeedVideo {
  id: string;
  user_id: string;
  business_id: string;
  video_url: string;
  caption: string;
  created_at: string;
  businesses: {
    id: string;
    business_name: string;
    category: string;
    average_rating?: number;
    total_reviews?: number;
    profile_picture_url?: string;
    latitude?: number;
    longitude?: number;
  };
  like_count: number;
  /** Menu items for the feed's left rail (BusinessItemsRail `items` prop). */
  localItems?: AliasItem[];
}

// Approximate coordinates for each demo business (Ottawa area).
// Used by the Discover feed's haversine distance calculation so the
// "Near" button shows a real computed distance instead of "Set location".
const DEMO_COORDS: Record<string, { latitude: number; longitude: number }> = {
  'jays-burger':           { latitude: 45.4215, longitude: -75.6972 },
  'sharp-fade-barbershop': { latitude: 45.4220, longitude: -75.7015 },
  'k1-floral-studio':      { latitude: 45.4230, longitude: -75.6950 },
  'holy-smoke-barbecue':   { latitude: 45.4200, longitude: -75.6980 },
  'pho-nga-son':           { latitude: 45.4225, longitude: -75.6940 },
};

/**
 * Synthetic Discover-feed entries for every local video (prepended to the feed).
 * Holy Smoke Barbecue is ordered first so it appears near the top of Discover. The
 * avatar uses the store's manifest banner so it always loads (no broken/blank pic).
 */
export function buildFeedVideos(): FeedVideo[] {
  const ordered = [...DEMO_VIDEOS].sort(
    (a, b) =>
      (a.businessSlug === 'holy-smoke-barbecue' ? 0 : 1) -
      (b.businessSlug === 'holy-smoke-barbecue' ? 0 : 1),
  );
  return ordered.map((v) => ({
    id: v.id,
    user_id: v.businessSlug,
    business_id: v.businessSlug,
    video_url: v.src,
    caption: v.caption,
    created_at: '2026-01-01T00:00:00.000Z',
    businesses: {
      id: v.businessSlug,
      business_name: v.businessName,
      category: v.category,
      average_rating: MENUS[v.manifestKey]?.rating ?? 4.8,
      total_reviews: MENUS[v.manifestKey]?.reviewCount ?? undefined,
      profile_picture_url: MENUS[v.manifestKey]?.banner ?? undefined,
      ...DEMO_COORDS[v.businessSlug],
    },
    like_count: 0,
    localItems: getAliasItems(v.manifestKey),
  }));
}
