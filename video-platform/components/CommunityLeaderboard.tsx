'use client';

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
const YOU_RANK = 7; // the demo account sits in the middle, with people to catch
const YOU_IMPACT_SCORE = 6840; // between #6 and #8 below

/** People ranked ABOVE and just below the current user (descending score). */
const NEARBY_PEOPLE: { name: string; score: number }[] = [
  { name: 'Marcus Chen', score: 18420 }, // #1
  { name: 'Sofia Ramirez', score: 15890 }, // #2
  { name: 'Aisha Patel', score: 13250 }, // #3
  { name: 'Liam O’Connor', score: 11100 }, // #4
  { name: 'Yuki Tanaka', score: 9540 }, // #5
  { name: 'Diego Morales', score: 8200 }, // #6
  // current user is inserted here at #7
  { name: 'Priya Nair', score: 5980 }, // #8
  { name: 'Noah Williams', score: 5210 }, // #9
  { name: 'Emma Schmidt', score: 4760 }, // #10
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

export function CommunityLeaderboard({ youName }: { youName: string }) {
  // Build the ranked rows by splicing the current user into position #7. The
  // mock list is already sorted; we just insert "You" at the right spot.
  const rows: LeaderboardRow[] = [];
  const aboveYou = NEARBY_PEOPLE.slice(0, YOU_RANK - 1); // #1..#6
  const belowYou = NEARBY_PEOPLE.slice(YOU_RANK - 1); // #8..#10

  aboveYou.forEach((p, i) =>
    rows.push({ position: i + 1, name: p.name, score: p.score, isYou: false }),
  );
  rows.push({ position: YOU_RANK, name: youName || 'You', score: YOU_IMPACT_SCORE, isYou: true });
  belowYou.forEach((p, i) =>
    rows.push({ position: YOU_RANK + 1 + i, name: p.name, score: p.score, isYou: false }),
  );

  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e1e]">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white">
          Your Community — within 5 km
        </h3>
      </div>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        You&apos;re ranked{' '}
        <span className="font-bold text-[#f97316]">#{YOU_RANK}</span> of {COMMUNITY_SIZE} nearby —
        catch the {YOU_RANK - 1} people above you.
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
