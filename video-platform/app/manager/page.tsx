'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getOwnerBusiness, getManagerOverview, type ManagerOverview } from '@/lib/supabase/manager';
import { ManagerHeader, StatCard, Panel, EmptyState, LoadingRow, Stars, timeAgo } from './_components/ui';

const money = (n: number) => `$${n.toFixed(2)}`;

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<ManagerOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const business = await getOwnerBusiness(user.id);
      const data = await getManagerOverview(user.id, business);
      if (!cancelled) {
        setOverview(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div>
      <ManagerHeader title="Dashboard" description="A live overview of your business on Localys." />

      {loading || !overview ? (
        <LoadingRow label="Loading your metrics…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Content views" value={overview.totalViews.toLocaleString()} hint="Across your videos" />
            <StatCard
              label="Orders"
              value={overview.totalOrders.toLocaleString()}
              hint={`${overview.pendingOrders} awaiting pickup`}
            />
            <StatCard
              label="Avg. rating"
              value={overview.avgRating != null ? overview.avgRating.toFixed(1) : '—'}
              hint={`${overview.reviewCount} review${overview.reviewCount === 1 ? '' : 's'}`}
            />
            <StatCard label="Revenue (test)" value={money(overview.revenue)} hint="Paid + completed" accent />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Completed" value={overview.completedOrders.toLocaleString()} hint="Orders fulfilled" />
            <StatCard label="Awaiting pickup" value={overview.pendingOrders.toLocaleString()} hint="Paid, not collected" />
            <StatCard
              label="Awaiting replies"
              value={overview.awaitingReplies.toLocaleString()}
              hint="Reviews to respond to"
            />
            <StatCard label="Reviews" value={overview.reviewCount.toLocaleString()} hint="Total received" />
          </div>

          <div className="mt-6">
            <Panel
              title="Recent activity"
              action={
                <Link href="/manager/orders" className="text-body-sm font-semibold text-primary hover:underline">
                  View orders
                </Link>
              }
            >
              {overview.recentActivity.length === 0 ? (
                <EmptyState
                  title="No activity yet"
                  description="Orders and reviews will appear here as customers interact with your business. Run migration 043 to load demo data."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {overview.recentActivity.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-body-sm ${
                            a.kind === 'order' ? 'bg-primary/15 text-primary' : 'bg-surface text-foreground'
                          }`}
                          aria-hidden="true"
                        >
                          {a.kind === 'order' ? '🧾' : '⭐'}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-body-sm font-semibold text-foreground">{a.title}</p>
                          <p className="truncate text-caption text-muted-foreground">{a.subtitle}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {a.kind === 'order' && a.amount != null ? (
                          <p className="text-body-sm font-bold text-foreground">{money(a.amount)}</p>
                        ) : a.rating != null ? (
                          <Stars value={a.rating} />
                        ) : null}
                        <p className="text-caption text-muted-foreground">{timeAgo(a.at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
