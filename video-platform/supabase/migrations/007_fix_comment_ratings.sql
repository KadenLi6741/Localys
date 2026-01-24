-- =====================================================
-- Fix Comment Ratings System
-- =====================================================
-- Complete rewrite without avatar_url references

-- Drop all old functions
DROP FUNCTION IF EXISTS public.get_video_comments(uuid, uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_comment_replies(uuid, uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_comment_with_likes(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_video_average_rating(uuid) CASCADE;

-- Add rating column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'comments' 
    AND column_name = 'rating'
  ) THEN
    ALTER TABLE public.comments ADD COLUMN rating INTEGER DEFAULT NULL;
  END IF;
END $$;

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'comments' 
    AND constraint_name = 'rating_range'
  ) THEN
    ALTER TABLE public.comments ADD CONSTRAINT rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS comments_rating_idx ON public.comments(rating);
CREATE INDEX IF NOT EXISTS comments_video_rating_idx ON public.comments(video_id, rating);

-- Function to get average rating for a video
CREATE FUNCTION public.get_video_average_rating(p_video_id UUID)
RETURNS TABLE (
  average_rating DECIMAL,
  total_rated_comments BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(c.rating)::NUMERIC, 2) AS average_rating,
    COUNT(c.id) AS total_rated_comments
  FROM public.comments c
  WHERE c.video_id = p_video_id
    AND c.rating IS NOT NULL
    AND c.parent_comment_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comments for a video
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

-- Function to get replies for a comment
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

-- Function to get a comment with likes
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
    COALESCE(like_counts.like_count, 0)::BIGINT,
    CASE WHEN p_user_id IS NOT NULL THEN COALESCE(user_likes.is_liked, FALSE) ELSE FALSE END,
    c.rating
  FROM public.comments c
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
  WHERE c.id = p_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
