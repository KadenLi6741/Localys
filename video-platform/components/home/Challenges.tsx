/**
 * Challenges — daily and monthly gamified goals with progress + coin rewards on the home page.
 * Purpose: Encourages repeat engagement by showing the user trackable challenges (e.g. "order from
 *   3 businesses") and how close they are to each reward. Data comes from lib/home-data.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { Coins } from 'lucide-react';
import { dailyChallenges, monthlyChallenges, type Challenge } from '@/lib/home-data';

// One challenge row: title, coin reward, and a progress bar derived from current/goal.
function ChallengeCard({ challenge }: { challenge: Challenge }) {
  // Clamp to 100% so an over-achieved challenge never overflows the bar.
  const pct = Math.min(100, Math.round((challenge.current / challenge.goal) * 100));
  return (
    <div className="rounded-md border border-gray-200 bg-white px-2 py-0.5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-1.5">
        <p className="min-w-0 truncate text-[11px] font-semibold text-black dark:text-white leading-snug">{challenge.title}</p>
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gray-100 px-1 py-0 text-[9px] font-bold text-black dark:bg-gray-700 whitespace-nowrap">
          <Coins className="h-2 w-2 text-[#f97316]" />+{challenge.reward}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <div className="flex-1 h-[3px] overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full rounded-full bg-[#f97316] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[9px] text-gray-400 shrink-0">{challenge.current}/{challenge.goal}</span>
      </div>
    </div>
  );
}

/** (A) Daily + monthly challenges, each with a progress bar (coins/rewards theme). */
export function Challenges() {
  return (
    <section className="grid gap-1.5 lg:grid-cols-2">
      <div>
        <h3 className="mb-0.5 text-[10px] font-bold text-black dark:text-white uppercase tracking-wide">Daily</h3>
        <div className="grid gap-0.5">
          {dailyChallenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
        </div>
      </div>
      <div>
        <h3 className="mb-0.5 text-[10px] font-bold text-black dark:text-white uppercase tracking-wide">Monthly</h3>
        <div className="grid gap-0.5">
          {monthlyChallenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
        </div>
      </div>
    </section>
  );
}
