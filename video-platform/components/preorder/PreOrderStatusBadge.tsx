'use client';

import type { PreOrderStatus } from '@/models/PreOrder';

const STATUS_CONFIG: Record<PreOrderStatus, { label: string; color: string }> = {
  pending_payment: { label: 'Pending Payment', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  confirmed: { label: 'Confirmed', color: 'bg-green-500/20 text-green-300 border-green-500/40' },
  preparing: { label: 'Preparing', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  ready: { label: 'Ready', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  arrived: { label: 'Arrived', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  completed: { label: 'Completed', color: 'bg-white/10 text-white/60 border-white/20' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
};

export function PreOrderStatusBadge({ status }: { status: PreOrderStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}
