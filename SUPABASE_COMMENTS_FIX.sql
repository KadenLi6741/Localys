-- =====================================================
-- Complete Comments System Setup for Supabase
-- =====================================================
-- Run this entire script in your Supabase SQL Editor
-- This ensures the comments table is properly set up with all required columns and functions
-- =====================================================

-- Step 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Add rating column to comments table if it doesn't exist
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS rating INTEGER;

-- Step 3: Add rating constraint if it doesn't exist
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

-- Step 4: Create indexes for rating if they don't exist
CREATE INDEX IF NOT EXISTS comments_rating_idx ON public.comments(rating);
CREATE INDEX IF NOT EXISTS comments_video_rating_idx ON public.comments(video_id, rating);

-- Step 5: Enable RLS if not already enabled
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop old policies if they exist
DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can read comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can insert own likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON public.comment_likes;

-- Step 7: Create proper RLS policies
CREATE POLICY "Anyone can read comments"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own comments"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read comment likes"
  ON public.comment_likes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own likes"
  ON public.comment_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON public.comment_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 8: Drop and recreate the get_video_average_rating function
DROP FUNCTION IF EXISTS public.get_video_average_rating(uuid) CASCADE;

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

-- Step 9: Drop and recreate get_video_comments function
DROP FUNCTION IF EXISTS public.get_video_comments(uuid, uuid, integer, integer) CASCADE;

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

-- Step 10: Drop and recreate get_comment_replies function
DROP FUNCTION IF EXISTS public.get_comment_replies(uuid, uuid, integer, integer) CASCADE;

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

-- Step 11: Enable realtime for comments and comment_likes (if not already enabled)
DO $$
BEGIN
  -- Try to add comments table to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  EXCEPTION WHEN duplicate_object THEN
    -- Table is already in the publication, that's OK
    NULL;
  END;
  
  -- Try to add comment_likes table to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
  EXCEPTION WHEN duplicate_object THEN
    -- Table is already in the publication, that's OK
    NULL;
  END;
END $$;

-- Step 12: Verify setup (these should all show results)
-- Check comments table exists
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'comments' 
ORDER BY ordinal_position;

-- Check if there are any existing comments
SELECT COUNT(*) as total_comments FROM public.comments;

-- Done! The comments system is now properly set up.
-- Test by creating a new comment in your app.
