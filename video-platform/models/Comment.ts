/**
 * Comment.ts — TypeScript types for video comments/replies and their realtime callbacks.
 * Purpose: Shapes the comment data + create/update payloads used by the comments UI and data layer.
 *   Types only — no runtime code.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

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
  image_url?: string | null;
  reply_count?: number;
  replies?: Comment[];
  rating: number | null;
  /** True when the reviewer has a real order from the reviewed business. */
  verified?: boolean;
}

export interface CreateCommentPayload {
  video_id: string;
  content: string;
  rating?: number;
  image_url?: string;
}

export interface CreateReplyPayload {
  parent_comment_id: string;
  content: string;
  rating?: number;
  image_url?: string;
}

export interface UpdateCommentPayload {
  comment_id: string;
  content: string;
}

export type CommentSubscriptionCallback = (comment: Comment) => void;
export type LikeSubscriptionCallback = (data: { comment_id: string; like_count: number; user_liked: boolean }) => void;
