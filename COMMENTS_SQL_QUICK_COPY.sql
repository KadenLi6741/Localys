-- =====================================================
-- COPY THIS ENTIRE SQL INTO YOUR SUPABASE SQL EDITOR
-- =====================================================
-- This will set up comments, likes, and all helper functions
-- Paste everything below into: Database > SQL Editor > New Query
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 1. COMMENTS TABLE =====
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0),
  CONSTRAINT max_content_length CHECK (char_length(content) <= 2000)
);

-- ===== 2. INDEXES ON COMMENTS =====
CREATE INDEX IF NOT EXISTS comments_video_id_idx ON public.comments(video_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS comments_video_parent_created_idx ON public.comments(video_id, parent_comment_id, created_at DESC);

-- ===== 3. UPDATED_AT TRIGGER =====
DROP TRIGGER IF EXISTS comments_updated_at ON public.comments;
DROP TRIGGER IF EXISTS prevent_nested_replies ON public.comments;

-- If an older version of this function exists with a different signature/return
-- type Postgres will refuse to replace it. Drop first to ensure the CREATE
-- works regardless of previous definition.
DROP FUNCTION IF EXISTS public.handle_comments_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comments_updated_at();

-- Function to prevent nested replies (replies to replies)
DROP FUNCTION IF EXISTS public.prevent_nested_replies() CASCADE;

CREATE OR REPLACE FUNCTION public.prevent_nested_replies()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    -- Check if the parent comment is itself a reply
    IF (SELECT parent_comment_id FROM public.comments WHERE id = NEW.parent_comment_id) IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot reply to a reply - only 1 level of nesting allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent nested replies
CREATE TRIGGER prevent_nested_replies
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_nested_replies();

-- ===== 4. COMMENT_LIKES TABLE =====
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_comment_like UNIQUE (comment_id, user_id)
);

-- ===== 5. INDEXES ON LIKES =====
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS comment_likes_created_at_idx ON public.comment_likes(created_at DESC);

-- ===== 6. HELPER FUNCTION: GET COMMENT WITH LIKES =====
-- Drop older definitions (may have different OUT column types) before
-- recreating the function to avoid "cannot change return type" errors.
DROP FUNCTION IF EXISTS public.get_comment_with_likes(uuid, uuid) CASCADE;

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

-- ===== 7. HELPER FUNCTION: GET VIDEO COMMENTS =====
DROP FUNCTION IF EXISTS public.get_video_comments(uuid, uuid, integer, integer) CASCADE;

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
  WITH comment_likes AS (
    SELECT
      comment_id,
      COUNT(*) AS like_count
    FROM public.comment_likes
    GROUP BY comment_id
  ),
  user_likes AS (
    SELECT
      comment_id,
      TRUE AS is_liked
    FROM public.comment_likes
    WHERE user_id = p_user_id
  ),
  reply_counts AS (
    SELECT
      parent_comment_id AS pc_id,
      COUNT(*) AS reply_count
    FROM public.comments comm_inner
    WHERE comm_inner.parent_comment_id IS NOT NULL
    GROUP BY comm_inner.parent_comment_id
  )
  SELECT
    c.id,
    c.video_id,
    c.user_id,
    c.content,
    c.parent_comment_id,
    c.created_at,
    c.updated_at,
    COALESCE(cl.like_count, 0) AS like_count,
    COALESCE(ul.is_liked, FALSE) AS is_liked,
    p.username,
    p.full_name,
    p.avatar_url,
    COALESCE(rc.reply_count, 0) AS reply_count
  FROM public.comments c
  LEFT JOIN comment_likes cl ON c.id = cl.comment_id
  LEFT JOIN user_likes ul ON c.id = ul.comment_id
  LEFT JOIN reply_counts rc ON c.id = rc.pc_id
  LEFT JOIN public.profiles p ON c.user_id = p.id
  WHERE c.video_id = p_video_id
    AND c.parent_comment_id IS NULL
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 8. HELPER FUNCTION: GET COMMENT REPLIES =====
DROP FUNCTION IF EXISTS public.get_comment_replies(uuid, uuid, integer, integer) CASCADE;

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
  WITH comment_likes AS (
    SELECT
      comment_id,
      COUNT(*) AS like_count
    FROM public.comment_likes
    GROUP BY comment_id
  ),
  user_likes AS (
    SELECT
      comment_id,
      TRUE AS is_liked
    FROM public.comment_likes
    WHERE user_id = p_user_id
  )
  SELECT
    c.id,
    c.video_id,
    c.user_id,
    c.content,
    c.parent_comment_id,
    c.created_at,
    c.updated_at,
    COALESCE(cl.like_count, 0) AS like_count,
    COALESCE(ul.is_liked, FALSE) AS is_liked,
    p.username,
    p.full_name,
    p.avatar_url
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

-- ===== 9. ENABLE RLS =====
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- ===== 10. RLS POLICIES FOR COMMENTS =====
DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

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

-- ===== 11. RLS POLICIES FOR LIKES =====
DROP POLICY IF EXISTS "Anyone can read comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can insert own likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON public.comment_likes;

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

-- ===== 12. ENABLE REALTIME (OPTIONAL) =====
-- Modify the supabase_realtime publication safely. "ALTER PUBLICATION ... DROP TABLE IF EXISTS"
-- is not valid Postgres syntax, so use a PL/pgSQL block that checks pg_publication_tables.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.comments';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comment_likes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.comment_likes';
  END IF;

  -- Ensure the tables are added to the publication (will error if publication doesn't exist).
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.comments';
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes';
END
$$;
