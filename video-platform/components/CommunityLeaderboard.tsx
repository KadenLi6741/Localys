'use client';

import { useState } from 'react';
import { MapPin, ChevronUp } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
 * MOCK leaderboard + rank rewards — wire to real 5km query later.
 *
 * Everything in this block is fake-but-stable demo data. It is seeded (a plain
 * hard-coded list, never shuffled) so the leaderboard looks identical on every
 * refresh. Replace `NEARBY` with a real "users within 5 km, ordered by Impact
 * Score" query and set `CURRENT_USER_RANK` / `NEARBY_TOTAL` from that result.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Rank tiers, low → high, with point thresholds + per-rank rewards. */
const RANK_REWARDS = [
  { name: 'Bronze',                min: 0,     max: 499,      reward: 'Welcome badge + standard coins',                       image: '/Ranks/Bronze.png' },
  { name: 'Silver',                min: 500,   max: 1499,     reward: '+5% bonus coins',                                      image: '/Ranks/silver.png' },
  { name: 'Gold',                  min: 1500,  max: 3999,     reward: '5% off one order/month + 10% bonus coins',             image: '/Ranks/gold.png' },
  { name: 'Diamond',               min: 4000,  max: 7999,     reward: 'Free delivery perk + 15% bonus coins',                 image: '/Ranks/diamond.png' },
  { name: 'Ascendant',             min: 8000,  max: 14999,    reward: 'Early access to deals + 20% bonus coins',              image: '/Ranks/Ascendant.png' },
  { name: 'Localy Philanthropist', min: 15000, max: Infinity, reward: 'Top-supporter status + 25% bonus coins + featured',    image: '/Ranks/Locally%20Philanthorpist.png' },
] as const;

type RankTier = (typeof RANK_REWARDS)[number];

/** Maps an Impact Score to its rank tier. */
function tierForScore(score: number): RankTier {
  for (let i = RANK_REWARDS.length - 1; i >= 0; i--) {
    if (score >= RANK_REWARDS[i].min) return RANK_REWARDS[i];
  }
  return RANK_REWARDS[0];
}

interface NearbyUser {
  /** 1-based position among everyone within 5 km. */
  position: number;
  name: string;
  impact: number;
  /** True for the signed-in user (their own row). */
  isYou?: boolean;
}

/** Top of the 5 km leaderboard. The current user sits mid-pack at #7 of 42. */
const NEARBY: NearbyUser[] = [
  { position: 1,  name: 'Marisol Reyes',  impact: 12450 },
  { position: 2,  name: 'Devon Clarke',   impact: 9310 },
  { position: 3,  name: 'Aisha Karim',    impact: 7200 },
  { position: 4,  name: 'Tomas Becker',   impact: 5640 },
  { position: 5,  name: 'Priya Nair',     impact: 4120 },
  { position: 6,  name: 'Liam O’Connor',  impact: 2980 },
  { position: 7,  name: 'You',            impact: 1820, isYou: true },
  { position: 8,  name: 'Hana Suzuki',    impact: 1540 },
  { position: 9,  name: 'Marcus Webb',    impact: 1180 },
  { position: 10, name: 'Elena Costa',    impact: 870 },
];

const CURRENT_USER_RANK = 7;
const NEARBY_TOTAL = 42;
/* ──────────────────────────────────────────────────────────────────────────── */

/** Small rank badge image; falls back to a clean text badge if the file is missing. */
function MiniBadge({ tier }: { tier: RankTier }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="inline-flex h-7 items-center rounded-full border border-[#f97316]/40 px-2 text-[10px] font-bold uppercase tracking-wide text-[#f97316]"
        aria-label={tier.name}
      >
        {tier.name}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tier.image}
      alt={tier.name}
      title={tier.name}
      className="h-7 w-7 shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Community leaderboard for the profile page: the user's rank within a 5 km
 * radius, the ranked list of nearby supporters (own row highlighted, people just
 * above clearly marked), and a Rank Rewards section with progress to the next
 * rank. Palette: black / white / #f97316 only; readable in light + dark mode.
 */
export function CommunityLeaderboard() {
  const you = NEARBY.find((u) => u.isYou)!;
  const tier = tierForScore(you.impact);
  const tierIndex = RANK_REWARDS.indexOf(tier);
  const nextTier = tierIndex < RANK_REWARDS.length - 1 ? RANK_REWARDS[tierIndex + 1] : null;

  // Progress from the current tier's floor to the next tier's floor.
  const pctToNext = nextTier
    ? Math.max(0, Math.min(100, Math.round(((you.impact - tier.min) / (nextTier.min - tier.min)) * 100)))
    : 100;
  const pointsToNext = nextTier ? nextTier.min - you.impact : 0;

  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1a1a1a]">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white">
          Your Community
        </h3>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#f97316]/40 px-2.5 py-0.5 text-[11px] font-semibold text-[#f97316]">
          <MapPin className="h-3 w-3" /> within 5 km
        </span>
      </div>

      {/* Your standing */}
      <div className="mb-4 rounded-xl bg-[#f97316]/10 px-4 py-3 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">You&apos;re ranked</p>
        <p className="text-2xl font-extrabold text-[#f97316]">
          #{CURRENT_USER_RANK}
          <span className="ml-1 text-base font-semibold text-gray-500 dark:text-gray-400">
            of {NEARBY_TOTAL} nearby
          </span>
        </p>
      </div>

      {/* Ranked list (top ~10) */}
      <ul className="space-y-1.5">
        {NEARBY.map((u) => {
          const uTier = tierForScore(u.impact);
          const aheadOfYou = !u.isYou && u.position < CURRENT_USER_RANK;
          const gap = aheadOfYou ? u.impact - you.impact : 0;
          return (
            <li
              key={u.position}
              className={[
                'flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors',
                u.isYou
                  ? 'border-[#f97316] bg-[#f97316]/10'
                  : aheadOfYou
                    ? 'border-[#f97316]/30 bg-[#f97316]/[0.04] dark:bg-[#f97316]/[0.06]'
                    : 'border-gray-200 bg-white dark:border-white/10 dark:bg-transparent',
              ].join(' ')}
            >
              {/* Position */}
              <span
                className={[
                  'w-8 shrink-0 text-center text-sm font-extrabold tabular-nums',
                  u.position === 1 || u.isYou ? 'text-[#f97316]' : 'text-gray-400 dark:text-gray-500',
                ].join(' ')}
              >
                #{u.position}
              </span>

              {/* Badge */}
              <MiniBadge tier={uTier} />

              {/* Name + tier name */}
              <div className="min-w-0 flex-1">
                <p
                  className={[
                    'truncate text-sm font-bold',
                    u.isYou ? 'text-[#f97316]' : 'text-gray-900 dark:text-white',
                  ].join(' ')}
                >
                  {u.name}
                  {u.isYou && (
                    <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wide text-[#f97316]">
                      You
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{uTier.name}</p>
              </div>

              {/* Impact score + gap to overtake */}
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-gray-900 tabular-nums dark:text-white">
                  {u.impact.toLocaleString()}
                </p>
                {aheadOfYou ? (
                  <p className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#f97316]">
                    <ChevronUp className="h-3 w-3" /> +{gap.toLocaleString()} ahead
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Impact</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Rank Rewards + progress to next rank */}
      <div className="mt-5 border-t border-gray-200 pt-4 dark:border-white/10">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white">
          Rank Rewards
        </h4>

        {/* Progress to next rank */}
        {nextTier ? (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-transparent">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900 dark:text-white">{tier.name}</span>
              <span className="font-semibold text-[#f97316]">{pctToNext}% to {nextTier.name}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-[#f97316] transition-[width] duration-500"
                style={{ width: `${pctToNext}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
              {pointsToNext.toLocaleString()} more Impact to reach {nextTier.name} — unlocks {nextTier.reward.toLowerCase()}.
            </p>
          </div>
        ) : (
          <div className="mb-4 inline-flex items-center rounded-full bg-[#f97316] px-4 py-1.5 text-sm font-semibold text-white">
            Top rank reached
          </div>
        )}

        {/* All tiers + their rewards */}
        <ul className="space-y-1.5">
          {RANK_REWARDS.map((r) => {
            const isCurrent = r.name === tier.name;
            const reached = you.impact >= r.min;
            const range = r.max === Infinity
              ? `${r.min.toLocaleString()}+`
              : `${r.min.toLocaleString()}–${r.max.toLocaleString()}`;
            return (
              <li
                key={r.name}
                className={[
                  'flex items-center gap-3 rounded-xl border px-3 py-2',
                  isCurrent
                    ? 'border-[#f97316] bg-[#f97316]/10'
                    : 'border-gray-200 bg-white dark:border-white/10 dark:bg-transparent',
                ].join(' ')}
              >
                <MiniBadge tier={r} />
                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      'flex items-center gap-1.5 text-sm font-bold',
                      isCurrent ? 'text-[#f97316]' : reached ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500',
                    ].join(' ')}
                  >
                    {r.name}
                    {isCurrent && (
                      <span className="rounded-full bg-[#f97316] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{r.reward}</p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-gray-400 dark:text-gray-500">
                  {range}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
