'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Coins,
  Ticket,
  Store,
  Trophy,
  Gift,
  Check,
  X,
  Sparkles,
  CalendarClock,
  Truck,
  Coffee,
  Percent,
  CreditCard,
  Rocket,
  Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCoins, deductCoins } from '@/lib/supabase/profiles';
import { getUserCoupons } from '@/lib/supabase/coupons';
import { Toast } from '@/components/Toast';
import { cn } from '@/lib/utils';

/* ============================ Types + seed catalog ============================ */

type TabId = 'coupons' | 'shop' | 'challenges' | 'rewards';

interface CatalogItem {
  id: string;
  kind: 'coupon' | 'shop';
  title: string;
  business?: string;
  finePrint?: string;
  description?: string;
  cost: number; // coin cost; 0 = free claim
  icon: LucideIcon;
}

const COUPONS: CatalogItem[] = [
  { id: 'cp-5off', kind: 'coupon', title: '$5 off any order', business: 'Any Localys business', finePrint: 'Min spend $20 · Expires in 30 days', cost: 500, icon: Percent },
  { id: 'cp-freedelivery', kind: 'coupon', title: 'Free delivery on your next order', business: 'Participating shops', finePrint: 'One-time use · Expires in 14 days', cost: 300, icon: Truck },
  { id: 'cp-bogo-coffee', kind: 'coupon', title: 'Buy 1 Get 1 coffee', business: 'Local cafés', finePrint: 'Dine-in or pickup · Expires in 21 days', cost: 800, icon: Coffee },
  { id: 'cp-15off-new', kind: 'coupon', title: '15% off first order at a new business', business: 'New businesses', finePrint: 'First order only · Expires in 30 days', cost: 400, icon: Sparkles },
];

const SHOP_ITEMS: CatalogItem[] = [
  { id: 'sh-giftcredit', kind: 'shop', title: '$10 Localys gift credit', description: 'Apply toward any order at checkout.', cost: 1000, icon: CreditCard },
  { id: 'sh-boost', kind: 'shop', title: 'Featured placement boost', description: 'For business accounts — surface your shop in discovery.', cost: 1500, icon: Rocket },
  { id: 'sh-mystery', kind: 'shop', title: 'Mystery local deal', description: 'A surprise coupon from a nearby business.', cost: 250, icon: Package },
  { id: 'sh-doublecoins', kind: 'shop', title: 'Double-coins weekend pass', description: 'Earn 2× coins on everything for one weekend.', cost: 600, icon: Coins },
];

const EARN_RATES = [
  { label: 'Place an order', pts: '+50' },
  { label: 'Leave a review', pts: '+30' },
  { label: 'Refer a friend', pts: '+200' },
  { label: 'Daily check-in', pts: '+10' },
];

const WEEKLY_CHALLENGES = [
  { id: 'visit-3', label: 'Visit 3 small businesses this week', reward: 200, progress: 1, total: 3 },
  { id: 'review-2', label: 'Leave 2 reviews', reward: 60, progress: 0, total: 2 },
  { id: 'order-new', label: 'Order from a new business', reward: 100, progress: 0, total: 1 },
];

const KNICKS_CHALLENGE = {
  id: 'knicks-finals',
  title: 'Knicks NBA Finals Prediction',
  description:
    'Predict the New York Knicks to win the NBA Finals. If they win, a bonus coupon unlocks straight into My Rewards. This is a fun prediction reward — no purchase or wager, coupons only.',
  reward: '$10 coupon',
};

/* ============================ Persisted store ============================ */

const REDEEMED_KEY = 'localys.rewards.redeemed';
const OPTIN_KEY = 'localys.rewards.optins';
const STORE_EVENT = 'localys:rewards-store';

interface RedeemedReward {
  id: string;
  title: string;
  business?: string;
  code: string;
  redeemedAt: string;
  expiry: string;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

/** localStorage-backed rewards store (redeemed items + permanent opt-ins). */
function useRewardsStore() {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener(STORE_EVENT, cb);
    window.addEventListener('storage', cb);
    return () => {
      window.removeEventListener(STORE_EVENT, cb);
      window.removeEventListener('storage', cb);
    };
  }, []);

  const redeemedJson = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(REDEEMED_KEY) || '[]',
    () => '[]',
  );
  const optInJson = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(OPTIN_KEY) || '{}',
    () => '{}',
  );

  const redeemed = useMemo<RedeemedReward[]>(() => {
    try {
      return JSON.parse(redeemedJson) as RedeemedReward[];
    } catch {
      return [];
    }
  }, [redeemedJson]);

  const optIns = useMemo<Record<string, boolean>>(() => {
    try {
      return JSON.parse(optInJson) as Record<string, boolean>;
    } catch {
      return {};
    }
  }, [optInJson]);

  const addRedeemed = useCallback((item: CatalogItem) => {
    const current = readJSON<RedeemedReward[]>(REDEEMED_KEY, []);
    const code = `LCL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const expiry = new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const next = [
      { id: `${item.id}-${Date.now()}`, title: item.title, business: item.business, code, redeemedAt: new Date().toISOString(), expiry },
      ...current,
    ];
    window.localStorage.setItem(REDEEMED_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(STORE_EVENT));
  }, []);

  const optIn = useCallback((id: string) => {
    const current = readJSON<Record<string, boolean>>(OPTIN_KEY, {});
    window.localStorage.setItem(OPTIN_KEY, JSON.stringify({ ...current, [id]: true }));
    window.dispatchEvent(new Event(STORE_EVENT));
  }, []);

  return { redeemed, optIns, addRedeemed, optIn };
}

/* ============================ Small UI atoms ============================ */

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'coupons', label: 'Coupons', icon: Ticket },
  { id: 'shop', label: 'Coin Shop', icon: Store },
  { id: 'challenges', label: 'Challenges', icon: Trophy },
  { id: 'rewards', label: 'My Rewards', icon: Gift },
];

function CoinPrice({ cost }: { cost: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[4px] bg-primary/15 px-2 py-1 text-caption font-bold text-primary">
      <Coins className="h-3.5 w-3.5" aria-hidden="true" />
      {cost.toLocaleString()} coins
    </span>
  );
}

/* ============================ Page ============================ */

export default function RewardsPage() {
  return (
    <ProtectedRoute>
      <RewardsContent />
    </ProtectedRoute>
  );
}

function RewardsContent() {
  const { user } = useAuth();
  const { redeemed, optIns, addRedeemed, optIn } = useRewardsStore();

  const [tab, setTab] = useState<TabId>('coupons');
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimedCoupons, setClaimedCoupons] = useState<{ id: string; code: string; pct: number }[]>([]);
  const [confirmItem, setConfirmItem] = useState<CatalogItem | null>(null);
  const [confirmKnicks, setConfirmKnicks] = useState(false);
  const [toast, setToast] = useState('');

  // Load live balance + real claimed coupons.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: coins }, { data: coupons }] = await Promise.all([
        getUserCoins(user.id),
        getUserCoupons(user.id),
      ]);
      if (cancelled) return;
      setBalance(coins ?? 0);
      setClaimedCoupons(
        (coupons ?? []).map((uc: { id: string; coupon?: { code?: string; discount_percentage?: number } }) => ({
          id: uc.id,
          code: uc.coupon?.code ?? '—',
          pct: uc.coupon?.discount_percentage ?? 0,
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const redeemedIds = useMemo(() => new Set(redeemed.map((r) => r.title)), [redeemed]);

  // Redeem a catalog item: optimistic balance deduction with rollback on error.
  const handleConfirmRedeem = async () => {
    if (!confirmItem || !user || balance === null) return;
    const item = confirmItem;
    setConfirmItem(null);

    if (item.cost > 0 && balance < item.cost) {
      setToast('Not enough coins for that reward.');
      return;
    }

    const prev = balance;
    setBalance(prev - item.cost); // optimistic

    if (item.cost > 0) {
      const { error } = await deductCoins(user.id, item.cost);
      if (error) {
        setBalance(prev); // rollback
        setToast('Something went wrong — your coins were not spent.');
        return;
      }
    }
    addRedeemed(item);
    setToast(item.cost > 0 ? `Redeemed! ${item.cost.toLocaleString()} coins spent.` : 'Claimed! Added to My Rewards.');
  };

  const handleKnicksOptIn = () => {
    setConfirmKnicks(false);
    optIn(KNICKS_CHALLENGE.id);
    setToast('You are in. If the Knicks win, your coupon unlocks in My Rewards.');
  };

  const knicksOptedIn = !!optIns[KNICKS_CHALLENGE.id];

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-12">
      <div className="mx-auto max-w-6xl px-4 pt-8 lg:px-8">
        {/* ===== Header ===== */}
        <div className="mb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your balance</p>
              <p className="mt-1 flex items-center gap-2 text-display font-bold leading-none text-foreground">
                <Coins className="h-9 w-9 text-primary" aria-hidden="true" />
                <span className="tabular-nums">{balance === null ? '—' : balance.toLocaleString()}</span>
                <span className="text-subheading font-semibold text-muted-foreground">coins</span>
              </p>
              <p className="mt-2 max-w-xl text-body-sm text-muted-foreground">
                Earn coins by exploring local businesses — spend them on coupons and perks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTab('challenges')}
              className="text-body-sm font-semibold text-primary hover:underline"
            >
              How it works →
            </button>
          </div>
        </div>

        {/* ===== Tab nav ===== */}
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={active}
                className={cn(
                  'relative inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-body-sm font-bold transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t.label}
                {active && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {/* ===== Loading skeleton ===== */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse border border-border bg-surface p-4">
                <div className="mb-3 h-10 w-10 rounded-[4px] bg-surface-2" />
                <div className="mb-2 h-4 w-3/4 rounded-[4px] bg-surface-2" />
                <div className="h-3 w-1/2 rounded-[4px] bg-surface-2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* ===== COUPONS ===== */}
            {tab === 'coupons' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {COUPONS.map((c) => {
                  const Icon = c.icon;
                  const claimed = redeemedIds.has(c.title);
                  const afford = balance !== null && balance >= c.cost;
                  return (
                    <div key={c.id} className="flex flex-col border border-border bg-surface p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-primary/15 text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span
                          className={cn(
                            'rounded-[4px] px-2 py-0.5 text-caption font-semibold',
                            claimed ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary',
                          )}
                        >
                          {claimed ? 'Claimed' : 'Available'}
                        </span>
                      </div>
                      <p className="text-body font-semibold text-foreground">{c.title}</p>
                      {c.business && <p className="mt-0.5 text-caption text-muted-foreground">{c.business}</p>}
                      {c.finePrint && <p className="mt-2 text-caption text-muted-foreground">{c.finePrint}</p>}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <CoinPrice cost={c.cost} />
                      </div>
                      <button
                        type="button"
                        disabled={claimed || !afford}
                        onClick={() => setConfirmItem(c)}
                        title={!afford && !claimed ? `Need ${(c.cost - (balance ?? 0)).toLocaleString()} more coins` : undefined}
                        className={cn(
                          'mt-3 rounded-[4px] px-4 py-2 text-body-sm font-bold transition-colors',
                          claimed
                            ? 'cursor-default border border-success bg-success/10 text-success'
                            : afford
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'cursor-not-allowed bg-surface-2 text-muted-foreground',
                        )}
                      >
                        {claimed ? 'Claimed ✓' : afford ? 'Redeem' : 'Not enough coins'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===== COIN SHOP ===== */}
            {tab === 'shop' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {SHOP_ITEMS.map((s) => {
                  const Icon = s.icon;
                  const owned = redeemedIds.has(s.title);
                  const afford = balance !== null && balance >= s.cost;
                  const shortfall = balance !== null ? s.cost - balance : 0;
                  return (
                    <div
                      key={s.id}
                      className={cn('flex flex-col border border-border bg-surface p-4', !afford && !owned && 'opacity-60')}
                    >
                      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-[4px] bg-primary/15 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <p className="text-body font-semibold text-foreground">{s.title}</p>
                      {s.description && <p className="mt-1 flex-1 text-caption text-muted-foreground">{s.description}</p>}
                      <div className="mt-3">
                        <CoinPrice cost={s.cost} />
                      </div>
                      <button
                        type="button"
                        disabled={owned || !afford}
                        onClick={() => setConfirmItem(s)}
                        title={!afford && !owned ? `Need ${shortfall.toLocaleString()} more coins` : undefined}
                        className={cn(
                          'mt-3 rounded-[4px] px-4 py-2 text-body-sm font-bold transition-colors',
                          owned
                            ? 'cursor-default border border-success bg-success/10 text-success'
                            : afford
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'cursor-not-allowed bg-surface-2 text-muted-foreground',
                        )}
                      >
                        {owned ? 'Redeemed ✓' : afford ? 'Redeem with coins' : `Need ${shortfall.toLocaleString()} more`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===== CHALLENGES ===== */}
            {tab === 'challenges' && (
              <div className="space-y-8">
                {/* Earn rates */}
                <section>
                  <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">How you earn coins</h2>
                  <ul className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-4">
                    {EARN_RATES.map((r) => (
                      <li key={r.label} className="bg-surface p-4 text-center">
                        <p className="text-subheading font-bold text-primary">{r.pts}</p>
                        <p className="mt-1 text-caption text-muted-foreground">{r.label}</p>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Weekly */}
                <section>
                  <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Weekly challenges</h2>
                  <div className="flex flex-col gap-3">
                    {WEEKLY_CHALLENGES.map((c) => {
                      const done = c.progress >= c.total;
                      return (
                        <div key={c.id} className="border border-border bg-surface p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px]', done ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary')}>
                                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Trophy className="h-4 w-4" aria-hidden="true" />}
                              </span>
                              <div>
                                <p className="text-body-sm font-semibold text-foreground">{c.label}</p>
                                <p className="mt-0.5 text-caption text-muted-foreground">{c.progress}/{c.total} complete</p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-[4px] bg-primary/15 px-2 py-1 text-caption font-bold text-primary">+{c.reward} coins</span>
                          </div>
                          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-[4px] bg-surface-2" role="progressbar" aria-valuenow={c.progress} aria-valuemin={0} aria-valuemax={c.total} aria-label={`${c.label}: ${c.progress} of ${c.total}`}>
                            <div className={cn('h-full', done ? 'bg-success' : 'bg-primary')} style={{ width: `${Math.min(100, (c.progress / c.total) * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Knicks prediction */}
                <section>
                  <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Event prediction</h2>
                  <div className="border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-primary/15 text-primary">
                          <CalendarClock className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-body-sm font-semibold text-foreground">{KNICKS_CHALLENGE.title}</p>
                          <p className="mt-1 text-body-sm text-muted-foreground">{KNICKS_CHALLENGE.description}</p>
                          <p className="mt-2 text-caption text-muted-foreground">
                            Reward: <span className="font-semibold text-primary">{KNICKS_CHALLENGE.reward}</span> · Permanent opt-in
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={knicksOptedIn}
                        onClick={() => setConfirmKnicks(true)}
                        className={cn(
                          'shrink-0 rounded-[4px] px-4 py-2 text-body-sm font-bold transition-colors',
                          knicksOptedIn ? 'cursor-default border border-success bg-success/10 text-success' : 'bg-primary text-primary-foreground hover:bg-primary/90',
                        )}
                      >
                        {knicksOptedIn ? 'Opted in ✓' : 'Opt in'}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ===== MY REWARDS ===== */}
            {tab === 'rewards' && (
              <>
                {redeemed.length === 0 && claimedCoupons.length === 0 ? (
                  <div className="border border-border bg-surface py-16 text-center">
                    <Gift className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
                    <p className="font-semibold text-foreground">No coupons yet</p>
                    <p className="mt-1 text-body-sm text-muted-foreground">Complete a challenge to earn coins, then redeem a coupon.</p>
                    <button
                      type="button"
                      onClick={() => setTab('coupons')}
                      className="mt-4 rounded-[4px] bg-primary px-5 py-2.5 text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Browse coupons
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {redeemed.map((r) => (
                      <div key={r.id} className="flex flex-col border border-border bg-surface p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <Ticket className="h-5 w-5 text-primary" aria-hidden="true" />
                          <span className="rounded-[4px] bg-success/15 px-2 py-0.5 text-caption font-semibold text-success">Active</span>
                        </div>
                        <p className="text-body font-semibold text-foreground">{r.title}</p>
                        {r.business && <p className="mt-0.5 text-caption text-muted-foreground">{r.business}</p>}
                        {/* QR placeholder */}
                        <div className="my-3 flex items-center gap-3 rounded-[4px] bg-background p-3">
                          <div
                            className="h-14 w-14 shrink-0 rounded-[4px]"
                            style={{
                              backgroundImage:
                                'repeating-conic-gradient(var(--foreground) 0% 25%, transparent 0% 50%)',
                              backgroundSize: '8px 8px',
                            }}
                            aria-hidden="true"
                          />
                          <div>
                            <p className="font-mono text-body-sm font-bold text-foreground">{r.code}</p>
                            <p className="text-caption text-muted-foreground">Expires {r.expiry}</p>
                          </div>
                        </div>
                        <Link href="/cart" className="mt-auto text-body-sm font-semibold text-primary hover:underline">
                          Apply at checkout →
                        </Link>
                      </div>
                    ))}
                    {claimedCoupons.map((c) => (
                      <div key={c.id} className="flex flex-col border border-border bg-surface p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <Ticket className="h-5 w-5 text-primary" aria-hidden="true" />
                          <span className="rounded-[4px] bg-success/15 px-2 py-0.5 text-caption font-semibold text-success">Active</span>
                        </div>
                        <p className="text-body font-semibold text-foreground">{c.pct}% off coupon</p>
                        <div className="my-3 rounded-[4px] bg-background p-3">
                          <p className="font-mono text-body-sm font-bold text-foreground">{c.code}</p>
                        </div>
                        <Link href="/cart" className="mt-auto text-body-sm font-semibold text-primary hover:underline">
                          Apply at checkout →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ===== Redeem confirm modal ===== */}
      {confirmItem && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={() => setConfirmItem(null)}>
          <div className="w-full max-w-sm border border-border bg-card p-6 shadow-[inset_0_0_0_1px_var(--border)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-subheading font-bold text-foreground">Confirm redemption</h3>
              <button type="button" onClick={() => setConfirmItem(null)} aria-label="Close" className="rounded-[4px] p-1 text-muted-foreground hover:bg-surface hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-body-sm text-foreground">
              {confirmItem.cost > 0 ? (
                <>Redeem <span className="font-semibold">{confirmItem.title}</span> for{' '}
                  <span className="font-semibold text-primary">{confirmItem.cost.toLocaleString()} coins</span>?
                  {balance !== null && (
                    <> Your balance will be <span className="font-semibold">{(balance - confirmItem.cost).toLocaleString()}</span>.</>
                  )}
                </>
              ) : (
                <>Claim <span className="font-semibold">{confirmItem.title}</span> for free?</>
              )}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmItem(null)} className="rounded-[4px] border border-border px-4 py-2 text-body-sm font-semibold text-muted-foreground hover:bg-surface hover:text-foreground">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmRedeem} className="rounded-[4px] bg-primary px-4 py-2 text-body-sm font-bold text-primary-foreground hover:bg-primary/90">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Knicks permanent opt-in confirm ===== */}
      {confirmKnicks && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={() => setConfirmKnicks(false)}>
          <div className="w-full max-w-sm border border-border bg-card p-6 shadow-[inset_0_0_0_1px_var(--border)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-subheading font-bold text-foreground">Opt in to the prediction?</h3>
            <p className="text-body-sm text-muted-foreground">
              Once you opt in you <span className="font-semibold text-foreground">cannot opt out</span> — your prediction
              is locked until the event resolves. If the Knicks win, a bonus coupon unlocks in My Rewards. No purchase or
              wager required.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmKnicks(false)} className="rounded-[4px] border border-border px-4 py-2 text-body-sm font-semibold text-muted-foreground hover:bg-surface hover:text-foreground">
                Cancel
              </button>
              <button type="button" onClick={handleKnicksOptIn} className="rounded-[4px] bg-primary px-4 py-2 text-body-sm font-bold text-primary-foreground hover:bg-primary/90">
                I understand — opt in
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
