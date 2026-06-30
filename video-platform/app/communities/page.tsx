'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Plus, Share2 } from 'lucide-react';
import { VoteArrowUp, VoteArrowDown } from '@/components/VoteArrow';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useCommunities } from '@/contexts/CommunitiesContext';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityAvatar } from '@/components/communities/CommunityAvatar';
import { PostMedia } from '@/components/communities/PostMedia';
import { FieldError } from '@/components/forms/FieldError';
import { validateRequired, validateMaxLength, firstError } from '@/lib/utils/validation';

const COMMUNITY_IMAGES: Record<string, string> = {
  'richmondhill-eats': '/Communities/Richmond Hill.jpg',
  'local-services': '/Communities/Local services.jpg',
  'support-local': '/Communities/SupportLocal.png',
  'markham': '/Communities/Markham.png',
  'vaughan': '/Communities/Vaughan.jpg',
};

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
  const { communities, threads, vote, createCommunity, createThread } = useCommunities();

  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [communityForm, setCommunityForm] = useState({ name: '', description: '' });
  const [threadForm, setThreadForm] = useState({ communityId: '', title: '', content: '' });
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());

  const sortedThreads = [...threads].sort((a, b) => b.votes - a.votes);

  const toggleJoin = (communityId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setJoinedCommunities(prev => {
      const next = new Set(prev);
      if (next.has(communityId)) next.delete(communityId);
      else next.add(communityId);
      return next;
    });
  };

  const handleSharePost = async (e: React.MouseEvent, threadId: string, communityId: string, title: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/communities/${communityId}/${threadId}`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };

  const handleCreateCommunity = () => {
    // Syntactic + semantic: name required, 3–30 chars, reasonable description length.
    const error = firstError(
      validateRequired(communityForm.name, 'Community name'),
      communityForm.name.trim().length < 3 ? 'Community name must be at least 3 characters.' : null,
      validateMaxLength(communityForm.name.trim(), 30, 'Community name'),
      validateMaxLength(communityForm.description, 200, 'Description'),
    );
    if (error) { setCommunityError(error); return; }
    setCommunityError(null);
    const c = createCommunity(communityForm.name.trim(), communityForm.description.trim());
    setCommunityForm({ name: '', description: '' });
    setShowCreateCommunity(false);
    router.push(`/communities/${c.id}`);
  };

  const handleCreateThread = () => {
    // Syntactic + semantic: a community must be chosen and a non-empty title given.
    const error = firstError(
      !threadForm.communityId ? 'Please choose a community.' : null,
      validateRequired(threadForm.title, 'Title'),
      validateMaxLength(threadForm.title.trim(), 150, 'Title'),
      validateMaxLength(threadForm.content, 2000, 'Body'),
    );
    if (error) { setThreadError(error); return; }
    setThreadError(null);
    const t = createThread(
      threadForm.communityId,
      threadForm.title.trim(),
      threadForm.content.trim(),
      user?.email?.split('@')[0] || 'you'
    );
    setThreadForm({ communityId: '', title: '', content: '' });
    setShowCreateThread(false);
    router.push(`/communities/${t.communityId}/${t.id}`);
  };

  const suggestedCommunities = communities.filter(c => !joinedCommunities.has(c.id)).slice(0, 3);
  // Demo "recently visited" — a handful of existing communities for the left rail.
  const recentCommunities = communities.slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#121212] text-gray-900 dark:text-white">
      <div className="mx-auto max-w-6xl px-3 py-4 lg:flex lg:gap-6">
        {/* Left rail: Recent Communities */}
        <aside className="mb-4 lg:mb-0 lg:w-64 lg:shrink-0">
          <div className="sticky top-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white">Recent Communities</h2>
            <div className="space-y-1">
              {recentCommunities.map((c) => (
                <Link
                  key={c.id}
                  href={`/communities/${c.id}`}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <CommunityAvatar src={COMMUNITY_IMAGES[c.id]} name={c.name} className="h-8 w-8 shrink-0 text-xs" />
                  <div className="min-w-0 flex-1 leading-none">
                    <p className="truncate text-sm font-semibold leading-tight text-gray-900 dark:text-white">r/{c.name}</p>
                    <p className="text-[11px] leading-tight text-gray-500 dark:text-gray-400">{c.memberCount.toLocaleString()} members</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Main feed */}
        <div className="min-w-0 flex-1 lg:max-w-3xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Communities</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Connect with your local community</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateThread(true)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Post
            </button>
            <button
              onClick={() => setShowCreateCommunity(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#f97316] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          </div>
        </div>

        {/* Suggested for you */}
        {suggestedCommunities.length > 0 && (
          <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">Suggested for you</h2>
            <div className="space-y-3">
              {suggestedCommunities.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <Link href={`/communities/${c.id}`} className="shrink-0">
                    <CommunityAvatar src={COMMUNITY_IMAGES[c.id]} name={c.name} className="h-10 w-10" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/communities/${c.id}`} className="block text-sm font-semibold text-gray-900 dark:text-white hover:underline truncate">
                      r/{c.name}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {c.memberCount?.toLocaleString() ?? '0'} members
                    </p>
                  </div>
                  <button
                    onClick={(e) => toggleJoin(c.id, e)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                      joinedCommunities.has(c.id)
                        ? 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        : 'bg-[#f97316] text-white hover:opacity-90'
                    }`}
                  >
                    {joinedCommunities.has(c.id) ? 'Joined' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thread feed — Reddit card style */}
        <div className="space-y-2">
          {sortedThreads.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition-colors overflow-hidden"
            >
              {/* Post header */}
              <div className="flex items-start gap-2 px-3 pt-3 pb-1.5">
                <Link href={`/communities/${t.communityId}`} onClick={(e) => e.stopPropagation()} className="shrink-0 mt-0.5">
                  <CommunityAvatar src={COMMUNITY_IMAGES[t.communityId]} name={t.communityName} className="h-6 w-6 text-[11px]" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-1 gap-y-0">
                    <Link
                      href={`/communities/${t.communityId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[12px] font-bold text-gray-900 dark:text-white hover:underline"
                    >
                      r/{t.communityName}
                    </Link>
                    <span className="text-[11px] text-gray-400">•</span>
                    <span className="text-[11px] text-gray-400">{timeAgo(t.createdAt)}</span>
                    <span className="text-[11px] text-gray-400">•</span>
                    <span className="text-[11px] text-[#f97316] font-medium">Suggested for you</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Posted by {t.author}</p>
                </div>
                <button
                  onClick={(e) => toggleJoin(t.communityId, e)}
                  className={`shrink-0 ml-1 rounded-full px-3.5 py-1 text-xs font-bold transition ${
                    joinedCommunities.has(t.communityId)
                      ? 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      : 'bg-[#f97316] text-white hover:opacity-90'
                  }`}
                >
                  {joinedCommunities.has(t.communityId) ? 'Joined' : 'Join'}
                </button>
              </div>

              {/* Post body */}
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

              {/* Bottom action bar — Reddit style */}
              <div className="flex items-center gap-1 px-2 pb-2 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                {/* Upvote / count / Downvote pill */}
                <div className="flex items-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <button
                    onClick={(e) => { e.stopPropagation(); vote(t.id, 1); }}
                    aria-label="Upvote"
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      t.userVote === 1 ? 'text-[#f97316]' : 'text-black dark:text-white hover:text-[#f97316]'
                    }`}
                  >
                    <VoteArrowUp className="h-4 w-4" />
                  </button>
                  <span className={`min-w-[20px] text-center text-xs font-bold tabular-nums ${
                    t.userVote !== 0 ? 'text-[#f97316]' : 'text-black dark:text-white'
                  }`}>{t.votes}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); vote(t.id, -1); }}
                    aria-label="Downvote"
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      t.userVote === -1 ? 'text-[#f97316]' : 'text-black dark:text-white hover:text-[#f97316]'
                    }`}
                  >
                    <VoteArrowDown className="h-4 w-4" />
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
                  onClick={(e) => handleSharePost(e, t.id, t.communityId, t.title)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          ))}
        </div>
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
                  onChange={(e) => { setCommunityForm(f => ({ ...f, name: e.target.value })); if (communityError) setCommunityError(null); }}
                  placeholder="e.g. NorthYorkEats"
                  aria-invalid={!!communityError}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
                />
                <FieldError message={communityError} />
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
                  onChange={(e) => { setThreadForm(f => ({ ...f, communityId: e.target.value })); if (threadError) setThreadError(null); }}
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
                  onChange={(e) => { setThreadForm(f => ({ ...f, title: e.target.value })); if (threadError) setThreadError(null); }}
                  placeholder="Post title"
                  aria-invalid={!!threadError}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
                />
                <FieldError message={threadError} />
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
