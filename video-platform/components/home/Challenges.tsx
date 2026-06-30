import { Coins, Check } from 'lucide-react';
import { dailyChallenges, monthlyChallenges, type Challenge } from '@/lib/home-data';

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const pct = Math.min(100, Math.round((challenge.current / challenge.goal) * 100));
  const done = pct >= 100;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-black dark:text-white">{challenge.title}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#f97316] dark:bg-[#f97316]/15">
          <Coins className="h-3.5 w-3.5" />+{challenge.reward}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-[#f97316] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {done ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#f97316]">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />Done
          </span>
        ) : (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-600 dark:text-gray-300">
            {challenge.current}/{challenge.goal}
          </span>
        )}
      </div>
    </div>
  );
}

function ChallengeGroup({ title, challenges }: { title: string; challenges: Challenge[] }) {
  return (
    <div className="flex flex-col">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h3>
      <div className="grid flex-1 auto-rows-fr gap-3">
        {challenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
      </div>
    </div>
  );
}

/** (A) Daily + monthly challenges, each with a progress bar (coins/rewards theme). */
export function Challenges() {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-[#f97316] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Quests</span>
        <h2 className="text-xl font-bold text-black dark:text-white sm:text-2xl">Earn coins</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChallengeGroup title="Daily" challenges={dailyChallenges} />
        <ChallengeGroup title="Monthly" challenges={monthlyChallenges} />
      </div>
    </section>
  );
}
