'use client';

/**
 * Community thread page (/communities/[id]/[threadId]) — a single discussion thread + replies.
 * Purpose: Shows one thread's post (with media) and its replies, with voting and replying. Uses
 *   CommunitiesContext; gated behind ProtectedRoute.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useCommunities } from '@/contexts/CommunitiesContext';
import { useAuth } from '@/contexts/AuthContext';
import { PostMedia } from '@/components/communities/PostMedia';

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ThreadPage() {
  return (
    <ProtectedRoute>
      <ThreadContent />
    </ProtectedRoute>
  );
}

function ThreadContent() {
  const params = useParams();
  const communityId = params.id as string;
  const threadId = params.threadId as string;
  const { user } = useAuth();
  const { communities, threads, comments, vote, voteComment, addComment } = useCommunities();

  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const thread = threads.find((t) => t.id === threadId);
  const community = communities.find((c) => c.id === communityId);
  const threadComments = comments
    .filter((c) => c.threadId === threadId)
    .sort((a, b) => b.votes - a.votes);

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    addComment(threadId, commentText.trim(), user?.email?.split('@')[0] || 'you');
    setCommentText('');
    setSubmitting(false);
  };

  if (!thread) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-[#121212]">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Post not found.</p>
          <Link href="/communities" className="text-sm font-semibold text-[#f97316] hover:underline">
            Back to Communities
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#121212] text-gray-900 dark:text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Back nav */}
        <Link
          href={`/communities/${communityId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {community?.name || 'Community'}
        </Link>

        {/* Thread card */}
        <div className="mb-4 flex overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Vote column */}
          <div className="flex w-12 shrink-0 flex-col items-center gap-1 bg-gray-50 dark:bg-gray-800 py-4 border-r border-gray-200 dark:border-gray-700">
            <button
              onClick={() => vote(thread.id, 1)}
              aria-label="Upvote"
              className={`flex h-8 w-8 items-center justify-center rounded-lg p-0 transition-colors ${
                thread.userVote === 1
                  ? 'text-[#f97316]'
                  : 'text-black dark:text-white hover:text-[#f97316]'
              }`}
            >
              <ChevronUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <span
              className={`text-sm font-bold tabular-nums ${
                thread.userVote === 1
                  ? 'text-[#f97316]'
                  : thread.userVote === -1
                  ? 'text-[#f97316]'
                  : 'text-black dark:text-white'
              }`}
            >
              {thread.votes}
            </span>
            <button
              onClick={() => vote(thread.id, -1)}
              aria-label="Downvote"
              className={`flex h-8 w-8 items-center justify-center rounded-lg p-0 transition-colors ${
                thread.userVote === -1
                  ? 'text-[#f97316]'
                  : 'text-black dark:text-white hover:text-[#f97316]'
              }`}
            >
              <ChevronDown className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Thread body */}
          <div className="flex-1 p-5">
            <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Link
                href={`/communities/${communityId}`}
                className="font-semibold text-[#f97316] hover:underline"
              >
                {thread.communityName}
              </Link>
              <span>&middot;</span>
              <span>Posted by {thread.author}</span>
              <span>&middot;</span>
              <span>{timeAgo(thread.createdAt)}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-snug mb-3">
              {thread.title}
            </h1>
            {thread.content && (
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {thread.content}
              </p>
            )}
            <PostMedia media={thread.media} />
          </div>
        </div>

        {/* Comment input */}
        <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">Add a comment</p>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || submitting}
              className="rounded-xl bg-[#f97316] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition"
            >
              Comment
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {threadComments.length} {threadComments.length === 1 ? 'Comment' : 'Comments'}
          </h2>

          {threadComments.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No comments yet. Be the first!</p>
            </div>
          ) : (
            threadComments.map((c) => (
              <div
                key={c.id}
                className="flex gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
              >
                {/* Avatar */}
                <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {c.author[0]?.toUpperCase() || '?'}
                </div>

                {/* Comment body */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{c.author}</span>
                    <span>&middot;</span>
                    <span>{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{c.content}</p>
                  <div className="mt-2 flex items-center gap-1">
                    <button
                      onClick={() => voteComment(c.id, 1)}
                      aria-label="Upvote comment"
                      className={`h-5 w-5 flex items-center justify-center rounded p-0 text-xs transition-colors ${
                        c.userVote === 1 ? 'text-[#f97316]' : 'text-black dark:text-white hover:text-[#f97316]'
                      }`}
                    >
                      <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <span className={`text-[11px] font-semibold tabular-nums ${c.userVote === 1 ? 'text-[#f97316]' : 'text-black dark:text-white'}`}>
                      {c.votes}
                    </span>
                    <button
                      onClick={() => voteComment(c.id, -1)}
                      aria-label="Downvote comment"
                      className={`h-5 w-5 flex items-center justify-center rounded p-0 text-xs transition-colors ${
                        c.userVote === -1 ? 'text-[#f97316]' : 'text-black dark:text-white hover:text-[#f97316]'
                      }`}
                    >
                      <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
