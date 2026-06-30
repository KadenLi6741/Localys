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
import { isDemoId } from '@/lib/utils/ids';
import {
  getDemoComments,
  addDemoComment,
  isCommentLiked,
  setDemoRating,
} from '@/lib/clientEngagement';

/** Average rating across comments that carry a rating (demo videos). */
function averageOf(list: Comment[]): { avg: number | null; count: number } {
  const rated = list.filter((c) => c.rating != null);
  if (rated.length === 0) return { avg: null, count: 0 };
  const sum = rated.reduce((s, c) => s + (c.rating || 0), 0);
  return { avg: sum / rated.length, count: rated.length };
}

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
        const demo = isDemoId(videoId);

        if (loadMore) {
          setComments(prev => [...prev, ...data]);
          setOffset(prev => prev + data.length);
        } else if (demo) {
          // Overlay client-side state: persisted user comments + saved likes.
          const seeded = data.map(c =>
            isCommentLiked(c.id)
              ? { ...c, is_liked: true, like_count: c.like_count + 1 }
              : c
          );
          const merged = [...getDemoComments(videoId), ...seeded];
          setComments(merged);
          setOffset(merged.length);

          const { avg, count } = averageOf(merged);
          setAverageRating(avg);
          setTotalRatedComments(count);
        } else {
          setComments(data);
          setOffset(data.length);

          const { data: ratingData, error: ratingErr } = await getVideoAverageRating(videoId);
          if (!ratingErr && ratingData) {
            setAverageRating(ratingData.average_rating);
            setTotalRatedComments(ratingData.total_rated_comments);
          }
        }

        setHasMore(!demo && data.length === COMMENTS_PER_PAGE);
      }
    } catch (err: any) {
      console.error('Exception loading comments:', err);
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [videoId, offset]);

  const handleCreateComment = async (content: string, rating?: number, imageUrl?: string) => {
    if (!user || posting) return;

    setPosting(true);
    try {
      const payload: CreateCommentPayload = {
        video_id: videoId,
        content,
        rating,
        image_url: imageUrl,
      };

      const { data, error: err } = await createComment(payload);

      if (err) {
        console.error('Comment creation failed:', err.message);
        alert(`Failed to post comment: ${err.message}`);
        return;
      }

      if (data) {
        setComments(prev => {
          const next = [data, ...prev];
          if (isDemoId(videoId)) {
            // Persist the demo comment + recompute the client-side average.
            addDemoComment(videoId, data);
            if (rating) setDemoRating(videoId, rating);
            const { avg, count } = averageOf(next);
            setAverageRating(avg);
            setTotalRatedComments(count);
          }
          return next;
        });

        if (rating && !isDemoId(videoId)) {
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

  const handleCommentDeleted = useCallback((commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f97316]"></div>
        </div>
      </div>
    );
  }

  return (
    // Flex column so the comment form (with the Post button) stays pinned and
    // always visible, while only the comments list scrolls. Prevents the Post
    // button from being pushed off the bottom of short panels (Discover feed).
    <div className={`flex h-full min-h-0 flex-col bg-white text-black dark:bg-[#121212] dark:text-white ${className}`}>
      {/* Average Rating Display */}
      {(averageRating || totalRatedComments > 0) && (
        <div className="shrink-0 p-4 bg-gray-50 dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-5 h-5 ${
                    averageRating && averageRating >= star ? 'fill-[#f97316] text-[#f97316]' : 'text-gray-300'
                  }`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-200">
              {averageRating ? `${averageRating.toFixed(1)}/5 ` : 'No ratings'}
              <span className="text-gray-500 dark:text-gray-400">({totalRatedComments} {totalRatedComments === 1 ? 'rating' : 'ratings'})</span>
            </span>
          </div>
        </div>
      )}

      {/* Comment Form — pinned (does not scroll away), so Post is always visible */}
      {user && (
        <div className="shrink-0 p-4 border-b border-gray-200 dark:border-white/10">
          <CommentForm
            onSubmit={handleCreateComment}
            loading={posting}
            placeholder="Add a comment..."
          />
        </div>
      )}

      {/* Comments List — the only scrolling region */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100">
        {comments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
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
                onCommentDeleted={handleCommentDeleted}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={() => loadComments(true)}
                  disabled={loadingMore}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-black rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
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
        <div className="p-4 bg-red-50 text-red-600 text-sm border-t border-red-200">
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