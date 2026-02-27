-- Drop existing functions first (in reverse dependency order)
DROP FUNCTION IF EXISTS public.get_comment_with_likes(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_comment_replies(UUID, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_video_comments(UUID, UUID, INTEGER, INTEGER);

-- Recreate get_video_comments with new columns
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
  rating SMALLINT,
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
    c.image_url,
    c.rating,
    COALESCE(reply_counts.reply_count, 0) AS reply_count
  FROM public.comments c
  LEFT JOIN public.profiles p ON c.user_id = p.id
  LEFT JOIN (
    SELECT cl.comment_id, COUNT(*) AS like_count
    FROM public.comment_likes cl
    GROUP BY cl.comment_id
  ) like_counts ON c.id = like_counts.comment_id
  LEFT JOIN (
    SELECT cl.comment_id, TRUE AS is_liked
    FROM public.comment_likes cl
    WHERE cl.user_id = p_user_id
  ) user_likes ON c.id = user_likes.comment_id
  LEFT JOIN (
    SELECT c2.parent_comment_id, COUNT(*) AS reply_count
    FROM public.comments c2
    WHERE c2.parent_comment_id IS NOT NULL
    GROUP BY c2.parent_comment_id
  ) reply_counts ON c.id = reply_counts.parent_comment_id
  WHERE c.video_id = p_video_id
    AND c.parent_comment_id IS NULL
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate get_comment_replies with new columns
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
  rating SMALLINT
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
    c.image_url,
    c.rating
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

-- Recreate get_comment_with_likes with new columns
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
  rating SMALLINT
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
    c.image_url,
    c.rating
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
  WHERE c.id = p_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
