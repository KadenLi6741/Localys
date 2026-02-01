-- =====================================================
-- Video Comments, Likes, and Replies System Schema
-- =====================================================
-- This file contains the database schema for a video commenting system
-- with likes and threaded replies using Supabase.
--
-- Tables:
-- 1. comments - Comments and replies on videos
-- 2. comment_likes - User likes on comments
--
-- All tables use UUIDs for primary keys and follow Supabase best practices.
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- COMMENTS TABLE
-- =====================================================
-- Stores comments and replies for videos.
-- Supports threaded replies via parent_comment_id.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Video this comment belongs to
  video_id UUID NOT NULL,
  -- User who made the comment
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Comment content
  content TEXT NOT NULL,
  -- Parent comment for replies (null for top-level comments)
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Constraints
  CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0),
  CONSTRAINT max_content_length CHECK (char_length(content) <= 2000),
  -- Prevent replies to replies (1-level nesting only)
  CONSTRAINT no_nested_replies CHECK (
    parent_comment_id IS NULL OR
    (SELECT parent_comment_id FROM public.comments WHERE id = comments.parent_comment_id) IS NULL
  )
);

-- Indexes for fast comment queries
CREATE INDEX IF NOT EXISTS comments_video_id_idx ON public.comments(video_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments(created_at DESC);
-- Composite index for efficient comment fetching with replies
CREATE INDEX IF NOT EXISTS comments_video_parent_created_idx ON public.comments(video_id, parent_comment_id, created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on comment updates
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comments_updated_at();

-- =====================================================
-- COMMENT_LIKES TABLE
-- =====================================================
-- Stores user likes on comments.
-- Ensures one like per user per comment.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Comment being liked
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  -- User who liked the comment
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Ensure one like per user per comment
  CONSTRAINT unique_comment_like UNIQUE (comment_id, user_id)
);

-- Indexes for fast like queries
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS comment_likes_created_at_idx ON public.comment_likes(created_at DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get comment with like count and user's like status
CREATE OR REPLACE FUNCTION public.get_comment_with_likes(
  p_comment_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  video_id UUID,
  user_id UUID,
  content TEXT,
  parent_comment_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  like_count BIGINT,
  is_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.video_id,
    c.user_id,
    c.content,
    c.parent_comment_id,
    c.created_at,
    c.updated_at,
    COALESCE(like_counts.like_count, 0) AS like_count,
    CASE WHEN p_user_id IS NOT NULL THEN COALESCE(user_likes.is_liked, FALSE) ELSE FALSE END AS is_liked
  FROM public.comments c
  LEFT JOIN (
    SELECT comment_id, COUNT(*) AS like_count
    FROM public.comment_likes
    GROUP BY comment_id
  ) like_counts ON c.id = like_counts.comment_id
  LEFT JOIN (
    SELECT comment_id, TRUE AS is_liked
    FROM public.comment_likes
    WHERE user_id = p_user_id
  ) user_likes ON c.id = user_likes.comment_id
  WHERE c.id = p_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comments for a video with likes
CREATE OR REPLACE FUNCTION public.get_video_comments(
  p_video_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  video_id UUID,
  user_id UUID,
  content TEXT,
  parent_comment_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  like_count BIGINT,
  is_liked BOOLEAN,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  reply_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.video_id,
    c.user_id,
    c.content,
    c.parent_comment_id,
    c.created_at,
    c.updated_at,
    COALESCE(like_counts.like_count, 0) AS like_count,
    CASE WHEN p_user_id IS NOT NULL THEN COALESCE(user_likes.is_liked, FALSE) ELSE FALSE END AS is_liked,
    p.username,
    p.full_name,
    p.avatar_url,
    COALESCE(reply_counts.reply_count, 0) AS reply_count
  FROM public.comments c
  LEFT JOIN public.profiles p ON c.user_id = p.id
  LEFT JOIN (
    SELECT comment_id, COUNT(*) AS like_count
    FROM public.comment_likes
    GROUP BY comment_id
  ) like_counts ON c.id = like_counts.comment_id
  LEFT JOIN (
    SELECT comment_id, TRUE AS is_liked
    FROM public.comment_likes
    WHERE user_id = p_user_id
  ) user_likes ON c.id = user_likes.comment_id
  LEFT JOIN (
    SELECT parent_comment_id, COUNT(*) AS reply_count
    FROM public.comments
    WHERE parent_comment_id IS NOT NULL
    GROUP BY parent_comment_id
  ) reply_counts ON c.id = reply_counts.parent_comment_id
  WHERE c.video_id = p_video_id
    AND c.parent_comment_id IS NULL
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get replies for a comment
CREATE OR REPLACE FUNCTION public.get_comment_replies(
  p_parent_comment_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  video_id UUID,
  user_id UUID,
  content TEXT,
  parent_comment_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  like_count BIGINT,
  is_liked BOOLEAN,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.video_id,
    c.user_id,
    c.content,
    c.parent_comment_id,
    c.created_at,
    c.updated_at,
    COALESCE(like_counts.like_count, 0) AS like_count,
    CASE WHEN p_user_id IS NOT NULL THEN COALESCE(user_likes.is_liked, FALSE) ELSE FALSE END AS is_liked,
    p.username,
    p.full_name,
    p.avatar_url
  FROM public.comments c
  LEFT JOIN public.profiles p ON c.user_id = p.id
  LEFT JOIN (
    SELECT comment_id, COUNT(*) AS like_count
    FROM public.comment_likes
    GROUP BY comment_id
  ) like_counts ON c.id = like_counts.comment_id
  LEFT JOIN (
    SELECT comment_id, TRUE AS is_liked
    FROM public.comment_likes
    WHERE user_id = p_user_id
  ) user_likes ON c.id = user_likes.comment_id
  WHERE c.parent_comment_id = p_parent_comment_id
  ORDER BY c.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;