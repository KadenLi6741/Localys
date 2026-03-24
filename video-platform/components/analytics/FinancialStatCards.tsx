'use client';

import type { FinancialSummary } from '@/models/Analytics';

interface FinancialStatCardsProps {
  summary: FinancialSummary;
}

const cards = [
  { key: 'totalRevenue', icon: '💰', label: 'Total Revenue', prefix: '$' },
  { key: 'totalOrders', icon: '📦', label: 'Total Orders', prefix: '' },
  { key: 'completedOrders', icon: '✅', label: 'Completed', prefix: '' },
  { key: 'cancelledOrders', icon: '❌', label: 'Cancelled', prefix: '' },
] as const;

export function FinancialStatCards({ summary }: FinancialStatCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => {
        const value = summary[card.key];
        const formatted = card.key === 'totalRevenue'
          ? `${card.prefix}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : `${card.prefix}${value.toLocaleString()}`;

        return (
          <div
            key={card.key}
            className="entrance-fade bg-[var(--color-charcoal-lighter)] rounded-xl p-4 transition-shadow duration-200 hover:shadow-[0_0_20px_rgba(245,166,35,0.1)]"
            style={{
              animation: `fadeInUp 0.4s ease-out ${i * 0.08}s forwards`,
              opacity: 0,
            }}
          >
            <p className="text-[12px] text-[var(--color-cream)]/70 mb-1">
              {card.icon} {card.label}
            </p>
            <p className="text-[24px] font-bold text-[#F5A623]">{formatted}</p>
          </div>
        );
      })}
    </div>
  );
}
