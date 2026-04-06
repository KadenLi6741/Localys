'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

export interface ShoutoutComment {
  id: string;
  user_id: string;
  username: string;
  profile_picture_url: string | null;
  text: string;
  created_at: string;
  parent_comment_id: string | null;
  likes: number;
  liked_by_me: boolean;
  replies?: ShoutoutComment[];
}

export interface Shoutout {
  id: string;
  user_id: string;
  username: string;
  profile_picture_url: string | null;
  business_name: string;
  business_id: string | null;
  text: string;
  star_rating: number | null;
  tags: string[];
  photos: string[];
  video_url: string | null;
  created_at: string;
  likes: number;
  liked_by_me: boolean;
  comment_count: number;
}

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
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString();
}

interface ShoutoutCardProps {
  shoutout: Shoutout;
  index: number;
  onLike: (id: string) => void;
  onComment: (id: string) => void;
  comments: ShoutoutComment[];
  loadingComments: boolean;
  onLoadComments: (id: string) => void;
  onSubmitComment: (shoutoutId: string, text: string, parentId?: string) => void;
  onLikeComment: (commentId: string) => void;
  currentUserId: string | null;
  onEdit?: (shoutout: Shoutout) => void;
  onDelete?: (id: string) => void;
}

export function ShoutoutCard({
  shoutout,
  index,
  onLike,
  comments,
  loadingComments,
  onLoadComments,
  onSubmitComment,
  onLikeComment,
  currentUserId,
  onEdit,
  onDelete,
}: ShoutoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(shoutout.liked_by_me);
  const [likeCount, setLikeCount] = useState(shoutout.likes);
  const [animateLike, setAnimateLike] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  const isAuthor = currentUserId === shoutout.user_id;

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleDelete = () => {
    setFadingOut(true);
    setTimeout(() => {
      onDelete?.(shoutout.id);
    }, 200);
  };

  const handleLike = () => {
    setAnimateLike(true);
    setTimeout(() => setAnimateLike(false), 400);
    if (liked) {
      setLikeCount((c) => c - 1);
    } else {
      setLikeCount((c) => c + 1);
    }
    setLiked(!liked);
    onLike(shoutout.id);
  };

  const handleToggleComments = () => {
    if (!showComments && comments.length === 0) {
      onLoadComments(shoutout.id);
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = () => {
    const text = commentText.trim();
    if (!text) return;
    onSubmitComment(shoutout.id, text);
    setCommentText('');
  };

  const handleSubmitReply = (parentId: string) => {
    const text = replyText.trim();
    if (!text) return;
    onSubmitComment(shoutout.id, text, parentId);
    setReplyText('');
    setReplyTo(null);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/explore?shoutout=${shoutout.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Silently fail
    }
  };

  // Separate top-level comments and replies
  const topLevelComments = comments.filter((c) => !c.parent_comment_id);
  const replies = comments.filter((c) => c.parent_comment_id);
  const getReplies = (parentId: string) => replies.filter((r) => r.parent_comment_id === parentId);
  const visibleComments = showAllComments ? topLevelComments : topLevelComments.slice(0, 3);

  return (
    <article
      className={`bg-white border border-[#E8E8E4] px-3 py-2.5 transition-all duration-300 ${fadingOut ? 'opacity-0 scale-95' : ''}`}
      style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`, transition: 'opacity 200ms, transform 200ms' }}
    >
      {/* Author row */}
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/profile/${shoutout.user_id}`} className="shrink-0">
          {shoutout.profile_picture_url ? (
            <Image
              src={shoutout.profile_picture_url}
              alt={shoutout.username}
              width={32}
              height={32}
              unoptimized
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center">
              <span className="text-xs text-[#6B6B65]">{shoutout.username?.charAt(0)?.toUpperCase() || '?'}</span>
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-[#1A1A1A] truncate">{shoutout.username}</p>
            <span className="text-[10px] text-[#6B6B65]">&middot;</span>
            <p className="text-[11px] text-[#6B6B65]">{timeAgo(shoutout.created_at)}</p>
          </div>
        </div>

        {/* Three-dot menu — author only */}
        {isAuthor && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setShowMenu(!showMenu); setConfirmDelete(false); }}
              className="p-1.5 text-[#6B6B65] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E8E8E4] overflow-hidden shadow-lg z-20">
                {!confirmDelete ? (
                  <>
                    <button
                      onClick={() => { setShowMenu(false); onEdit?.(shoutout); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#E05C3A] hover:bg-[#F8F8F6] transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete
                    </button>
                  </>
                ) : (
                  <div className="p-3">
                    <p className="text-sm text-[#1A1A1A] mb-2">Delete this shoutout?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        className="flex-1 py-1.5 text-xs font-semibold bg-[#E05C3A] text-white hover:bg-[#E05C3A]/80 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { setConfirmDelete(false); setShowMenu(false); }}
                        className="flex-1 py-1.5 text-xs font-semibold border border-[#E8E8E4] text-[#6B6B65] hover:text-[#1A1A1A] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Business tag */}
      <div className="mb-1.5">
        {shoutout.business_id ? (
          <Link
            href={`/profile/${shoutout.business_id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#1A1A1A] hover:underline"
          >
            @{shoutout.business_name}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#1A1A1A]">
            {shoutout.business_name}
          </span>
        )}
      </div>

      {/* Tags */}
      {shoutout.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {shoutout.tags.map((tag) => (
            <span
              key={tag}
              className="inline-block px-2 py-0.5 text-xs font-semibold bg-[#F8F8F6] text-[#1A1A1A]"
            >
              {TAG_LABELS[tag] || tag}
            </span>
          ))}
        </div>
      )}

      {/* Text content */}
      <div className="mb-2">
        <p
          ref={textRef}
          className={`text-sm text-[#1A1A1A] leading-snug whitespace-pre-wrap ${!expanded ? 'line-clamp-3' : ''}`}
        >
          {shoutout.text}
        </p>
        {shoutout.text.length > 200 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-[#1A1A1A] font-medium hover:underline mt-1"
          >
            Read more
          </button>
        )}
      </div>

      {/* Video */}
      {shoutout.video_url && (
        <div className="relative rounded-xl overflow-hidden mb-2">
          <video
            ref={videoRef}
            src={shoutout.video_url}
            className="w-full max-h-80 object-contain bg-black rounded-xl"
            muted={videoMuted}
            autoPlay
            loop
            playsInline
            onClick={() => {
              setVideoMuted(!videoMuted);
              if (videoRef.current) videoRef.current.muted = !videoMuted;
            }}
          />
          <button
            onClick={() => {
              setVideoMuted(!videoMuted);
              if (videoRef.current) videoRef.current.muted = !videoMuted;
            }}
            className="absolute bottom-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white text-xs"
          >
            {videoMuted ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
            )}
          </button>
        </div>
      )}

      {/* Photos */}
      {shoutout.photos.length > 0 && !shoutout.video_url && (
        <div className={`grid gap-1.5 mb-2 ${shoutout.photos.length === 1 ? 'grid-cols-1' : shoutout.photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {shoutout.photos.map((photo, i) => (
            <button
              key={i}
              onClick={() => setPhotoPreview(photo)}
              className="relative aspect-square overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            >
              <Image src={photo} alt="" fill unoptimized className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Star rating */}
      {shoutout.star_rating && shoutout.star_rating > 0 && (
        <div className="flex items-center gap-0.5 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`w-4 h-4 ${star <= shoutout.star_rating! ? 'text-[#1A1A1A]' : 'text-[#E8E8E4]'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-4 pt-1.5 border-t border-[var(--color-charcoal-lighter-plus)]">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-[#E05C3A]' : 'text-[var(--color-body-text)] hover:text-[#E05C3A]'}`}
        >
          <span className={`text-base ${animateLike ? 'animate-[likeButtonPop_0.4s_ease-out]' : ''}`}>
            <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          </span>
          <span>{likeCount}</span>
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-sm text-[var(--color-body-text)] hover:text-[var(--color-cream)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <span>{shoutout.comment_count}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm text-[var(--color-body-text)] hover:text-[var(--color-cream)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          <span>Share</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-[#E8E8E4]">
          {/* Comment input */}
          {currentUserId && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-[#F8F8F6] border border-[#E8E8E4] px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#6B6B65] focus:outline-none focus:border-[#1A1A1A]"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                className="px-3 py-2 bg-[#1A1A1A] text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
              >
                Post
              </button>
            </div>
          )}

          {loadingComments && (
            <div className="py-4 text-center text-[#6B6B65] text-sm">Loading comments...</div>
          )}

          {/* Comment list */}
          <div className="space-y-3">
            {visibleComments.map((comment) => (
              <div key={comment.id}>
                <CommentRow
                  comment={comment}
                  onLike={onLikeComment}
                  onReply={(id) => { setReplyTo(id === replyTo ? null : id); setReplyText(''); }}
                  currentUserId={currentUserId}
                />
                {/* Replies */}
                {getReplies(comment.id).length > 0 && (
                  <div className="ml-10 mt-2 space-y-2 border-l-2 border-[#E8E8E4] pl-3">
                    {getReplies(comment.id).map((reply) => (
                      <CommentRow
                        key={reply.id}
                        comment={reply}
                        onLike={onLikeComment}
                        onReply={(id) => { setReplyTo(id === replyTo ? null : id); setReplyText(''); }}
                        currentUserId={currentUserId}
                      />
                    ))}
                  </div>
                )}
                {/* Reply input */}
                {replyTo === comment.id && currentUserId && (
                  <div className="ml-10 mt-2 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply(comment.id)}
                      placeholder="Write a reply..."
                      autoFocus
                      className="flex-1 bg-[#F8F8F6] border border-[#E8E8E4] px-3 py-1.5 text-sm text-[#1A1A1A] placeholder-[#6B6B65] focus:outline-none focus:border-[#1A1A1A]"
                    />
                    <button
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyText.trim()}
                      className="px-2.5 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold disabled:opacity-40 transition-opacity"
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {topLevelComments.length > 3 && !showAllComments && (
            <button
              onClick={() => setShowAllComments(true)}
              className="mt-3 text-sm text-[#1A1A1A] font-medium hover:underline"
            >
              Load more comments ({topLevelComments.length - 3} more)
            </button>
          )}
        </div>
      )}

      {/* Photo preview modal */}
      {photoPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPhotoPreview(null)}
        >
          <Image
            src={photoPreview}
            alt=""
            width={800}
            height={800}
            unoptimized
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
          />
        </div>
      )}
    </article>
  );
}

function CommentRow({
  comment,
  onLike,
  onReply,
  currentUserId,
}: {
  comment: ShoutoutComment;
  onLike: (id: string) => void;
  onReply: (id: string) => void;
  currentUserId: string | null;
}) {
  const [liked, setLiked] = useState(comment.liked_by_me);
  const [likeCount, setLikeCount] = useState(comment.likes);

  const handleLike = () => {
    if (liked) setLikeCount((c) => c - 1);
    else setLikeCount((c) => c + 1);
    setLiked(!liked);
    onLike(comment.id);
  };

  return (
    <div className="flex gap-2">
      {comment.profile_picture_url ? (
        <Image
          src={comment.profile_picture_url}
          alt={comment.username}
          width={28}
          height={28}
          unoptimized
          className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-[#F8F8F6] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] text-[#6B6B65]">{comment.username?.charAt(0)?.toUpperCase() || '?'}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-[#1A1A1A]">{comment.username}</span>
          <span className="text-[10px] text-[#6B6B65]">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm text-[#1A1A1A] mt-0.5">{comment.text}</p>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={handleLike}
            className={`text-xs transition-colors ${liked ? 'text-[#E05C3A]' : 'text-[#6B6B65] hover:text-[#E05C3A]'}`}
          >
            {liked ? (<svg className="w-3 h-3 inline" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>) : (<svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>)} {likeCount > 0 && likeCount}
          </button>
          {currentUserId && (
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-[#6B6B65] hover:text-[#1A1A1A] transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
