'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Coins, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { dailyChallenges, monthlyChallenges } from '@/lib/home-data';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { setPremiumDemo } from '@/lib/supabase/profiles';
import { applyPremiumPoints } from '@/lib/premium';
import type { Challenge } from '@/lib/home-data';

export default function PointsPage() {
  return <ProtectedRoute><PointsContent /></ProtectedRoute>;
}

function PointsContent() {
  const { user } = useAuth();
  const [coins, setCoins] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumBusy, setPremiumBusy] = useState(false);

  const loadProfile = () => {
    if (!user) return;
    supabase.from('profiles').select('coin_balance, is_premium').eq('id', user.id).single()
      .then(({ data }) => {
        if (!data) return;
        setCoins(data.coin_balance ?? 0);
        setIsPremium(!!(data as { is_premium?: boolean }).is_premium);
      });
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // DEMO: toggle premium without real payment so the perks are visible instantly.
  const handleTogglePremium = async () => {
    if (!user) return;
    setPremiumBusy(true);
    const ok = await setPremiumDemo(user.id, !isPremium);
    if (ok) setIsPremium((p) => !p);
    setPremiumBusy(false);
  };

  const canConvert = coins !== null && coins >= 500;
  const convertableBlocks = canConvert ? Math.floor(coins / 500) : 0;
  const creditValue = convertableBlocks * 2.5;

  // Challenge reward shown to the user — boosted 15% when Premium.
  const rewardFor = (c: Challenge) => applyPremiumPoints(c.reward, isPremium);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-lg px-4 py-6">

        {/* Back + title */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/home" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 transition hover:bg-gray-200">
            <ChevronLeft className="h-5 w-5 text-black" />
          </Link>
          <h1 className="text-xl font-bold text-black">My Points</h1>
        </div>

        {/* Balance hero */}
        <div className="mb-6 rounded-2xl bg-black p-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Coins className="h-5 w-5 text-[#f97316]" />
            <span className="text-sm font-semibold uppercase tracking-wide text-[#f97316]">Your Balance</span>
          </div>
          <p className="text-5xl font-bold text-white">{coins ?? '—'}</p>
          <p className="mt-1 text-sm text-gray-400">Localy Points</p>
        </div>

        {/* Localy Premium */}
        <div className="mb-6 rounded-2xl border border-[#f97316]/40 bg-[#f97316]/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-black">Localy Premium</h2>
                <span className="rounded-full bg-[#f97316] px-2 py-0.5 text-xs font-semibold text-white">$5/month</span>
                {isPremium && (
                  <span className="rounded-full bg-black px-2 py-0.5 text-xs font-semibold text-white">Active</span>
                )}
              </div>
              <ul className="mt-2 space-y-1 text-sm text-black">
                <li className="flex items-start gap-1.5">
                  <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-[#f97316] text-[#f97316]" />
                  <span>Customers earn <strong>15% more points</strong> on everything.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-[#f97316] text-[#f97316]" />
                  <span>Businesses unlock <strong>Localy Emails</strong> tools (AI writing + automation).</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {!isPremium && (
              <Link
                href="/premium"
                className="flex-1 rounded-xl bg-[#f97316] py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
              >
                Upgrade
              </Link>
            )}
            {/* DEMO: toggle premium without real payment */}
            <button
              onClick={handleTogglePremium}
              disabled={premiumBusy}
              className={`rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                isPremium
                  ? 'flex-1 border border-gray-300 text-black hover:bg-gray-100'
                  : 'flex-1 border border-[#f97316] text-[#f97316] hover:bg-[#f97316]/10'
              }`}
            >
              {premiumBusy ? 'Saving…' : isPremium ? 'Deactivate Premium (demo)' : 'Activate Premium (demo)'}
            </button>
          </div>
        </div>

        {/* What are points */}
        <div className="mb-6 rounded-2xl border border-gray-200 p-4">
          <h2 className="mb-2 text-sm font-bold text-black">What are Points?</h2>
          <p className="text-sm leading-relaxed text-black">
            Points are earned by completing daily and monthly challenges. Accumulate enough points and convert them into <strong>Localy credit</strong> — real money off your next order at any local business.
          </p>
        </div>

        {/* Daily challenges */}
        <div className="mb-5">
          <h2 className="mb-2 text-sm font-bold text-black">Daily Challenges</h2>
          <div className="space-y-2">
            {dailyChallenges.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-black">{c.title}</p>
                  <p className="text-xs text-gray-500">{c.current}/{c.goal} completed</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#f97316]">+{rewardFor(c)} pts</span>
                  {isPremium && <p className="text-[11px] font-semibold text-[#f97316]">Premium +15%</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly challenges */}
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-bold text-black">Monthly Challenges</h2>
          <div className="space-y-2">
            {monthlyChallenges.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-black">{c.title}</p>
                  <p className="text-xs text-gray-500">{c.current}/{c.goal} completed</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#f97316]">+{rewardFor(c)} pts</span>
                  {isPremium && <p className="text-[11px] font-semibold text-[#f97316]">Premium +15%</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Convert to credit */}
        <div className="rounded-2xl border border-[#f97316]/40 bg-[#f97316]/5 p-5">
          <h2 className="mb-1 text-sm font-bold text-black">Convert to Localy Credit</h2>
          <p className="mb-4 text-sm text-black">
            Reach <strong>500 points</strong> to convert into real Localy credit, spendable on any order.
          </p>
          <div className="mb-4 space-y-1.5">
            {[
              { pts: 500, credit: 2.5 },
              { pts: 1000, credit: 5 },
              { pts: 2500, credit: 15 },
              { pts: 5000, credit: 35 },
            ].map(row => (
              <div key={row.pts} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span className="text-black">{row.pts.toLocaleString()} pts</span>
                <span className="font-bold text-[#f97316]">→ ${row.credit.toFixed(2)} credit</span>
              </div>
            ))}
          </div>
          <button
            disabled={!canConvert}
            className="w-full rounded-xl bg-[#f97316] py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {canConvert
              ? `Convert ${convertableBlocks * 500} pts → $${creditValue.toFixed(2)} credit`
              : `${coins ?? 0} / 500 pts needed to convert`}
          </button>
        </div>
      </div>
    </div>
  );
}
