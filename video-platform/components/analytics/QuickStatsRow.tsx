'use client';

import type { QuickStats } from '@/models/Analytics';

interface QuickStatsRowProps {
  stats: QuickStats;
}

export function QuickStatsRow({ stats }: QuickStatsRowProps) {
  const changeIsPositive = stats.revenueChangePercent >= 0;

  return (
    <div>
      <h4 className="text-sm font-semibold text-[var(--color-cream)]/80 mb-3">⚡ Quick Stats</h4>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--color-charcoal)] rounded-xl p-3">
          <p className="text-[11px] text-[var(--color-body-text)] mb-1">Avg Order Value</p>
          <p className="text-lg font-bold text-[#F5A623]">
            ${stats.averageOrderValue.toFixed(2)}
          </p>
        </div>
        <div className="bg-[var(--color-charcoal)] rounded-xl p-3">
          <p className="text-[11px] text-[var(--color-body-text)] mb-1">Best Selling Day</p>
          <p className="text-lg font-bold text-[var(--color-cream)]">{stats.bestSellingDay}</p>
        </div>
        <div className="bg-[var(--color-charcoal)] rounded-xl p-3">
          <p className="text-[11px] text-[var(--color-body-text)] mb-1">Return Rate</p>
          <p className="text-lg font-bold text-[#6BAF7A]">{stats.returnRate}%</p>
        </div>
        <div className="bg-[var(--color-charcoal)] rounded-xl p-3">
          <p className="text-[11px] text-[var(--color-body-text)] mb-1">Month vs Last</p>
          <p className={`text-lg font-bold flex items-center gap-1 ${changeIsPositive ? 'text-[#6BAF7A]' : 'text-[#E05C3A]'}`}>
            <svg className={`w-4 h-4 ${changeIsPositive ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            {Math.abs(stats.revenueChangePercent)}%
          </p>
        </div>
      </div>
    </div>
  );
}
