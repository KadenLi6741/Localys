'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserCoinPurchases, getUserItemPurchases, getBusinessItemSales } from '@/lib/supabase/profiles';
import { supabase } from '@/lib/supabase/client';
import type { CoinPurchase, ItemPurchase } from '@/models/Order';
import { useTranslation } from '@/hooks/useTranslation';
import { OrderQRCode } from '@/components/QRCode';
import { RefreshCw, Star, CalendarClock } from 'lucide-react';
import { getLocalOrders, type LocalOrder } from '@/lib/clientEngagement';
import { getReviewStats } from '@/lib/utils/reviewStats';

/** "Sat, Jun 28 at 6:30 PM" from an ISO string, or null when absent/invalid. */
function formatScheduleLabel(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

/** Buyer-chosen pickup/delivery time + special concerns, shown on an order card. */
function OrderDetails({ scheduledAt, specialRequests }: { scheduledAt?: string | null; specialRequests?: string | null }) {
  const schedule = formatScheduleLabel(scheduledAt);
  if (!schedule && !specialRequests) return null;
  return (
    <div className="mt-2 space-y-1">
      {schedule && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <CalendarClock className="h-3.5 w-3.5 text-[#f97316] shrink-0" />
          {schedule}
        </p>
      )}
      {specialRequests && (
        <p className="text-xs text-muted-foreground">Note: {specialRequests}</p>
      )}
    </div>
  );
}

/** Star rating + review count shown under an order name. */
function OrderReviews({ statsKey }: { statsKey: string }) {
  const { rating, reviews } = getReviewStats(statsKey);
  return (
    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="h-3 w-3 fill-[#f97316] text-[#f97316]" strokeWidth={1.5} />
      {rating.toFixed(1)} · {reviews} reviews
    </p>
  );
}

function DiscountBadge({ item }: { item: ItemPurchase }) {
  const [showTooltip, setShowTooltip] = useState(false);
  if (!item.coupon_code || !item.original_price) return null;
  const discountAmount = item.original_price - item.price;

  return (
    <span className="relative inline-flex items-center gap-1 text-xs text-[#f97316] font-semibold">
      <span>-${discountAmount.toFixed(2)}</span>
      <span
        className="cursor-help inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#f97316]/10 border border-[#f97316]/30 text-[10px] text-[#f97316]"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(v => !v)}
      >
        i
      </span>
      {showTooltip && (
        <span className="absolute bottom-full right-0 mb-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs whitespace-nowrap z-10 shadow-lg">
          <span className="block font-semibold mb-0.5">Code: {item.coupon_code}</span>
          <span className="text-gray-300">{item.discount_percentage}% off</span>
        </span>
      )}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid:      'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30',
    pending:   'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30',
    shipped:   'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30',
    completed: 'bg-muted text-foreground border-border',
    delivered: 'bg-muted text-foreground border-border',
    failed:    'bg-red-50 text-red-600 border-red-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <span className={`inline-flex items-center text-xs px-3 py-1 rounded-full font-semibold capitalize border ${styles[status] || styles.pending}`}>
      {status}
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
  const router = useRouter();
  const [coinPurchases, setCoinPurchases] = useState<CoinPurchase[]>([]);
  const [itemPurchases, setItemPurchases] = useState<ItemPurchase[]>([]);
  const [itemSales, setItemSales] = useState<ItemPurchase[]>([]);
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
  const [tablesExist, setTablesExist] = useState(true);

  useEffect(() => { loadOrders(); }, [userId, isBusiness]);

  useEffect(() => {
    const channel = supabase
      .channel('order-status-changes')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'item_purchases', filter: `buyer_id=eq.${userId}`,
      }, (payload) => {
        const updated = payload.new as ItemPurchase;
        setItemPurchases(prev => prev.map(p => p.id === updated.id ? { ...p, status: updated.status } : p));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
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
    } catch {
      setCoinPurchases([]); setItemPurchases([]); setItemSales([]);
      setTablesExist(false);
    } finally {
      // Load client-side orders (demo items that may not be in Supabase)
      try { setLocalOrders(getLocalOrders()); } catch { /* ignore */ }
      setLoading(false);
    }
  };

  const handleReorder = (item: ItemPurchase) => {
    router.push(
      `/checkout?itemId=${item.item_id}&itemName=${encodeURIComponent(item.item_name)}&itemPrice=${item.price}&sellerId=${item.seller_id}&buyerId=${userId}`
    );
  };

  const allPurchases = [...coinPurchases, ...itemPurchases].sort((a, b) => {
    const dateA = new Date('created_at' in a ? a.created_at : a.purchased_at).getTime();
    const dateB = new Date('created_at' in b ? b.created_at : b.purchased_at).getTime();
    return dateB - dateA;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f97316]" />
      </div>
    );
  }

  if (!tablesExist) {
    return <div className="text-center py-8"><p className="text-sm text-muted-foreground">Order history coming soon</p></div>;
  }

  if (isBusiness) {
    const hasPurchases = coinPurchases.length > 0 || itemPurchases.length > 0;
    const hasSales = itemSales.length > 0;
    if (!hasPurchases && !hasSales) {
      return <div className="text-center py-8"><p className="text-muted-foreground text-sm">No orders yet</p></div>;
    }
    return (
      <div className="space-y-4">
        <div className="flex gap-4 border-b border-border">
          {(['purchases', 'sales'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab ? 'text-[#f97316] border-[#f97316]' : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              {tab}
              {tab === 'purchases' && hasPurchases ? ` (${coinPurchases.length + itemPurchases.length})` : ''}
              {tab === 'sales' && hasSales ? ` (${itemSales.length})` : ''}
            </button>
          ))}
        </div>
        {activeTab === 'purchases' && (
          <div className="space-y-2">
            {allPurchases.length === 0
              ? <p className="text-center py-4 text-muted-foreground text-sm">No purchases</p>
              : allPurchases.map((order, idx) => (
                  <OrderItem key={idx} order={order}
                    onReorder={!('coins' in order) ? () => handleReorder(order as ItemPurchase) : undefined} />
                ))}
          </div>
        )}
        {activeTab === 'sales' && (
          <div className="space-y-2">
            {itemSales.length === 0
              ? <p className="text-center py-4 text-muted-foreground text-sm">No sales yet</p>
              : itemSales.map((sale, idx) => <SaleItem key={idx} sale={sale} />)}
          </div>
        )}
      </div>
    );
  }

  // Deduplicate local orders: hide any whose id already appears in Supabase itemPurchases
  const supabaseItemIds = new Set(itemPurchases.map((p) => p.id));
  const dedupedLocal = localOrders.filter((o) => !supabaseItemIds.has(o.id));

  if (allPurchases.length === 0 && dedupedLocal.length === 0) {
    return <div className="text-center py-8"><p className="text-muted-foreground text-sm">No orders yet</p></div>;
  }

  return (
    <div className="space-y-2">
      {dedupedLocal.map((order) => (
        <LocalOrderItem key={order.id} order={order} />
      ))}
      {allPurchases.map((order, idx) => (
        <OrderItem key={idx} order={order}
          onReorder={!('coins' in order) ? () => handleReorder(order as ItemPurchase) : undefined} />
      ))}
    </div>
  );
}

function OrderItem({ order, onReorder }: { order: CoinPurchase | ItemPurchase; onReorder?: () => void }) {
  const [showQR, setShowQR] = useState(false);
  const isCoinPurchase = 'coins' in order;
  const date = new Date(isCoinPurchase ? order.created_at : order.purchased_at);
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (isCoinPurchase) {
    const coins = order as CoinPurchase;
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold text-foreground">Coin Purchase</p>
            <p className="text-muted-foreground text-sm">{coins.coins} coins</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-[#f97316]">{coins.coins}x</p>
            <p className="text-muted-foreground text-xs">{formattedDate}</p>
          </div>
        </div>
      </div>
    );
  }

  const item = order as ItemPurchase;
  const isPaid = item.status === 'paid';

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{item.item_name}</p>
          <OrderReviews statsKey={item.seller_id || item.item_name} />
          <p className="text-foreground text-xs font-semibold mt-0.5">Order #{item.id.substring(0, 8).toUpperCase()}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-foreground">
            {item.original_price ? `$${item.original_price.toFixed(2)}` : `$${item.price.toFixed(2)}`}
          </p>
          <DiscountBadge item={item} />
          <p className="text-muted-foreground text-xs mt-0.5">{formattedDate}</p>
        </div>
      </div>
      <OrderDetails scheduledAt={item.scheduled_at} specialRequests={item.special_requests} />
      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border">
        <StatusBadge status={item.status} />
        {isPaid && item.verification_token && (
          <button
            onClick={() => setShowQR(!showQR)}
            className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:border-foreground/30 transition-colors font-medium"
          >
            {showQR ? 'Hide QR' : 'Show QR'}
          </button>
        )}
        {onReorder && (
          <button
            onClick={onReorder}
            className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#f97316] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-3 w-3" />
            Order again
          </button>
        )}
      </div>
      {showQR && isPaid && item.verification_token && (
        <div className="mt-3 flex flex-col items-center py-3 border-t border-border">
          <p className="text-muted-foreground text-xs mb-2">Show at pickup</p>
          <OrderQRCode orderId={item.id} token={item.verification_token} size={160} />
        </div>
      )}
    </div>
  );
}

function LocalOrderItem({ order }: { order: LocalOrder }) {
  const [showQR, setShowQR] = useState(false);
  const date = new Date(order.purchased_at);
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {order.itemName}{order.quantity && order.quantity > 1 ? <span className="text-muted-foreground font-normal"> ×{order.quantity}</span> : null}
          </p>
          <OrderReviews statsKey={order.itemName} />
          <p className="text-foreground text-xs font-semibold mt-0.5">Order #{order.confirmationNumber}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-foreground">${order.price.toFixed(2)}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{formattedDate}</p>
        </div>
      </div>
      <OrderDetails scheduledAt={order.scheduledAt} specialRequests={order.specialRequests} />
      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border">
        <span className="inline-flex items-center text-xs px-3 py-1 rounded-full font-semibold capitalize border bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30">
          paid
        </span>
        {order.token && (
          <button
            onClick={() => setShowQR(!showQR)}
            className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:border-foreground/30 transition-colors font-medium"
          >
            {showQR ? 'Hide QR' : 'Show QR'}
          </button>
        )}
      </div>
      {showQR && order.token && (
        <div className="mt-3 flex flex-col items-center py-3 border-t border-border">
          <p className="text-muted-foreground text-xs mb-2">Show at pickup</p>
          <OrderQRCode orderId={order.id} token={order.token} size={160} />
        </div>
      )}
    </div>
  );
}

function SaleItem({ sale }: { sale: ItemPurchase }) {
  const date = new Date(sale.purchased_at);
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{sale.item_name}</p>
          <p className="text-foreground text-xs font-semibold mt-0.5">Order #{sale.id.substring(0, 8).toUpperCase()}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-[#f97316]">${sale.price.toFixed(2)}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{formattedDate}</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <StatusBadge status={sale.status} />
      </div>
    </div>
  );
}
