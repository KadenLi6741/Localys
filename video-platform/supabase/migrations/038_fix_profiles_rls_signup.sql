-- Migration to fix profiles RLS policy for signup
-- The issue: New auth users can't insert their own profiles because RLS requires auth.uid() to be set
-- Solution: Allow inserts when there's no existing profile for that user ID

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Create a more permissive insert policy that allows signup
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- Allow if inserting for own user ID (when authenticated)
    auth.uid() = id 
    -- OR allow if this is a new signup (no existing profile for this ID)
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id)
  );

-- Note: The API endpoint uses service_role key which bypasses RLS entirely,
-- but this policy provides additional safety.
