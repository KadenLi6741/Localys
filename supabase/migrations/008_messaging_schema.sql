-- =====================================================
-- MESSAGING SCHEMA & RPC SETUP
-- =====================================================
-- Paste this into Supabase SQL Editor if you haven't already set up messaging.
-- Includes conversations, conversation_participants, messages, and the RPC.
-- =====================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop tables in reverse dependency order (messages first, then participants, then conversations)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- ===== 1. CONVERSATIONS TABLE =====
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_direct boolean NOT NULL DEFAULT true,
  participant_ids uuid[] NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz
);

-- ===== 2. CONVERSATION_PARTICIPANTS TABLE =====
CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

-- ===== 3. MESSAGES TABLE =====
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== 4. INDEXES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at DESC);

-- Unique index to prevent duplicate 1-to-1 conversations (for sorted participant_ids)
-- Simple unique index works with ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_direct_pair ON public.conversations (participant_ids);

-- Optional: GIN index for fast array searches (not for uniqueness)
CREATE INDEX IF NOT EXISTS idx_conversations_participant_ids_gin ON public.conversations USING gin (participant_ids);

-- ===== 5. TRIGGER: UPDATE last_message_at =====
DROP FUNCTION IF EXISTS public._conversations_update_last_message_at() CASCADE;

CREATE FUNCTION public._conversations_update_last_message_at() RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_last_message_after_insert ON public.messages;

CREATE TRIGGER trg_update_last_message_after_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE PROCEDURE public._conversations_update_last_message_at();

-- ===== 6. RPC: create_or_get_direct_conversation(uid_a, uid_b) =====
DROP FUNCTION IF EXISTS public.create_or_get_direct_conversation(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.create_or_get_direct_conversation(uid_a uuid, uid_b uuid)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_ids uuid[];
  conv public.conversations%ROWTYPE;
BEGIN
  IF uid_a IS NULL OR uid_b IS NULL THEN
    RAISE EXCEPTION 'user ids are required';
  END IF;
  IF uid_a = uid_b THEN
    RAISE EXCEPTION 'cannot create direct conversation with self';
  END IF;

  p_ids := ARRAY[LEAST(uid_a, uid_b), GREATEST(uid_a, uid_b)];

  INSERT INTO public.conversations (participant_ids, is_direct)
  VALUES (p_ids, true)
  ON CONFLICT (participant_ids) DO UPDATE
    SET last_message_at = public.conversations.last_message_at
  RETURNING * INTO conv;

  INSERT INTO public.conversation_participants (id, conversation_id, user_id)
    SELECT gen_random_uuid(), conv.id, unnest(p_ids)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN conv;
END;
$$;

-- ===== 7. RPC: get_or_create_conversation(p_user_one_id, p_user_two_id) =====
-- Wrapper with parameter names matching the frontend call
DROP FUNCTION IF EXISTS public.get_or_create_conversation(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user_one_id uuid,
  p_user_two_id uuid
)
RETURNS public.conversations
LANGUAGE sql
AS $$
  SELECT * FROM public.create_or_get_direct_conversation(p_user_one_id, p_user_two_id);
$$;

-- ===== 8. ENABLE RLS =====
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ===== 9. RLS POLICIES: CONVERSATIONS =====
DROP POLICY IF EXISTS "conversations_select_for_participants" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_if_in_participant_ids" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_for_participants" ON public.conversations;

CREATE POLICY "conversations_select_for_participants" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversations.id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "conversations_insert_if_in_participant_ids" ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() = ANY(participant_ids)
  );

CREATE POLICY "conversations_update_for_participants" ON public.conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversations.id
        AND cp.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversations.id
        AND cp.user_id = auth.uid()
    )
  );

-- ===== 10. RLS POLICIES: CONVERSATION_PARTICIPANTS =====
DROP POLICY IF EXISTS "conversation_participants_select_for_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_self" ON public.conversation_participants;

-- Users can only see their own participant rows (no recursion)
CREATE POLICY "conversation_participants_select_for_participants" ON public.conversation_participants
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "conversation_participants_insert_self" ON public.conversation_participants
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- ===== 11. RLS POLICIES: MESSAGES =====
DROP POLICY IF EXISTS "messages_select_for_participants" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_sender_is_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_update_sender_only" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_sender_only" ON public.messages;

CREATE POLICY "messages_select_for_participants" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_sender_is_participant" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_update_sender_only" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

CREATE POLICY "messages_delete_sender_only" ON public.messages
  FOR DELETE USING (sender_id = auth.uid());

-- ===== 12. ENABLE REALTIME (OPTIONAL) =====
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.conversations';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.messages';
  END IF;

  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
END
$$;
