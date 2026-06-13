'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Coins, Trophy, CalendarClock, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCoins } from '@/lib/supabase/profiles';
import { cn } from '@/lib/utils';

/** Seeded weekly challenges (backbone — completion tracking wires up later). */
const WEEKLY_CHALLENGES = [
  { id: 'visit-3', label: 'Visit 3 small businesses this week', reward: 150, progress: 1, total: 3 },
  { id: 'review-2', label: 'Leave 2 reviews', reward: 100, progress: 0, total: 2 },
  { id: 'watch-10', label: 'Watch 10 local videos', reward: 50, progress: 6, total: 10 },
  { id: 'share-1', label: 'Share a business with a friend', reward: 75, progress: 0, total: 1 },
  { id: 'order-1', label: 'Place an order from a local shop', reward: 200, progress: 0, total: 1 },
];

/**
 * Seeded event-based bonus challenges. Opt-in only, and rewards are points
 * and coupons — never real-money wagers.
 */
const EVENT_CHALLENGES = [
  {
    id: 'knicks-prediction',
    title: 'Knicks Prediction',
    description:
      'Opt in now: if the New York Knicks win their next game, you permanently unlock a bonus coupon redeemable at participating local shops. One-time opt-in — once you are in, you stay in.',
    reward: '500 pts + bonus coupon',
    deadline: 'Permanent opt-in',
  },
  {
    id: 'summer-fest',
    title: 'Summer Street Fest',
    description:
      'Opt in before the downtown street festival: visit any 2 participating vendors that weekend to earn double points.',
    reward: '2× points all weekend',
    deadline: 'Opt in before July 4',
  },
];

const OPT_IN_STORAGE_KEY = 'localys.challenge.optins';
const OPT_IN_EVENT = 'localys:challenge-optins';

/**
 * Event-bonus opt-ins, persisted in localStorage. Opting in is permanent —
 * there is no opt-out path, so once a user is in they stay in across reloads.
 * useSyncExternalStore keeps the SSR/hydration snapshot stable.
 */
function useOptIns() {
  const json = useSyncExternalStore(
    (cb) => {
      window.addEventListener(OPT_IN_EVENT, cb);
      window.addEventListener('storage', cb);
      return () => {
        window.removeEventListener(OPT_IN_EVENT, cb);
        window.removeEventListener('storage', cb);
      };
    },
    () => window.localStorage.getItem(OPT_IN_STORAGE_KEY) || '{}',
    () => '{}',
  );

  const optIns = useMemo<Record<string, boolean>>(() => {
    try {
      return JSON.parse(json) as Record<string, boolean>;
    } catch {
      return {};
    }
  }, [json]);

  const optIn = (id: string) => {
    const next = { ...optIns, [id]: true };
    window.localStorage.setItem(OPT_IN_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(OPT_IN_EVENT));
  };

  return { optIns, optIn };
}

/** How points are earned (static explainer list). */
const EARN_RULES = [
  { label: 'Complete a weekly challenge', pts: '50–200 pts' },
  { label: 'Leave a review on a business', pts: '25 pts' },
  { label: 'First order from a new business', pts: '100 pts' },
  { label: 'Share a business page', pts: '10 pts' },
];

export default function ChallengesPage() {
  const { user } = useAuth();
  const [coins, setCoins] = useState<number | null>(null);
  const { optIns, optIn } = useOptIns();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUserCoins(user.id).then(({ data }) => {
      if (!cancelled) setCoins(data ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-12">
      <div className="mx-auto max-w-3xl px-4 pt-8 lg:px-8">
        {/* Header + balance */}
        <div className="mb-8">
          <h1 className="text-heading-sm font-bold text-foreground">Challenges &amp; Rewards</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Earn points by supporting local businesses, then redeem them for coupons and perks.
          </p>

          <div className="mt-5 flex flex-col gap-4 rounded-[4px] border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <Coins className="h-6 w-6 text-primary" aria-hidden="true" />
              </span>
              <div>
                <p className="text-caption uppercase tracking-wider text-muted-foreground">Your balance</p>
                <p className="text-heading-sm font-bold tabular-nums text-foreground">
                  {coins ?? '—'} <span className="text-body-sm font-semibold text-muted-foreground">pts</span>
                </p>
              </div>
            </div>
            <Link
              href="/buy-coins"
              className="rounded-[4px] bg-primary px-5 py-2.5 text-center text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get more points
            </Link>
          </div>
        </div>

        {/* How to earn */}
        <section className="mb-10">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            How to earn
          </h2>
          <ul className="divide-y divide-border rounded-[4px] border border-border bg-card">
            {EARN_RULES.map((r) => (
              <li key={r.label} className="flex items-center justify-between px-4 py-3">
                <span className="text-body-sm text-foreground">{r.label}</span>
                <span className="text-body-sm font-bold text-primary">{r.pts}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Weekly challenges */}
        <section className="mb-10">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Weekly challenges
          </h2>
          <div className="flex flex-col gap-3">
            {WEEKLY_CHALLENGES.map((c) => {
              const done = c.progress >= c.total;
              return (
                <div key={c.id} className="rounded-[4px] border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          done ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary'
                        )}
                      >
                        {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Trophy className="h-4 w-4" aria-hidden="true" />}
                      </span>
                      <div>
                        <p className="text-body-sm font-semibold text-foreground">{c.label}</p>
                        <p className="mt-0.5 text-caption text-muted-foreground">
                          {c.progress}/{c.total} complete
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-[4px] bg-primary/15 px-2 py-1 text-caption font-bold text-primary">
                      +{c.reward} pts
                    </span>
                  </div>
                  <div
                    className="mt-3 h-1.5 w-full overflow-hidden rounded-[4px] bg-surface-2"
                    role="progressbar"
                    aria-valuenow={c.progress}
                    aria-valuemin={0}
                    aria-valuemax={c.total}
                    aria-label={`${c.label}: ${c.progress} of ${c.total} complete`}
                  >
                    <div
                      className={cn('h-full', done ? 'bg-success' : 'bg-primary')}
                      style={{ width: `${Math.min(100, (c.progress / c.total) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Event-based bonus challenges */}
        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Event bonuses (opt-in)
          </h2>
          <div className="flex flex-col gap-3">
            {EVENT_CHALLENGES.map((e) => {
              const optedIn = !!optIns[e.id];
              return (
                <div key={e.id} className="rounded-[4px] border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <CalendarClock className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-body-sm font-semibold text-foreground">{e.title}</p>
                        <p className="mt-1 text-body-sm text-muted-foreground">{e.description}</p>
                        <p className="mt-2 text-caption text-muted-foreground">
                          <span className="font-semibold text-primary">{e.reward}</span> · {e.deadline}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => optIn(e.id)}
                      disabled={optedIn}
                      aria-pressed={optedIn}
                      className={cn(
                        'shrink-0 rounded-[4px] px-4 py-2 text-body-sm font-bold transition-colors',
                        optedIn
                          ? 'cursor-default border border-success bg-success/10 text-success'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      )}
                    >
                      {optedIn ? 'Opted in ✓' : 'Opt in'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-caption text-muted-foreground">
            Event bonuses are free, opt-in prediction rewards. No purchase or wager is ever required —
            rewards are points and coupons only.
          </p>
        </section>
      </div>
    </div>
  );
}
