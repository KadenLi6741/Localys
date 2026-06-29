'use client';

import { useEffect, useState } from 'react';
import { X, Lock } from 'lucide-react';
import {
  RANKS,
  computeImpactScore,
  getRankProgress,
  resolveImpactInputs,
  type ImpactInputs,
} from '@/lib/ranks';

/** Badge image; falls back to a visible placeholder disc if a file is missing. */
function RankBadge({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`rounded-full border-2 border-border bg-muted flex items-center justify-center ${className}`}
        aria-label={alt}
      >
        <span className="text-2xl font-black text-muted-foreground select-none">{alt[0]}</span>
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

  const inputs = resolveImpactInputs({ moneySpent, points, bizCount });
  const score = computeImpactScore(inputs);
  const { current, next, pctToNext, isMax } = getRankProgress(score);

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Your Rank</h3>
        <button
          onClick={() => setOpen(true)}
          className="rounded-full border border-[#f97316] px-3 py-1 text-xs font-semibold text-[#f97316] transition-colors hover:bg-[#f97316] hover:text-white"
        >
          Ranks
        </button>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* Rank badge — ~2x larger, borderless, sits cleanly on the white card */}
        <RankBadge src={current.image} alt={current.name} className="h-80 w-80 max-w-full sm:h-96 sm:w-96" />
        <div className="w-full text-center">
          <p className="text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">{current.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Impact Score {score.toLocaleString()}</p>

          {isMax ? (
            <div className="mt-3 inline-flex items-center rounded-full bg-[#f97316] px-4 py-1.5 text-sm font-semibold text-white">
              Max rank reached
            </div>
          ) : (
            <div className="mt-3 w-full">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold text-[#f97316]">{pctToNext}% to {next!.name}</span>
                <span className="text-muted-foreground">{score.toLocaleString()} / {next!.threshold.toLocaleString()}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[#f97316] transition-[width] duration-500"
                  style={{ width: `${pctToNext}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {open && <RanksModal currentId={current.id} score={score} onClose={() => setOpen(false)} />}
    </div>
  );
}

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
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold uppercase tracking-widest text-foreground">Ranks</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Support local businesses to raise your Impact Score and climb the tiers.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tiers — lowest to highest */}
        <div className="overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {RANKS.map((rank) => {
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
                          ? 'border border-border bg-muted'
                          : 'border border-border bg-muted opacity-60'
                  }`}
                >
                  <p
                    className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${
                      unlocked ? 'text-[#f97316]' : 'text-muted-foreground'
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
                        <Lock className="h-6 w-6 text-muted-foreground" />
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{rank.requirement}</p>

                  {isCurrent ? (
                    <span className="mt-2 rounded-full bg-[#f97316] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Current
                    </span>
                  ) : unlocked ? (
                    <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unlocked</span>
                  ) : (
                    <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Locked</span>
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
