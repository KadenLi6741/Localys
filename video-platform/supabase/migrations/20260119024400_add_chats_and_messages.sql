-- SQL DDL (for Supabase/Postgres)

-- Enable UUID generation extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Chats: a container for a conversation (initially used for 1:1 chats)
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Chat members: who belongs to a chat
CREATE TABLE IF NOT EXISTS public.chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read timestamptz,
  role text DEFAULT 'member',
  UNIQUE (chat_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted boolean NOT NULL DEFAULT false,
  reply_to uuid REFERENCES public.messages(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON public.messages (chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON public.chat_members (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id ON public.chat_members (chat_id);

-- Recommended RLS policies
-- Assumption: user id is available as auth.uid() in Supabase/Postgres

-- Enable RLS on chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Enable RLS on messages and chat_members so only members can read/write
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- Policy: allow selecting chats only if the requester is a member of the chat
CREATE POLICY "Select chats if member" ON public.chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.chats.id
        AND cm.user_id = auth.uid()
    )
  );

-- Policy: allow inserting chats (for creating new chats)
CREATE POLICY "Insert chats" ON public.chats
  FOR INSERT WITH CHECK (true);

-- Policy: allow selecting messages only if the requester is a member of the chat
CREATE POLICY "Select messages if member" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.messages.chat_id
        AND cm.user_id = auth.uid()
    )
  );

-- Policy: allow inserting messages only if requester is a member (sender_id should be auth.uid())
CREATE POLICY "Insert messages if member" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.messages.chat_id
        AND cm.user_id = auth.uid()
    ) AND sender_id = auth.uid()
  );

-- Allow updating/deleting messages only by the sender (or admins) -- adjust as needed
CREATE POLICY "Update messages by sender" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

-- Chat members: only allow a user to read their own membership rows or rows from chats they belong to
CREATE POLICY "Select chat_members if member" ON public.chat_members
  FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.chat_members.chat_id
        AND cm.user_id = auth.uid()
    )
  );

-- Allow inserting a chat_members row only if the user_id equals auth.uid() or if the user is adding other users when creating a chat
CREATE POLICY "Insert chat_members" ON public.chat_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.chat_members.chat_id
        AND cm.user_id = auth.uid()
    )
  );

-- Note: For finding existing 1:1 chats, the application will run a deterministic query:
-- Find chats where is_group = false and have exactly two members with user ids A and B.
-- This is more maintainable than a materialized view for this use case.
