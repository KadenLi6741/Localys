'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { RevenueDataPoint } from '@/models/Analytics';

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

type TimeRange = 'week' | 'month' | 'all';

function filterByRange(data: RevenueDataPoint[], range: TimeRange): RevenueDataPoint[] {
  if (range === 'all' || data.length === 0) return data;
  const now = new Date();
  const cutoff = new Date(now);
  if (range === 'week') cutoff.setDate(cutoff.getDate() - 7);
  else cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().substring(0, 10);
  return data.filter(d => d.date >= cutoffStr);
}

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-charcoal)]/90 border border-[var(--color-charcoal-lighter-plus)] rounded-lg p-3 shadow-lg">
      <p className="text-[var(--color-body-text)] text-xs mb-1">{label}</p>
      <p className="text-[#F5A623] font-semibold">${payload[0].value.toFixed(2)}</p>
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [range, setRange] = useState<TimeRange>('month');
  const filtered = filterByRange(data, range);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--color-cream)]/80">💰 Revenue Over Time</h4>
        <div className="flex gap-1">
          {(['week', 'month', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                range === r
                  ? 'bg-[#F5A623] text-black'
                  : 'bg-[var(--color-charcoal-lighter)] text-[var(--color-body-text)] hover:text-[var(--color-cream)]'
              }`}
            >
              {r === 'week' ? 'Week' : r === 'month' ? 'Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length < 2 ? (
        <div className="h-[200px] flex items-center justify-center text-[var(--color-body-text)] text-sm">
          Not enough data to display chart
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={filtered} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F5A623" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--color-body-text)', fontSize: 11 }}
              tickFormatter={(val: string) => val.substring(5)}
              axisLine={{ stroke: '#ffffff08' }}
            />
            <YAxis
              tick={{ fill: 'var(--color-body-text)', fontSize: 11 }}
              axisLine={{ stroke: '#ffffff08' }}
              tickFormatter={(val: number) => `$${val}`}
            />
            <Tooltip content={<RevenueTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#F5A623"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
