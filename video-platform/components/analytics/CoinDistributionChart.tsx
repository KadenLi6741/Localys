'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import type { CoinDistribution } from '@/models/Analytics';

interface CoinDistributionChartProps {
  data: CoinDistribution[];
}

const PIE_COLORS = [
  '#eab308', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#f97316',
  '#14b8a6', '#f43f5e', '#8b5cf6', '#06b6d4',
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: CoinDistribution }[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="bg-black/90 border border-white/20 rounded-lg p-3 shadow-lg">
      <p className="text-white text-sm font-semibold mb-1">{entry.title}</p>
      <p className="text-yellow-400 text-xs">🪙 {entry.coinsSpent} coins ({entry.percentage}%)</p>
    </div>
  );
}

function CustomLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx);
  const cy = Number(props.cy);
  const midAngle = Number(props.midAngle);
  const innerRadius = Number(props.innerRadius);
  const outerRadius = Number(props.outerRadius);
  const percent = Number(props.percent);
  const pct = Math.round(percent * 100);
  if (pct < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {pct}%
    </text>
  );
}

export function CoinDistributionChart({ data }: CoinDistributionChartProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-white/80 mb-3">📊 Coin Distribution by Video</h4>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="coinsSpent"
            nameKey="title"
            label={CustomLabel}
            labelLine={false}
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) => <span className="text-white/60 text-xs">{value}</span>}
            wrapperStyle={{ fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
