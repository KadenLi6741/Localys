/**
 * pricing.ts — derive a clean "from $X–$Y" price range for a business from its item prices.
 * Purpose: Turns a list of raw menu prices into a tidy, rounded range to display on cards/feed, so
 *   businesses show an approachable price band (e.g. "$20–$30") instead of exact min/max. Centralised
 *   so every surface rounds the same way.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

export interface PriceRange {
  min: number;
  max: number;
}

// Computes a rounded, presentation-friendly price band from a set of prices. Uses the average and
// spread (std-dev) to pick sensible round steps ($10 below ~$70, $25 above) and widen the band when
// prices vary a lot, while keeping the lower bound from being unrealistically far below the upper.
export function computeRoundedPriceRange(prices: number[]): PriceRange | null {
  if (!prices.length) return null;

  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + (price - avg) ** 2, 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  let minPrice: number;
  let maxPrice: number;

  if (avg < 70) {
    minPrice = Math.floor(avg / 10) * 10;
    maxPrice = minPrice + 10;

    if (stdDev > avg * 0.35) {
      maxPrice += 10;
    }
  } else {
    minPrice = Math.round(avg / 25) * 25;
    maxPrice = minPrice + 25;

    if (stdDev > avg * 0.3) {
      maxPrice += 25;
    }
  }

  if (minPrice < 0) minPrice = 0;
  if (maxPrice <= minPrice) maxPrice = minPrice + 10;

  const minimumTightLowerBound = maxPrice / 2;
  if (minPrice < minimumTightLowerBound) {
    const roundingStep = maxPrice >= 100 ? 10 : 5;
    minPrice = Math.ceil(minimumTightLowerBound / roundingStep) * roundingStep;
    if (minPrice >= maxPrice) {
      minPrice = Math.max(0, maxPrice - roundingStep);
    }
  }

  return { min: minPrice, max: maxPrice };
}

// Midpoint of a price range, rounded — a single representative price when one number is needed.
export function computeAveragePrice(range: PriceRange | null): number | null {
  if (!range) return null;
  return Math.round((range.min + range.max) / 2);
}