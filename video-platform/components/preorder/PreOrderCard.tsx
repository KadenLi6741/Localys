'use client';

import { useState } from 'react';
import type { PreOrder } from '@/models/PreOrder';
import { PreOrderStatusBadge } from './PreOrderStatusBadge';
import { QRCodeDisplay } from './QRCodeDisplay';

interface PreOrderCardProps {
  preorder: PreOrder;
  onCancel?: (id: string) => void;
  showQR?: boolean;
}

export function PreOrderCard({ preorder, onCancel, showQR = false }: PreOrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const scheduledDate = new Date(preorder.scheduled_time);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
      <div className="p-4 cursor-pointer hover:bg-white/[0.03] transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-mono font-semibold text-sm">{preorder.order_code}</span>
              <PreOrderStatusBadge status={preorder.status} />
            </div>
            <p className="text-white/60 text-sm">{preorder.business?.business_name || 'Restaurant'}</p>
            <p className="text-white/40 text-xs mt-1">
              {scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' at '}
              {scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-green-400 font-semibold">${Number(preorder.subtotal).toFixed(2)}</p>
            <p className="text-white/30 text-xs">{preorder.order_type}</p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
          {preorder.preorder_items && preorder.preorder_items.length > 0 && (
            <div className="space-y-1">
              {preorder.preorder_items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-white/70">{item.quantity}x {item.item_name}</span>
                  <span className="text-white/50">${(Number(item.item_price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {preorder.restaurant_table && (
            <p className="text-white/50 text-sm">Table: {preorder.restaurant_table.label} ({preorder.restaurant_table.section})</p>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-white/50">Paid</span>
            <span className="text-green-400">${Number(preorder.amount_paid).toFixed(2)}</span>
          </div>
          {Number(preorder.amount_remaining) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Remaining</span>
              <span className="text-yellow-400">${Number(preorder.amount_remaining).toFixed(2)}</span>
            </div>
          )}

          {showQR && ['confirmed', 'preparing', 'ready'].includes(preorder.status) && (
            <div className="pt-3 flex justify-center">
              <QRCodeDisplay qrToken={preorder.qr_token} orderCode={preorder.order_code} size={160} />
            </div>
          )}

          {preorder.notes && <p className="text-white/40 text-xs italic">Note: {preorder.notes}</p>}

          {onCancel && ['confirmed', 'pending_payment'].includes(preorder.status) && (
            <button onClick={(e) => { e.stopPropagation(); onCancel(preorder.id); }} className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm transition-colors">
              Cancel Order
            </button>
          )}
        </div>
      )}
    </div>
  );
}
