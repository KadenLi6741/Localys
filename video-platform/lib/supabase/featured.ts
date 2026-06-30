import { supabase } from './client';
import type { Product, VideoCard, Deal } from '../home-data';
import storeMenus from '@/data/store-menus.json';
import { DEMO_STORES } from '@/lib/demoStores';

/**
 * Real-data layer for the Walmart-style Home feed.
 *
 * SINGLE SOURCE OF TRUTH = `data/store-menus.json` (built from public/Menu by
 * scripts/build-store-menus.mjs). Supabase is used ONLY for identity/routing:
 * it resolves each seeded business → its profile id (cart sellerId) + username
 * (the /profile/<username> link). Banners and item photos come from public/Menu
 * via the manifest, so the home feed and the store page render the same photos.
 */
interface ManifestItem {
  id: string; name: string; price: number; description?: string; image?: string;
  category: string; likePct?: number; likeCount?: number; reviewCount?: number;
  hq?: boolean; deal?: Deal;
}
interface ManifestStore {
  slug: string; department?: string; banner?: string | null; bannerHq?: boolean;
  rating: number; ratingCount: string; reviewCount?: number; categories: string[];
  featuredIds: string[]; pickedIds: string[]; items: ManifestItem[]; isService?: boolean;
  address?: string;
}
const MENUS = storeMenus as Record<string, ManifestStore>;

export interface LocalBusiness {
  id: string; // profile id (== owner_id)
  username: string;
  slug: string; // manifest slug (stable key for allergen lookup, etc.)
  name: string;
  image?: string; // real business photo (or undefined → neutral placeholder)
  category: string; // department label, e.g. "Restaurants", "Flowers"
  type: string; // 'food' | 'retail' | 'service'
  href: string; // /profile/<username>
  rating: number;
  reviewCount: number;
  address?: string; // street address (used to compute distance from the user)
  products: Product[]; // its menu items, mapped to product cards
}

function departmentFor(category: string | null | undefined, type: string): string {
  if (category && category.trim()) return category.trim();
  if (type === 'food') return 'Restaurants';
  if (type === 'service') return 'Home Services';
  return 'Shop';
}

/**
 * Build the home feed from the Menu manifest. Supabase resolves identity only
 * (profile id for cart sellerId + username for the link); banner + items + deals
 * come from `data/store-menus.json`. Only businesses present in the manifest are
 * surfaced — no stray dev/test accounts, no empty stores.
 */
/** Build a home-feed LocalBusiness from a manifest store + its identity/routing. */
function menuToBusiness(
  menu: ManifestStore,
  opts: { id: string; username: string; name: string; type: string; category: string },
): LocalBusiness {
  const { id, username, name, type, category } = opts;
  const href = `/profile/${username}`;
  // Business card image: the banner only if it's sharp enough, else the first
  // high-res item photo (the home builder may still swap it for variety).
  const firstHqItem = menu.items.find((it) => it.hq)?.image;
  const image = (menu.bannerHq ? menu.banner : undefined) || firstHqItem || menu.banner || undefined;
  const rating = menu.rating;
  const reviewCount = menu.reviewCount ?? (parseInt(String(menu.ratingCount), 10) || 0);

  const products: Product[] = menu.items.map((it) => ({
    id: it.id,
    title: it.name,
    description: name,
    businessId: id,
    businessName: name,
    price: it.price,
    image: it.image || image || undefined, // Menu item photo
    rating,
    reviewCount: it.reviewCount ?? reviewCount,
    href,
    deal: it.deal,
    dealLabel: it.deal?.label,
    hq: it.hq,
  }));

  return { id, username, slug: menu.slug, name, image, category, type, href, rating, reviewCount, address: menu.address, products };
}

export async function getLocalBusinesses(): Promise<LocalBusiness[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, type')
    .in('type', ['food', 'retail', 'service']);

  const list: LocalBusiness[] = [];

  if (!error && profiles?.length) {
    const { data: bizRows } = await supabase
      .from('businesses')
      .select('owner_id, business_name, category')
      .in('owner_id', profiles.map((p) => p.id));

    const bizByOwner = new Map<string, any>();
    for (const b of bizRows || []) bizByOwner.set(b.owner_id, b);

    for (const p of profiles) {
      const b = bizByOwner.get(p.id);
      const name = b?.business_name || p.full_name || '';
      const menu = MENUS[name];
      if (!menu) continue; // only manifest-backed stores appear on the home feed

      const category = menu.department || departmentFor(b?.category, p.type);
      list.push(menuToBusiness(menu, {
        id: p.id, username: p.username || p.id, name, type: p.type, category,
      }));
    }
  }

  // Built-in demo stores with no Supabase profile (e.g. Jay's Burger) — injected
  // from the manifest so they appear on the home feed and distribute their items.
  for (const ds of DEMO_STORES) {
    if (!ds.demoOnly) continue;
    if (list.some((b) => b.username === ds.slug)) continue;
    const menu = MENUS[ds.manifestKey];
    if (!menu) continue;
    list.push(menuToBusiness(menu, {
      id: ds.slug, username: ds.slug, name: ds.name, type: ds.type,
      category: menu.department || departmentFor(null, ds.type),
    }));
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
