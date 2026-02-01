-- Fix Comment RPC Functions to include avatar_url
-- Run this directly in Supabase SQL Editor

-- Drop old functions
DROP FUNCTION IF EXISTS public.get_video_comments(uuid, uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_comment_replies(uuid, uuid, integer, integer) CASCADE;

-- Create get_video_comments with avatar_url
CREATE FUNCTION public.get_video_comments(
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
  reply_count BIGINT,
  rating INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH comment_likes AS (
    SELECT cl.comment_id, COUNT(*) AS like_count
    FROM public.comment_likes cl
    GROUP BY cl.comment_id
  ),
  user_likes AS (
    SELECT cl.comment_id, TRUE AS is_liked
    FROM public.comment_likes cl
    WHERE cl.user_id = p_user_id
  ),
  reply_counts AS (
    SELECT c.parent_comment_id, COUNT(*) AS reply_count
    FROM public.comments c
    WHERE c.parent_comment_id IS NOT NULL
    GROUP BY c.parent_comment_id
  )
  SELECT
    c.id,
    c.video_id,
    c.user_id,
    c.content,
    c.parent_comment_id,
    c.created_at,
    c.updated_at,
    COALESCE(cl.like_count, 0)::BIGINT,
    COALESCE(ul.is_liked, FALSE),
    p.username,
    p.full_name,
    p.profile_picture_url AS avatar_url,
    COALESCE(rc.reply_count, 0)::BIGINT,
    c.rating
  FROM public.comments c
  LEFT JOIN comment_likes cl ON c.id = cl.comment_id
  LEFT JOIN user_likes ul ON c.id = ul.comment_id
  LEFT JOIN reply_counts rc ON c.id = rc.parent_comment_id
  LEFT JOIN public.profiles p ON c.user_id = p.id
  WHERE c.video_id = p_video_id AND c.parent_comment_id IS NULL
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_comment_replies with avatar_url
CREATE FUNCTION public.get_comment_replies(
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
  avatar_url TEXT,
  rating INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH comment_likes AS (
    SELECT cl.comment_id, COUNT(*) AS like_count
    FROM public.comment_likes cl
    GROUP BY cl.comment_id
  ),
  user_likes AS (
    SELECT cl.comment_id, TRUE AS is_liked
    FROM public.comment_likes cl
    WHERE cl.user_id = p_user_id
  )
  SELECT
    c.id,
    c.video_id,
    c.user_id,
    c.content,
    c.parent_comment_id,
    c.created_at,
    c.updated_at,
    COALESCE(cl.like_count, 0)::BIGINT,
    COALESCE(ul.is_liked, FALSE),
    p.username,
    p.full_name,
    p.profile_picture_url AS avatar_url,
    c.rating
  FROM public.comments c
  LEFT JOIN comment_likes cl ON c.id = cl.comment_id
  LEFT JOIN user_likes ul ON c.id = ul.comment_id
  LEFT JOIN public.profiles p ON c.user_id = p.id
  WHERE c.parent_comment_id = p_parent_comment_id
  ORDER BY c.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
