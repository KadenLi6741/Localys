'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { VideoConversion } from '@/models/Analytics';

interface VideoConversionChartProps {
  data: VideoConversion[];
}

function ConversionTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1A]/90 border border-[#3A3A34] rounded-lg p-3 shadow-lg">
      <p className="text-white text-sm font-semibold mb-1">{label}</p>
      {payload.map((p, idx) => (
        <p key={idx} className="text-xs" style={{ color: p.name === 'views' ? '#1B5EA8' : '#6BAF7A' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export function VideoConversionChart({ data }: VideoConversionChartProps) {
  if (data.length === 0) return null;

  const chartData = data.map(v => ({
    name: v.caption.length > 20 ? v.caption.substring(0, 20) + '…' : v.caption,
    views: v.views,
    orders: v.orders,
  }));

  return (
    <div>
      <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3">Video Performance</h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E4" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6B6B65', fontSize: 10 }}
            axisLine={{ stroke: '#E8E8E4' }}
          />
          <YAxis
            tick={{ fill: '#6B6B65', fontSize: 11 }}
            axisLine={{ stroke: '#E8E8E4' }}
          />
          <Tooltip content={<ConversionTooltip />} />
          <Bar dataKey="views" fill="#1B5EA8" radius={[4, 4, 0, 0]} barSize={20} name="views" />
          <Bar dataKey="orders" fill="#6BAF7A" radius={[4, 4, 0, 0]} barSize={20} name="orders" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
