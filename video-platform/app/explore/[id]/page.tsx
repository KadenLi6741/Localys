'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import type { Shoutout, ShoutoutComment } from '@/components/explore/ShoutoutCard';

const TAG_LABELS: Record<string, string> = {
  'hidden-gem': '#HiddenGem',
  'cheap-eats': '#CheapEats',
  'must-visit': '#MustVisit',
  'underrated': '#Underrated',
  'great-service': '#GreatService',
  'new-spot': '#NewSpot',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [shoutout, setShoutout] = useState<Shoutout | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<ShoutoutComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    loadShoutout();
    loadComments();
  }, [id]);

  const loadShoutout = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shoutouts')
      .select(`
        id, user_id, business_name, business_id, text, star_rating, tags, video_url, created_at,
        profiles!shoutouts_user_id_fkey(username, profile_picture_url),
        shoutout_photos(photo_url),
        shoutout_likes(user_id),
        shoutout_comments(id)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }

    const profileRaw = data.profiles as unknown;
    const profile = Array.isArray(profileRaw) ? profileRaw[0] as { username: string; profile_picture_url: string | null } | undefined : profileRaw as { username: string; profile_picture_url: string | null } | null;
    const photos = (data.shoutout_photos as { photo_url: string }[]) || [];
    const likes = (data.shoutout_likes as { user_id: string }[]) || [];
    const commentsList = (data.shoutout_comments as { id: string }[]) || [];

    const mapped: Shoutout = {
      id: data.id,
      user_id: data.user_id,
      username: profile?.username || 'Unknown',
      profile_picture_url: profile?.profile_picture_url || null,
      business_name: data.business_name,
      business_id: data.business_id,
      text: data.text,
      star_rating: data.star_rating,
      tags: data.tags || [],
      photos: photos.map((p) => p.photo_url),
      video_url: data.video_url || null,
      created_at: data.created_at,
      likes: likes.length,
      liked_by_me: user ? likes.some((l) => l.user_id === user.id) : false,
      comment_count: commentsList.length,
    };

    setShoutout(mapped);
    setLiked(mapped.liked_by_me);
    setLikeCount(mapped.likes);
    setLoading(false);
  };

  const loadComments = async () => {
    setLoadingComments(true);
    const { data } = await supabase
      .from('shoutout_comments')
      .select(`
        id, user_id, shoutout_id, parent_comment_id, text, created_at,
        profiles!shoutout_comments_user_id_fkey(username, profile_picture_url),
        shoutout_comment_likes(user_id)
      `)
      .eq('shoutout_id', id)
      .order('created_at', { ascending: true });

    const mapped: ShoutoutComment[] = (data || []).map((c: Record<string, unknown>) => {
      const profile = c.profiles as { username: string; profile_picture_url: string | null } | null;
      const likes = (c.shoutout_comment_likes as { user_id: string }[]) || [];
      return {
        id: c.id as string,
        user_id: c.user_id as string,
        username: profile?.username || 'Unknown',
        profile_picture_url: profile?.profile_picture_url || null,
        text: c.text as string,
        created_at: c.created_at as string,
        parent_comment_id: c.parent_comment_id as string | null,
        likes: likes.length,
        liked_by_me: user ? likes.some((l) => l.user_id === user.id) : false,
      };
    });

    setComments(mapped);
    setLoadingComments(false);
  };

  const handleLike = async () => {
    if (!user || !shoutout) return;
    if (liked) {
      await supabase.from('shoutout_likes').delete().eq('user_id', user.id).eq('shoutout_id', shoutout.id);
      setLiked(false);
      setLikeCount((c) => c - 1);
    } else {
      await supabase.from('shoutout_likes').insert({ user_id: user.id, shoutout_id: shoutout.id });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

  const handleSubmitComment = async (parentId?: string) => {
    if (!user || !shoutout) return;
    const text = parentId ? replyText.trim() : commentText.trim();
    if (!text) return;

    const { data } = await supabase
      .from('shoutout_comments')
      .insert({
        user_id: user.id,
        shoutout_id: shoutout.id,
        parent_comment_id: parentId || null,
        text,
      })
      .select('id, created_at')
      .single();

    if (data) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, profile_picture_url')
        .eq('id', user.id)
        .single();

      const newComment: ShoutoutComment = {
        id: data.id,
        user_id: user.id,
        username: profile?.username || 'You',
        profile_picture_url: profile?.profile_picture_url || null,
        text,
        created_at: data.created_at,
        parent_comment_id: parentId || null,
        likes: 0,
        liked_by_me: false,
      };
      setComments((prev) => [...prev, newComment]);
      if (parentId) {
        setReplyText('');
        setReplyTo(null);
      } else {
        setCommentText('');
      }
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    if (comment.liked_by_me) {
      await supabase.from('shoutout_comment_likes').delete().eq('user_id', user.id).eq('comment_id', commentId);
    } else {
      await supabase.from('shoutout_comment_likes').insert({ user_id: user.id, comment_id: commentId });
    }

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, liked_by_me: !c.liked_by_me, likes: c.liked_by_me ? c.likes - 1 : c.likes + 1 }
          : c
      )
    );
  };

  const handleDelete = async () => {
    if (!shoutout) return;
    setDeleting(true);
    await supabase.from('shoutouts').delete().eq('id', shoutout.id);
    router.push('/explore');
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Silently fail
    }
  };

  // Separate top-level and replies
  const topLevelComments = comments.filter((c) => !c.parent_comment_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_comment_id === parentId);

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-24 lg:pb-8">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-24 bg-[#F5F5F5] rounded" />
            <div className="h-8 w-3/4 bg-[#F5F5F5] rounded" />
            <div className="aspect-video bg-[#F5F5F5] rounded" />
            <div className="h-4 w-full bg-[#F5F5F5] rounded" />
            <div className="h-4 w-2/3 bg-[#F5F5F5] rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!shoutout) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#1A1A1A] font-semibold mb-2">Post not found</p>
          <Link href="/explore" className="text-sm text-[#2A6FD6] hover:underline">Back to Blogs</Link>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === shoutout.user_id;
  const dateStr = new Date(shoutout.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-8">

        {/* Back link */}
        <Link href="/explore" className="inline-flex items-center gap-1.5 text-sm text-[#6B6B65] hover:text-[#1A1A1A] transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Blogs
        </Link>

        {/* Header */}
        <article>
          {/* Business name as title */}
          <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {shoutout.business_name}
          </h1>

          {/* Meta row */}
          <div className="flex items-center gap-3 mb-6 text-sm text-[#6B6B65]">
            <Link href={`/profile/${shoutout.user_id}`} className="flex items-center gap-2 hover:text-[#1A1A1A] transition-colors">
              {shoutout.profile_picture_url ? (
                <Image src={shoutout.profile_picture_url} alt="" width={28} height={28} unoptimized className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#F5F5F5] flex items-center justify-center text-xs text-[#6B6B65]">
                  {shoutout.username?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <span className="font-medium">@{shoutout.username}</span>
            </Link>
            <span>&middot;</span>
            <span>{dateStr}</span>
            {shoutout.star_rating && (
              <>
                <span>&middot;</span>
                <span className="text-[#F5A623]">{'★'.repeat(shoutout.star_rating)}{'☆'.repeat(5 - shoutout.star_rating)}</span>
              </>
            )}
          </div>

          {/* Tags */}
          {shoutout.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {shoutout.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 text-xs font-semibold bg-[#F5F5F5] text-[#1A1A1A]">
                  {TAG_LABELS[tag] || tag}
                </span>
              ))}
            </div>
          )}

          {/* Photos */}
          {shoutout.photos.length > 0 && (
            <div className={`grid gap-2 mb-6 ${shoutout.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {shoutout.photos.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoPreview(photo)}
                  className="relative aspect-video overflow-hidden bg-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6]"
                >
                  <Image src={photo} alt="" fill unoptimized className="object-cover hover:scale-105 transition-transform duration-300" />
                </button>
              ))}
            </div>
          )}

          {/* Video */}
          {shoutout.video_url && (
            <div className="mb-6">
              <video
                src={shoutout.video_url}
                className="w-full max-h-[500px] object-contain bg-black rounded-lg"
                controls
                playsInline
              />
            </div>
          )}

          {/* Text content */}
          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-[#1A1A1A] leading-relaxed whitespace-pre-wrap text-base">
              {shoutout.text}
            </p>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-4 py-4 border-t border-b border-[#E8E8E4] mb-8">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${liked ? 'text-[#E05C3A]' : 'text-[#6B6B65] hover:text-[#1A1A1A]'}`}
            >
              <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {likeCount > 0 && likeCount}
            </button>

            <button
              onClick={() => commentInputRef.current?.focus()}
              className="flex items-center gap-1.5 text-sm font-medium text-[#6B6B65] hover:text-[#1A1A1A] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {comments.length > 0 && comments.length}
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-sm font-medium text-[#6B6B65] hover:text-[#1A1A1A] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>

            {/* Delete — author only */}
            {isAuthor && (
              <div className="ml-auto relative">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#E05C3A] hover:text-[#E05C3A]/80 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6B6B65]">Delete this post?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1 text-xs font-semibold bg-[#E05C3A] text-white hover:bg-[#E05C3A]/80 transition-colors disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1 text-xs font-semibold border border-[#E8E8E4] text-[#6B6B65] hover:text-[#1A1A1A] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <section>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">
              Comments {comments.length > 0 && `(${comments.length})`}
            </h2>

            {/* New comment input */}
            {user ? (
              <div className="flex gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex-shrink-0" />
                <div className="flex-1">
                  <textarea
                    ref={commentInputRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                    placeholder="Write a comment..."
                    rows={2}
                    className="w-full border border-[#E8E8E4] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6]/20 focus:border-[#2A6FD6] resize-none"
                  />
                  {commentText.trim() && (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleSubmitComment()}
                        className="px-4 py-1.5 text-sm font-semibold bg-[#2A6FD6] text-white rounded hover:bg-[#245FCC] transition-colors"
                      >
                        Post
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#6B6B65] mb-6">
                <Link href="/login" className="text-[#2A6FD6] hover:underline">Sign in</Link> to leave a comment.
              </p>
            )}

            {/* Comments list */}
            {loadingComments ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F5F5F5]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 bg-[#F5F5F5] rounded" />
                      <div className="h-3 w-full bg-[#F5F5F5] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topLevelComments.length === 0 ? (
              <p className="text-sm text-[#6B6B65] text-center py-6">No comments yet. Be the first!</p>
            ) : (
              <div className="space-y-4">
                {topLevelComments.map((comment) => {
                  const replies = getReplies(comment.id);
                  return (
                    <div key={comment.id}>
                      {/* Comment */}
                      <div className="flex gap-3">
                        <Link href={`/profile/${comment.user_id}`} className="shrink-0">
                          {comment.profile_picture_url ? (
                            <Image src={comment.profile_picture_url} alt="" width={32} height={32} unoptimized className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center text-xs text-[#6B6B65]">
                              {comment.username?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-[#1A1A1A]">{comment.username}</span>
                            <span className="text-[11px] text-[#9E9A90]">{timeAgo(comment.created_at)}</span>
                          </div>
                          <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{comment.text}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <button
                              onClick={() => handleLikeComment(comment.id)}
                              className={`text-xs font-medium transition-colors ${comment.liked_by_me ? 'text-[#E05C3A]' : 'text-[#9E9A90] hover:text-[#1A1A1A]'}`}
                            >
                              {comment.likes > 0 ? `${comment.likes} ♥` : '♥'}
                            </button>
                            {user && (
                              <button
                                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                                className="text-xs font-medium text-[#9E9A90] hover:text-[#1A1A1A] transition-colors"
                              >
                                Reply
                              </button>
                            )}
                          </div>

                          {/* Reply input */}
                          {replyTo === comment.id && (
                            <div className="mt-2 flex gap-2">
                              <input
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitComment(comment.id); } }}
                                placeholder={`Reply to @${comment.username}...`}
                                className="flex-1 border border-[#E8E8E4] rounded px-3 py-1.5 text-sm text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:ring-1 focus:ring-[#2A6FD6]"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSubmitComment(comment.id)}
                                disabled={!replyText.trim()}
                                className="px-3 py-1.5 text-xs font-semibold bg-[#2A6FD6] text-white rounded hover:bg-[#245FCC] disabled:opacity-40 transition-colors"
                              >
                                Reply
                              </button>
                            </div>
                          )}

                          {/* Replies */}
                          {replies.length > 0 && (
                            <div className="mt-3 ml-2 pl-3 border-l-2 border-[#F5F5F5] space-y-3">
                              {replies.map((reply) => (
                                <div key={reply.id} className="flex gap-2">
                                  <Link href={`/profile/${reply.user_id}`} className="shrink-0">
                                    {reply.profile_picture_url ? (
                                      <Image src={reply.profile_picture_url} alt="" width={24} height={24} unoptimized className="w-6 h-6 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[10px] text-[#6B6B65]">
                                        {reply.username?.charAt(0)?.toUpperCase()}
                                      </div>
                                    )}
                                  </Link>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-xs font-semibold text-[#1A1A1A]">{reply.username}</span>
                                      <span className="text-[10px] text-[#9E9A90]">{timeAgo(reply.created_at)}</span>
                                    </div>
                                    <p className="text-xs text-[#1A1A1A] whitespace-pre-wrap">{reply.text}</p>
                                    <button
                                      onClick={() => handleLikeComment(reply.id)}
                                      className={`text-[10px] font-medium mt-0.5 transition-colors ${reply.liked_by_me ? 'text-[#E05C3A]' : 'text-[#9E9A90] hover:text-[#1A1A1A]'}`}
                                    >
                                      {reply.likes > 0 ? `${reply.likes} ♥` : '♥'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </article>
      </div>

      {/* Photo lightbox */}
      {photoPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPhotoPreview(null)}
        >
          <button
            onClick={() => setPhotoPreview(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <Image src={photoPreview} alt="" width={1200} height={800} unoptimized className="max-w-full max-h-[90vh] object-contain" />
        </div>
      )}
    </div>
  );
}
