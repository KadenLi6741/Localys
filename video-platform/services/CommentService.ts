import type { Comment, CreateCommentPayload, CreateReplyPayload, UpdateCommentPayload, CommentSubscriptionCallback, LikeSubscriptionCallback } from '../models/Comment';
import {
  getVideoComments,
  getCommentReplies,
  createComment,
  createReply,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  toggleCommentLike,
  subscribeToVideoComments,
  subscribeToCommentReplies,
  subscribeToCommentLikes,
  getVideoAverageRating,
} from '../lib/supabase/comments';

export class CommentService {
  async getVideoComments(videoId: string, limit = 20, offset = 0): Promise<{ data: Comment[] | null; error: Error | null }> {
    return getVideoComments(videoId, limit, offset);
  }

  async getCommentReplies(parentCommentId: string, limit = 50, offset = 0): Promise<{ data: Comment[] | null; error: Error | null }> {
    return getCommentReplies(parentCommentId, limit, offset);
  }

  async createComment(payload: CreateCommentPayload): Promise<{ data: Comment | null; error: Error | null }> {
    return createComment(payload);
  }

  async createReply(payload: CreateReplyPayload): Promise<{ data: Comment | null; error: Error | null }> {
    return createReply(payload);
  }

  async updateComment(payload: UpdateCommentPayload): Promise<{ error: Error | null }> {
    return updateComment(payload);
  }

  async deleteComment(commentId: string): Promise<{ error: Error | null }> {
    return deleteComment(commentId);
  }

  async likeComment(commentId: string): Promise<{ error: Error | null }> {
    return likeComment(commentId);
  }

  async unlikeComment(commentId: string): Promise<{ error: Error | null }> {
    return unlikeComment(commentId);
  }

  async toggleLike(commentId: string, isLiked: boolean): Promise<{ error: Error | null }> {
    return toggleCommentLike(commentId, isLiked);
  }

  subscribeToVideoComments(videoId: string, callback: CommentSubscriptionCallback) {
    return subscribeToVideoComments(videoId, callback);
  }

  subscribeToCommentReplies(parentCommentId: string, callback: CommentSubscriptionCallback) {
    return subscribeToCommentReplies(parentCommentId, callback);
  }

  subscribeToCommentLikes(callback: LikeSubscriptionCallback) {
    return subscribeToCommentLikes(callback);
  }

  async getVideoAverageRating(videoId: string) {
    return getVideoAverageRating(videoId);
  }
}

export const commentService = new CommentService();
