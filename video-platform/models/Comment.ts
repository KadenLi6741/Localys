export interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  like_count: number;
  is_liked: boolean;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  reply_count?: number;
  replies?: Comment[];
  rating: number | null;
}

export interface CreateCommentPayload {
  video_id: string;
  content: string;
  rating?: number;
}

export interface CreateReplyPayload {
  parent_comment_id: string;
  content: string;
  rating?: number;
}

export interface UpdateCommentPayload {
  comment_id: string;
  content: string;
}

export type CommentSubscriptionCallback = (comment: Comment) => void;
export type LikeSubscriptionCallback = (data: { comment_id: string; like_count: number; user_liked: boolean }) => void;
