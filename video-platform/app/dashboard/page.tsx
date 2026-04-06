'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { QRScanner } from '@/components/QRScanner';
import type { ItemPurchase } from '@/models/Order';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [isBusiness, setIsBusiness] = useState<boolean | null>(null);
  const [pendingOrders, setPendingOrders] = useState<ItemPurchase[]>([]);
  const [completedOrders, setCompletedOrders] = useState<ItemPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; order?: { item_name: string; price: number } } | null>(null);

  useEffect(() => {
    if (!user) return;
    checkBusinessStatus();
  }, [user]);

  useEffect(() => {
    if (isBusiness === true && user) {
      loadOrders();
    }
  }, [isBusiness, user]);

  // Real-time: listen for new orders and status changes
  useEffect(() => {
    if (!user || !isBusiness) return;

    const channel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'item_purchases',
          filter: `seller_id=eq.${user.id}`,
        },
        (payload) => {
          const newOrder = payload.new as ItemPurchase;
          if (newOrder.status === 'paid') {
            setPendingOrders(prev => [newOrder, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'item_purchases',
          filter: `seller_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as ItemPurchase;
          if (updated.status === 'completed') {
            setPendingOrders(prev => prev.filter(o => o.id !== updated.id));
            setCompletedOrders(prev => [updated, ...prev.slice(0, 19)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isBusiness]);

  const checkBusinessStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('type')
      .eq('id', user.id)
      .single();

    if (data?.type) {
      setIsBusiness(true);
    } else {
      setIsBusiness(false);
      router.replace('/profile');
    }
  };

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: pending }, { data: completed }] = await Promise.all([
      supabase
        .from('item_purchases')
        .select('*')
        .eq('seller_id', user.id)
        .eq('status', 'paid')
        .order('purchased_at', { ascending: false }),
      supabase
        .from('item_purchases')
        .select('*')
        .eq('seller_id', user.id)
        .eq('status', 'completed')
        .order('purchased_at', { ascending: false })
        .limit(20),
    ]);

    setPendingOrders(pending || []);
    setCompletedOrders(completed || []);
    setLoading(false);
  };

  const handleScan = useCallback(async (data: string) => {
    setShowScanner(false);

    // Parse the QR URL to extract orderId and token
    try {
      const url = new URL(data);
      const orderId = url.searchParams.get('id');
      const token = url.searchParams.get('token');

      if (!orderId || !token) {
        setScanResult({ success: false, message: 'Invalid QR code format.' });
        return;
      }

      const response = await fetch('/api/orders/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, token }),
      });

      const result = await response.json();

      if (!response.ok) {
        setScanResult({ success: false, message: result.error || 'Failed to complete order.' });
        return;
      }

      setScanResult({
        success: true,
        message: 'Order completed!',
        order: result.order,
      });
    } catch {
      setScanResult({ success: false, message: 'Could not read QR code data.' });
    }
  }, []);

  if (isBusiness === null || (loading && isBusiness)) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white pb-24">
      <div className="w-full px-4 lg:px-12 py-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        {/* Scan result notification */}
        {scanResult && (
          <div className={`mb-4 p-4 rounded-lg border ${
            scanResult.success
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={scanResult.success ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                  {scanResult.message}
                </p>
                {scanResult.order && (
                  <p className="text-white/60 text-sm mt-1">
                    {scanResult.order.item_name} - ${scanResult.order.price.toFixed(2)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setScanResult(null)}
                className="text-white/40 hover:text-white/60"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Pending Orders */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Pending Orders
              {pendingOrders.length > 0 && (
                <span className="ml-2 text-sm bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                  {pendingOrders.length}
                </span>
              )}
            </h2>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
              <p className="text-white/40">No pending orders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <OrderCard key={order.id} order={order} variant="pending" />
              ))}
            </div>
          )}
        </section>

        {/* Completed Orders */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Completed</h2>
          {completedOrders.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
              <p className="text-white/40">No completed orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <OrderCard key={order.id} order={order} variant="completed" />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Floating scan button */}
      <button
        onClick={() => { setScanResult(null); setShowScanner(true); }}
        className="fixed bottom-24 right-4 z-10 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg shadow-green-500/25 transition-all active:scale-95"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      </button>

      {/* QR Scanner overlay */}
      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

function OrderCard({ order, variant }: { order: ItemPurchase; variant: 'pending' | 'completed' }) {
  const date = new Date(order.purchased_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const borderColor = variant === 'pending' ? 'border-yellow-500/30' : 'border-green-500/30';
  const statusColor = variant === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300';

  return (
    <div className={`bg-white/5 border ${borderColor} rounded-lg p-4`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-white">
            {order.item_name}
            {order.quantity && order.quantity > 1 && (
              <span className="text-white/50 font-normal"> x{order.quantity}</span>
            )}
          </p>
          <p className="text-white/40 text-xs mt-0.5">
            Order #{order.id.substring(0, 8)} &middot; {formattedDate} {formattedTime}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium text-white">${order.price.toFixed(2)}</p>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize mt-1 ${statusColor}`}>
            {order.status}
          </span>
        </div>
      </div>
      {order.special_requests && (
        <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-3 py-2">
          <p className="text-yellow-300 text-xs font-medium">Special Request</p>
          <p className="text-white/80 text-sm">{order.special_requests}</p>
        </div>
      )}
    </div>
  );
}
