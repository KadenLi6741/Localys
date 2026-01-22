-- =====================================================
-- Row Level Security (RLS) Policies for User Messaging
-- =====================================================
-- This file contains all RLS policies to ensure users can only
-- access their own data and conversations they're part of.
--
-- Security Principles:
-- 1. Users can only read/update their own profile
-- 2. Users can only access conversations they're part of
-- 3. Users can only read messages from conversations they're part of
-- 4. Users can only send messages in conversations they're part of
-- 5. Users can only mark their own received messages as read
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
-- RLS must be explicitly enabled on each table.
-- Even with RLS enabled, users won't be able to access data
-- until policies are created.
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
-- Users can read all profiles (for user lookup/search),
-- but can only update their own profile.
-- =====================================================

-- Policy: Anyone authenticated can read all profiles
-- Reason: Users need to see other users' profiles to start conversations
CREATE POLICY "Users can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can only update their own profile
-- Reason: Users should only be able to modify their own data
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile (usually done via trigger on signup)
-- Reason: New users need to create their profile after authentication
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- CONVERSATIONS POLICIES
-- =====================================================
-- Users can only see and interact with conversations
-- where they are either user_one_id or user_two_id.
-- =====================================================

-- Policy: Users can read conversations they're part of
-- Reason: Users should only see their own conversations
CREATE POLICY "Users can read own conversations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_one_id OR
    auth.uid() = user_two_id
  );

-- Policy: Users can insert conversations they're part of
-- Reason: Users need to create new conversations with other users
-- Note: The user_one_id/user_two_id ordering is enforced by the helper function
CREATE POLICY "Users can insert conversations they're part of"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_one_id OR
    auth.uid() = user_two_id
  );

-- Policy: Users can update conversations they're part of
-- Reason: Users need to update unread counts and last message info
-- Note: The trigger function handles this, but we need the policy for RLS
CREATE POLICY "Users can update own conversations"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_one_id OR
    auth.uid() = user_two_id
  )
  WITH CHECK (
    auth.uid() = user_one_id OR
    auth.uid() = user_two_id
  );

-- =====================================================
-- MESSAGES POLICIES
-- =====================================================
-- Users can only read messages from conversations they're part of.
-- Users can only send messages where they are the sender.
-- Users can only mark their own received messages as read.
-- =====================================================

-- Policy: Users can read messages from their conversations
-- Reason: Users should only see messages from conversations they're part of
-- We join through the conversations table to verify access
CREATE POLICY "Users can read messages from own conversations"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND (
          conversations.user_one_id = auth.uid() OR
          conversations.user_two_id = auth.uid()
        )
    )
  );

-- Policy: Users can insert messages where they are the sender
-- Reason: Users should only be able to send messages as themselves
-- We also verify the conversation belongs to the user
CREATE POLICY "Users can send messages in own conversations"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND (
          conversations.user_one_id = auth.uid() OR
          conversations.user_two_id = auth.uid()
        )
    )
  );

-- Policy: Users can update their own received messages (to mark as read)
-- Reason: Users should only be able to mark messages sent to them as read
-- They can only update the is_read field
CREATE POLICY "Users can mark own received messages as read"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = receiver_id
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND (
          conversations.user_one_id = auth.uid() OR
          conversations.user_two_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    auth.uid() = receiver_id
    AND (
      -- Can only update is_read field
      (OLD.sender_id = NEW.sender_id)
      AND (OLD.receiver_id = NEW.receiver_id)
      AND (OLD.conversation_id = NEW.conversation_id)
      AND (OLD.content = NEW.content)
      AND (OLD.created_at = NEW.created_at)
    )
  );

-- =====================================================
-- REALTIME PUBLICATION POLICIES
-- =====================================================
-- Enable realtime for tables that need it.
-- Realtime subscriptions respect RLS policies automatically.
-- =====================================================

-- Enable realtime for messages table
-- This allows clients to subscribe to message changes in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for conversations table
-- This allows clients to subscribe to conversation updates (like unread counts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

