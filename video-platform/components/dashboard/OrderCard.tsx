'use client';

import type { PreOrder, PreOrderStatus } from '@/models/PreOrder';
import { PreOrderStatusBadge } from '@/components/preorder/PreOrderStatusBadge';

interface OrderCardProps {
  preorder: PreOrder;
  onStatusUpdate: (id: string, status: PreOrderStatus) => void;
}

const NEXT_STATUS: Partial<Record<PreOrderStatus, { label: string; next: PreOrderStatus }>> = {
  confirmed: { label: 'Start Preparing', next: 'preparing' },
  preparing: { label: 'Mark Ready', next: 'ready' },
  ready: { label: 'Awaiting Arrival', next: 'ready' },
  arrived: { label: 'Complete Order', next: 'completed' },
};

export function OrderCard({ preorder, onStatusUpdate }: OrderCardProps) {
  const scheduledDate = new Date(preorder.scheduled_time);
  const action = NEXT_STATUS[preorder.status];

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-mono font-semibold">{preorder.order_code}</span>
            <PreOrderStatusBadge status={preorder.status} />
          </div>
          {preorder.customer && (
            <p className="text-white/60 text-sm">{preorder.customer.full_name || preorder.customer.username}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-white/40 text-xs">
            {scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
          <p className="text-green-400 font-semibold text-sm">${Number(preorder.subtotal).toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-1">
        {preorder.preorder_items?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-white/70">{item.quantity}x {item.item_name}</span>
            <span className="text-white/40">${(Number(item.item_price) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {preorder.restaurant_table && (
        <p className="text-white/50 text-xs">Table: {preorder.restaurant_table.label} ({preorder.restaurant_table.section})</p>
      )}

      {preorder.notes && <p className="text-white/40 text-xs italic">Note: {preorder.notes}</p>}

      {Number(preorder.amount_remaining) > 0 && (
        <p className="text-yellow-400/80 text-xs">Remaining balance: ${Number(preorder.amount_remaining).toFixed(2)}</p>
      )}

      {action && action.next !== preorder.status && (
        <button
          onClick={() => onStatusUpdate(preorder.id, action.next)}
          className="w-full py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-300 text-sm font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
