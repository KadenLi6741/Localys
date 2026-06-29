/**
 * businessAliases.ts — maps certain real businesses to a built-in demo store/menu.
 * Purpose: Lets specific accounts (e.g. a test business that is really "Pho Xe Lua") display a curated
 *   demo name, menu and caption without mutating the live database. Centralises that mapping so the feed,
 *   store page and item rail all resolve the same alias.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import storeMenus from '@/data/store-menus.json';

/**
 * App-level business aliases.
 *
 * `cp9xssw59` is Andy's test business — it IS Pho Xe Lua. Rather than mutating the
 * live database, we alias it in app code to the built-in Pho Xe Lua demo store.
 * Pho Xe Lua's menu lives only in `data/store-menus.json`, under the manifest key
 * "Pho Nga Son" (its photos come from the "Pho Xelua resaturant" folder — i.e. that
 * manifest IS Pho Xe Lua's menu).
 */
export const PHO_XE_LUA_MANIFEST_KEY = 'Pho Nga Son';
export const PHO_XE_LUA_NAME = 'Pho Xe Lua Vietnamese Cuisine';

export interface BusinessAlias {
  /** Display name to show instead of the stored business/profile name. */
  name: string;
  /** Key into `store-menus.json` for the store page + item rail. */
  manifestKey: string;
  /** Caption to show instead of the stored video caption. */
  caption: string;
}

/** Usernames / business names that should resolve to a canonical demo store. */
const ALIASES: Record<string, BusinessAlias> = {
  cp9xssw59: {
    name: PHO_XE_LUA_NAME,
    manifestKey: PHO_XE_LUA_MANIFEST_KEY,
    caption: 'A big thank you from Andy!',
  },
};

/** Returns the alias for a business (matched on username OR business name), else null. */
export function getBusinessAlias(
  username?: string | null,
  businessName?: string | null,
): BusinessAlias | null {
  if (username && ALIASES[username]) return ALIASES[username];
  if (businessName && ALIASES[businessName]) return ALIASES[businessName];
  return null;
}

export interface AliasItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
}

interface ManifestItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
}

/** Pho Xe Lua's menu items (from the manifest) mapped to the left-rail shape. */
export function getAliasItems(manifestKey: string): AliasItem[] {
  const all = storeMenus as Record<string, { items?: ManifestItem[] }>;
  const items = all[manifestKey]?.items ?? [];
  return items.map((it) => ({
    id: it.id,
    name: it.name,
    price: Number(it.price) || 0,
    image: it.image,
    description: it.description,
  }));
}

/** Convenience: Pho Xe Lua's items for the feed left rail. */
export function getPhoXeLuaItems(): AliasItem[] {
  return getAliasItems(PHO_XE_LUA_MANIFEST_KEY);
}
