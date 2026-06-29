'use client';

/**
 * StatCards — the four headline promotion KPIs (coins spent, views, views/coin, balance).
 * Purpose: Gives creators an at-a-glance summary at the top of the analytics dashboard before the
 *   detailed charts. Purely presentational — receives a pre-computed summary object.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import type { AnalyticsSummary } from '@/models/Analytics';

interface StatCardsProps {
  summary: AnalyticsSummary;
}

export function StatCards({ summary }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg p-4">
        <p className="text-[#f97316]/80 text-xs mb-1">Coins Spent</p>
        <p className="text-[#f97316] text-2xl font-bold"> {summary.totalCoinsSpent.toLocaleString()}</p>
      </div>
      <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg p-4">
        <p className="text-[#f97316]/80 text-xs mb-1">Total Views</p>
        <p className="text-[#f97316] text-2xl font-bold"> {summary.totalViews.toLocaleString()}</p>
      </div>
      <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg p-4">
        <p className="text-[#f97316]/80 text-xs mb-1">Views per Coin</p>
        <p className="text-[#f97316] text-2xl font-bold"> {summary.viewsPerCoin}</p>
      </div>
      <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg p-4">
        <p className="text-[#f97316]/80 text-xs mb-1">Balance</p>
        <p className="text-[#f97316] text-2xl font-bold"> {summary.currentBalance.toLocaleString()}</p>
      </div>
    </div>
  );
}
