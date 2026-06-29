/**
 * supabase/comments.ts — data-access layer for video comments, replies, likes and ratings.
 * Purpose: All comment CRUD plus realtime subscriptions (new comments, new replies, like changes) live
 *   here, so the comment UI components stay declarative. Re-exports the comment model types.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { supabase } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';
import type {
  Comment,
  CreateCommentPayload,
  CreateReplyPayload,
  UpdateCommentPayload,
  CommentSubscriptionCallback,
  LikeSubscriptionCallback,
} from '../../models/Comment';

export type { Comment, CreateCommentPayload, CreateReplyPayload, UpdateCommentPayload, CommentSubscriptionCallback, LikeSubscriptionCallback };

import { isDemoId } from '../utils/ids';
import { getLocalOrders } from '../clientEngagement';

// ── Verified Review feature ──────────────────────────────────────────────
// A review is "verified" when the reviewer has actually ordered from the
// business being reviewed. The business is the owner (user_id) of the video the
// review is attached to; orders live in `item_purchases` (buyer_id + seller_id).

/** Order statuses that count as a real, completed purchase from a business. */
const VERIFYING_ORDER_STATUSES = ['paid', 'completed'];

// MOCK verified reviews for demo — a believable, STABLE subset of the seeded
// reviews shows the "Verified Review" badge so the feature is visible to judges
// immediately (not randomized per refresh).
const DEMO_VERIFIED_COMMENT_IDS = new Set<string>(['demo-comment-1', 'demo-comment-4']);

/** The business/seller that owns a video (the entity being reviewed). */
async function getVideoOwnerId(videoId: string): Promise<string | null> {
  if (isDemoId(videoId)) return null;
  try {
    const { data } = await supabase.from('videos').select('user_id').eq('id', videoId).maybeSingle();
    return (data as { user_id?: string } | null)?.user_id ?? null;
  } catch {
    return null;
  }
}

/** Set of every buyer id with a real order from this seller/business. */
async function getVerifiedBuyerIds(sellerId: string | null | undefined): Promise<Set<string>> {
  if (!sellerId || isDemoId(sellerId)) return new Set<string>();
  try {
    const { data, error } = await supabase
      .from('item_purchases')
      .select('buyer_id')
      .eq('seller_id', sellerId)
      .in('status', VERIFYING_ORDER_STATUSES);
    if (error || !data) return new Set<string>();
    return new Set(data.map((r: { buyer_id: string }) => r.buyer_id).filter(Boolean));
  } catch {
    return new Set<string>();
  }
}

/** True when this specific buyer has at least one real order from this seller. */
async function hasOrderFromSeller(buyerId: string, sellerId: string | null): Promise<boolean> {
  if (!buyerId || !sellerId || isDemoId(sellerId)) return false;
  try {
    const { data } = await supabase
      .from('item_purchases')
      .select('id')
      .eq('seller_id', sellerId)
      .eq('buyer_id', buyerId)
      .in('status', VERIFYING_ORDER_STATUSES)
      .limit(1);
    return !!(data && data.length > 0);
  } catch {
    return false;
  }
}

// Demo comment ids are intentionally non-UUID so isDemoId() routes their
// likes/replies through the client-side path (no Supabase, no FK violation).
const LOCAL_DEMO_COMMENTS: Comment[] = [
  {
    id: 'demo-comment-1',
    video_id: 'local',
    user_id: '00000000-0000-0000-0000-000000000001',
    content: 'Absolutely love this place — been coming here for years and the quality never slips. The staff are genuinely friendly and the food speaks for itself.',
    parent_comment_id: null,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    like_count: 24,
    is_liked: false,
    username: 'localfoodie_raj',
    full_name: 'Raj M.',
    avatar_url: null,
    reply_count: 0,
    rating: 5,
  },
  {
    id: 'demo-comment-2',
    video_id: 'local',
    user_id: '00000000-0000-0000-0000-000000000002',
    content: 'Solid spot. Prices are fair and everything comes out fresh.',
    parent_comment_id: null,
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    like_count: 11,
    is_liked: false,
    username: 'corner_table_k',
    full_name: 'Kate L.',
    avatar_url: null,
    reply_count: 0,
    rating: 4,
  },
  {
    id: 'demo-comment-3',
    video_id: 'local',
    user_id: '00000000-0000-0000-0000-000000000003',
    content: 'Discovered this after seeing the video and I was not disappointed. Went on a Wednesday evening and the place was busy — always a good sign.',
    parent_comment_id: null,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    like_count: 8,
    is_liked: false,
    username: 'dev_eats',
    full_name: 'Devon A.',
    avatar_url: null,
    reply_count: 0,
    rating: null,
  },
  {
    id: 'demo-comment-4',
    video_id: 'local',
    user_id: '00000000-0000-0000-0000-000000000004',
    content: 'Highly recommend.',
    parent_comment_id: null,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    like_count: 5,
    is_liked: false,
    username: 'spoonandfork',
    full_name: 'Sam T.',
    avatar_url: null,
    reply_count: 0,
    rating: 5,
  },
];

/**
 * Get the current authenticated user's ID
 * @throws Error if user is not authenticated
 */
async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

/**
 * Transform raw comment data from database functions
 */
function transformCommentData(rawComment: any): Comment {
  return {
    id: rawComment.id,
    video_id: rawComment.video_id,
    user_id: rawComment.user_id,
    content: rawComment.content,
    parent_comment_id: rawComment.parent_comment_id,
    created_at: rawComment.created_at,
    updated_at: rawComment.updated_at,
    like_count: rawComment.like_count || 0,
    is_liked: rawComment.is_liked || false,
    username: rawComment.username,
    full_name: rawComment.full_name,
    avatar_url: rawComment.avatar_url ?? null,
    reply_count: rawComment.reply_count || 0,
    rating: rawComment.rating ?? null,
    verified: rawComment.verified ?? false,
  };
}

/**
 * Get comments for a video with pagination
 * Includes like counts and user's like status
 *
 * @param videoId - The ID of the video
 * @param limit - Maximum number of comments to fetch (default: 20)
 * @param offset - Number of comments to skip (default: 0)
 * @returns Array of comments with metadata
 */
export async function getVideoComments(
  videoId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ data: Comment[] | null; error: Error | null }> {
  if (isDemoId(videoId)) {
    return {
      data: LOCAL_DEMO_COMMENTS.map(c => ({
        ...c,
        video_id: videoId,
        verified: DEMO_VERIFIED_COMMENT_IDS.has(c.id),
      })),
      error: null,
    };
  }
  try {
    let currentUserId: string | null = null;
    try {
      currentUserId = await getCurrentUserId();
    } catch {
      currentUserId = null;
    }

    const { data, error } = await supabase.rpc('get_video_comments', {
      p_video_id: videoId,
      p_user_id: currentUserId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('RPC error fetching comments:', error);
      return { data: null, error: new Error(error.message) };
    }

    const comments = (data || []).map(transformCommentData);

    // Flag reviewers who have a real order from this business (best-effort —
    // never blocks comment loading if the lookup fails).
    const ownerId = await getVideoOwnerId(videoId);
    const verifiedBuyers = await getVerifiedBuyerIds(ownerId);
    if (verifiedBuyers.size > 0) {
      for (const c of comments) c.verified = verifiedBuyers.has(c.user_id);
    }

    return { data: comments, error: null };
  } catch (error: any) {
    console.error('Exception in getVideoComments:', error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Get replies for a specific comment
 *
 * @param parentCommentId - The ID of the parent comment
 * @param limit - Maximum number of replies to fetch (default: 50)
 * @param offset - Number of replies to skip (default: 0)
 * @returns Array of reply comments
 */
export async function getCommentReplies(
  parentCommentId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: Comment[] | null; error: Error | null }> {
  try {
    let currentUserId: string | null = null;
    try {
      currentUserId = await getCurrentUserId();
    } catch {
      currentUserId = null;
    }

    const { data, error } = await supabase.rpc('get_comment_replies', {
      p_parent_comment_id: parentCommentId,
      p_user_id: currentUserId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('RPC error fetching replies:', error);
      return { data: null, error: new Error(error.message) };
    }

    const replies = (data || []).map(transformCommentData);
    return { data: replies, error: null };
  } catch (error: any) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Create a new comment on a video
 *
 * @param payload - Comment creation payload
 * @returns The created comment with metadata
 */
export async function createComment(
  payload: CreateCommentPayload
): Promise<{ data: Comment | null; error: Error | null }> {
  if (isDemoId(payload.video_id)) {
    const { data: { user } } = await supabase.auth.getUser();
    const username = user?.email?.split('@')[0] || 'you';
    const comment: Comment = {
      id: `demo-comment-${Date.now()}`,
      video_id: payload.video_id,
      user_id: user?.id || 'local-user',
      content: payload.content,
      parent_comment_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      like_count: 0,
      is_liked: false,
      username,
      full_name: username,
      avatar_url: null,
      reply_count: 0,
      rating: payload.rating || null,
      // MOCK verified reviews for demo — the user's own demo review is verified
      // when they have a local (demo) order on file. Demo orders aren't tied to
      // a business id, so any completed local order counts.
      verified: getLocalOrders().length > 0,
    };
    return { data: comment, error: null };
  }
  try {
    const currentUserId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('comments')
      .insert({
        video_id: payload.video_id,
        user_id: currentUserId,
        content: payload.content.trim(),
        parent_comment_id: null,
        rating: payload.rating || null,
        image_url: payload.image_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error.message || error.details || error.code);
      return { data: null, error: new Error(error.message) };
    }

    const { data: commentWithLikes, error: fetchError } = await supabase.rpc('get_comment_with_likes', {
      p_comment_id: data.id,
      p_user_id: currentUserId,
    });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return { data: null, error: new Error(fetchError.message) };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, full_name')
      .eq('id', currentUserId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return { data: null, error: new Error(profileError.message) };
    }

    // Mark verified if the reviewer has a real order from this business.
    const ownerId = await getVideoOwnerId(payload.video_id);
    const verified = await hasOrderFromSeller(currentUserId, ownerId);

    const comment: Comment = {
      ...transformCommentData({
        ...commentWithLikes[0],
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: null,
      }),
      verified,
    };

    return { data: comment, error: null };
  } catch (error: any) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Create a reply to a comment
 *
 * @param payload - Reply creation payload
 * @returns The created reply with metadata
 */
export async function createReply(
  payload: CreateReplyPayload
): Promise<{ data: Comment | null; error: Error | null }> {
  // Demo parent comment → build the reply client-side, no Supabase insert.
  if (isDemoId(payload.parent_comment_id)) {
    const { data: { user } } = await supabase.auth.getUser();
    const username = user?.email?.split('@')[0] || 'you';
    const reply: Comment = {
      id: `demo-comment-${Date.now()}`,
      video_id: 'local',
      user_id: user?.id || 'local-user',
      content: payload.content,
      parent_comment_id: payload.parent_comment_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      like_count: 0,
      is_liked: false,
      username,
      full_name: username,
      avatar_url: null,
      reply_count: 0,
      rating: payload.rating || null,
    };
    return { data: reply, error: null };
  }
  try {
    const currentUserId = await getCurrentUserId();

    const { data: parentComment, error: parentError } = await supabase
      .from('comments')
      .select('video_id')
      .eq('id', payload.parent_comment_id)
      .single();

    if (parentError || !parentComment) {
      return { data: null, error: new Error('Parent comment not found') };
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        video_id: parentComment.video_id,
        user_id: currentUserId,
        content: payload.content.trim(),
        parent_comment_id: payload.parent_comment_id,
        rating: payload.rating || null,
        image_url: payload.image_url || null,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const { data: replyWithLikes, error: fetchError } = await supabase.rpc('get_comment_with_likes', {
      p_comment_id: data.id,
      p_user_id: currentUserId,
    });

    if (fetchError) {
      return { data: null, error: new Error(fetchError.message) };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, full_name')
      .eq('id', currentUserId)
      .single();

    if (profileError) {
      return { data: null, error: new Error(profileError.message) };
    }

    const reply: Comment = {
      ...transformCommentData({
        ...replyWithLikes[0],
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: null,
      }),
    };

    return { data: reply, error: null };
  } catch (error: any) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Update a comment's content
 *
 * @param payload - Comment update payload
 * @returns Success status
 */
export async function updateComment(
  payload: UpdateCommentPayload
): Promise<{ error: Error | null }> {
  try {
    const currentUserId = await getCurrentUserId();

    const { error } = await supabase
      .from('comments')
      .update({
        content: payload.content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.comment_id)
      .eq('user_id', currentUserId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Delete a comment
 *
 * @param commentId - The ID of the comment to delete
 * @returns Success status
 */
export async function deleteComment(
  commentId: string
): Promise<{ error: Error | null }> {
  try {
    const currentUserId = await getCurrentUserId();

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', currentUserId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Like a comment
 *
 * @param commentId - The ID of the comment to like
 * @returns Success status
 */
export async function likeComment(
  commentId: string
): Promise<{ error: Error | null }> {
  // Demo comments aren't real rows — caller persists the like client-side.
  if (isDemoId(commentId)) return { error: null };
  try {
    const currentUserId = await getCurrentUserId();

    const { error } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: currentUserId,
      });

    if (error) {
      // Duplicate key - user already liked this comment
      if (error.code === '23505') {
        return { error: new Error('You have already liked this comment') };
      }
      console.error('Error liking comment:', error.message || error.details || error.code);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Unlike a comment
 *
 * @param commentId - The ID of the comment to unlike
 * @returns Success status
 */
export async function unlikeComment(
  commentId: string
): Promise<{ error: Error | null }> {
  // Demo comments aren't real rows — caller persists the unlike client-side.
  if (isDemoId(commentId)) return { error: null };
  try {
    const currentUserId = await getCurrentUserId();

    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', currentUserId);

    if (error) {
      console.error('Error unliking comment:', error.message || error.details || error.code);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Toggle like status for a comment
 *
 * @param commentId - The ID of the comment
 * @param isLiked - Current like status
 * @returns Success status
 */
export async function toggleCommentLike(
  commentId: string,
  isLiked: boolean
): Promise<{ error: Error | null }> {
  if (isLiked) {
    return unlikeComment(commentId);
  } else {
    return likeComment(commentId);
  }
}

/**
 * Subscribe to new comments on a video
 *
 * @param videoId - The ID of the video
 * @param callback - Function called when new comments are added
 * @returns The RealtimeChannel for unsubscribing
 */
export function subscribeToVideoComments(
  videoId: string,
  callback: CommentSubscriptionCallback
): RealtimeChannel {
  if (isDemoId(videoId)) {
    return supabase.channel(`local_noop:${videoId}`);
  }
  const channel = supabase
    .channel(`video_comments:${videoId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `video_id=eq.${videoId}`,
      },
      async (payload) => {
        if (!payload.new.parent_comment_id) {
          const currentUserId = (await supabase.auth.getUser()).data.user?.id;
          if (currentUserId) {
            const { data: commentWithLikes } = await supabase.rpc('get_comment_with_likes', {
              p_comment_id: payload.new.id,
              p_user_id: currentUserId,
            });

            if (commentWithLikes && commentWithLikes[0]) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, full_name')
                .eq('id', payload.new.user_id)
                .single();

              if (profile) {
                const comment = transformCommentData({
                  ...commentWithLikes[0],
                  username: profile.username,
                  full_name: profile.full_name,
                  avatar_url: null,
                });
                callback(comment);
              }
            }
          }
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to new replies on a specific comment
 *
 * @param parentCommentId - The ID of the parent comment
 * @param callback - Function called when new replies are added
 * @returns The RealtimeChannel for unsubscribing
 */
export function subscribeToCommentReplies(
  parentCommentId: string,
  callback: CommentSubscriptionCallback
): RealtimeChannel {
  const channel = supabase
    .channel(`comment_replies:${parentCommentId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `parent_comment_id=eq.${parentCommentId}`,
      },
      async (payload) => {
        const currentUserId = (await supabase.auth.getUser()).data.user?.id;
        if (currentUserId) {
          const { data: replyWithLikes } = await supabase.rpc('get_comment_with_likes', {
            p_comment_id: payload.new.id,
            p_user_id: currentUserId,
          });

          if (replyWithLikes && replyWithLikes[0]) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, full_name')
              .eq('id', payload.new.user_id)
              .single();

            if (profile) {
              const reply = transformCommentData({
                ...replyWithLikes[0],
                username: profile.username,
                full_name: profile.full_name,
                avatar_url: null,
              });
              callback(reply);
            }
          }
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to like count changes on comments
 *
 * @param callback - Function called when likes are added/removed
 * @returns The RealtimeChannel for unsubscribing
 */
export function subscribeToCommentLikes(
  callback: LikeSubscriptionCallback
): RealtimeChannel {
  const channel = supabase
    .channel('comment_likes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comment_likes',
      },
      async (payload) => {
        const commentId = (payload.new as any)?.comment_id || (payload.old as any)?.comment_id;
        if (commentId) {
          const { data: likeData, error } = await supabase
            .from('comment_likes')
            .select('user_id', { count: 'exact' })
            .eq('comment_id', commentId);

          if (!error && likeData) {
            const currentUserId = (await supabase.auth.getUser()).data.user?.id;
            const userLiked = currentUserId ? likeData.some(like => like.user_id === currentUserId) : false;

            callback({
              comment_id: commentId,
              like_count: likeData.length,
              user_liked: userLiked,
            });
          }
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Get average rating for a video
 *
 * @param videoId - The ID of the video
 * @returns Average rating and total rated comments
 */
export async function getVideoAverageRating(
  videoId: string
): Promise<{ data: { average_rating: number | null; total_rated_comments: number } | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_video_average_rating', {
      p_video_id: videoId,
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (data && data.length > 0) {
      return {
        data: {
          average_rating: data[0].average_rating ? parseFloat(data[0].average_rating) : null,
          total_rated_comments: parseInt(data[0].total_rated_comments) || 0,
        },
        error: null,
      };
    }

    return { data: { average_rating: null, total_rated_comments: 0 }, error: null };
  } catch (error: any) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}