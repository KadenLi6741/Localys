'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

interface BusyTimesChartProps {
  data: { hour: number; level: number }[];
}

function getBarColor(level: number): string {
  if (level <= 25) return '#22c55e';
  if (level <= 50) return '#eab308';
  if (level <= 75) return '#f97316';
  return '#ef4444';
}

function formatHour(hour: number): string {
  if (hour === 0) return '12a';
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return '12p';
  return `${hour - 12}p`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: number }) {
  if (!active || !payload?.length || label === undefined) return null;
  const level = payload[0].value;
  const busyLabel = level <= 25 ? 'Not busy' : level <= 50 ? 'Moderate' : level <= 75 ? 'Busy' : 'Very busy';
  return (
    <div className="bg-black/90 border border-white/20 rounded-lg p-3 shadow-lg">
      <p className="text-white/60 text-xs mb-1">{formatHour(label)}</p>
      <p className="text-white font-semibold text-sm">{busyLabel} ({level}%)</p>
    </div>
  );
}

export function BusyTimesChart({ data }: BusyTimesChartProps) {
  const chartData = data.map((d) => ({ name: formatHour(d.hour), hour: d.hour, level: d.level }));

  if (chartData.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-white/40 text-sm">No busy times data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis
          dataKey="name"
          tick={{ fill: '#ffffff60', fontSize: 10 }}
          axisLine={{ stroke: '#ffffff10' }}
          interval={2}
        />
        <YAxis
          tick={{ fill: '#ffffff60', fontSize: 10 }}
          axisLine={{ stroke: '#ffffff10' }}
          domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="level" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry.level)} fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
