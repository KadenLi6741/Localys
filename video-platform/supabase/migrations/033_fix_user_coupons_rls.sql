-- Drop all existing user_coupons policies
DROP POLICY IF EXISTS "allow_user_coupons_read" ON public.user_coupons;
DROP POLICY IF EXISTS "allow_user_coupons_insert" ON public.user_coupons;
DROP POLICY IF EXISTS "allow_user_coupons_update" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_select_policy" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_insert_policy" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_update_policy" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_read" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_insert" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_update" ON public.user_coupons;

-- Disable RLS temporarily
ALTER TABLE public.user_coupons DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

-- Simple permissive INSERT policy - allow authenticated users to insert their own rows
CREATE POLICY "user_coupons_insert_new" ON public.user_coupons
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Simple SELECT policy - allow users to read only their own coupons
CREATE POLICY "user_coupons_select_own" ON public.user_coupons
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Simple UPDATE policy - allow users to update only their own coupons
CREATE POLICY "user_coupons_update_own" ON public.user_coupons
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verify policies exist
SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE tablename = 'user_coupons';
