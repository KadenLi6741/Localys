-- EMERGENCY FIX: Complete RLS reset for chats and chat_members tables
-- This removes ALL policies and recreates them cleanly

-- ============================================
-- CHATS TABLE FIX
-- ============================================

-- Disable RLS temporarily to clean up
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on chats
DROP POLICY IF EXISTS "Select chats if member" ON public.chats;
DROP POLICY IF EXISTS "Insert chats" ON public.chats;
DROP POLICY IF EXISTS "Update chats" ON public.chats;
DROP POLICY IF EXISTS "Delete chats" ON public.chats;

-- Re-enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Simple, clean policies for chats
-- Allow anyone authenticated to INSERT (create new chats)
CREATE POLICY "chats_insert" ON public.chats
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Allow users to SELECT chats they're members of
CREATE POLICY "chats_select" ON public.chats
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members 
      WHERE chat_id = chats.id 
      AND user_id = auth.uid()
    )
  );

-- ============================================
-- CHAT_MEMBERS TABLE FIX
-- ============================================

-- Disable RLS temporarily
ALTER TABLE public.chat_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on chat_members
DROP POLICY IF EXISTS "Select chat_members if member" ON public.chat_members;
DROP POLICY IF EXISTS "Insert chat_members" ON public.chat_members;

-- Re-enable RLS
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- Simple policies for chat_members
-- Allow anyone authenticated to INSERT members (for creating new chats)
CREATE POLICY "chat_members_insert" ON public.chat_members
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Allow users to SELECT members from chats they belong to
CREATE POLICY "chat_members_select" ON public.chat_members
  FOR SELECT 
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.chat_members cm2
      WHERE cm2.chat_id = chat_members.chat_id
      AND cm2.user_id = auth.uid()
    )
  );

-- ============================================
-- MESSAGES TABLE FIX
-- ============================================

-- Disable RLS temporarily
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on messages
DROP POLICY IF EXISTS "Select messages if member" ON public.messages;
DROP POLICY IF EXISTS "Insert messages if member" ON public.messages;
DROP POLICY IF EXISTS "Update messages by sender" ON public.messages;

-- Re-enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Simple policies for messages
-- Allow authenticated users to INSERT messages
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Allow users to SELECT messages from chats they're in
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members 
      WHERE chat_id = messages.chat_id 
      AND user_id = auth.uid()
    )
  );
