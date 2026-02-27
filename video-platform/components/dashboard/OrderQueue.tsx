'use client';

import { useState, useEffect } from 'react';
import type { PreOrder, PreOrderStatus } from '@/models/PreOrder';
import { getBusinessPreOrders, updatePreOrderStatus } from '@/lib/supabase/preorders';
import { OrderCard } from './OrderCard';
import { supabase } from '@/lib/supabase/client';

interface OrderQueueProps {
  businessId: string;
}

const STATUS_FILTERS: { label: string; statuses: PreOrderStatus[] }[] = [
  { label: 'All Active', statuses: ['confirmed', 'preparing', 'ready', 'arrived'] },
  { label: 'Confirmed', statuses: ['confirmed'] },
  { label: 'Preparing', statuses: ['preparing'] },
  { label: 'Ready', statuses: ['ready'] },
  { label: 'Arrived', statuses: ['arrived'] },
];

export function OrderQueue({ businessId }: OrderQueueProps) {
  const [orders, setOrders] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(0);

  useEffect(() => {
    loadOrders();
  }, [businessId, activeFilter]);

  useEffect(() => {
    const channel = supabase
      .channel('preorders-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'preorders',
        filter: `business_id=eq.${businessId}`,
      }, () => {
        loadOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessId]);

  const loadOrders = async () => {
    const filter = STATUS_FILTERS[activeFilter].statuses;
    const { data } = await getBusinessPreOrders(businessId, filter);
    setOrders(data || []);
    setLoading(false);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: PreOrderStatus) => {
    await updatePreOrderStatus(orderId, newStatus);
    loadOrders();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((filter, i) => (
          <button
            key={filter.label}
            onClick={() => setActiveFilter(i)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeFilter === i ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40 hover:text-white/70'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-8">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-white/40 text-center py-8 text-sm">No orders matching this filter</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} preorder={order} onStatusUpdate={handleStatusUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
