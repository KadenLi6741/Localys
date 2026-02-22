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