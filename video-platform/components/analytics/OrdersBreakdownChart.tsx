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
import type { OrdersBreakdown } from '@/models/Analytics';

interface OrdersBreakdownChartProps {
  data: OrdersBreakdown[];
}

function BreakdownTooltip({ active, payload }: { active?: boolean; payload?: { payload: OrdersBreakdown }[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="bg-[#1A1A18]/90 border border-[#3A3A34] rounded-lg p-3 shadow-lg">
      <p className="text-[#F5F0E8] text-sm font-semibold mb-1">{entry.status}</p>
      <p className="text-[#F5A623] text-xs">{entry.count} orders</p>
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
    <text x={x} y={y} fill="#F5F0E8" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {pct}%
    </text>
  );
}

export function OrdersBreakdownChart({ data }: OrdersBreakdownChartProps) {
  if (data.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-[#F5F0E8]/80 mb-3">📦 Orders Breakdown</h4>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="count"
            nameKey="status"
            label={CustomLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<BreakdownTooltip />} />
          <Legend
            formatter={(value: string) => <span className="text-[#9E9A90] text-xs">{value}</span>}
            wrapperStyle={{ fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
