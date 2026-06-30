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
 */

export interface Rank {
  id: string;
  name: string;
  /** Badge image in public/Ranks (URL-encoded path). */
  image: string;
  /** Minimum Impact Score required to hold this rank. */
  threshold: number;
  /** Human-readable requirement shown in the ranks pop-up. */
  requirement: string;
  /** Perk unlocked at this tier, shown in the ranks pop-up. */
  reward: string;
}

/** Lowest → highest. Bronze is the start; Locally Philanthropist is the best/hardest. */
export const RANKS: Rank[] = [
  { id: 'bronze',         name: 'Bronze',                 image: '/Ranks/Bronze.png',                    threshold: 0,     requirement: 'Start supporting local businesses', reward: 'Welcome badge + standard coins' },
  { id: 'silver',         name: 'Silver',                 image: '/Ranks/silver.png',                    threshold: 500,   requirement: 'Reach an Impact Score of 500',       reward: '+5% bonus coins' },
  { id: 'gold',           name: 'Gold',                   image: '/Ranks/gold.png',                      threshold: 1500,  requirement: 'Reach an Impact Score of 1,500',     reward: '5% off one order/month + 10% bonus coins' },
  { id: 'diamond',        name: 'Diamond',                image: '/Ranks/diamond.png',                   threshold: 4000,  requirement: 'Reach an Impact Score of 4,000',     reward: 'Free delivery perk + 15% bonus coins' },
  { id: 'ascendant',      name: 'Ascendant',              image: '/Ranks/Ascendant.png',                 threshold: 9000,  requirement: 'Reach an Impact Score of 9,000',     reward: 'Early access to deals + 20% bonus coins' },
  { id: 'philanthropist', name: 'Locally Philanthropist', image: '/Ranks/Locally%20Philanthorpist.png',  threshold: 20000, requirement: 'Reach an Impact Score of 20,000',    reward: 'Top-supporter status + 25% bonus coins + featured' },
];

/** Inclusive Impact-Score range a rank covers (e.g. "1,500–3,999" or "20,000+"). */
export function rankRange(rank: Rank): string {
  const idx = RANKS.findIndex((r) => r.id === rank.id);
  const next = RANKS[idx + 1];
  return next
    ? `${rank.threshold.toLocaleString()}–${(next.threshold - 1).toLocaleString()}`
    : `${rank.threshold.toLocaleString()}+`;
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

export interface LeaderboardEntry {
  name: string;
  score: number;
  isYou?: boolean;
}

/** Mock "top supporters" used to seed the community leaderboard in the Ranks pop-up. */
export const LEADERBOARD_SEED: { name: string; score: number }[] = [
  { name: 'Maya R.',  score: 21450 },
  { name: 'Devon K.', score: 12880 },
  { name: 'Priya S.', score: 7320 },
  { name: 'Liam T.',  score: 5010 },
  { name: 'Noah W.',  score: 3950 },
  { name: 'Sofia L.', score: 2880 },
  { name: 'Ethan M.', score: 1620 },
  { name: 'Ava P.',   score: 940 },
];

/** Inserts the current user into the seeded leaderboard, ranked by Impact Score (desc). */
export function buildLeaderboard(
  userScore: number,
  userName: string,
): (LeaderboardEntry & { rank: number })[] {
  const all: LeaderboardEntry[] = [
    ...LEADERBOARD_SEED,
    { name: userName, score: userScore, isYou: true },
  ];
  all.sort((a, b) => b.score - a.score);
  return all.map((e, i) => ({ ...e, rank: i + 1 }));
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
