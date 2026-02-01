-- Fix chat_members RLS policy to allow adding both users to a new 1:1 chat
-- The issue: When creating a 1:1 chat, we insert two rows with different user_ids
-- The current policy blocks the second insert because the current user isn't already a member

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Insert chat_members" ON public.chat_members;

-- Create a new, more permissive policy that allows:
-- 1. Users to add themselves to a chat
-- 2. Users to add another user when creating a new 1:1 chat (is_group = false)
CREATE POLICY "Insert chat_members" ON public.chat_members
  FOR INSERT WITH CHECK (
    -- Allow if adding yourself
    user_id = auth.uid()
    OR
    -- Allow if you're already a member of this chat (for adding to existing chats)
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.chat_members.chat_id
        AND cm.user_id = auth.uid()
    )
    OR
    -- Allow if this is a new 1:1 chat being created (not a group)
    (
      EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = public.chat_members.chat_id
          AND c.is_group = false
      )
      AND
      -- And there's exactly one member already (the current user)
      (
        SELECT COUNT(*) FROM public.chat_members cm
        WHERE cm.chat_id = public.chat_members.chat_id
      ) = 1
      AND
      -- And that member is the current user
      EXISTS (
        SELECT 1 FROM public.chat_members cm
        WHERE cm.chat_id = public.chat_members.chat_id
          AND cm.user_id = auth.uid()
      )
    )
  );
