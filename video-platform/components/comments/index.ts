/**
 * comments/index — public API for the comments module.
 * Purpose: Re-exports the comment UI components plus the underlying Supabase comment helpers/types, so
 *   the rest of the app imports everything comments-related from one place ('@/components/comments').
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
export { default as CommentSection } from './CommentSection';
export { default as CommentItem } from './CommentItem';
export { default as CommentForm } from './CommentForm';

export type {
  Comment,
  CreateCommentPayload,
  CreateReplyPayload,
  UpdateCommentPayload,
} from '@/lib/supabase/comments';

export {
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
} from '@/lib/supabase/comments';