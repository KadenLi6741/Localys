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
  try {
    const currentUserId = await getCurrentUserId();

    console.log('Creating comment for video:', payload.video_id, 'user:', currentUserId);

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
      console.error('Insert error:', error);
      return { data: null, error: new Error(error.message) };
    }

    console.log('Comment created successfully:', data.id);

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

    const comment: Comment = {
      ...transformCommentData({
        ...commentWithLikes[0],
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: null,
      }),
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
  try {
    const currentUserId = await getCurrentUserId();

    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
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