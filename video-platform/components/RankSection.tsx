'use client';

import { useEffect, useState } from 'react';
import { X, Lock } from 'lucide-react';
import {
  RANKS,
  buildLeaderboard,
  computeImpactScore,
  getRankProgress,
  rankRange,
  resolveImpactInputs,
  type ImpactInputs,
} from '@/lib/ranks';

/** Badge image; falls back to a visible placeholder disc if a file is missing. */
function RankBadge({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center ${className}`}
        aria-label={alt}
      >
        <span className="text-xs font-black text-gray-400 select-none">{alt[0]}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      className={`object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Compact profile rank summary: small current-rank badge + name + a thin progress
 * bar, plus a "Ranks" button that opens a pop-up with the full tiers and the
 * community leaderboard. The user's rank comes from a single source of truth
 * (`getRankProgress`) and is reused everywhere. Palette: black / white / #f97316.
 */
export function RankSection({
  moneySpent,
  points,
  bizCount,
  userName = 'You',
}: ImpactInputs & { userName?: string }) {
  const [open, setOpen] = useState(false);

  const inputs = resolveImpactInputs({ moneySpent, points, bizCount });
  const score = computeImpactScore(inputs);
  // Single source of truth for the user's rank — reused by the summary AND the modal.
  const { current, next, pctToNext, isMax } = getRankProgress(score);

  return (
    <div className="mb-3 rounded-2xl border border-gray-200 bg-white px-3 py-2.5">
      <div className="flex items-center gap-3">
        <RankBadge src={current.image} alt={current.name} className="h-11 w-11 shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-gray-900">{current.name}</p>
              <p className="text-[11px] leading-tight text-gray-500">Impact Score {score.toLocaleString()}</p>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-full border border-[#f97316] px-3 py-1 text-xs font-semibold text-[#f97316] transition-colors hover:bg-[#f97316] hover:text-white"
            >
              Ranks
            </button>
          </div>

          <div className="mt-1.5">
            {isMax ? (
              <p className="text-[11px] font-semibold text-[#f97316]">Max rank reached</p>
            ) : (
              <>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#f97316] transition-[width] duration-500"
                    style={{ width: `${pctToNext}%` }}
                  />
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-[#f97316]">{pctToNext}% to {next!.name}</span>
                  <span className="text-gray-400">{score.toLocaleString()} / {next!.threshold.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {open && (
        <RanksModal
          score={score}
          userName={userName}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * The Ranks pop-up: full tier list + rewards + top-supporters board. Computes
 * the user's rank from `score` (single source of truth) so any caller — the
 * profile rank card OR the community leaderboard's "Ranks" button — can open it
 * with just the score + name.
 */
export function RanksModal({
  score,
  userName = 'You',
  onClose,
}: {
  score: number;
  userName?: string;
  onClose: () => void;
}) {
  const { current, next, pctToNext, isMax } = getRankProgress(score);

  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const board = buildLeaderboard(score, userName);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-extrabold uppercase tracking-widest text-gray-900">Ranks</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 transition-colors hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          {/* Your rank — same `current` as the profile summary */}
          <div className="flex items-center gap-3 rounded-xl border border-[#f97316] bg-[#f97316]/10 p-3">
            <RankBadge src={current.image} alt={current.name} className="h-12 w-12 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#f97316]">Your rank</p>
              <p className="truncate text-base font-extrabold leading-tight text-gray-900">{current.name}</p>
              {isMax ? (
                <p className="mt-0.5 text-[11px] font-semibold text-[#f97316]">
                  Max rank reached · Impact Score {score.toLocaleString()}
                </p>
              ) : (
                <div className="mt-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-[#f97316]" style={{ width: `${pctToNext}%` }} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {pctToNext}% to {next!.name} · {score.toLocaleString()} / {next!.threshold.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* All tiers — lowest to highest, with each tier's reward + score range.
              This detailed list lives ONLY inside the modal (never inline). */}
          <div>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-500">All tiers &amp; rewards</h3>
            <ul className="space-y-1.5">
              {RANKS.map((rank) => {
                const isCurrent = rank.id === current.id;
                const unlocked = score >= rank.threshold;
                return (
                  <li
                    key={rank.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                      isCurrent ? 'border-[#f97316] bg-[#f97316]/10' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                      <RankBadge
                        src={rank.image}
                        alt={rank.name}
                        className={`h-10 w-10 ${!unlocked ? 'opacity-30 grayscale' : ''}`}
                      />
                      {!unlocked && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`flex items-center gap-1.5 text-sm font-bold ${
                          isCurrent ? 'text-[#f97316]' : unlocked ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {rank.name}
                        {isCurrent && (
                          <span className="rounded-full bg-[#f97316] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            Current
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[11px] text-gray-500">{rank.reward}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-gray-400">
                      {rankRange(rank)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Community leaderboard — rank number sits right next to the name */}
          <div>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-500">Top supporters</h3>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              {board.map((e, i) => (
                <div
                  key={`${e.name}-${i}`}
                  className={`flex items-center gap-2 px-3 py-1.5 ${i > 0 ? 'border-t border-gray-100' : ''} ${
                    e.isYou ? 'bg-[#f97316]/10' : 'bg-white'
                  }`}
                >
                  <span
                    className={`w-5 text-right text-xs font-bold tabular-nums ${
                      e.isYou ? 'text-[#f97316]' : 'text-gray-400'
                    }`}
                  >
                    {e.rank}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                      e.isYou ? 'text-[#f97316]' : 'text-gray-900'
                    }`}
                  >
                    {e.isYou ? `${e.name} (You)` : e.name}
                  </span>
                  <span
                    className={`shrink-0 text-xs tabular-nums ${
                      e.isYou ? 'font-semibold text-[#f97316]' : 'text-gray-400'
                    }`}
                  >
                    {e.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
