'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronUp, ChevronDown, MessageSquare, Plus } from 'lucide-react';

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

export default function CommunitiesPage() {
  return (
    <ProtectedRoute>
      <CommunitiesContent />
    </ProtectedRoute>
  );
}

function CommunitiesContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { communities, threads, vote, voteCommunity, createCommunity, createThread } = useCommunities();

  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showCreateThread, setShowCreateThread] = useState(false);

  const [communityForm, setCommunityForm] = useState({ name: '', description: '' });
  const [threadForm, setThreadForm] = useState({ communityId: '', title: '', content: '' });

  const sortedThreads = [...threads].sort((a, b) => b.votes - a.votes);

  const handleCreateCommunity = () => {
    if (!communityForm.name.trim()) return;
    const c = createCommunity(communityForm.name.trim(), communityForm.description.trim());
    setCommunityForm({ name: '', description: '' });
    setShowCreateCommunity(false);
    router.push(`/communities/${c.id}`);
  };

  const handleCreateThread = () => {
    if (!threadForm.title.trim() || !threadForm.communityId) return;
    const t = createThread(threadForm.communityId, threadForm.title.trim(), threadForm.content.trim(), user?.email?.split('@')[0] || 'you');
    setThreadForm({ communityId: '', title: '', content: '' });
    setShowCreateThread(false);
    router.push(`/communities/${t.communityId}/${t.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#1A1A18] text-gray-900 dark:text-white">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex gap-6">
          {/* Left sidebar */}
          <aside className="hidden lg:flex w-60 shrink-0 flex-col gap-4">
            <button
              onClick={() => setShowCreateCommunity(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" />
              Create Community
            </button>

            {/* Communities list with vote buttons */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Communities</h3>
              <div className="space-y-1">
                {communities.map((c) => (
                  <div key={c.id} className="flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    {/* Vote column */}
                    <div className="flex flex-col items-center shrink-0">
                      <button
                        onClick={() => voteCommunity(c.id, 1)}
                        aria-label={`Upvote ${c.name}`}
                        className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
                          c.userVote === 1 ? 'text-[#f97316]' : 'text-gray-300 hover:text-[#f97316]'
                        }`}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <span className={`text-[10px] font-bold tabular-nums leading-none ${
                        c.userVote === 1 ? 'text-[#f97316]' : c.userVote === -1 ? 'text-gray-500' : 'text-gray-400'
                      }`}>{c.votes}</span>
                      <button
                        onClick={() => voteCommunity(c.id, -1)}
                        aria-label={`Downvote ${c.name}`}
                        className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
                          c.userVote === -1 ? 'text-gray-500' : 'text-gray-300 hover:text-gray-500'
                        }`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Link
                      href={`/communities/${c.id}`}
                      className="flex min-w-0 flex-1 items-center gap-2"
                    >
                      <img src={COMMUNITY_IMAGES[c.id] || ''} alt={c.name} className="h-5 w-5 shrink-0 rounded-full object-cover" />
                      <span className="truncate text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent posts — improved layout */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Recent Posts</h3>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {sortedThreads.slice(0, 4).map((t) => (
                  <Link
                    key={t.id}
                    href={`/communities/${t.communityId}/${t.id}`}
                    className="block py-2.5 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-1 px-1 rounded transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src={COMMUNITY_IMAGES[t.communityId] || ''} alt={t.communityName} className="h-2.5 w-2.5 rounded-full object-cover shrink-0" />
                      <span className="text-[10px] font-semibold text-[#f97316] uppercase tracking-wide">{t.communityName}</span>
                      <span className="ml-auto text-[10px] text-gray-400">{timeAgo(t.createdAt)}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug">{t.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                      <span>{t.votes} votes</span>
                      <span>&middot;</span>
                      <span>{t.commentCount} {t.commentCount === 1 ? 'comment' : 'comments'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* Main feed */}
          <main className="min-w-0 flex-1">
            {/* Header row */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">Communities</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Connect with your local community</p>
              </div>
              <button
                onClick={() => setShowCreateThread(true)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Post
              </button>
            </div>

            {/* Mobile: create community + browse communities */}
            <div className="mb-4 flex gap-2 lg:hidden">
              <button
                onClick={() => setShowCreateCommunity(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#f97316] px-3 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Create Community
              </button>
              <div className="flex gap-1 overflow-x-auto flex-1">
                {communities.slice(0, 3).map((c) => (
                  <Link
                    key={c.id}
                    href={`/communities/${c.id}`}
                    className="shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Thread feed */}
            <div className="space-y-2">
              {sortedThreads.map((t) => (
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

                  {/* Post content */}
                  <div
                    className="flex-1 cursor-pointer p-3"
                    onClick={() => router.push(`/communities/${t.communityId}/${t.id}`)}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <Link
                        href={`/communities/${t.communityId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-semibold text-[#f97316] hover:underline"
                      >
                        {t.communityName}
                      </Link>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        Posted by {t.author} &middot; {timeAgo(t.createdAt)}
                      </span>
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
          </main>
        </div>
      </div>

      {/* Create Community Modal */}
      {showCreateCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateCommunity(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Create Community</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  type="text"
                  value={communityForm.name}
                  onChange={(e) => setCommunityForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. NorthYorkEats"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Description</label>
                <input
                  type="text"
                  value={communityForm.description}
                  onChange={(e) => setCommunityForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What is this community about?"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowCreateCommunity(false)}
                className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCommunity}
                disabled={!communityForm.name.trim()}
                className="flex-1 rounded-xl bg-[#f97316] py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Thread Modal */}
      {showCreateThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateThread(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">New Post</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Community</label>
                <select
                  value={threadForm.communityId}
                  onChange={(e) => setThreadForm(f => ({ ...f, communityId: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
                >
                  <option value="">Select a community</option>
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input
                  type="text"
                  value={threadForm.title}
                  onChange={(e) => setThreadForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Post title"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Body (optional)</label>
                <textarea
                  value={threadForm.content}
                  onChange={(e) => setThreadForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Share more details..."
                  rows={3}
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
                disabled={!threadForm.title.trim() || !threadForm.communityId}
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
