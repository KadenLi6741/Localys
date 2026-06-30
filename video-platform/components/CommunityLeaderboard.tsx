'use client';

import { useState } from 'react';
import { MapPin, ChevronUp, Star } from 'lucide-react';

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

/** Rank badge image; falls back to a clean text badge if the file is missing. */
function MiniBadge({ tier, className = 'h-7 w-7' }: { tier: RankTier; className?: string }) {
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
      className={`shrink-0 object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

/** Square initials avatar for a leaderboard row (reference uses square thumbnails). */
function RowAvatar({ name, isYou }: { name: string; isYou?: boolean }) {
  const initial = (name.trim()[0] || '?').toUpperCase();
  return (
    <div
      className={[
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
        isYou
          ? 'bg-[#f97316] text-white'
          : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300',
      ].join(' ')}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

/**
 * Community leaderboard for the profile page — laid out like a competitive
 * ranked ladder (emblem banner + RANK/RATING column headers + full-width rows
 * with a distinct rank-number column, tier emblem, avatar and name). Keeps the
 * existing 5 km data/logic; only the composition mirrors the reference.
 * Palette: black / white / #f97316 only; readable in light + dark mode.
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
    <div className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1a1a1a]">
      {/* ── Banner: emblem cell + centered title (mirrors the reference top bar) ── */}
      <div className="flex items-stretch border-b border-gray-200 dark:border-white/10">
        {/* Emblem cell */}
        <div className="flex w-20 shrink-0 items-center justify-center border-r border-gray-200 bg-[#f97316]/10 sm:w-24 dark:border-white/10">
          <MiniBadge tier={tier} className="h-12 w-12 sm:h-14 sm:w-14" />
        </div>
        {/* Title block */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-3 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
            Community Leaderboard
          </p>
          <p className="text-2xl font-black uppercase tracking-wider text-gray-900 sm:text-3xl dark:text-white">
            Top {NEARBY_TOTAL}
          </p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#f97316]/40 px-2.5 py-0.5 text-[11px] font-semibold text-[#f97316]">
            <MapPin className="h-3 w-3" /> within 5 km
          </span>
        </div>
        {/* Your standing chip (top-right corner) */}
        <div className="hidden shrink-0 flex-col items-end justify-center pr-4 sm:flex">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">You</span>
          <span className="text-lg font-black text-[#f97316]">#{CURRENT_USER_RANK}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">of {NEARBY_TOTAL}</span>
        </div>
      </div>

      {/* ── Column headers ── */}
      <div className="flex items-center border-b border-gray-200 bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-500">
        <span className="w-12 shrink-0 py-2 text-center sm:w-14">Rank</span>
        <span className="py-2 pl-3">Rating</span>
      </div>

      {/* ── Ranked rows ── */}
      <ul>
        {NEARBY.map((u) => {
          const uTier = tierForScore(u.impact);
          const aheadOfYou = !u.isYou && u.position < CURRENT_USER_RANK;
          const gap = aheadOfYou ? u.impact - you.impact : 0;
          const accent = u.isYou || u.position === 1;
          return (
            <li
              key={u.position}
              className={[
                'flex items-stretch border-b last:border-b-0 transition-colors',
                u.isYou
                  ? 'border-[#f97316]/40 bg-[#f97316]/10'
                  : 'border-gray-100 bg-white hover:bg-gray-50 dark:border-white/[0.06] dark:bg-transparent dark:hover:bg-white/[0.03]',
              ].join(' ')}
            >
              {/* Rank-number column (distinct panel, like the reference left cell) */}
              <div
                className={[
                  'flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 sm:w-14',
                  u.isYou ? 'bg-[#f97316]/15' : 'bg-gray-50 dark:bg-white/[0.04]',
                ].join(' ')}
              >
                {u.position === 1 && <Star className="h-3 w-3 fill-[#f97316] text-[#f97316]" />}
                <span
                  className={[
                    'text-lg font-black tabular-nums sm:text-xl',
                    accent ? 'text-[#f97316]' : 'text-gray-400 dark:text-gray-500',
                  ].join(' ')}
                >
                  {u.position}
                </span>
              </div>

              {/* Content: emblem + rating, avatar, name */}
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
                {/* Tier emblem + rating value */}
                <div className="flex shrink-0 items-center gap-2">
                  <MiniBadge tier={uTier} className="h-8 w-8" />
                  <span
                    className={[
                      'w-12 text-right text-sm font-extrabold tabular-nums sm:w-14',
                      u.isYou ? 'text-[#f97316]' : 'text-gray-900 dark:text-white',
                    ].join(' ')}
                  >
                    {u.impact.toLocaleString()}
                  </span>
                </div>

                {/* Avatar */}
                <RowAvatar name={u.name} isYou={u.isYou} />

                {/* Name + tier / standing */}
                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      'flex items-center gap-1.5 truncate text-sm font-bold',
                      u.isYou ? 'text-[#f97316]' : 'text-gray-900 dark:text-white',
                    ].join(' ')}
                  >
                    <span className="truncate">{u.name}</span>
                    {u.isYou && (
                      <span className="shrink-0 rounded bg-[#f97316] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        You
                      </span>
                    )}
                  </p>
                  {aheadOfYou ? (
                    <p className="inline-flex items-center gap-0.5 truncate text-[11px] font-semibold uppercase tracking-wide text-[#f97316]">
                      <ChevronUp className="h-3 w-3" /> +{gap.toLocaleString()} ahead
                    </p>
                  ) : (
                    <p className="truncate text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {uTier.name}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* ── Rank Rewards + progress to next rank ── */}
      <div className="border-t border-gray-200 p-4 dark:border-white/10">
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
