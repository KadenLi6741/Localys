/**
 * Deterministic, plausible review stats for a given key (e.g. a seller id or
 * item name). The same key always yields the same rating + review count, so a
 * store shows consistent numbers everywhere and order rows never render blank.
 *
 * This mirrors the deterministic "stableCount" approach already used for the
 * feed's review counts in components/HomeContent.tsx — there is no per-order
 * review table, so demo/local content relies on this shared helper.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

/** FNV-1a hash → unsigned 32-bit int (stable across reloads). */
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param key any stable identifier (seller id, item name, slug…)
 * @returns rating in [4.2, 4.9] (one decimal) and a review count in [40, 600].
 */
export function getReviewStats(key: string): { rating: number; reviews: number } {
  const h = hashString(key || 'localy');
  const rating = 4.2 + (h % 8) / 10; // 4.2 … 4.9
  const reviews = 40 + ((h >>> 4) % 561); // 40 … 600
  return { rating: Math.round(rating * 10) / 10, reviews };
}
