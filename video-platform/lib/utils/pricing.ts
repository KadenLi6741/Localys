export interface PriceRange {
  min: number;
  max: number;
}

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

export function computeAveragePrice(range: PriceRange | null): number | null {
  if (!range) return null;
  return Math.round((range.min + range.max) / 2);
}