'use client';

/**
 * Single community page (/communities/[id]) — one community's thread list.
 * Purpose: Shows a community's details and its threads with voting, posting and sharing; tapping a thread
 *   opens it. Uses CommunitiesContext; gated behind ProtectedRoute.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronUp, ChevronDown, MessageSquare, Plus, Users, Share2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useCommunities } from '@/contexts/CommunitiesContext';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityAvatar } from '@/components/communities/CommunityAvatar';
import { PostMedia } from '@/components/communities/PostMedia';

const COMMUNITY_IMAGES: Record<string, string> = {
  'richmondhill-eats': '/community-media/richmond-hill.jpg',
  'local-services': '/community-media/local-services.jpg',
  'support-local': '/community-media/support-local.png',
  'markham': '/community-media/markham.png',
  'vaughan': '/community-media/vaughan.jpg',
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function CommunityPage() {
  return (
    <ProtectedRoute>
      <CommunityContent />
    </ProtectedRoute>
  );
}

function CommunityContent() {
  const params = useParams();
  const router = useRouter();
  const communityId = params.id as string;
  const { user } = useAuth();
  const { communities, threads, vote, createThread } = useCommunities();

  const [showCreateThread, setShowCreateThread] = useState(false);
  const [threadForm, setThreadForm] = useState({ title: '', content: '' });
  const [joined, setJoined] = useState(false);

  const community = communities.find((c) => c.id === communityId);
  const communityThreads = threads
    .filter((t) => t.communityId === communityId)
    .sort((a, b) => b.votes - a.votes);

  const handleCreateThread = () => {
    if (!threadForm.title.trim()) return;
    const t = createThread(
      communityId,
      threadForm.title.trim(),
      threadForm.content.trim(),
      user?.email?.split('@')[0] || 'you'
    );
    setThreadForm({ title: '', content: '' });
    setShowCreateThread(false);
    router.push(`/communities/${communityId}/${t.id}`);
  };

  const handleSharePost = async (e: React.MouseEvent, threadId: string, title: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/communities/${communityId}/${threadId}`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };

  if (!community) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-[#121212]">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Community not found.</p>
          <Link href="/communities" className="text-sm font-semibold text-[#f97316] hover:underline">
            Back to Communities
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#121212] text-gray-900 dark:text-white">
      {/* Community header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Link
            href="/communities"
            className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            All Communities
          </Link>
          <div className="flex items-center gap-3">
            <CommunityAvatar src={COMMUNITY_IMAGES[community.id]} name={community.name} className="h-12 w-12 shrink-0 text-lg" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">r/{community.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{community.description}</p>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Users className="h-4 w-4" />
                <span>{community.memberCount.toLocaleString()} members</span>
              </div>
              <button
                onClick={() => setJoined(j => !j)}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  joined
                    ? 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'bg-[#f97316] text-white hover:opacity-90'
                }`}
              >
                {joined ? 'Joined' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-4">
        {/* Actions */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {communityThreads.length} {communityThreads.length === 1 ? 'post' : 'posts'}
          </p>
          <button
            onClick={() => setShowCreateThread(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" />
            Create Post
          </button>
        </div>

        {/* Thread list — Reddit card style */}
        {communityThreads.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-3">No posts yet in this community.</p>
            <button
              onClick={() => setShowCreateThread(true)}
              className="text-sm font-semibold text-[#f97316] hover:underline"
            >
              Be the first to post
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {communityThreads.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition-colors overflow-hidden"
              >
                {/* Post header */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                  <CommunityAvatar src={COMMUNITY_IMAGES[community.id]} name={community.name} className="h-6 w-6 shrink-0 text-[11px]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-0">
                      <span className="text-[12px] font-bold text-gray-900 dark:text-white">r/{community.name}</span>
                      <span className="text-[11px] text-gray-400">•</span>
                      <span className="text-[11px] text-gray-400">{timeAgo(t.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">Posted by {t.author}</p>
                  </div>
                  <button
                    onClick={() => setJoined(j => !j)}
                    className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-bold transition ${
                      joined
                        ? 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                        : 'bg-[#f97316] text-white hover:opacity-90'
                    }`}
                  >
                    {joined ? 'Joined' : 'Join'}
                  </button>
                </div>

                {/* Thread body */}
                <div
                  className="cursor-pointer px-3 pb-2"
                  onClick={() => router.push(`/communities/${t.communityId}/${t.id}`)}
                >
                  <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white leading-snug mb-1">
                    {t.title}
                  </h3>
                  {t.content && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                      {t.content}
                    </p>
                  )}
                  <PostMedia media={t.media} />
                </div>

                {/* Bottom action bar */}
                <div className="flex items-center gap-1 px-2 pb-2 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                  {/* Vote pill */}
                  <div className="flex items-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <button
                      onClick={(e) => { e.stopPropagation(); vote(t.id, 1); }}
                      aria-label="Upvote"
                      className={`flex h-8 w-8 items-center justify-center rounded-full p-0 transition-colors ${
                        t.userVote === 1 ? 'text-[#f97316]' : 'text-black dark:text-white hover:text-[#f97316]'
                      }`}
                    >
                      <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <span className={`min-w-[20px] text-center text-xs font-bold tabular-nums ${
                      t.userVote === 1 ? 'text-[#f97316]' : t.userVote === -1 ? 'text-[#f97316]' : 'text-black dark:text-white'
                    }`}>{t.votes}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); vote(t.id, -1); }}
                      aria-label="Downvote"
                      className={`flex h-8 w-8 items-center justify-center rounded-full p-0 transition-colors ${
                        t.userVote === -1 ? 'text-[#f97316]' : 'text-black dark:text-white hover:text-[#f97316]'
                      }`}
                    >
                      <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Comments */}
                  <button
                    onClick={() => router.push(`/communities/${t.communityId}/${t.id}`)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>{t.commentCount}</span>
                  </button>

                  {/* Share */}
                  <button
                    onClick={(e) => handleSharePost(e, t.id, t.title)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Thread Modal */}
      {showCreateThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateThread(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">New Post</h2>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">Posting to r/{community.name}</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input
                  type="text"
                  value={threadForm.title}
                  onChange={(e) => setThreadForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Post title"
                  autoFocus
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Body (optional)</label>
                <textarea
                  value={threadForm.content}
                  onChange={(e) => setThreadForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Share more details..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowCreateThread(false)}
                className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateThread}
                disabled={!threadForm.title.trim()}
                className="flex-1 rounded-xl bg-[#f97316] py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
