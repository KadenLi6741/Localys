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
import type { ViewsDataPoint } from '@/models/Analytics';

interface ViewsChartProps {
  data: ViewsDataPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: ViewsDataPoint }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as ViewsDataPoint;
  return (
    <div className="bg-black/90 border border-white/20 rounded-lg p-3 shadow-lg">
      <p className="text-white/60 text-xs mb-1">{label}</p>
      <p className="text-blue-400 font-semibold">👁️ {payload[0].value} views</p>
      {point.promoted && (
        <p className="text-yellow-400 text-xs mt-1">⭐ Promotion day</p>
      )}
    </div>
  );
}

function CustomDot(props: { cx?: number; cy?: number; payload?: ViewsDataPoint }) {
  const { cx, cy, payload } = props;
  if (!payload?.promoted || cx === undefined || cy === undefined) return null;
  return (
    <svg x={cx - 6} y={cy - 6} width={12} height={12}>
      <text x={6} y={10} textAnchor="middle" fontSize={12}>⭐</text>
    </svg>
  );
}

export function ViewsChart({ data }: ViewsChartProps) {
  if (data.length < 2) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-white/80 mb-3">👁️ Views Over Time</h4>
        <div className="h-[200px] flex items-center justify-center text-white/40 text-sm">
          Not enough data to display chart
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-white/80 mb-3">👁️ Views Over Time</h4>
      <div className="flex items-center gap-4 mb-2 text-xs text-white/40">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-blue-400 inline-block rounded" /> Views
        </span>
        <span className="flex items-center gap-1">⭐ Promotion day</span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
            dataKey="views"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#viewsGradient)"
            dot={<CustomDot />}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
