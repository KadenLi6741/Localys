'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerPreOrders, cancelPreOrder } from '@/lib/supabase/preorders';
import { PreOrderCard } from '@/components/preorder/PreOrderCard';
import type { PreOrder } from '@/models/PreOrder';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    const { data } = await getCustomerPreOrders(user.id);
    setOrders(data || []);
    setLoading(false);
  };

  const handleCancel = async (orderId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to cancel this order?')) return;
    await cancelPreOrder(orderId, user.id);
    loadOrders();
  };

  const activeOrders = orders.filter((o) => ['pending_payment', 'confirmed', 'preparing', 'ready'].includes(o.status));
  const pastOrders = orders.filter((o) => ['arrived', 'completed', 'cancelled'].includes(o.status));

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Loading orders...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-white text-2xl font-bold mb-6">My Pre-Orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/40 mb-4">No pre-orders yet</p>
            <p className="text-white/30 text-sm">Browse restaurants to place your first pre-order</p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-white/60 text-sm font-semibold mb-3 uppercase tracking-wider">Active Orders</h2>
                <div className="space-y-3">
                  {activeOrders.map((order) => (
                    <PreOrderCard key={order.id} preorder={order} onCancel={handleCancel} showQR />
                  ))}
                </div>
              </div>
            )}

            {pastOrders.length > 0 && (
              <div>
                <h2 className="text-white/60 text-sm font-semibold mb-3 uppercase tracking-wider">Past Orders</h2>
                <div className="space-y-3">
                  {pastOrders.map((order) => (
                    <PreOrderCard key={order.id} preorder={order} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
