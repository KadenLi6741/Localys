'use client';

import { useMemo, useState } from 'react';
import { MessageSquareHeart, ChevronUp, Check, RotateCcw, Trash2 } from 'lucide-react';
import {
  useCommunityFeedback,
  deleteFeedback,
  toggleResolved,
  clearFeedbackForBusiness,
  type FeedbackEntry,
} from '@/lib/community-feedback';

type SortKey = 'top' | 'newest';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Business Manager → Community Feedback panel.
 * Owners see wishlist/feedback for their business (message, upvotes, date),
 * sorted by most upvoted by default, and can delete, mark resolved,
 * sort/filter, and clear all. Reads the shared community-feedback store.
 */
export function CommunityFeedbackPanel({ businessId }: { businessId: string | null | undefined }) {
  const { entries } = useCommunityFeedback(businessId);
  const [sort, setSort] = useState<SortKey>('top');
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);

  const totalCount = entries.length;

  const list = useMemo(() => {
    const filtered = unresolvedOnly ? entries.filter((e) => !e.resolved) : entries;
    return [...filtered].sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return b.upvotes - a.upvotes;
    });
  }, [entries, sort, unresolvedOnly]);

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this feedback entry?')) return;
    deleteFeedback(id);
  };

  const handleClearAll = () => {
    if (totalCount === 0) return;
    if (!window.confirm('Clear all community feedback? This cannot be undone.')) return;
    clearFeedbackForBusiness(businessId);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      {/* Header + count badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center">
            <MessageSquareHeart className="h-3.5 w-3.5 text-[#f97316]" />
          </div>
          <p className="text-sm font-semibold text-foreground">Community Feedback</p>
          <span className="text-[11px] font-semibold text-[#f97316] bg-orange-50 px-2 py-0.5 rounded-full">
            {totalCount} community request{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={handleClearAll}
          disabled={totalCount === 0}
          className="text-xs font-medium text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40 disabled:hover:text-muted-foreground"
        >
          Clear all
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Wishlist &amp; requests from your customers</p>

      {/* Sort / filter controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setSort('top')}
          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
            sort === 'top' ? 'bg-[#f97316] text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Most upvoted
        </button>
        <button
          onClick={() => setSort('newest')}
          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
            sort === 'newest' ? 'bg-[#f97316] text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Newest
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        <button
          onClick={() => setUnresolvedOnly((v) => !v)}
          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
            unresolvedOnly ? 'bg-[#f97316] text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Unresolved only
        </button>
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="border border-border rounded-2xl p-8 text-center">
          <MessageSquareHeart className="h-9 w-9 text-gray-200 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">
            {totalCount === 0 ? 'No community feedback yet' : 'Nothing matches this filter'}
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {totalCount === 0 ? 'Requests from the home feedback box appear here' : 'Try switching the filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((entry) => (
            <FeedbackRow key={entry.id} entry={entry} onDelete={() => handleDelete(entry.id)} onResolve={() => toggleResolved(entry.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackRow({ entry, onDelete, onResolve }: { entry: FeedbackEntry; onDelete: () => void; onResolve: () => void }) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-3 ${entry.resolved ? 'border-border bg-muted/40' : 'border-border bg-card'}`}>
      {/* Upvote count */}
      <div className="flex w-11 shrink-0 flex-col items-center rounded-xl border border-[#f97316]/40 bg-orange-50 px-2 py-1.5 text-[#f97316] dark:bg-[#f97316]/15">
        <ChevronUp className="h-4 w-4" />
        <span className="text-xs font-bold">{entry.upvotes}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm ${entry.resolved ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{entry.message}</p>
          {entry.resolved && (
            <span className="text-[10px] font-semibold text-[#f97316] bg-orange-50 px-1.5 py-0.5 rounded">Resolved</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {entry.authorName} · {formatDate(entry.createdAt)}
        </p>
      </div>

      {/* Manage */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onResolve}
          aria-label={entry.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
            entry.resolved
              ? 'bg-muted text-muted-foreground hover:text-foreground'
              : 'bg-orange-50 text-[#f97316] hover:bg-orange-100'
          }`}
        >
          {entry.resolved ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{entry.resolved ? 'Undo' : 'Resolve'}</span>
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete feedback"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
