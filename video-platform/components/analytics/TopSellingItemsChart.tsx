'use client';

import type { TopSellingItem } from '@/models/Analytics';

interface TopSellingItemsChartProps {
  data: TopSellingItem[];
}

export function TopSellingItemsChart({ data }: TopSellingItemsChartProps) {
  if (data.length === 0) return null;

  const maxUnits = Math.max(...data.map(d => d.unitsSold), 1);

  return (
    <div>
      <h4 className="text-sm font-semibold text-[#F5F0E8]/80 mb-3">🏆 Top Selling Items</h4>
      <div className="space-y-3">
        {data.map((item, i) => {
          const pct = (item.unitsSold / maxUnits) * 100;
          return (
            <div key={item.itemName} className="flex items-center gap-3">
              <span className="text-[#F5F0E8] text-sm w-28 truncate flex-shrink-0" title={item.itemName}>
                {item.itemName}
              </span>
              <div className="flex-1 h-6 bg-[#1A1A18] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #F5A623, #F5A623cc)',
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              </div>
              <span className="text-[#F5A623] text-sm font-semibold w-8 text-right flex-shrink-0">
                {item.unitsSold}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
