'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessItemSales } from '@/lib/supabase/profiles';
import type { ItemPurchase } from '@/models/Order';
import { ManagerHeader, StatCard, Panel, EmptyState, LoadingRow, timeAgo } from '../_components/ui';

const money = (n: number) => `$${Number(n).toFixed(2)}`;

export default function ManagerPayments() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ItemPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await getBusinessItemSales(user.id);
      if (!cancelled) {
        setOrders((data || []).filter((o) => o.status === 'paid' || o.status === 'completed'));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const gross = orders.reduce((s, o) => s + Number(o.price ?? 0), 0);
  // Demo payout model: Localys keeps a 10% service fee in test mode.
  const fees = Math.round(gross * 0.1 * 100) / 100;
  const net = Math.round((gross - fees) * 100) / 100;

  return (
    <div>
      <ManagerHeader title="Payments" description="Your payouts and earnings. Stripe runs in test mode for the demo." />

      <div className="mb-4 rounded-[12px] border border-primary/30 bg-primary/10 px-4 py-3 text-body-sm text-foreground">
        <span className="font-semibold text-primary">Test mode.</span> No real money moves. These figures are computed
        from your paid &amp; completed orders for the competition demo.
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Gross sales" value={money(gross)} />
        <StatCard label="Service fee (10%)" value={money(fees)} />
        <StatCard label="Net payout" value={money(net)} accent />
      </div>

      <Panel title="Payout method" className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-body-sm font-semibold text-foreground">Stripe (test)</p>
            <p className="mt-1 text-caption text-muted-foreground">
              Payouts are simulated in test mode. Connect a real Stripe account before going live.
            </p>
          </div>
          <span className="rounded-full bg-success/15 px-3 py-1 text-caption font-semibold text-success">Connected · test</span>
        </div>
      </Panel>

      <Panel title="Recent settled orders" className="mt-6">
        {loading ? (
          <LoadingRow />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No settled orders yet"
            description="Paid and completed orders contribute to your payout. Run migration 043 for demo data."
          />
        ) : (
          <ul className="divide-y divide-border">
            {orders.slice(0, 10).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold text-foreground">{o.item_name}</p>
                  <p className="text-caption text-muted-foreground">
                    #{o.id.substring(0, 8)} · {timeAgo(o.purchased_at)}
                  </p>
                </div>
                <span className="shrink-0 text-body-sm font-bold text-foreground">{money(o.price)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
