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
    <span className="relative inline-flex items-center gap-1 text-xs text-[#6BAF7A] font-semibold">
      <span>- ${discountAmount.toFixed(2)}</span>
      <span
        className="cursor-help inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#6BAF7A]/20 border border-[#6BAF7A]/40 text-[10px] text-[#6BAF7A] transition-all duration-200 hover:bg-[#6BAF7A]/30"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(v => !v)}
      >
        i
      </span>
      {showTooltip && (
        <span className="absolute bottom-full right-0 mb-2 px-3 py-2 rounded-lg bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] text-[var(--color-cream)] text-xs whitespace-nowrap z-10 shadow-lg">
          <span className="block text-[#F5A623] font-semibold mb-1">Coupon: {item.coupon_code}</span>
          <span className="text-[var(--color-body-text)]">{item.discount_percentage}% off</span>
        </span>
      )}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; icon: string }> = {
    paid: { bg: 'bg-[#F5A623]/15 border border-[#F5A623]/40', text: 'text-[#F5A623]', icon: '💳' },
    completed: { bg: 'bg-[#6BAF7A]/15 border border-[#6BAF7A]/40', text: 'text-[#6BAF7A]', icon: '✓' },
    delivered: { bg: 'bg-[#6BAF7A]/15 border border-[#6BAF7A]/40', text: 'text-[#6BAF7A]', icon: '📦' },
    pending: { bg: 'bg-[#F5A623]/15 border border-[#F5A623]/40', text: 'text-[#F5A623]', icon: '⏳' },
    shipped: { bg: 'bg-[#F5A623]/15 border border-[#F5A623]/40', text: 'text-[#F5A623]', icon: '🚚' },
    failed: { bg: 'bg-[#E05C3A]/15 border border-[#E05C3A]/40', text: 'text-[#E05C3A]', icon: '✕' },
    cancelled: { bg: 'bg-[#E05C3A]/15 border border-[#E05C3A]/40', text: 'text-[#E05C3A]', icon: '✕' },
  };

  const style = styles[status] || styles.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold capitalize transition-all duration-200 ${style.bg} ${style.text} shadow-sm hover:shadow-md`}>
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F5A623]"></div>
      </div>
    );
  }

  if (!tablesExist) {
    return (
      <div className="text-center py-8 text-[var(--color-body-text)]">
        <p className="text-sm">Order history feature coming soon!</p>
      </div>
    );
  }

  if (isBusiness) {
    const hasPurchases = coinPurchases.length > 0 || itemPurchases.length > 0;
    const hasSales = itemSales.length > 0;

    if (!hasPurchases && !hasSales) {
      return (
        <div className="text-center py-8 text-[var(--color-body-text)]">
          <p>No orders yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-4 border-b border-[var(--color-charcoal-lighter-plus)]">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] rounded-t-lg ${
              activeTab === 'purchases'
                ? 'text-[#F5A623] border-b-2 border-[#F5A623]'
                : 'text-[var(--color-body-text)] hover:text-[var(--color-cream)]'
            }`}
          >
            Purchases {hasPurchases ? `(${coinPurchases.length + itemPurchases.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] rounded-t-lg ${
              activeTab === 'sales'
                ? 'text-[#F5A623] border-b-2 border-[#F5A623]'
                : 'text-[var(--color-body-text)] hover:text-[var(--color-cream)]'
            }`}
          >
            Sales {hasSales ? `(${itemSales.length})` : ''}
          </button>
        </div>

        {activeTab === 'purchases' && (
          <div className="space-y-3">
            {allPurchases.length === 0 ? (
              <p className="text-center py-4 text-[var(--color-body-text)]/60 text-sm">No purchases</p>
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
              <p className="text-center py-4 text-[var(--color-body-text)]/60 text-sm">No sales yet</p>
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
      <div className="text-center py-8 text-[var(--color-body-text)]">
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
      <div className="bg-[var(--color-charcoal-light)] border border-[#F5A623]/30 rounded-2xl p-4 hover:bg-[var(--color-charcoal-lighter)] hover:border-[#F5A623]/40 hover:shadow-lg hover:shadow-[#F5A623]/20 transition-all duration-200">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-2xl">🪙</div>
            <div>
              <p className="font-medium text-[var(--color-cream)]">Coin Purchase</p>
              <p className="text-[var(--color-body-text)] text-sm">{coins.coins} coins</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-[#F5A623]">{coins.coins}x 🪙</p>
            <p className="text-[var(--color-body-text)] text-xs">{formattedDate}</p>
          </div>
        </div>
      </div>
    );
  }

  const item = order as ItemPurchase;
  const isPaid = item.status === 'paid';

  return (
    <div className="bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-lg p-4 hover:bg-[var(--color-charcoal-lighter)] hover:border-[#F5A623]/40 hover:shadow-lg hover:shadow-[#F5A623]/20 transition-all duration-200 active:scale-95">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 flex-1">
          <div className="text-2xl">🛍️</div>
          <div>
            <p className="font-semibold text-[var(--color-cream)]">{item.item_name}</p>
            <p className="text-[var(--color-body-text)] text-sm">Order #{item.id.substring(0, 8)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-[#F5A623]">
            {item.original_price ? `$${item.original_price.toFixed(2)}` : `$${item.price.toFixed(2)}`}
          </p>
          <DiscountBadge item={item} />
          <p className="text-[var(--color-body-text)] text-xs mt-1">{formattedDate}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-[var(--color-charcoal-lighter-plus)]">
        <StatusBadge status={item.status} />
        {isPaid && item.verification_token && (
          <button
            onClick={() => setShowQR(!showQR)}
            className="text-xs px-3 py-1.5 min-h-[44px] rounded-full bg-[#6BAF7A]/20 border border-[#6BAF7A]/40 text-[#6BAF7A] hover:bg-[#6BAF7A]/30 transition-all duration-200 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
          >
            {showQR ? 'Hide QR' : 'Show QR'}
          </button>
        )}
      </div>
      {showQR && isPaid && item.verification_token && (
        <div className="mt-3 flex flex-col items-center py-3 border-t border-[var(--color-charcoal-lighter-plus)]">
          <p className="text-[var(--color-body-text)] text-xs mb-2">Show at pickup</p>
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
    <div className="bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-lg p-4 hover:bg-[var(--color-charcoal-lighter)] hover:border-[#6BAF7A]/40 hover:shadow-lg hover:shadow-[#6BAF7A]/20 transition-all duration-200 active:scale-95">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 flex-1">
          <div className="text-2xl">📦</div>
          <div>
            <p className="font-semibold text-[var(--color-cream)]">{sale.item_name}</p>
            <p className="text-[var(--color-body-text)] text-sm">Order #{sale.id.substring(0, 8)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-[#6BAF7A]">${sale.price.toFixed(2)}</p>
          <p className="text-[var(--color-body-text)] text-xs mt-1">{formattedDate}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-[var(--color-charcoal-lighter-plus)]">
        <StatusBadge status={sale.status} />
      </div>
    </div>
  );
}
