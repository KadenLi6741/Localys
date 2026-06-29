'use client';

/**
 * RankSection — the "Your Rank" card on the profile, showing tier badge, Impact Score and progress.
 * Purpose: Gamifies supporting local businesses. It derives the user's Impact Score from their spend,
 *   points and number of businesses supported, maps it to a rank tier (lib/ranks), shows progress to
 *   the next tier, and opens a modal listing all tiers with their unlock thresholds and rewards.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect, useState } from 'react';
import { X, Lock } from 'lucide-react';
import {
  RANKS,
  computeImpactScore,
  getRankProgress,
  rankPointsRange,
  resolveImpactInputs,
  type ImpactInputs,
} from '@/lib/ranks';

/** Badge image; falls back to a visible placeholder disc if a file is missing. */
function RankBadge({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center ${className}`}
        aria-label={alt}
      >
        <span className="text-2xl font-black text-gray-400 select-none">{alt[0]}</span>
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
 * Profile rank/tier display: current rank badge + name, a progress bar to the next
 * rank (or a "max rank" state at the top), and a "Ranks" button that opens a pop-up
 * of all six rank images. Palette: black / white / #f97316 only.
 */
export function RankSection({ moneySpent, points, bizCount }: ImpactInputs) {
  const [open, setOpen] = useState(false);

  // Turn the raw inputs into a single Impact Score, then resolve which rank that score falls in
  // and how far along the user is toward the next tier. All ranking rules live in lib/ranks.
  const inputs = resolveImpactInputs({ moneySpent, points, bizCount });
  const score = computeImpactScore(inputs);
  const { current, next, pctToNext, isMax } = getRankProgress(score);

  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900">Your Rank</h3>
        <button
          onClick={() => setOpen(true)}
          className="rounded-full border border-[#f97316] px-3 py-1 text-xs font-semibold text-[#f97316] transition-colors hover:bg-[#f97316] hover:text-white"
        >
          Ranks
        </button>
      </div>

      <div className="flex flex-col items-center gap-1">
        {/* Rank badge — kept at its large rendered size (h-[598px]/sm:h-[718px]),
            but clipped by a shorter overflow-hidden box so the heavy white padding
            baked into the image is trimmed top & bottom, condensing the card
            WITHOUT shrinking the badge itself. */}
        <div className="flex w-full items-center justify-center overflow-hidden h-[360px] sm:h-[430px]">
          <RankBadge src={current.image} alt={current.name} className="h-[598px] w-[598px] max-w-full shrink-0 sm:h-[718px] sm:w-[718px]" />
        </div>
        <div className="w-full text-center">
          <p className="text-2xl font-extrabold leading-tight text-gray-900 sm:text-3xl">{current.name}</p>
          <p className="mt-0.5 text-sm text-gray-500">Impact Score {score.toLocaleString()}</p>

          {isMax ? (
            <>
              <div className="mt-3 inline-flex items-center rounded-full bg-[#f97316] px-4 py-1.5 text-sm font-semibold text-white">
                Max rank reached
              </div>
              {/* Reward held at the top rank */}
              <div className="mt-3 w-full rounded-xl border border-[#f97316] bg-[#f97316]/10 px-3 py-2 text-left">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#f97316]">Your reward</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">{current.reward}</p>
              </div>
            </>
          ) : (
            <>
              <div className="mt-3 w-full">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#f97316]">{(next!.threshold - score).toLocaleString()} pts to {next!.name}</span>
                  <span className="text-gray-400">{score.toLocaleString()} / {next!.threshold.toLocaleString()}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#f97316] transition-[width] duration-500"
                    style={{ width: `${pctToNext}%` }}
                  />
                </div>
              </div>
              {/* Reward unlocked at the next rank */}
              <div className="mt-3 w-full rounded-xl border border-[#f97316] bg-[#f97316]/10 px-3 py-2 text-left">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#f97316]">Next reward · {next!.name}</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">{next!.reward}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {open && <RanksModal currentId={current.id} score={score} onClose={() => setOpen(false)} />}
    </div>
  );
}

// Full-screen overlay listing every rank tier with its badge, points range and reward, dimming/locking
// tiers the user hasn't reached yet. Opened from the "Ranks" button so users can see what's ahead.
function RanksModal({ currentId, score, onClose }: { currentId: string; score: number; onClose: () => void }) {
  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold uppercase tracking-widest text-gray-900">Ranks</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Support local businesses to raise your Impact Score and climb the tiers.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 transition-colors hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tiers — lowest to highest */}
        <div className="overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {RANKS.map((rank, i) => {
              const isCurrent = rank.id === currentId;
              const unlocked = score >= rank.threshold;
              // Localy Philanthropist shows with no box/outline — just image + label on white.
              const isPhil = rank.id === 'philanthropist';
              return (
                <div
                  key={rank.id}
                  className={`relative flex flex-col items-center rounded-xl p-3 text-center transition-colors ${
                    isPhil
                      ? 'border-0 bg-transparent'
                      : isCurrent
                        ? 'border border-[#f97316] bg-[#f97316]/10'
                        : unlocked
                          ? 'border border-gray-200 bg-gray-50'
                          : 'border border-gray-100 bg-gray-50 opacity-60'
                  }`}
                >
                  <p
                    className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${
                      unlocked ? 'text-[#f97316]' : 'text-gray-400'
                    }`}
                  >
                    {rank.name}
                  </p>

                  <div className="relative">
                    {/* Borderless, ~2x larger rank image */}
                    <div className={`flex h-32 w-32 items-center justify-center ${!unlocked ? 'opacity-30 grayscale' : ''}`}>
                      <RankBadge
                        src={rank.image}
                        alt={rank.name}
                        className="h-32 w-32"
                      />
                    </div>
                    {!unlocked && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-gray-400" />
                      </span>
                    )}
                  </div>

                  {/* Points range to reach this rank */}
                  <p className={`mt-2 text-[11px] font-semibold ${unlocked ? 'text-gray-900' : 'text-gray-400'}`}>
                    {rankPointsRange(i)}
                  </p>

                  {/* Reward unlocked at this rank */}
                  <p className="mt-1 text-[11px] leading-snug text-gray-500">{rank.reward}</p>

                  {isCurrent ? (
                    <span className="mt-2 rounded-full bg-[#f97316] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Current
                    </span>
                  ) : unlocked ? (
                    <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Unlocked</span>
                  ) : (
                    <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-300">Locked</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
