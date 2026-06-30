/**
 * Common-allergen catalogue + auto-detection.
 *
 * The canonical reference list lives in Supabase (`allergens`, seeded by
 * supabase/20260629_allergens.sql). This module mirrors that list so the UI
 * (chips, badges) and the filter work even before the migration is applied,
 * and provides:
 *   - CURATED_STORE_ALLERGENS  fallback copy of the curated `store_allergens`
 *                              rows, keyed by manifest slug.
 *   - detectAllergens()        keyword-based detection from menu item text,
 *                              used for any store with no curated tags.
 *
 * Resolution order (see contexts/AllergenContext): curated (DB → this file) →
 * auto-detected from the store's menu items.
 */

export type AllergenKey =
  | 'milk' | 'eggs' | 'peanuts' | 'tree_nuts' | 'soy'
  | 'gluten' | 'fish' | 'shellfish' | 'sesame';

export interface Allergen {
  key: AllergenKey;
  label: string;
  icon: string;
}

/** Mirrors the `allergens` reference table (same order). */
export const COMMON_ALLERGENS: Allergen[] = [
  { key: 'milk',      label: 'Milk / Dairy',   icon: '' },
  { key: 'eggs',      label: 'Eggs',           icon: '' },
  { key: 'peanuts',   label: 'Peanuts',        icon: '' },
  { key: 'tree_nuts', label: 'Tree Nuts',      icon: '' },
  { key: 'soy',       label: 'Soy',            icon: '' },
  { key: 'gluten',    label: 'Gluten / Wheat', icon: '' },
  { key: 'fish',      label: 'Fish',           icon: '' },
  { key: 'shellfish', label: 'Shellfish',      icon: '' },
  { key: 'sesame',    label: 'Sesame',         icon: '' },
];

const BY_KEY = new Map(COMMON_ALLERGENS.map((a) => [a.key, a]));

export function getAllergen(key: string): Allergen | undefined {
  return BY_KEY.get(key as AllergenKey);
}

/** Label for an allergen key (falls back to the raw key). */
export function allergenLabel(key: string): string {
  return BY_KEY.get(key as AllergenKey)?.label ?? key;
}

/**
 * Fallback copy of the curated `store_allergens` rows (keyed by manifest slug).
 * Keep in sync with supabase/20260629_allergens.sql. Used when Supabase has no
 * curated rows (e.g. the migration hasn't been applied to the live DB yet).
 */
export const CURATED_STORE_ALLERGENS: Record<string, AllergenKey[]> = {
  'amys-fish-and-chips': ['fish', 'shellfish', 'gluten', 'eggs'],
  'holy-smoke-barbecue': ['gluten', 'soy'],
  'pho-nga-son':         ['fish', 'shellfish', 'soy', 'peanuts', 'gluten', 'eggs'],
  'jays-burger':         ['gluten', 'milk', 'eggs', 'sesame', 'soy'],
};

/**
 * Keyword signals for detecting allergens from menu item names/categories.
 * Intentionally conservative — a missed tag is safer surfaced as "unknown"
 * than a wrong "allergen-free" claim, so the UI always frames these as a
 * best-effort warning, never a guarantee.
 */
const ALLERGEN_KEYWORDS: Record<AllergenKey, string[]> = {
  milk: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'dairy', 'latte', 'mozzarella', 'cheddar', 'parmesan', 'queso', 'custard', 'pudding', 'alfredo', 'ranch', 'gelato', 'ice cream', 'milkshake', 'poutine'],
  eggs: ['egg', 'mayo', 'mayonnaise', 'aioli', 'custard', 'meringue', 'omelet', 'omelette', 'frittata', 'carbonara'],
  peanuts: ['peanut', 'satay', 'pad thai'],
  tree_nuts: ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'nutella', 'pine nut', 'praline', 'marzipan'],
  soy: ['soy', 'soya', 'tofu', 'edamame', 'miso', 'teriyaki', 'hoisin', 'tempeh'],
  gluten: ['bun', 'bread', 'wheat', 'flour', 'pasta', 'noodle', 'breaded', 'battered', 'batter', 'dough', 'bagel', 'tortilla', 'wrap', 'pizza', 'pretzel', 'cracker', 'beer', 'pancake', 'waffle', 'toast', 'panko', 'crust', 'biscuit', 'gravy', 'dumpling', 'spring roll', 'sandwich', 'burger', 'sub', 'roll'],
  fish: ['fish', 'salmon', 'tuna', 'haddock', 'halibut', 'cod', 'anchovy', 'tilapia', 'fish sauce', 'sardine', 'mackerel', 'pho', 'unagi', 'eel'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'clam', 'oyster', 'mussel', 'scallop', 'calamari', 'squid', 'crawfish', 'crayfish'],
  sesame: ['sesame', 'tahini', 'hummus'],
};

/**
 * Best-effort allergen detection from a list of free-text strings (item names,
 * categories, descriptions). Returns the matching allergen keys.
 */
export function detectAllergens(texts: Array<string | null | undefined>): AllergenKey[] {
  const hay = texts.filter(Boolean).join(' • ').toLowerCase();
  if (!hay) return [];
  const hits: AllergenKey[] = [];
  for (const a of COMMON_ALLERGENS) {
    const kws = ALLERGEN_KEYWORDS[a.key];
    if (kws.some((kw) => hay.includes(kw))) hits.push(a.key);
  }
  return hits;
}
