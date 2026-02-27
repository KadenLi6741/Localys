'use client';

import { useState, useEffect } from 'react';
import { getUserCoinPurchases, getUserItemPurchases, getBusinessItemSales } from '@/lib/supabase/profiles';
import { getCustomerPreOrders, getBusinessPreOrders } from '@/lib/supabase/preorders';
import type { CoinPurchase, ItemPurchase } from '@/models/Order';
import type { PreOrder } from '@/models/PreOrder';
import { PreOrderStatusBadge } from '@/components/preorder/PreOrderStatusBadge';
import { useTranslation } from '@/hooks/useTranslation';

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
  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'purchases' | 'sales' | 'preorders'>('purchases');
  const [tablesExist, setTablesExist] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [userId, isBusiness]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Load user's purchases
      const { data: coins } = await getUserCoinPurchases(userId);
      const { data: items } = await getUserItemPurchases(userId);

      setCoinPurchases(coins || []);
      setItemPurchases(items || []);

      // Load business sales if applicable
      if (isBusiness) {
        const { data: sales } = await getBusinessItemSales(userId);
        setItemSales(sales || []);
        // Load business pre-orders
        if (businessId) {
          const { data: bizPreOrders } = await getBusinessPreOrders(businessId);
          setPreOrders(bizPreOrders || []);
        }
      } else {
        // Load customer pre-orders
        const { data: custPreOrders } = await getCustomerPreOrders(userId);
        setPreOrders(custPreOrders || []);
      }

      setTablesExist(true);
    } catch (error) {
      console.error('Error loading orders:', error);
      setCoinPurchases([]);
      setItemPurchases([]);
      setItemSales([]);
      setPreOrders([]);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  // If tables don't exist, show a friendly message
  if (!tablesExist) {
    return (
      <div className="text-center py-8 text-white/60">
        <p className="text-sm">Order history feature coming soon!</p>
      </div>
    );
  }

  // For businesses, show purchases, sales, and pre-orders
  if (isBusiness) {
    const hasPurchases = coinPurchases.length > 0 || itemPurchases.length > 0;
    const hasSales = itemSales.length > 0;
    const hasPreOrders = preOrders.length > 0;

    if (!hasPurchases && !hasSales && !hasPreOrders) {
      return (
        <div className="text-center py-8 text-white/60">
          <p>No orders yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'purchases'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            Purchases {hasPurchases ? `(${coinPurchases.length + itemPurchases.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'sales'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            Sales {hasSales ? `(${itemSales.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('preorders')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'preorders'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            Pre-Orders {hasPreOrders ? `(${preOrders.length})` : ''}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'purchases' && (
          <div className="space-y-3">
            {allPurchases.length === 0 ? (
              <p className="text-center py-4 text-white/40 text-sm">No purchases</p>
            ) : (
              allPurchases.map((order, idx) => (
                <OrderItem key={idx} order={order} />
              ))
            )}
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-3">
            {itemSales.length === 0 ? (
              <p className="text-center py-4 text-white/40 text-sm">No sales yet</p>
            ) : (
              itemSales.map((sale, idx) => (
                <SaleItem key={idx} sale={sale} />
              ))
            )}
          </div>
        )}

        {activeTab === 'preorders' && (
          <div className="space-y-3">
            {preOrders.length === 0 ? (
              <p className="text-center py-4 text-white/40 text-sm">No pre-orders yet</p>
            ) : (
              preOrders.map((po) => (
                <PreOrderHistoryItem key={po.id} preOrder={po} />
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // For regular users, show purchases and pre-orders
  const hasPreOrders = preOrders.length > 0;

  if (allPurchases.length === 0 && !hasPreOrders) {
    return (
      <div className="text-center py-8 text-white/60">
        <p>No orders yet</p>
      </div>
    );
  }

  // If user has pre-orders, show tabs
  if (hasPreOrders) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4 border-b border-white/10">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'purchases'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            Purchases {allPurchases.length > 0 ? `(${allPurchases.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('preorders')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'preorders'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            Pre-Orders ({preOrders.length})
          </button>
        </div>

        {activeTab === 'purchases' && (
          <div className="space-y-3">
            {allPurchases.length === 0 ? (
              <p className="text-center py-4 text-white/40 text-sm">No purchases</p>
            ) : (
              allPurchases.map((order, idx) => (
                <OrderItem key={idx} order={order} />
              ))
            )}
          </div>
        )}

        {activeTab === 'preorders' && (
          <div className="space-y-3">
            {preOrders.map((po) => (
              <PreOrderHistoryItem key={po.id} preOrder={po} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allPurchases.map((order, idx) => (
        <OrderItem key={idx} order={order} />
      ))}
    </div>
  );
}

function OrderItem({ order }: { order: CoinPurchase | ItemPurchase }) {
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
      <div className="bg-white/5 border border-yellow-500/30 rounded-lg p-4 hover:bg-white/10 transition-colors">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-2xl">🪙</div>
            <div>
              <p className="font-medium text-white">Coin Purchase</p>
              <p className="text-white/60 text-sm">{coins.coins} coins</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-yellow-400">{coins.coins}x 🪙</p>
            <p className="text-white/60 text-xs">{formattedDate}</p>
          </div>
        </div>
      </div>
    );
  }

  const item = order as ItemPurchase;
  return (
    <div className="bg-white/5 border border-blue-500/30 rounded-lg p-4 hover:bg-white/10 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 flex-1">
          <div className="text-2xl">🛍️</div>
          <div>
            <p className="font-medium text-white">{item.item_name}</p>
            <p className="text-white/60 text-sm">Order #{item.id.substring(0, 8)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium text-blue-400">${item.price.toFixed(2)}</p>
          <p className="text-white/60 text-xs">{formattedDate}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
          item.status === 'completed' 
            ? 'bg-green-500/20 text-green-300'
            : 'bg-yellow-500/20 text-yellow-300'
        }`}>
          {item.status}
        </span>
      </div>
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
    <div className="bg-white/5 border border-green-500/30 rounded-lg p-4 hover:bg-white/10 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 flex-1">
          <div className="text-2xl">📦</div>
          <div>
            <p className="font-medium text-white">{sale.item_name}</p>
            <p className="text-white/60 text-sm">Order #{sale.id.substring(0, 8)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium text-green-400">${sale.price.toFixed(2)}</p>
          <p className="text-white/60 text-xs">{formattedDate}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
          sale.status === 'completed'
            ? 'bg-green-500/20 text-green-300'
            : 'bg-yellow-500/20 text-yellow-300'
        }`}>
          {sale.status}
        </span>
      </div>
    </div>
  );
}

function PreOrderHistoryItem({ preOrder }: { preOrder: PreOrder }) {
  const date = new Date(preOrder.scheduled_time);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="bg-white/5 border border-purple-500/30 rounded-lg p-4 hover:bg-white/10 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 flex-1">
          <div className="text-2xl">{preOrder.order_type === 'dine-in' ? '🍽️' : '📦'}</div>
          <div>
            <p className="font-medium text-white">
              {preOrder.order_code}
            </p>
            <p className="text-white/60 text-sm capitalize">
              {preOrder.order_type} &middot; {formattedDate} at {formattedTime}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium text-purple-400">${Number(preOrder.subtotal).toFixed(2)}</p>
          <PreOrderStatusBadge status={preOrder.status} />
        </div>
      </div>
      {preOrder.amount_remaining > 0 && preOrder.status !== 'cancelled' && (
        <p className="text-white/40 text-xs mt-2">
          ${Number(preOrder.amount_remaining).toFixed(2)} due at restaurant
        </p>
      )}
    </div>
  );
}
