-- Fix RLS policies to allow public comment reading
-- This ensures comments can be read by everyone, not just authenticated users

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;

-- Create a new policy that allows everyone to read comments
CREATE POLICY "Anyone can read comments"
  ON public.comments
  FOR SELECT
  USING (true);
