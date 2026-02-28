'use client';

import type { AnalyticsSummary } from '@/models/Analytics';

interface StatCardsProps {
  summary: AnalyticsSummary;
}

export function StatCards({ summary }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <p className="text-yellow-400/80 text-xs mb-1">Coins Spent</p>
        <p className="text-yellow-400 text-2xl font-bold"> {summary.totalCoinsSpent.toLocaleString()}</p>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-400/80 text-xs mb-1">Total Views</p>
        <p className="text-blue-400 text-2xl font-bold"> {summary.totalViews.toLocaleString()}</p>
      </div>
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
        <p className="text-green-400/80 text-xs mb-1">Views per Coin</p>
        <p className="text-green-400 text-2xl font-bold"> {summary.viewsPerCoin}</p>
      </div>
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
        <p className="text-purple-400/80 text-xs mb-1">Balance</p>
        <p className="text-purple-400 text-2xl font-bold"> {summary.currentBalance.toLocaleString()}</p>
      </div>
    </div>
  );
}
