/**
 * Built-in demo stores that are NOT seeded in Supabase but should still render.
 *
 * These power the no-DB demo wiring: `/profile/<slug>` renders the manifest store
 * page for every entry here (see app/profile/[userId]/page.tsx), and any entry
 * flagged `demoOnly` is injected into the home feed (see lib/supabase/featured.ts)
 * because Supabase has no profile row for it.
 *
 * `manifestKey` keys into data/store-menus.json (built from public/menu).
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
export interface DemoStore {
  /** URL slug → /profile/<slug>. */
  slug: string;
  /** Key into data/store-menus.json. */
  manifestKey: string;
  /** Display name. */
  name: string;
  /** profile.type: 'food' | 'retail' | 'service'. */
  type: string;
  /** True when there is NO Supabase profile → must be injected into the home feed. */
  demoOnly?: boolean;
}

export const DEMO_STORES: DemoStore[] = [
  { slug: 'jays-burger', manifestKey: "Jay's Burger", name: "Jay's Burger", type: 'food', demoOnly: true },
  { slug: 'sharp-fade-barbershop', manifestKey: 'Sharp Fade Barbershop', name: 'Sharp Fade Barbershop', type: 'service' },
  { slug: 'k1-floral-studio', manifestKey: 'K1 Floral Studio', name: 'K1 Floral Studio', type: 'retail' },
  { slug: 'holy-smoke-barbecue', manifestKey: 'Holy Smoke Barbecue', name: 'Holy Smoke Barbecue', type: 'food' },
  { slug: 'pho-nga-son', manifestKey: 'Pho Nga Son', name: 'Pho Xe Lua Vietnamese Cuisine', type: 'food' },
];

export function getDemoStoreBySlug(slug?: string | null): DemoStore | undefined {
  if (!slug) return undefined;
  return DEMO_STORES.find((s) => s.slug === slug);
}
