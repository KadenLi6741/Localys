'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOwnerBusiness,
  getOwnerReviews,
  replyToReview,
  deleteReviewReply,
  type OwnerReview,
} from '@/lib/supabase/manager';
import { ManagerHeader, StatCard, Panel, EmptyState, LoadingRow, Stars, timeAgo } from '../_components/ui';

type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1';
type StatusFilter = 'all' | 'awaiting' | 'replied';

export default function ManagerFeedback() {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<OwnerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Per-review reply draft + busy state.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const business = await getOwnerBusiness(user.id);
      const data = await getOwnerReviews(user.id, business?.id);
      if (!cancelled) {
        setBusinessId(business?.id ?? null);
        setReviews(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const awaiting = reviews.filter((r) => !r.reply).length;
    const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : null;
    return { total, awaiting, avg };
  }, [reviews]);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (ratingFilter !== 'all' && Math.round(r.rating) !== Number(ratingFilter)) return false;
      if (statusFilter === 'awaiting' && r.reply) return false;
      if (statusFilter === 'replied' && !r.reply) return false;
      return true;
    });
  }, [reviews, ratingFilter, statusFilter]);

  const handleReply = async (reviewId: string) => {
    if (!user || !businessId) return;
    const text = (drafts[reviewId] ?? '').trim();
    if (text.length < 2) {
      setError('Reply must be at least 2 characters.');
      return;
    }
    setError(null);
    setBusyId(reviewId);
    const { data, error: replyError } = await replyToReview({
      reviewId,
      businessId,
      ownerId: user.id,
      text,
    });
    setBusyId(null);
    if (replyError || !data) {
      setError(replyError?.message || 'Could not post your reply. Please try again.');
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, reply: data } : r)));
    setDrafts((prev) => ({ ...prev, [reviewId]: '' }));
  };

  const handleDeleteReply = async (reviewId: string, replyId: string) => {
    setBusyId(reviewId);
    const { error: delError } = await deleteReviewReply(replyId);
    setBusyId(null);
    if (delError) {
      setError(delError.message || 'Could not remove the reply.');
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, reply: null } : r)));
  };

  return (
    <div>
      <ManagerHeader title="Feedback" description="Read customer reviews and reply to them." />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total reviews" value={stats.total.toLocaleString()} />
        <StatCard label="Awaiting replies" value={stats.awaiting.toLocaleString()} accent={stats.awaiting > 0} />
        <StatCard label="Avg. rating" value={stats.avg != null ? stats.avg.toFixed(1) : '—'} />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Rating</span>
          <div className="flex flex-wrap gap-1.5">
            {(['all', '5', '4', '3', '2', '1'] as RatingFilter[]).map((r) => (
              <button
                key={r}
                onClick={() => setRatingFilter(r)}
                className={`rounded-full px-3 py-1.5 text-caption font-semibold transition-colors ${
                  ratingFilter === r ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground hover:bg-secondary'
                }`}
                aria-pressed={ratingFilter === r}
              >
                {r === 'all' ? 'All' : `${r}★`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
          <div className="flex gap-1.5">
            {(['all', 'awaiting', 'replied'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1.5 text-caption font-semibold capitalize transition-colors ${
                  statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground hover:bg-secondary'
                }`}
                aria-pressed={statusFilter === s}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-[10px] border border-destructive/40 bg-destructive/10 px-4 py-2 text-body-sm text-destructive">
          {error}
        </p>
      )}

      {/* Review list */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <LoadingRow label="Loading reviews…" />
        ) : reviews.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            description="Reviews customers leave on your storefront appear here. Run migration 043 to load demo reviews."
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="No reviews match these filters" description="Try a different rating or status." />
        ) : (
          filtered.map((r) => (
            <Panel key={r.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm font-bold text-foreground">{r.reviewerName}</span>
                    <Stars value={r.rating} />
                  </div>
                  {r.text && <p className="mt-2 text-body-sm text-foreground">{r.text}</p>}
                </div>
                <span className="shrink-0 text-caption text-muted-foreground">{timeAgo(r.created_at)}</span>
              </div>

              {/* Reply, or reply composer */}
              {r.reply ? (
                <div className="mt-4 rounded-[12px] border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-caption font-semibold uppercase tracking-wide text-primary">
                      Your reply · {timeAgo(r.reply.created_at)}
                    </span>
                    <button
                      onClick={() => r.reply && handleDeleteReply(r.id, r.reply.id)}
                      disabled={busyId === r.id}
                      className="text-caption font-semibold text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1.5 text-body-sm text-foreground">{r.reply.reply_text}</p>
                </div>
              ) : (
                <div className="mt-4">
                  <label htmlFor={`reply-${r.id}`} className="sr-only">
                    Reply to {r.reviewerName}
                  </label>
                  <textarea
                    id={`reply-${r.id}`}
                    value={drafts[r.id] ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Write a public reply…"
                    rows={2}
                    className="w-full resize-none rounded-[10px] border border-border bg-background px-3 py-2 text-body-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => handleReply(r.id)}
                      disabled={busyId === r.id}
                      className="rounded-full bg-primary px-5 py-2 text-body-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {busyId === r.id ? 'Posting…' : 'Reply'}
                    </button>
                  </div>
                </div>
              )}
            </Panel>
          ))
        )}
      </div>
    </div>
  );
}
