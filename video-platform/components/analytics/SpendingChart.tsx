'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { SpendingDataPoint } from '@/models/Analytics';

interface SpendingChartProps {
  data: SpendingDataPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/90 border border-white/20 rounded-lg p-3 shadow-lg">
      <p className="text-white/60 text-xs mb-1">{label}</p>
      <p className="text-yellow-400 font-semibold">🪙 {payload[0].value} coins</p>
    </div>
  );
}

export function SpendingChart({ data }: SpendingChartProps) {
  if (data.length < 2) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-white/80 mb-3">🪙 Spending Over Time</h4>
        <div className="h-[200px] flex items-center justify-center text-white/40 text-sm">
          Not enough data to display chart
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-white/80 mb-3">🪙 Spending Over Time</h4>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#ffffff60', fontSize: 11 }}
            tickFormatter={(val: string) => val.substring(5)}
            axisLine={{ stroke: '#ffffff10' }}
          />
          <YAxis
            tick={{ fill: '#ffffff60', fontSize: 11 }}
            axisLine={{ stroke: '#ffffff10' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="coinsSpent"
            stroke="#eab308"
            strokeWidth={2}
            fill="url(#spendingGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
