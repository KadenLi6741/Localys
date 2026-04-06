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
      <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3">Top Selling Items</h4>
      <div className="space-y-3">
        {data.map((item, i) => {
          const pct = (item.unitsSold / maxUnits) * 100;
          return (
            <div key={item.itemName} className="flex items-center gap-3">
              <span className="text-[#1A1A1A] text-sm w-28 truncate flex-shrink-0" title={item.itemName}>
                {item.itemName}
              </span>
              <div className="flex-1 h-6 bg-[#F0F0EC] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #1B5EA8, #1B5EA8cc)',
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              </div>
              <span className="text-[#1B5EA8] text-sm font-semibold w-8 text-right flex-shrink-0">
                {item.unitsSold}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
