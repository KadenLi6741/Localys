/**
 * Localys profile ranking / tier system.
 *
 * A single "Impact Score" combines how much a user supports local businesses
 * (money weighted most, then points, then number of businesses). Score thresholds
 * map to 6 ranks, with the jumps getting progressively bigger toward the top so
 * "Locally Philanthropist" is the hardest to earn.
 *
 * Everything here is intentionally tweakable: adjust IMPACT_WEIGHTS or a rank's
 * `threshold` and the whole profile UI updates.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

export interface Rank {
  id: string;
  name: string;
  /** Badge image in public/ranks. */
  image: string;
  /** Minimum Impact Score required to hold this rank. */
  threshold: number;
  /** Human-readable requirement shown in the ranks pop-up. */
  requirement: string;
  /** Perk/reward unlocked at this rank, shown in the rank-rewards display. */
  reward: string;
}

// MOCK rank rewards — wire to real points later.
// Thresholds double as the points needed to reach each rank; the upper bound of
// a rank's range is (next rank's threshold − 1). `reward` is the perk unlocked.
/** Lowest → highest. Bronze is the start; Locally Philanthropist is the best/hardest. */
export const RANKS: Rank[] = [
  { id: 'bronze',         name: 'Bronze',                 image: '/ranks/bronze.png',                    threshold: 0,     requirement: 'Start supporting local businesses',   reward: 'Welcome badge + standard coin earning' },
  { id: 'silver',         name: 'Silver',                 image: '/ranks/silver.png',                    threshold: 500,   requirement: 'Reach 500 points',                    reward: '+5% bonus coins on every order' },
  { id: 'gold',           name: 'Gold',                   image: '/ranks/gold.png',                      threshold: 1500,  requirement: 'Reach 1,500 points',                  reward: '5% off one order per month + 10% bonus coins' },
  { id: 'diamond',        name: 'Diamond',                image: '/ranks/diamond.png',                   threshold: 4000,  requirement: 'Reach 4,000 points',                  reward: 'Free delivery perk + 15% bonus coins' },
  { id: 'ascendant',      name: 'Ascendant',              image: '/ranks/ascendant.png',                 threshold: 8000,  requirement: 'Reach 8,000 points',                  reward: 'Early access to deals + 20% bonus coins' },
  { id: 'philanthropist', name: 'Locally Philanthropist', image: '/ranks/locally-philanthropist.png',    threshold: 15000, requirement: 'Reach 15,000 points',                 reward: 'Top-supporter status + 25% bonus coins + featured in community' },
];

/** Formats a rank's points range, e.g. "0–499 pts" or "15,000+ pts". */
export function rankPointsRange(index: number): string {
  const lower = RANKS[index].threshold;
  const next = RANKS[index + 1];
  if (!next) return `${lower.toLocaleString()}+ pts`;
  return `${lower.toLocaleString()}–${(next.threshold - 1).toLocaleString()} pts`;
}

/** Weights — money matters most, then points, then businesses supported. */
export const IMPACT_WEIGHTS = { money: 10, points: 1, businesses: 25 };

export interface ImpactInputs {
  /** Dollars spent supporting local businesses. */
  moneySpent: number;
  /** Loyalty points (coin balance). */
  points: number;
  /** Distinct businesses supported. */
  bizCount: number;
}

/** The one clear, tweakable scoring function. */
export function computeImpactScore({ moneySpent, points, bizCount }: ImpactInputs): number {
  return Math.round(
    moneySpent * IMPACT_WEIGHTS.money +
    points * IMPACT_WEIGHTS.points +
    bizCount * IMPACT_WEIGHTS.businesses,
  );
}

/** Demo fallback (realistic made-up numbers) when a user has no real activity yet. */
export const DEMO_IMPACT: ImpactInputs = { moneySpent: 320, points: 140, bizCount: 4 };

/** Returns the inputs to score — real values, or the demo set when everything is empty. */
export function resolveImpactInputs(inputs: ImpactInputs): ImpactInputs {
  const empty = inputs.moneySpent <= 0 && inputs.points <= 0 && inputs.bizCount <= 0;
  return empty ? DEMO_IMPACT : inputs;
}

export interface RankProgress {
  current: Rank;
  next: Rank | null;
  score: number;
  /** 0–100 percent of the way from the current rank's threshold to the next. */
  pctToNext: number;
  isMax: boolean;
}

/** Maps an Impact Score to the held rank + progress toward the next rank. */
export function getRankProgress(score: number): RankProgress {
  let idx = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].threshold) { idx = i; break; }
  }
  const current = RANKS[idx];
  const next = idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  let pctToNext = 100;
  if (next) {
    const span = next.threshold - current.threshold;
    pctToNext = span > 0
      ? Math.max(0, Math.min(100, Math.round(((score - current.threshold) / span) * 100)))
      : 0;
  }
  return { current, next, score, pctToNext, isMax: !next };
}
