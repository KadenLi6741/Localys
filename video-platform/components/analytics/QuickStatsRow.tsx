'use client';

/**
 * QuickStatsRow — four headline business KPIs (avg order value, best day, return rate, MoM change).
 * Purpose: Summarises a business's performance at the top of the financial dashboard. The month-over-
 *   month figure flips colour/arrow direction depending on whether revenue grew or fell.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import type { QuickStats } from '@/models/Analytics';

interface QuickStatsRowProps {
  stats: QuickStats;
}

export function QuickStatsRow({ stats }: QuickStatsRowProps) {
  // Drives the arrow direction and colour of the month-over-month revenue indicator.
  const changeIsPositive = stats.revenueChangePercent >= 0;

  return (
    <div>
      <h4 className="text-sm font-semibold text-[#F5F0E8]/80 mb-3">Quick Stats</h4>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#1A1A18] rounded-xl p-3">
          <p className="text-[11px] text-[#9E9A90] mb-1">Avg Order Value</p>
          <p className="text-lg font-bold text-[#f97316]">
            ${stats.averageOrderValue.toFixed(2)}
          </p>
        </div>
        <div className="bg-[#1A1A18] rounded-xl p-3">
          <p className="text-[11px] text-[#9E9A90] mb-1">Best Selling Day</p>
          <p className="text-lg font-bold text-[#F5F0E8]">{stats.bestSellingDay}</p>
        </div>
        <div className="bg-[#1A1A18] rounded-xl p-3">
          <p className="text-[11px] text-[#9E9A90] mb-1">Return Rate</p>
          <p className="text-lg font-bold text-[#f97316]">{stats.returnRate}%</p>
        </div>
        <div className="bg-[#1A1A18] rounded-xl p-3">
          <p className="text-[11px] text-[#9E9A90] mb-1">Month vs Last</p>
          <p className={`text-lg font-bold flex items-center gap-1 ${changeIsPositive ? 'text-[#f97316]' : 'text-[#E05C3A]'}`}>
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
