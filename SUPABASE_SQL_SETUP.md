# Supabase SQL Setup for Video Comments

## Overview
This guide provides the SQL statements you need to run in your Supabase SQL editor to enable the comments system. The code is organized into logical sections for clarity.

---

## Step 1: Create Comments Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0),
  CONSTRAINT max_content_length CHECK (char_length(content) <= 2000),
  CONSTRAINT no_nested_replies CHECK (
    parent_comment_id IS NULL OR
    (SELECT parent_comment_id FROM public.comments WHERE id = comments.parent_comment_id) IS NULL
  )
);
```

---

## Step 2: Create Indexes on Comments Table

Run this SQL:

```sql
-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS comments_video_id_idx ON public.comments(video_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS comments_video_parent_created_idx ON public.comments(video_id, parent_comment_id, created_at DESC);
```

---

## Step 3: Create Updated_At Trigger

Run this SQL:

```sql
-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comments_updated_at();
```

---

## Step 4: Create Comment Likes Table

Run this SQL:

```sql
-- Create comment_likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_comment_like UNIQUE (comment_id, user_id)
);

-- Create indexes for likes
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS comment_likes_created_at_idx ON public.comment_likes(created_at DESC);
```

---

## Step 5: Create Helper Functions

Run this SQL to create functions that your app uses:

```sql
-- Function to get a comment with like count and user's like status
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
```

---

## Step 6: Create Video Comments Function

Run this SQL:

```sql
-- Function to get all comments for a video with like counts and user data
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
      COUNT(*) AS like_count,
      CASE WHEN p_user_id IS NOT NULL AND EXISTS(
        SELECT 1 FROM public.comment_likes cl
        WHERE cl.comment_id = comment_likes.comment_id AND cl.user_id = p_user_id
      ) THEN TRUE ELSE FALSE END AS is_liked
    FROM public.comment_likes
    GROUP BY comment_id
  ),
  reply_counts AS (
    SELECT
      parent_comment_id,
      COUNT(*) AS reply_count
    FROM public.comments
    WHERE parent_comment_id IS NOT NULL
    GROUP BY parent_comment_id
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
    COALESCE(cl.is_liked, FALSE) AS is_liked,
    p.username,
    p.full_name,
    p.avatar_url,
    COALESCE(rc.reply_count, 0) AS reply_count
  FROM public.comments c
  LEFT JOIN comment_likes cl ON c.id = cl.comment_id
  LEFT JOIN reply_counts rc ON c.id = rc.parent_comment_id
  LEFT JOIN public.profiles p ON c.user_id = p.id
  WHERE c.video_id = p_video_id AND c.parent_comment_id IS NULL
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Step 7: Create Comment Replies Function

Run this SQL:

```sql
-- Function to get replies to a specific comment
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
      COUNT(*) AS like_count,
      CASE WHEN p_user_id IS NOT NULL AND EXISTS(
        SELECT 1 FROM public.comment_likes cl
        WHERE cl.comment_id = comment_likes.comment_id AND cl.user_id = p_user_id
      ) THEN TRUE ELSE FALSE END AS is_liked
    FROM public.comment_likes
    GROUP BY comment_id
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
    COALESCE(cl.is_liked, FALSE) AS is_liked,
    p.username,
    p.full_name,
    p.avatar_url
  FROM public.comments c
  LEFT JOIN comment_likes cl ON c.id = cl.comment_id
  LEFT JOIN public.profiles p ON c.user_id = p.id
  WHERE c.parent_comment_id = p_parent_comment_id
  ORDER BY c.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Step 8: Enable Row Level Security (RLS)

Run this SQL:

```sql
-- Enable RLS on both tables
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
```

---

## Step 9: Create RLS Policies for Comments Table

Run this SQL:

```sql
-- Allow all authenticated users to read comments
CREATE POLICY "Anyone can read comments"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to create their own comments
CREATE POLICY "Users can insert own comments"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own comments
CREATE POLICY "Users can update own comments"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

---

## Step 10: Create RLS Policies for Comment Likes Table

Run this SQL:

```sql
-- Allow all authenticated users to read likes
CREATE POLICY "Anyone can read comment likes"
  ON public.comment_likes
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to like comments (insert their own likes)
CREATE POLICY "Users can insert own likes"
  ON public.comment_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to unlike comments (delete their own likes)
CREATE POLICY "Users can delete own likes"
  ON public.comment_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

---

## Step 11: Enable Real-Time Updates (Optional but Recommended)

Run this SQL to enable live comment updates:

```sql
-- Enable realtime for comments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Enable realtime for comment likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
```

---

## Testing Your Setup

After running all the SQL above, you can test that everything works by running this query in Supabase SQL Editor:

```sql
-- This shows the structure of your tables
\d public.comments
\d public.comment_likes

-- This will list any comments (should be empty initially)
SELECT * FROM public.comments;
SELECT * FROM public.comment_likes;
```

---

## Important Notes

1. **Prerequisites**: Make sure you have a `profiles` table with columns: `id`, `username`, `full_name`, `avatar_url`. The comments system references this table.

2. **Videos**: The `video_id` field in the comments table should match an ID from your `businesses` table (since businesses have videos in your schema).

3. **User Authentication**: Ensure you have set up Supabase Authentication properly and that users are logging in with their profile created.

4. **RLS Policies**: These policies ensure that:
   - Anyone can READ comments
   - Only the comment creator can UPDATE/DELETE their own comments
   - Users can only LIKE/UNLIKE comments (manage their own likes)

---

## If You Already Have Migrations

If you already ran the migration files (`004_video_comments_schema.sql` and `005_video_comments_rls.sql`), then all of this is already set up and you don't need to run it again. Just verify the tables exist by running:

```sql
SELECT * FROM public.comments LIMIT 1;
SELECT * FROM public.comment_likes LIMIT 1;
```

If these queries don't error out, your schema is ready!
