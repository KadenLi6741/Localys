'use client';

import { useState, useEffect } from 'react';
import { getUserCoinPurchases, getUserItemPurchases, getBusinessItemSales } from '@/lib/supabase/profiles';
import { supabase } from '@/lib/supabase/client';
import type { CoinPurchase, ItemPurchase } from '@/models/Order';
import { useTranslation } from '@/hooks/useTranslation';
import { OrderQRCode } from '@/components/QRCode';

function DiscountBadge({ item }: { item: ItemPurchase }) {
  const [showTooltip, setShowTooltip] = useState(false);
  if (!item.coupon_code || !item.original_price) return null;

  const discountAmount = item.original_price - item.price;

  return (
    <span className="relative inline-flex items-center gap-1 text-xs text-success font-semibold">
      <span>- ${discountAmount.toFixed(2)}</span>
      <span
        className="cursor-help inline-flex items-center justify-center w-4 h-4 rounded-full bg-success/20 border border-success/40 text-[10px] text-success transition-all duration-200 hover:bg-success/30"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(v => !v)}
      >
        i
      </span>
      {showTooltip && (
        <span className="absolute bottom-full right-0 mb-2 px-3 py-2 rounded-[4px] bg-popover border border-border text-foreground text-xs whitespace-nowrap z-10">
          <span className="block text-primary font-semibold mb-1">Coupon: {item.coupon_code}</span>
          <span className="text-muted-foreground">{item.discount_percentage}% off</span>
        </span>
      )}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; icon: string }> = {
    paid: { bg: 'bg-primary/15 border border-primary/40', text: 'text-primary', icon: '$' },
    completed: { bg: 'bg-success/15 border border-success/40', text: 'text-success', icon: '✓' },
    delivered: { bg: 'bg-success/15 border border-success/40', text: 'text-success', icon: '✓' },
    pending: { bg: 'bg-primary/15 border border-primary/40', text: 'text-primary', icon: '•••' },
    shipped: { bg: 'bg-primary/15 border border-primary/40', text: 'text-primary', icon: '→' },
    failed: { bg: 'bg-destructive/15 border border-destructive/40', text: 'text-destructive', icon: '✕' },
    cancelled: { bg: 'bg-destructive/15 border border-destructive/40', text: 'text-destructive', icon: '✕' },
  };

  const style = styles[status] || styles.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[4px] font-semibold capitalize transition-all duration-200 ${style.bg} ${style.text}`}>
      <span>{style.icon}</span>
      <span>{status}</span>
    </span>
  );
}

interface OrderHistoryProps {
  userId: string;
  businessId?: string;
  isBusiness?: boolean;
}

export function OrderHistory({ userId, businessId, isBusiness = false }: OrderHistoryProps) {
  const { t } = useTranslation();
  const [coinPurchases, setCoinPurchases] = useState<CoinPurchase[]>([]);
  const [itemPurchases, setItemPurchases] = useState<ItemPurchase[]>([]);
  const [itemSales, setItemSales] = useState<ItemPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
  const [tablesExist, setTablesExist] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [userId, isBusiness]);

  // Supabase Realtime: listen for status changes on the user's orders
  useEffect(() => {
    const channel = supabase
      .channel('order-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'item_purchases',
          filter: `buyer_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as ItemPurchase;
          setItemPurchases(prev =>
            prev.map(p => p.id === updated.id ? { ...p, status: updated.status } : p)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data: coins } = await getUserCoinPurchases(userId);
      const { data: items } = await getUserItemPurchases(userId);

      setCoinPurchases(coins || []);
      setItemPurchases(items || []);

      if (isBusiness) {
        const { data: sales } = await getBusinessItemSales(userId);
        setItemSales(sales || []);
      }

      setTablesExist(true);
    } catch (error) {
      console.error('Error loading orders:', error);
      setCoinPurchases([]);
      setItemPurchases([]);
      setItemSales([]);
      setTablesExist(false);
    } finally {
      setLoading(false);
    }
  };

  const allPurchases = [...coinPurchases, ...itemPurchases].sort((a, b) => {
    const dateA = new Date('created_at' in a ? a.created_at : a.purchased_at).getTime();
    const dateB = new Date('created_at' in b ? b.created_at : b.purchased_at).getTime();
    return dateB - dateA;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tablesExist) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Order history feature coming soon!</p>
      </div>
    );
  }

  if (isBusiness) {
    const hasPurchases = coinPurchases.length > 0 || itemPurchases.length > 0;
    const hasSales = itemSales.length > 0;

    if (!hasPurchases && !hasSales) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No orders yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-4 border-b border-border">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-[4px] ${
              activeTab === 'purchases'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Purchases {hasPurchases ? `(${coinPurchases.length + itemPurchases.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-[4px] ${
              activeTab === 'sales'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sales {hasSales ? `(${itemSales.length})` : ''}
          </button>
        </div>

        {activeTab === 'purchases' && (
          <div className="space-y-3">
            {allPurchases.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground/60 text-sm">No purchases</p>
            ) : (
              allPurchases.map((order, idx) => (
                <div key={idx} className="order-card">
                  <OrderItem order={order} />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-3">
            {itemSales.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground/60 text-sm">No sales yet</p>
            ) : (
              itemSales.map((sale, idx) => (
                <div key={idx} className="order-card">
                  <SaleItem sale={sale} />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  if (allPurchases.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allPurchases.map((order, idx) => (
        <div key={idx} className="order-card">
          <OrderItem order={order} />
        </div>
      ))}
    </div>
  );
}

function OrderItem({ order }: { order: CoinPurchase | ItemPurchase }) {
  const [showQR, setShowQR] = useState(false);
  const isCoinPurchase = 'coins' in order;
  const date = new Date(isCoinPurchase ? order.created_at : order.purchased_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  if (isCoinPurchase) {
    const coins = order as CoinPurchase;
    return (
      <div className="bg-card border border-primary/30 rounded-[4px] p-4 hover:bg-surface hover:border-primary/40 transition-all duration-200">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 font-bold text-sm">C</div>
            <div>
              <p className="font-medium text-foreground">Coin Purchase</p>
              <p className="text-muted-foreground text-sm">{coins.coins} coins</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-primary">{coins.coins}x coins</p>
            <p className="text-muted-foreground text-xs">{formattedDate}</p>
          </div>
        </div>
      </div>
    );
  }

  const item = order as ItemPurchase;
  const isPaid = item.status === 'paid';

  return (
    <div className="bg-card border border-border rounded-[4px] p-4 hover:bg-surface hover:border-primary/40 transition-all duration-200 active:scale-95">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          </div>
          <div>
            <p className="font-semibold text-foreground">{item.item_name}</p>
            <p className="text-muted-foreground text-sm">Order #{item.id.substring(0, 8)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-primary">
            {item.original_price ? `$${item.original_price.toFixed(2)}` : `$${item.price.toFixed(2)}`}
          </p>
          <DiscountBadge item={item} />
          <p className="text-muted-foreground text-xs mt-1">{formattedDate}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border">
        <StatusBadge status={item.status} />
        {isPaid && item.verification_token && (
          <button
            onClick={() => setShowQR(!showQR)}
            className="text-xs px-3 py-1.5 min-h-[44px] rounded-[4px] bg-success/15 border border-success/40 text-success hover:bg-success/25 transition-all duration-200 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {showQR ? 'Hide QR' : 'Show QR'}
          </button>
        )}
      </div>
      {item.special_requests && (
        <div className="mt-3 px-3 py-2 bg-primary/10 border border-primary/30 rounded-[4px]">
          <p className="text-xs font-semibold text-primary mb-0.5">Special Request</p>
          <p className="text-xs text-foreground">{item.special_requests}</p>
        </div>
      )}
      {showQR && isPaid && item.verification_token && (
        <div className="mt-3 flex flex-col items-center py-3 border-t border-border">
          <p className="text-muted-foreground text-xs mb-2">Show at pickup</p>
          <OrderQRCode orderId={item.id} token={item.verification_token} size={160} />
        </div>
      )}
    </div>
  );
}

function SaleItem({ sale }: { sale: ItemPurchase }) {
  const date = new Date(sale.purchased_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="bg-card border border-border rounded-[4px] p-4 hover:bg-surface hover:border-success/40 transition-all duration-200 active:scale-95">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <div>
            <p className="font-semibold text-foreground">{sale.item_name}</p>
            <p className="text-muted-foreground text-sm">Order #{sale.id.substring(0, 8)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-success">${sale.price.toFixed(2)}</p>
          <p className="text-muted-foreground text-xs mt-1">{formattedDate}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border">
        <StatusBadge status={sale.status} />
      </div>
      {sale.special_requests && (
        <div className="mt-3 px-3 py-2 bg-warning/15 border border-warning/40 rounded-[4px]">
          <p className="text-xs font-semibold text-warning mb-0.5">⚠ Special Request</p>
          <p className="text-sm text-foreground font-medium">{sale.special_requests}</p>
        </div>
      )}
    </div>
  );
}
