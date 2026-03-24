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
      className={`bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-2xl px-3 py-2.5 transition-all duration-300 ${fadingOut ? 'opacity-0 scale-95' : ''}`}
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
            <div className="w-8 h-8 rounded-full bg-[var(--color-charcoal-lighter-plus)] flex items-center justify-center">
              <span className="text-xs text-[var(--color-body-text)]">{shoutout.username?.charAt(0)?.toUpperCase() || '?'}</span>
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-[var(--color-cream)] truncate">{shoutout.username}</p>
            <span className="text-[10px] text-[var(--color-body-text)]">&middot;</span>
            <p className="text-[11px] text-[var(--color-body-text)]">{timeAgo(shoutout.created_at)}</p>
          </div>
        </div>

        {/* Three-dot menu — author only */}
        {isAuthor && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setShowMenu(!showMenu); setConfirmDelete(false); }}
              className="p-1.5 rounded-lg text-[var(--color-body-text)] hover:text-[var(--color-cream)] hover:bg-[var(--glass-bg)] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--color-charcoal)] border border-[var(--color-charcoal-lighter-plus)] rounded-xl overflow-hidden shadow-lg z-20">
                {!confirmDelete ? (
                  <>
                    <button
                      onClick={() => { setShowMenu(false); onEdit?.(shoutout); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-cream)] hover:bg-[var(--color-charcoal-light)] transition-colors flex items-center gap-2"
                    >
                      <span>✏️</span> Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#E05C3A] hover:bg-[var(--color-charcoal-light)] transition-colors flex items-center gap-2"
                    >
                      <span>🗑️</span> Delete
                    </button>
                  </>
                ) : (
                  <div className="p-3">
                    <p className="text-sm text-[var(--color-cream)] mb-2">Delete this shoutout?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-[#E05C3A] text-white hover:bg-[#E05C3A]/80 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { setConfirmDelete(false); setShowMenu(false); }}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-charcoal-lighter-plus)] text-[var(--color-body-text)] hover:text-[var(--color-cream)] transition-colors"
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
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#F5A623] hover:underline"
          >
            @{shoutout.business_name}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#F5A623]">
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
              className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-[#F5A623]/10 text-[#F5A623]"
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
          className={`text-sm text-[var(--color-cream)] leading-snug whitespace-pre-wrap ${!expanded ? 'line-clamp-3' : ''}`}
        >
          {shoutout.text}
        </p>
        {shoutout.text.length > 200 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-[#F5A623] hover:underline mt-1"
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
            {videoMuted ? '🔇' : '🔊'}
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
              className="relative aspect-square overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
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
              className={`w-4 h-4 ${star <= shoutout.star_rating! ? 'text-[#F5A623]' : 'text-[var(--color-charcoal-lighter-plus)]'}`}
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
            {liked ? '❤️' : '🤍'}
          </span>
          <span>{likeCount}</span>
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-sm text-[var(--color-body-text)] hover:text-[var(--color-cream)] transition-colors"
        >
          <span className="text-base">💬</span>
          <span>{shoutout.comment_count}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm text-[var(--color-body-text)] hover:text-[var(--color-cream)] transition-colors"
        >
          <span className="text-base">🔗</span>
          <span>Share</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-[var(--color-charcoal-lighter-plus)]">
          {/* Comment input */}
          {currentUserId && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-[var(--color-charcoal)] border border-[var(--color-charcoal-lighter-plus)] rounded-lg px-3 py-2 text-sm text-[var(--color-cream)] placeholder-[var(--color-body-text)] focus:outline-none focus:border-[#F5A623]"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                className="px-3 py-2 bg-[#F5A623] text-black text-sm font-semibold rounded-lg disabled:opacity-40 transition-opacity"
              >
                Post
              </button>
            </div>
          )}

          {loadingComments && (
            <div className="py-4 text-center text-[var(--color-body-text)] text-sm">Loading comments...</div>
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
                  <div className="ml-10 mt-2 space-y-2 border-l-2 border-[var(--color-charcoal-lighter-plus)] pl-3">
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
                      className="flex-1 bg-[var(--color-charcoal)] border border-[var(--color-charcoal-lighter-plus)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-cream)] placeholder-[var(--color-body-text)] focus:outline-none focus:border-[#F5A623]"
                    />
                    <button
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyText.trim()}
                      className="px-2.5 py-1.5 bg-[#F5A623] text-black text-xs font-semibold rounded-lg disabled:opacity-40 transition-opacity"
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
              className="mt-3 text-sm text-[#F5A623] hover:underline"
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
        <div className="w-7 h-7 rounded-full bg-[var(--color-charcoal-lighter-plus)] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] text-[var(--color-body-text)]">{comment.username?.charAt(0)?.toUpperCase() || '?'}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-[var(--color-cream)]">{comment.username}</span>
          <span className="text-[10px] text-[var(--color-body-text)]">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm text-[var(--color-cream)] mt-0.5">{comment.text}</p>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={handleLike}
            className={`text-xs transition-colors ${liked ? 'text-[#E05C3A]' : 'text-[var(--color-body-text)] hover:text-[#E05C3A]'}`}
          >
            {liked ? '❤️' : '🤍'} {likeCount > 0 && likeCount}
          </button>
          {currentUserId && (
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-[var(--color-body-text)] hover:text-[var(--color-cream)] transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
