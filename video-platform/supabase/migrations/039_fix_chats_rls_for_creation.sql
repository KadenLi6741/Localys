-- Migration to fix chats RLS policy for new chat creation
-- Problem: When inserting a chat, the RLS policy was preventing creation
-- Solution: Ensure INSERT policy is fully permissive for authenticated users

-- Drop the old insert policy if it exists
DROP POLICY IF EXISTS "Insert chats" ON public.chats;
DROP POLICY IF EXISTS "Authenticated users can create chats" ON public.chats;

-- New insert policy: Allow any authenticated user to insert chats
-- Using true since we only care that they're authenticated (auth.uid() must exist)
CREATE POLICY "chats_insert_authenticated" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure select policy is correct
DROP POLICY IF EXISTS "Select chats if member" ON public.chats;

CREATE POLICY "chats_select_member" ON public.chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.chats.id
        AND cm.user_id = auth.uid()
    )
  );

-- Ensure chat_members policies are correct
DROP POLICY IF EXISTS "Select chat_members if member" ON public.chat_members;

CREATE POLICY "chat_members_select" ON public.chat_members
  FOR SELECT USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.chat_members.chat_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Insert chat_members" ON public.chat_members;

CREATE POLICY "chat_members_insert" ON public.chat_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.chat_members.chat_id
        AND cm.user_id = auth.uid()
    )
  );


