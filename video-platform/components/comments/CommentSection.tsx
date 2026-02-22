'use client';

/**
 * CommentSection Component
 *
 * Displays all comments for a video with real-time updates.
 * Includes comment creation, replies, and likes.
 *
 * Features:
 * - Real-time comment updates using Supabase Realtime
 * - Like/unlike functionality with live counts
 * - Reply system with threaded comments
 * - Pagination support
 * - Optimistic updates for better UX
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getVideoComments,
  createComment,
  subscribeToVideoComments,
  subscribeToCommentLikes,
  getVideoAverageRating,
  Comment,
  CreateCommentPayload,
} from '@/lib/supabase/comments';
import { RealtimeChannel } from '@supabase/supabase-js';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';

interface CommentSectionProps {
  videoId: string;
  className?: string;
}

export default function CommentSection({ videoId, className = '' }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [posting, setPosting] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalRatedComments, setTotalRatedComments] = useState(0);

  const COMMENTS_PER_PAGE = 20;

  const loadComments = useCallback(async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setOffset(0);
      }

      setError(null);

      const currentOffset = loadMore ? offset : 0;
      const { data, error: err } = await getVideoComments(videoId, COMMENTS_PER_PAGE, currentOffset);

      if (err) {
        console.error('Error loading comments:', err);
        setError(err.message);
        return;
      }

      if (data) {
        if (loadMore) {
          setComments(prev => [...prev, ...data]);
          setOffset(prev => prev + data.length);
        } else {
          setComments(data);
          setOffset(data.length);
          
          const { data: ratingData, error: ratingErr } = await getVideoAverageRating(videoId);
          if (!ratingErr && ratingData) {
            setAverageRating(ratingData.average_rating);
            setTotalRatedComments(ratingData.total_rated_comments);
          }
        }

        setHasMore(data.length === COMMENTS_PER_PAGE);
      }
    } catch (err: any) {
      console.error('Exception loading comments:', err);
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [videoId, offset]);

  const handleCreateComment = async (content: string, rating?: number) => {
    if (!user || posting) return;

    setPosting(true);
    try {
      const payload: CreateCommentPayload = {
        video_id: videoId,
        content,
        rating,
      };

      console.log('Submitting comment:', payload);

      const { data, error: err } = await createComment(payload);

      if (err) {
        console.error('Comment creation failed:', err);
        alert(`Failed to post comment: ${err.message}`);
        return;
      }

      console.log('Comment created successfully:', data);

      if (data) {
        setComments(prev => [data, ...prev]);
        
        if (rating) {
          const { data: ratingData, error: ratingErr } = await getVideoAverageRating(videoId);
          if (!ratingErr && ratingData) {
            setAverageRating(ratingData.average_rating);
            setTotalRatedComments(ratingData.total_rated_comments);
          }
        }
      }
    } catch (err: any) {
      console.error('Error creating comment:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setPosting(false);
    }
  };

  const handleNewComment = useCallback((newComment: Comment) => {
    setComments(prev => {
      if (prev.some(c => c.id === newComment.id)) {
        return prev;
      }
      return [newComment, ...prev];
    });
  }, []);

  const handleLikeUpdate = useCallback((likeData: { comment_id: string; like_count: number; user_liked: boolean }) => {
    setComments(prev =>
      prev.map(comment =>
        comment.id === likeData.comment_id
          ? { ...comment, like_count: likeData.like_count, is_liked: likeData.user_liked }
          : comment
      )
    );
  }, []);

  useEffect(() => {
    if (!videoId) return;

    loadComments();

  }, [videoId]);

  useEffect(() => {
    if (!videoId) return;

    const commentsChannel = subscribeToVideoComments(videoId, handleNewComment);
    const likesChannel = subscribeToCommentLikes(handleLikeUpdate);

    return () => {
      commentsChannel.unsubscribe();
      likesChannel.unsubscribe();
    };
  }, [videoId, handleNewComment, handleLikeUpdate]);

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black text-white ${className}`}>
      {/* Average Rating Display */}
      {(averageRating || totalRatedComments > 0) && (
        <div className="p-4 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-5 h-5 ${
                    averageRating && averageRating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                  }`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-300">
              {averageRating ? `${averageRating.toFixed(1)}/5 ` : 'No ratings'}
              <span className="text-gray-400">({totalRatedComments} {totalRatedComments === 1 ? 'rating' : 'ratings'})</span>
            </span>
          </div>
        </div>
      )}
      
      {/* Comment Form */}
      {user && (
        <div className="p-4 border-b border-white/10">
          <CommentForm
            onSubmit={handleCreateComment}
            loading={posting}
            placeholder="Add a comment..."
          />
        </div>
      )}

      {/* Comments List */}
      <div className="divide-y divide-white/10">
        {comments.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>No comments yet</p>
            <p className="text-sm mt-2">Be the first to share your thoughts!</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                videoId={videoId}
                onLikeUpdate={handleLikeUpdate}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={() => loadComments(true)}
                  disabled={loadingMore}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading...
                    </div>
                  ) : (
                    'Load More Comments'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/20 text-red-400 text-sm border-t border-red-500/30">
          <p>Error: {error}</p>
          <button
            onClick={() => loadComments()}
            className="mt-2 underline text-xs"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}