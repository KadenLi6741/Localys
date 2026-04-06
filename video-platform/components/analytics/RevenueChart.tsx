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
    <div className="bg-[#1A1A1A]/90 border border-[#3A3A34] rounded-lg p-3 shadow-lg">
      <p className="text-white/70 text-xs mb-1">{label}</p>
      <p className="text-[#1B5EA8] font-semibold">${payload[0].value.toFixed(2)}</p>
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [range, setRange] = useState<TimeRange>('month');
  const filtered = filterByRange(data, range);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[#1A1A1A]">Revenue Over Time</h4>
        <div className="flex gap-1">
          {(['week', 'month', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                range === r
                  ? 'bg-[#1B5EA8] text-white'
                  : 'bg-[#F8F8F6] text-[#6B6B65] hover:text-[#1A1A1A]'
              }`}
            >
              {r === 'week' ? 'Week' : r === 'month' ? 'Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length < 2 ? (
        <div className="h-[200px] flex items-center justify-center text-[#6B6B65] text-sm">
          Not enough data to display chart
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={filtered} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1B5EA8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1B5EA8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E4" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6B6B65', fontSize: 11 }}
              tickFormatter={(val: string) => val.substring(5)}
              axisLine={{ stroke: '#E8E8E4' }}
            />
            <YAxis
              tick={{ fill: '#6B6B65', fontSize: 11 }}
              axisLine={{ stroke: '#E8E8E4' }}
              tickFormatter={(val: number) => `$${val}`}
            />
            <Tooltip content={<RevenueTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#1B5EA8"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
