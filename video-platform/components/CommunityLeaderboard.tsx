'use client';

/**
 * CommunityLeaderboard — local "within 5 km" ranking of users by Impact Score.
 * Purpose: Motivates users to support nearby businesses by showing their standing against neighbors.
 *   The current user is slotted into the list by their real Impact Score so their rank/badge here
 *   always matches the "Your Rank" card. Neighbor rows are mock data until a real geo-query exists.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useState } from 'react';
import { getRankProgress } from '@/lib/ranks';

/**
 * Community Leaderboard — shows where the current user ranks among people in
 * their local community ("within 5 km"). Reuses the existing rank tiers/badges
 * from lib/ranks. Palette: black / white / #f97316 only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// MOCK leaderboard data — replace with real 5km query later.
// One stable place to swap for a real backend query. Scores are fixed (no
// randomness) so the board never reshuffles between renders/refreshes.
// ─────────────────────────────────────────────────────────────────────────────
const COMMUNITY_SIZE = 42; // total people within 5 km

/** Mock neighbors within 5 km (descending score). The current user is inserted
 *  into this list by their REAL Impact Score, so their rank/badge stays in sync
 *  with the "Your Rank" card. */
const NEARBY_PEOPLE: { name: string; score: number }[] = [
  { name: 'Marcus Chen', score: 18420 },
  { name: 'Sofia Ramirez', score: 15890 },
  { name: 'Aisha Patel', score: 13250 },
  { name: 'Liam O’Connor', score: 11100 },
  { name: 'Yuki Tanaka', score: 9540 },
  { name: 'Diego Morales', score: 8200 },
  { name: 'Priya Nair', score: 5980 },
  { name: 'Noah Williams', score: 5210 },
  { name: 'Emma Schmidt', score: 4760 },
];
// ─────────────────────────────────────────────────────────────────────────────

interface LeaderboardRow {
  position: number;
  name: string;
  score: number;
  isYou: boolean;
}

/** Small rank badge image with a graceful text fallback if the file is missing. */
function RankBadge({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="inline-flex h-6 items-center rounded-full border border-gray-200 px-2 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:border-white/15 dark:text-gray-300">
        {name}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      title={name}
      className="h-6 w-6 shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

// Renders the leaderboard card. Takes the current user's name + real Impact Score so it can place
// them correctly among the neighbors and highlight their row.
export function CommunityLeaderboard({ youName, youScore }: { youName: string; youScore: number }) {
  // Insert the current user into the sorted neighbor list by their REAL Impact
  // Score, then number the rows. This keeps the leaderboard badge + position in
  // sync with the "Your Rank" card (both derive from the same score).
  const rows: LeaderboardRow[] = [
    ...NEARBY_PEOPLE.map((p) => ({ ...p, isYou: false })),
    { name: youName || 'You', score: youScore, isYou: true },
  ]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ position: i + 1, name: p.name, score: p.score, isYou: p.isYou }));

  const youRank = rows.find((r) => r.isYou)!.position;
  const aheadOfYou = youRank - 1;

  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e1e]">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white">
          Your Community — within 5 km
        </h3>
      </div>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        You&apos;re ranked{' '}
        <span className="font-bold text-[#f97316]">#{youRank}</span> of {COMMUNITY_SIZE} nearby
        {aheadOfYou > 0
          ? ` — catch the ${aheadOfYou} ${aheadOfYou === 1 ? 'person' : 'people'} above you.`
          : ' — you’re #1 in your community! 🎉'}
      </p>

      <ol className="flex flex-col gap-1.5">
        {rows.map((row) => {
          const rank = getRankProgress(row.score).current;
          const isFirst = row.position === 1;
          return (
            <li
              key={row.position}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                row.isYou
                  ? 'border-[#f97316] bg-[#f97316]/10'
                  : 'border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/[0.03]'
              }`}
            >
              {/* Position */}
              <span
                className={`w-7 shrink-0 text-center text-sm font-extrabold tabular-nums ${
                  isFirst
                    ? 'text-[#f97316]'
                    : row.isYou
                      ? 'text-[#f97316]'
                      : 'text-gray-900 dark:text-white'
                }`}
              >
                #{row.position}
              </span>

              {/* Name */}
              <span
                className={`min-w-0 flex-1 truncate text-sm ${
                  row.isYou
                    ? 'font-bold text-gray-900 dark:text-white'
                    : 'font-medium text-gray-900 dark:text-gray-100'
                }`}
              >
                {row.name}
                {row.isYou && (
                  <span className="ml-2 rounded-full bg-[#f97316] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    You
                  </span>
                )}
              </span>

              {/* Rank badge */}
              <RankBadge src={rank.image} name={rank.name} />

              {/* Impact score */}
              <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                {row.score.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
        Impact Score reflects how much you support local businesses nearby.
      </p>
    </div>
  );
}
