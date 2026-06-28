import { supabase } from './client';
import type { Product, VideoCard } from '../home-data';
import storeImages from '@/data/store-images.json';

/**
 * Real-data layer for the Walmart-style Home feed.
 *
 * Everything on the home page is derived from the REAL seeded businesses:
 *   profiles (type food|retail|service) → businesses (name, category, photo)
 *   → menu_items (the product cards).
 * No mock/placeholder data is used anywhere.
 *
 * The feed is scoped to the curated seeded stores (data/store-images.json) so
 * stray dev/test accounts never surface. Each store's banner (cropped from its
 * Bizness menu) lives in the DB via the seed script; the manifest is also used
 * as an image fallback so banners show even if the DB photo is missing.
 */
const SEEDED = storeImages as Record<string, { slug: string; banner: string | null }>;
const seededBanner = (name: string): string | undefined => SEEDED[name]?.banner || undefined;
const isSeeded = (name: string): boolean => Object.prototype.hasOwnProperty.call(SEEDED, name);

export interface LocalBusiness {
  id: string; // profile id (== owner_id)
  username: string;
  name: string;
  image?: string; // real business photo (or undefined → neutral placeholder)
  category: string; // department label, e.g. "Restaurants", "Flowers"
  type: string; // 'food' | 'retail' | 'service'
  href: string; // /profile/<username>
  rating: number;
  reviewCount: number;
  products: Product[]; // its menu items, mapped to product cards
}

function departmentFor(category: string | null | undefined, type: string): string {
  if (category && category.trim()) return category.trim();
  if (type === 'food') return 'Restaurants';
  if (type === 'service') return 'Home Services';
  return 'Shop';
}

/**
 * Fetch every seeded local business with its menu items as product cards.
 * Businesses without any available menu item are skipped (nothing to show).
 */
export async function getLocalBusinesses(): Promise<LocalBusiness[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, type, profile_picture_url')
    .in('type', ['food', 'retail', 'service']);

  if (error || !profiles?.length) return [];

  const ids = profiles.map((p) => p.id);

  const [{ data: bizRows }, { data: items }] = await Promise.all([
    supabase
      .from('businesses')
      .select('owner_id, business_name, category, profile_picture_url, average_rating, total_reviews')
      .in('owner_id', ids),
    supabase
      .from('menu_items')
      .select('id, user_id, item_name, description, price, image_url, category')
      .in('user_id', ids)
      .eq('is_available', true),
  ]);

  const bizByOwner = new Map<string, any>();
  for (const b of bizRows || []) bizByOwner.set(b.owner_id, b);

  const itemsByOwner = new Map<string, any[]>();
  for (const it of items || []) {
    const arr = itemsByOwner.get(it.user_id) || [];
    arr.push(it);
    itemsByOwner.set(it.user_id, arr);
  }

  const list: LocalBusiness[] = [];
  for (const p of profiles) {
    const its = itemsByOwner.get(p.id) || [];
    if (!its.length) continue; // no menu yet → don't surface an empty store

    const b = bizByOwner.get(p.id);
    const name = b?.business_name || p.full_name || p.username || 'Local business';
    if (!isSeeded(name)) continue; // only the curated seeded stores — no stray dev/test accounts
    const image = b?.profile_picture_url || p.profile_picture_url || seededBanner(name) || undefined;
    const category = departmentFor(b?.category, p.type);
    const href = `/profile/${p.username || p.id}`;
    const rating = Number(b?.average_rating) || 0;
    const reviewCount = Number(b?.total_reviews) || 0;

    const products: Product[] = its.map((it) => ({
      id: `mi-${it.id}`,
      title: it.item_name,
      description: name,
      businessId: p.id,
      businessName: name,
      price: Number(it.price) || 0,
      image: it.image_url || image || undefined,
      rating,
      reviewCount,
      href,
    }));

    list.push({
      id: p.id,
      username: p.username || p.id,
      name,
      image,
      category,
      type: p.type,
      href,
      rating,
      reviewCount,
      products,
    });
  }

  return list;
}

/**
 * One representative product (cheapest item) per business — kept for the
 * existing "Local businesses near you" carousel callers.
 */
export async function getFeaturedLocalBusinesses(limit = 12): Promise<Product[]> {
  const businesses = await getLocalBusinesses();
  return businesses
    .slice(0, limit)
    .map((b) => b.products.slice().sort((x, y) => x.price - y.price)[0])
    .filter(Boolean);
}

/**
 * Real short-form videos for the "Featured in videos" row. Returns [] when the
 * store has no videos yet (the section then renders nothing — no fake cards).
 */
export async function getFeaturedVideos(limit = 10): Promise<VideoCard[]> {
  const { data, error } = await supabase
    .from('videos')
    .select(
      'id, caption, view_count, created_at, businesses:business_id(business_name, category, profile_picture_url)'
    )
    .order('view_count', { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  const fmtViews = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n ?? 0}`;

  return data.map((v: any) => ({
    id: v.id,
    title: v.caption || 'Local video',
    businessName: v.businesses?.business_name || 'Local business',
    thumbnail: v.businesses?.profile_picture_url || undefined,
    views: fmtViews(Number(v.view_count) || 0),
    href: `/video/${v.id}`,
    products: [],
  }));
}
