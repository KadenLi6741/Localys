'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronUp, ChevronDown, MessageSquare, Plus, Users } from 'lucide-react';

const COMMUNITY_IMAGES: Record<string, string> = {
  'richmondhill-eats': '/communities/Richmond Hill.jpg',
  'local-services': '/communities/Local services.jpg',
  'support-local': '/communities/SupportLocal.png',
  'markham': '/communities/Markham.png',
  'vaughan': '/communities/Vaughan.jpg',
};
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useCommunities } from '@/contexts/CommunitiesContext';
import { useAuth } from '@/contexts/AuthContext';

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

  if (!community) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-[#1A1A18]">
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
    <div className="min-h-screen bg-gray-100 dark:bg-[#1A1A18] text-gray-900 dark:text-white">
      {/* Community header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Link
            href="/communities"
            className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            All Communities
          </Link>
          <div className="flex items-center gap-3">
            <img
              src={COMMUNITY_IMAGES[community.id] || ''}
              alt={community.name}
              className="h-12 w-12 shrink-0 rounded-full object-cover border border-gray-200"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{community.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{community.description}</p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span>{community.memberCount.toLocaleString()} members</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
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

        {/* Thread list */}
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
                className="flex overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                {/* Vote column */}
                <div className="flex w-10 shrink-0 flex-col items-center gap-0.5 bg-gray-50 dark:bg-gray-800 py-3 border-r border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => vote(t.id, 1)}
                    aria-label="Upvote"
                    className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                      t.userVote === 1
                        ? 'text-[#f97316]'
                        : 'text-gray-400 hover:text-[#f97316] hover:bg-orange-50 dark:hover:bg-orange-950/20'
                    }`}
                  >
                    <ChevronUp className="h-5 w-5" />
                  </button>
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      t.userVote === 1
                        ? 'text-[#f97316]'
                        : t.userVote === -1
                        ? 'text-gray-500'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {t.votes}
                  </span>
                  <button
                    onClick={() => vote(t.id, -1)}
                    aria-label="Downvote"
                    className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                      t.userVote === -1
                        ? 'text-gray-500'
                        : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                </div>

                {/* Thread content */}
                <div
                  className="flex-1 cursor-pointer p-3"
                  onClick={() => router.push(`/communities/${t.communityId}/${t.id}`)}
                >
                  <div className="mb-1 text-xs text-gray-400 dark:text-gray-500">
                    Posted by {t.author} &middot; {timeAgo(t.createdAt)}
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug mb-2">
                    {t.title}
                  </h3>
                  {t.content && (
                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {t.content}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{t.commentCount} {t.commentCount === 1 ? 'comment' : 'comments'}</span>
                  </div>
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
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">Posting to {community.name}</p>
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
