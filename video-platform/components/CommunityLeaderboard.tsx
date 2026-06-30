'use client';

import { useState } from 'react';
import { MapPin, ChevronUp, Star } from 'lucide-react';
import { RANKS, getRankProgress, type Rank } from '@/lib/ranks';

/* ────────────────────────────────────────────────────────────────────────────
 * MOCK leaderboard — wire to real 5km query later.
 *
 * Everything in this block is fake-but-stable demo data. It is seeded (a plain
 * hard-coded list, never shuffled) so the leaderboard looks identical on every
 * refresh. Replace `NEARBY_OTHERS` with a real "users within 5 km, ordered by
 * Impact Score" query and set `NEARBY_TOTAL` from that result.
 *
 * RANK IS A SINGLE SOURCE OF TRUTH: tiers, thresholds, names and badge images
 * all come from `RANKS` in lib/ranks.ts (via getRankProgress) — the exact same
 * computation used by the profile rank summary and the Ranks pop-up. This
 * component owns NO rank thresholds of its own, only the per-rank reward copy.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Per-rank reward copy, keyed by the canonical rank id from lib/ranks.ts. */
const REWARDS_BY_ID: Record<string, string> = {
  bronze:         'Welcome badge + standard coins',
  silver:         '+5% bonus coins',
  gold:           '5% off one order/month + 10% bonus coins',
  diamond:        'Free delivery perk + 15% bonus coins',
  ascendant:      'Early access to deals + 20% bonus coins',
  philanthropist: 'Top-supporter status + 25% bonus coins + featured',
};

/** Other nearby supporters (the signed-in user is inserted by Impact Score). */
const NEARBY_OTHERS: { name: string; impact: number }[] = [
  { name: 'Marisol Reyes', impact: 12450 },
  { name: 'Devon Clarke',  impact: 9310 },
  { name: 'Aisha Karim',   impact: 7200 },
  { name: 'Tomas Becker',  impact: 5640 },
  { name: 'Priya Nair',    impact: 4120 },
  { name: 'Liam O’Connor', impact: 2980 },
  { name: 'Hana Suzuki',   impact: 1540 },
  { name: 'Marcus Webb',   impact: 1180 },
  { name: 'Elena Costa',   impact: 870 },
];

const NEARBY_TOTAL = 42;
/* ──────────────────────────────────────────────────────────────────────────── */

interface NearbyUser {
  /** 1-based position among everyone within 5 km. */
  position: number;
  name: string;
  impact: number;
  /** True for the signed-in user (their own row). */
  isYou?: boolean;
}

/** Inclusive Impact range a rank covers, derived from the canonical RANKS list. */
function rankRange(rank: Rank): string {
  const idx = RANKS.findIndex((r) => r.id === rank.id);
  const next = RANKS[idx + 1];
  return next
    ? `${rank.threshold.toLocaleString()}–${(next.threshold - 1).toLocaleString()}`
    : `${rank.threshold.toLocaleString()}+`;
}

/** Rank badge image; falls back to a clean text badge if the file is missing. */
function MiniBadge({ rank, className = 'h-7 w-7' }: { rank: Rank; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="inline-flex h-7 items-center rounded-full border border-[#f97316]/40 px-2 text-[10px] font-bold uppercase tracking-wide text-[#f97316]"
        aria-label={rank.name}
      >
        {rank.name}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={rank.image}
      alt={rank.name}
      title={rank.name}
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
export function CommunityLeaderboard({ score, userName = 'You' }: { score: number; userName?: string }) {
  // The user's rank comes from the SAME single source of truth as the profile
  // summary and the Ranks pop-up — getRankProgress(score) over lib/ranks.ts.
  const { current: tier, next: nextTier, pctToNext } = getRankProgress(score);
  const pointsToNext = nextTier ? nextTier.threshold - score : 0;

  // Insert the signed-in user into the nearby list by Impact Score, then rank.
  const rows: NearbyUser[] = [
    ...NEARBY_OTHERS.map((u) => ({ ...u })),
    { name: userName, impact: score, isYou: true },
  ]
    .sort((a, b) => b.impact - a.impact)
    .map((u, i) => ({ ...u, position: i + 1 }));

  const you = rows.find((u) => u.isYou)!;
  const currentUserRank = you.position;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1a1a1a]">
      {/* ── Banner: emblem cell + centered title (mirrors the reference top bar) ── */}
      <div className="flex items-stretch border-b border-gray-200 dark:border-white/10">
        {/* Emblem cell */}
        <div className="flex w-20 shrink-0 items-center justify-center border-r border-gray-200 bg-[#f97316]/10 sm:w-24 dark:border-white/10">
          <MiniBadge rank={tier} className="h-12 w-12 sm:h-14 sm:w-14" />
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
          <span className="text-lg font-black text-[#f97316]">#{currentUserRank}</span>
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
        {rows.map((u) => {
          const uTier = getRankProgress(u.impact).current;
          const aheadOfYou = !u.isYou && u.position < currentUserRank;
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
                  <MiniBadge rank={uTier} className="h-8 w-8" />
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
              {pointsToNext.toLocaleString()} more Impact to reach {nextTier.name} — unlocks {REWARDS_BY_ID[nextTier.id].toLowerCase()}.
            </p>
          </div>
        ) : (
          <div className="mb-4 inline-flex items-center rounded-full bg-[#f97316] px-4 py-1.5 text-sm font-semibold text-white">
            Top rank reached
          </div>
        )}

        {/* All tiers + their rewards — sourced from the canonical RANKS list */}
        <ul className="space-y-1.5">
          {RANKS.map((r) => {
            const isCurrent = r.id === tier.id;
            const reached = score >= r.threshold;
            return (
              <li
                key={r.id}
                className={[
                  'flex items-center gap-3 rounded-xl border px-3 py-2',
                  isCurrent
                    ? 'border-[#f97316] bg-[#f97316]/10'
                    : 'border-gray-200 bg-white dark:border-white/10 dark:bg-transparent',
                ].join(' ')}
              >
                <MiniBadge rank={r} />
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
                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{REWARDS_BY_ID[r.id]}</p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-gray-400 dark:text-gray-500">
                  {rankRange(r)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
