-- Fix RLS policy drift for chat creation
-- Ensures authenticated users can create chats and add both members in a 1:1 conversation flow

-- Keep RLS enabled
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- Reset chat policies to a known-good state
DROP POLICY IF EXISTS "Select chats if member" ON public.chats;
DROP POLICY IF EXISTS "Insert chats" ON public.chats;
DROP POLICY IF EXISTS "Update chats" ON public.chats;
DROP POLICY IF EXISTS "Delete chats" ON public.chats;
DROP POLICY IF EXISTS "chats_select" ON public.chats;
DROP POLICY IF EXISTS "chats_insert" ON public.chats;

CREATE POLICY "chats_insert" ON public.chats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "chats_select" ON public.chats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.chats.id
        AND cm.user_id = auth.uid()
    )
  );

-- Reset chat_members insert/select policies used by chat creation flow
DROP POLICY IF EXISTS "Insert chat_members" ON public.chat_members;
DROP POLICY IF EXISTS "Select chat_members if member" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_insert" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_select" ON public.chat_members;

CREATE POLICY "chat_members_insert" ON public.chat_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.chat_members.chat_id
        AND cm.user_id = auth.uid()
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = public.chat_members.chat_id
          AND c.is_group = false
      )
      AND (
        SELECT COUNT(*) FROM public.chat_members cm
        WHERE cm.chat_id = public.chat_members.chat_id
      ) = 1
      AND EXISTS (
        SELECT 1 FROM public.chat_members cm
        WHERE cm.chat_id = public.chat_members.chat_id
          AND cm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "chat_members_select" ON public.chat_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_members cm2
      WHERE cm2.chat_id = public.chat_members.chat_id
        AND cm2.user_id = auth.uid()
    )
  );
