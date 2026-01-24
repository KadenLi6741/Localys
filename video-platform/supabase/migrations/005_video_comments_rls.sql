-- =====================================================
-- Row Level Security (RLS) Policies for Video Comments
-- =====================================================
-- This file contains all RLS policies to ensure users can only
-- access appropriate comments and manage their own content.
--
-- Security Principles:
-- 1. Anyone can read comments for any video
-- 2. Users can only create/update/delete their own comments
-- 3. Users can only like/unlike comments (one like per user per comment)
-- 4. Users can only manage their own likes
-- =====================================================

-- =====================================================
-- ENABLE RLS ON TABLES
-- =====================================================

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMMENTS POLICIES
-- =====================================================

-- Policy: Anyone can read comments
-- Reason: Comments should be visible to all users viewing a video
CREATE POLICY "Anyone can read comments"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert their own comments
-- Reason: Users should only be able to create comments as themselves
CREATE POLICY "Users can insert own comments"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own comments
-- Reason: Users should only be able to edit their own comments
CREATE POLICY "Users can update own comments"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own comments
-- Reason: Users should only be able to delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- COMMENT_LIKES POLICIES
-- =====================================================

-- Policy: Anyone can read comment likes
-- Reason: Like counts should be visible to all users
CREATE POLICY "Anyone can read comment likes"
  ON public.comment_likes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert their own likes
-- Reason: Users should only be able to like as themselves
-- Note: The unique constraint prevents duplicate likes
CREATE POLICY "Users can insert own likes"
  ON public.comment_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own likes
-- Reason: Users should only be able to remove their own likes
CREATE POLICY "Users can delete own likes"
  ON public.comment_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- REALTIME PUBLICATION POLICIES
-- =====================================================
-- Enable realtime for tables that need live updates
-- =====================================================

-- Enable realtime for comments table
-- This allows clients to subscribe to new comments and replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Enable realtime for comment_likes table
-- This allows clients to subscribe to like count changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;