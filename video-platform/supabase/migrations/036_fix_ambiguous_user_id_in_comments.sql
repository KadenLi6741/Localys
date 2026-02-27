-- Fix ambiguous user_id column reference in comment functions
-- Simplified version using explicit subqueries instead of CTEs

-- Drop existing functions first (in reverse dependency order)
DROP FUNCTION IF EXISTS public.get_comment_with_likes(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_comment_replies(UUID, UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_video_comments(UUID, UUID, INTEGER, INTEGER) CASCADE;

-- Recreate get_video_comments - simplified with subqueries
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
  image_url TEXT,
  rating INTEGER,
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
    COALESCE((SELECT COUNT(*) FROM public.comment_likes cl WHERE cl.comment_id = c.id), 0)::BIGINT,
    CASE 
      WHEN p_user_id IS NULL THEN FALSE
      WHEN EXISTS(SELECT 1 FROM public.comment_likes cl2 WHERE cl2.comment_id = c.id AND cl2.user_id = p_user_id) 
      THEN TRUE 
      ELSE FALSE 
    END,
    pr.username,
    pr.full_name,
    pr.profile_picture_url AS avatar_url,
    c.image_url,
    c.rating,
    COALESCE((SELECT COUNT(*) FROM public.comments c2 WHERE c2.parent_comment_id = c.id), 0)::BIGINT
  FROM public.comments c
  LEFT JOIN public.profiles pr ON c.user_id = pr.id
  WHERE c.video_id = p_video_id
    AND c.parent_comment_id IS NULL
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate get_comment_replies - simplified with subqueries
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
  image_url TEXT,
  rating INTEGER
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
    COALESCE((SELECT COUNT(*) FROM public.comment_likes cl WHERE cl.comment_id = c.id), 0)::BIGINT,
    CASE 
      WHEN p_user_id IS NULL THEN FALSE
      WHEN EXISTS(SELECT 1 FROM public.comment_likes cl2 WHERE cl2.comment_id = c.id AND cl2.user_id = p_user_id) 
      THEN TRUE 
      ELSE FALSE 
    END,
    pr.username,
    pr.full_name,
    pr.profile_picture_url AS avatar_url,
    c.image_url,
    c.rating
  FROM public.comments c
  LEFT JOIN public.profiles pr ON c.user_id = pr.id
  WHERE c.parent_comment_id = p_parent_comment_id
  ORDER BY c.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate get_comment_with_likes - simplified with subqueries
CREATE FUNCTION public.get_comment_with_likes(
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
  is_liked BOOLEAN,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  image_url TEXT,
  rating INTEGER
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
    COALESCE((SELECT COUNT(*) FROM public.comment_likes cl WHERE cl.comment_id = c.id), 0)::BIGINT,
    CASE 
      WHEN p_user_id IS NULL THEN FALSE
      WHEN EXISTS(SELECT 1 FROM public.comment_likes cl2 WHERE cl2.comment_id = c.id AND cl2.user_id = p_user_id) 
      THEN TRUE 
      ELSE FALSE 
    END,
    pr.username,
    pr.full_name,
    pr.profile_picture_url AS avatar_url,
    c.image_url,
    c.rating,
    COALESCE((SELECT COUNT(*) FROM public.comments c2 WHERE c2.parent_comment_id = c.id), 0)::BIGINT
  FROM public.comments c
  LEFT JOIN public.profiles pr ON c.user_id = pr.id
  WHERE c.id = p_comment_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
