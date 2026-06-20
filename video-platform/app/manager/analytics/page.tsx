'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AnalyticsDashboard, TrustScoreCard } from '@/components/analytics';
import { FinancialOverview } from '@/components/analytics/FinancialOverview';
import { getOwnerBusiness, getOwnerReviews, type OwnerReview } from '@/lib/supabase/manager';
import { ManagerHeader, Panel, LoadingRow, EmptyState } from '../_components/ui';

/** Group review created_at timestamps into the last 6 calendar months. */
function monthlyReviewCounts(reviews: OwnerReview[]): { label: string; count: number }[] {
  const now = new Date();
  const buckets: { label: string; key: string; count: number }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      key: `${d.getFullYear()}-${d.getMonth()}`,
      count: 0,
    });
  }
  for (const r of reviews) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.count += 1;
  }
  return buckets.map(({ label, count }) => ({ label, count }));
}

export default function ManagerAnalytics() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<OwnerReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const business = await getOwnerBusiness(user.id);
      const data = await getOwnerReviews(user.id, business?.id);
      if (!cancelled) {
        setReviews(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const monthly = useMemo(() => monthlyReviewCounts(reviews), [reviews]);
  const maxMonthly = Math.max(1, ...monthly.map((m) => m.count));
  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // index 0 = 1★ … index 4 = 5★
    for (const r of reviews) {
      const i = Math.min(5, Math.max(1, Math.round(r.rating))) - 1;
      counts[i] += 1;
    }
    return counts;
  }, [reviews]);
  const maxDist = Math.max(1, ...distribution);

  if (!user) return null;

  return (
    <div>
      <ManagerHeader title="Analytics" description="Views, orders, revenue, advertising and reviews over time." />

      {/* Reuse: trust + rating snapshot */}
      <div className="mb-6">
        <TrustScoreCard userId={user.id} />
      </div>

      {/* Reuse: revenue + orders breakdown over time */}
      <div className="mb-6">
        <FinancialOverview userId={user.id} />
      </div>

      {/* Reuse: views + promotion / advertise performance over time */}
      <div className="mb-6">
        <AnalyticsDashboard userId={user.id} />
      </div>

      {/* Reviews over time (dependency-free bar chart) */}
      <Panel title="Reviews over time" className="mb-6">
        {loading ? (
          <LoadingRow />
        ) : reviews.length === 0 ? (
          <EmptyState title="No reviews yet" description="Customer reviews will chart here once you receive them." />
        ) : (
          <div className="flex items-end gap-3" style={{ height: 160 }}>
            {monthly.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                <span className="text-caption font-semibold text-foreground">{m.count}</span>
                <div
                  className="w-full rounded-t-[6px] bg-primary/80"
                  style={{ height: `${(m.count / maxMonthly) * 120}px`, minHeight: m.count > 0 ? 6 : 2 }}
                  aria-hidden="true"
                />
                <span className="text-caption text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Rating distribution */}
      <Panel title="Rating distribution">
        {loading ? (
          <LoadingRow />
        ) : reviews.length === 0 ? (
          <EmptyState title="No ratings yet" />
        ) : (
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star - 1];
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="w-10 shrink-0 text-caption font-semibold text-muted-foreground">{star}★</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(count / maxDist) * 100}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-caption text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
