'use client';

import { useState } from 'react';
import { MessageSquareHeart, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  addFeedback,
  toggleUpvote,
  hasUpvoted,
  useCommunityFeedback,
  DEMO_BUSINESS_ID,
} from '@/lib/community-feedback';

/** Short "x minutes/hours/days ago" label. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

/**
 * (I) Bottom community feedback box — customers leave wishlist / feedback
 * requests that flow into the Business Manager dashboard. Entries show most
 * recent first; anyone can upvote so popular requests rise to the top.
 */
export function Feedback() {
  const { user } = useAuth();
  // Generic home box posts into the shared demo channel so it appears in the
  // dashboard's Community Feedback panel.
  const { entries } = useCommunityFeedback(DEMO_BUSINESS_ID);

  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const authorName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.username as string) ||
    user?.email?.split('@')[0] ||
    'Guest';

  const visible = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || !user) return;
    addFeedback({ businessId: DEMO_BUSINESS_ID, message: text, authorId: user.id, authorName });
    setMessage('');
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-8">
      <div className="text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-orange-50 text-[#f97316] dark:bg-[#f97316]/15">
          <MessageSquareHeart className="h-6 w-6" />
        </span>
        <h2 className="text-xl font-bold text-black dark:text-white">We&apos;d love to hear what you think!</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Share a wish or request — local businesses see it on their dashboard.
        </p>
      </div>

      {/* Submit */}
      <form onSubmit={handleSubmit} className="mx-auto mt-5 max-w-2xl">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={280}
            disabled={!user}
            placeholder={user ? 'I wish this business had…' : 'Log in to leave feedback'}
            className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-black placeholder-gray-400 transition focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={!user || !message.trim()}
            className="shrink-0 rounded-full bg-[#f97316] px-6 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sent ? 'Thanks for sharing!' : 'Submit'}
          </button>
        </div>
      </form>

      {/* Existing entries — most recent first, upvotable */}
      {visible.length > 0 && (
        <div className="mx-auto mt-6 max-w-2xl space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Community requests
          </p>
          {visible.slice(0, 6).map((entry) => {
            const voted = hasUpvoted(entry, user?.id ?? null);
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <button
                  type="button"
                  onClick={() => toggleUpvote(entry.id, user?.id ?? null)}
                  aria-pressed={voted}
                  aria-label="Upvote this request"
                  className={`flex w-12 shrink-0 flex-col items-center rounded-xl border px-2 py-1.5 transition ${
                    voted
                      ? 'border-[#f97316] bg-orange-50 text-[#f97316] dark:bg-[#f97316]/15'
                      : 'border-gray-200 text-gray-600 hover:border-[#f97316] hover:text-[#f97316] dark:border-gray-600 dark:text-gray-300'
                  }`}
                >
                  <ChevronUp className="h-4 w-4" />
                  <span className="text-xs font-bold">{entry.upvotes}</span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm text-black dark:text-white">{entry.message}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {entry.authorName} · {timeAgo(entry.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
