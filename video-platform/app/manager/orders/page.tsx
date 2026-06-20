'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessItemSales } from '@/lib/supabase/profiles';
import type { ItemPurchase } from '@/models/Order';
import { ManagerHeader, StatCard, Panel, EmptyState, LoadingRow, timeAgo } from '../_components/ui';

type StatusFilter = 'all' | 'paid' | 'completed' | 'pending' | 'failed';

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-primary/15 text-primary',
  completed: 'bg-success/15 text-success',
  pending: 'bg-surface text-muted-foreground',
  failed: 'bg-destructive/15 text-destructive',
  cancelled: 'bg-destructive/15 text-destructive',
};

const money = (n: number) => `$${Number(n).toFixed(2)}`;

export default function ManagerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ItemPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await getBusinessItemSales(user.id);
      if (!cancelled) {
        setOrders(data || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.status === 'paid').length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    const revenue = orders
      .filter((o) => o.status === 'paid' || o.status === 'completed')
      .reduce((s, o) => s + Number(o.price ?? 0), 0);
    return { total: orders.length, paid, completed, revenue };
  }, [orders]);

  const filtered = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  return (
    <div>
      <ManagerHeader title="Orders" description="Incoming orders for your business. Stripe runs in test mode." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total orders" value={stats.total.toLocaleString()} />
        <StatCard label="Awaiting pickup" value={stats.paid.toLocaleString()} accent={stats.paid > 0} />
        <StatCard label="Completed" value={stats.completed.toLocaleString()} />
        <StatCard label="Revenue (test)" value={money(stats.revenue)} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {(['all', 'paid', 'completed', 'pending', 'failed'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-caption font-semibold capitalize transition-colors ${
              filter === s ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground hover:bg-secondary'
            }`}
            aria-pressed={filter === s}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <LoadingRow label="Loading orders…" />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Paid orders from customers appear here. Run migration 043 to load demo orders, or use Stripe test mode to place one."
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="No orders with this status" />
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <Panel key={o.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-body-sm font-bold text-foreground">
                      {o.item_name}
                      {o.quantity && o.quantity > 1 && (
                        <span className="font-normal text-muted-foreground"> ×{o.quantity}</span>
                      )}
                    </p>
                    <p className="mt-1 text-caption text-muted-foreground">
                      Order #{o.id.substring(0, 8)} · {timeAgo(o.purchased_at)}
                    </p>
                    {o.special_requests && (
                      <p className="mt-2 rounded-[8px] bg-surface px-3 py-1.5 text-caption text-foreground">
                        <span className="font-semibold">Note:</span> {o.special_requests}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-body-sm font-bold text-foreground">{money(o.price)}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-caption font-semibold capitalize ${
                        STATUS_STYLE[o.status] ?? 'bg-surface text-muted-foreground'
                      }`}
                    >
                      {o.status === 'paid' ? 'Awaiting pickup' : o.status}
                    </span>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 text-caption text-muted-foreground">
        Tip: complete a paid order by scanning the customer&rsquo;s pickup QR code from the orders dashboard.
      </p>
    </div>
  );
}
