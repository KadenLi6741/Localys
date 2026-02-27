-- Fix comment functions - simplified version with correct types and column aliases
-- Add business average rating columns if they don't exist
ALTER TABLE IF EXISTS public.businesses 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT NULL;

ALTER TABLE IF EXISTS public.businesses 
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Drop existing functions first (in reverse dependency order)
DROP FUNCTION IF EXISTS public.get_business_average_rating(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_comment_with_likes(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_comment_replies(UUID, UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_video_comments(UUID, UUID, INTEGER, INTEGER) CASCADE;

-- Recreate get_video_comments
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
    COALESCE((SELECT COUNT(*) FROM public.comment_likes WHERE comment_id = c.id), 0)::BIGINT,
    CASE 
      WHEN p_user_id IS NULL THEN FALSE
      ELSE COALESCE((SELECT TRUE FROM public.comment_likes WHERE comment_id = c.id AND user_id = p_user_id LIMIT 1), FALSE)
    END,
    pr.username,
    pr.full_name,
    pr.profile_picture_url AS avatar_url,
    c.image_url,
    c.rating,
    COALESCE((SELECT COUNT(*) FROM public.comments WHERE parent_comment_id = c.id), 0)::BIGINT
  FROM public.comments c
  LEFT JOIN public.profiles pr ON c.user_id = pr.id
  WHERE c.video_id = p_video_id
    AND c.parent_comment_id IS NULL
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate get_comment_replies
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
    COALESCE((SELECT COUNT(*) FROM public.comment_likes WHERE comment_id = c.id), 0)::BIGINT,
    CASE 
      WHEN p_user_id IS NULL THEN FALSE
      ELSE COALESCE((SELECT TRUE FROM public.comment_likes WHERE comment_id = c.id AND user_id = p_user_id LIMIT 1), FALSE)
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

-- Recreate get_comment_with_likes
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
    COALESCE((SELECT COUNT(*) FROM public.comment_likes WHERE comment_id = c.id), 0)::BIGINT,
    CASE 
      WHEN p_user_id IS NULL THEN FALSE
      ELSE COALESCE((SELECT TRUE FROM public.comment_likes WHERE comment_id = c.id AND user_id = p_user_id LIMIT 1), FALSE)
    END,
    pr.username,
    pr.full_name,
    pr.profile_picture_url AS avatar_url,
    c.image_url,
    c.rating,
    COALESCE((SELECT COUNT(*) FROM public.comments WHERE parent_comment_id = c.id), 0)::BIGINT
  FROM public.comments c
  LEFT JOIN public.profiles pr ON c.user_id = pr.id
  WHERE c.id = p_comment_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- BUSINESS AVERAGE RATING FUNCTIONS
-- =====================================================

-- Function to get average rating for a specific business
CREATE OR REPLACE FUNCTION public.get_business_average_rating(p_business_id UUID)
RETURNS TABLE (
  business_id UUID,
  average_rating DECIMAL,
  total_reviews BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_business_id,
    ROUND(AVG(c.rating)::NUMERIC, 2)::DECIMAL AS average_rating,
    COUNT(c.id) AS total_reviews
  FROM public.comments c
  INNER JOIN public.videos v ON c.video_id = v.id
  WHERE v.business_id = p_business_id
    AND c.rating IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get average ratings for all businesses with reviews
CREATE OR REPLACE FUNCTION public.get_all_business_ratings()
RETURNS TABLE (
  business_id UUID,
  average_rating DECIMAL,
  total_reviews BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.business_id,
    ROUND(AVG(c.rating)::NUMERIC, 2)::DECIMAL AS average_rating,
    COUNT(c.id) AS total_reviews
  FROM public.comments c
  INNER JOIN public.videos v ON c.video_id = v.id
  WHERE v.business_id IS NOT NULL
    AND c.rating IS NOT NULL
  GROUP BY v.business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update business average_rating and total_reviews columns
CREATE OR REPLACE FUNCTION public.update_business_ratings()
RETURNS void AS $$
BEGIN
  UPDATE public.businesses b
  SET 
    average_rating = t.average_rating,
    total_reviews = t.total_reviews,
    updated_at = NOW()
  FROM (
    SELECT
      v.business_id,
      ROUND(AVG(c.rating)::NUMERIC, 2)::DECIMAL AS average_rating,
      COUNT(c.id)::INTEGER AS total_reviews
    FROM public.comments c
    INNER JOIN public.videos v ON c.video_id = v.id
    WHERE v.business_id IS NOT NULL
      AND c.rating IS NOT NULL
    GROUP BY v.business_id
  ) t
  WHERE b.id = t.business_id;
  
  -- Set ratings to NULL for businesses with no reviews
  UPDATE public.businesses b
  SET 
    average_rating = NULL,
    total_reviews = 0,
    updated_at = NOW()
  WHERE b.id NOT IN (
    SELECT DISTINCT v.business_id
    FROM public.comments c
    INNER JOIN public.videos v ON c.video_id = v.id
    WHERE v.business_id IS NOT NULL
      AND c.rating IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on comments to update business ratings when a comment rating is changed
CREATE OR REPLACE FUNCTION public.handle_comment_rating_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a new comment with a rating, or the rating changed, update business ratings
  IF (TG_OP = 'INSERT' AND NEW.rating IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND (OLD.rating IS DISTINCT FROM NEW.rating)) THEN
    -- Update the business rating for the video's business
    UPDATE public.businesses b
    SET 
      average_rating = (
        SELECT ROUND(AVG(c.rating)::NUMERIC, 2)::DECIMAL
        FROM public.comments c
        INNER JOIN public.videos v ON c.video_id = v.id
        WHERE v.business_id = (SELECT business_id FROM public.videos WHERE id = NEW.video_id)
          AND c.rating IS NOT NULL
      ),
      total_reviews = (
        SELECT COUNT(c.id)::INTEGER
        FROM public.comments c
        INNER JOIN public.videos v ON c.video_id = v.id
        WHERE v.business_id = (SELECT business_id FROM public.videos WHERE id = NEW.video_id)
          AND c.rating IS NOT NULL
      ),
      updated_at = NOW()
    WHERE b.id = (SELECT business_id FROM public.videos WHERE id = NEW.video_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the trigger for comment rating updates
DROP TRIGGER IF EXISTS update_business_ratings_on_comment ON public.comments;
CREATE TRIGGER update_business_ratings_on_comment
  AFTER INSERT OR UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_rating_update();