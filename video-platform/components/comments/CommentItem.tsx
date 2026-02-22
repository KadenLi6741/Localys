'use client';

/**
 * CommentItem Component
 *
 * Displays a single comment with replies, likes, and actions.
 * Handles reply creation and like toggling.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCommentReplies,
  createReply,
  toggleCommentLike,
  subscribeToCommentReplies,
  Comment,
  CreateReplyPayload,
} from '@/lib/supabase/comments';
import { RealtimeChannel } from '@supabase/supabase-js';
import CommentForm from './CommentForm';

interface CommentItemProps {
  comment: Comment;
  videoId: string;
  onLikeUpdate: (likeData: { comment_id: string; like_count: number; user_liked: boolean }) => void;
  isReply?: boolean;
}

export default function CommentItem({ comment, videoId, onLikeUpdate, isReply = false }: CommentItemProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Comment[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [liking, setLiking] = useState(false);
  const [postingReply, setPostingReply] = useState(false);

  const loadReplies = async () => {
    if (replies.length > 0) return;

    setLoadingReplies(true);
    try {
      const { data, error } = await getCommentReplies(comment.id);
      if (error) {
        console.error('Failed to load replies:', error);
        return;
      }
      setReplies(data || []);
    } catch (err) {
      console.error('Error loading replies:', err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleCreateReply = async (content: string) => {
    if (!user || postingReply) return;

    setPostingReply(true);
    try {
      const payload: CreateReplyPayload = {
        parent_comment_id: comment.id,
        content,
      };

      const { data, error } = await createReply(payload);

      if (error) {
        alert(`Failed to post reply: ${error.message}`);
        return;
      }

      if (data) {
        setReplies(prev => [...prev, data]);
        setShowReplies(true);
        setShowReplyForm(false);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setPostingReply(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!user || liking) return;

    setLiking(true);
    try {
      const { error } = await toggleCommentLike(comment.id, comment.is_liked);

      if (error) {
        alert(`Failed to ${comment.is_liked ? 'unlike' : 'like'} comment: ${error.message}`);
        return;
      }

      const newLikeCount = comment.is_liked ? comment.like_count - 1 : comment.like_count + 1;
      const newIsLiked = !comment.is_liked;

      onLikeUpdate({
        comment_id: comment.id,
        like_count: newLikeCount,
        user_liked: newIsLiked,
      });
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLiking(false);
    }
  };

  const handleShowReplies = () => {
    setShowReplies(!showReplies);
    if (!showReplies && replies.length === 0) {
      loadReplies();
    }
  };

  useEffect(() => {
    if (!showReplies) return;

    const channel = subscribeToCommentReplies(comment.id, (newReply) => {
      setReplies(prev => {
        if (prev.some(r => r.id === newReply.id)) {
          return prev;
        }
        return [...prev, newReply];
      });
    });

    return () => channel.unsubscribe();
  }, [comment.id, showReplies]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`${isReply ? 'ml-8 border-l border-white/20 pl-4' : 'p-4'}`}>
      {/* Comment Header */}
      <div className="flex items-start gap-3 mb-2">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.avatar_url ? (
            <img
              src={comment.avatar_url}
              alt={comment.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-sm font-semibold">
                {comment.username?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">
              {comment.full_name || comment.username}
            </span>
            <span className="text-xs text-gray-400">
              {formatTimestamp(comment.created_at)}
            </span>
          </div>

          {/* Rating Display */}
          {comment.rating && (
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${
                    comment.rating && comment.rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                  }`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
              <span className="text-xs text-gray-400 ml-1">{comment.rating}/5</span>
            </div>
          )}

          <p className="text-sm text-gray-200 whitespace-pre-wrap break-words mb-2">
            {comment.content}
          </p>

          {/* Comment Actions */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            {/* Like Button */}
            <button
              onClick={handleLikeToggle}
              disabled={!user || liking}
              className={`flex items-center gap-1 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                comment.is_liked ? 'text-red-400' : ''
              }`}
            >
              {liking ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
              ) : (
                <svg className="w-4 h-4" fill={comment.is_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
              <span>{comment.like_count}</span>
            </button>

            {/* Reply Button */}
            {!isReply && user && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="hover:text-white transition-colors"
              >
                Reply
              </button>
            )}

            {/* Show Replies Button */}
            {!isReply && comment.reply_count > 0 && (
              <button
                onClick={handleShowReplies}
                className="hover:text-white transition-colors"
              >
                {showReplies ? 'Hide' : 'View'} {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply Form */}
      {showReplyForm && user && (
        <div className="mt-3 ml-11">
          <CommentForm
            onSubmit={handleCreateReply}
            loading={postingReply}
            placeholder={`Reply to ${comment.username}...`}
            compact
          />
          <button
            onClick={() => setShowReplyForm(false)}
            className="mt-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Replies */}
      {showReplies && (
        <div className="mt-3">
          {loadingReplies ? (
            <div className="flex items-center justify-center py-4 ml-11">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  videoId={videoId}
                  onLikeUpdate={onLikeUpdate}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}