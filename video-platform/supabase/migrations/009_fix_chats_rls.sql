-- Fix chats table RLS policies
-- The issue: INSERT policy with CHECK (true) isn't allowing authenticated users to create chats

-- Drop old policies
DROP POLICY IF EXISTS "Select chats if member" ON public.chats;
DROP POLICY IF EXISTS "Insert chats" ON public.chats;

-- Create a new SELECT policy - allow users to see chats they're members of
CREATE POLICY "Select chats if member" ON public.chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.chats.id
        AND cm.user_id = auth.uid()
    )
  );

-- Create a new INSERT policy - allow any authenticated user to create chats
CREATE POLICY "Insert chats" ON public.chats
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Optional: Add UPDATE policy if needed
CREATE POLICY "Update chats" ON public.chats
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.chats.id
        AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (true);

-- Optional: Add DELETE policy
CREATE POLICY "Delete chats" ON public.chats
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = public.chats.id
        AND cm.user_id = auth.uid()
    )
  );
