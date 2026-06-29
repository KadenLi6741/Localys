'use client';

/**
 * CoinDistributionChart — pie chart of how a creator's promotion coins are split across videos.
 * Purpose: Shows which videos a creator has invested the most promotion coins in. Renders nothing
 *   when there's no data. Uses an on-brand orange/grey palette only.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

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

// Orange-family + grays only — on-brand, no blue/green/yellow/purple.
const PIE_COLORS = [
  '#f97316', '#111111', '#fdba74', '#9ca3af', '#fb923c', '#d1d5db',
  '#c2410c', '#6b7280', '#ffb380', '#4b5563',
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: CoinDistribution }[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="bg-[#1A1A18]/90 border border-white/20 rounded-lg p-3 shadow-lg">
      <p className="text-white text-sm font-semibold mb-1">{entry.title}</p>
      <p className="text-[#f97316] text-xs">{entry.coinsSpent} coins ({entry.percentage}%)</p>
    </div>
  );
}

// Draws the percentage label centred inside each pie slice; hides labels for tiny (<5%) slices
// to avoid cluttered, overlapping text.
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
      <h4 className="text-sm font-semibold text-white/80 mb-3">Coin Distribution by Video</h4>
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
