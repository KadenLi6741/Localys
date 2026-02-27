-- Disable RLS temporarily to debug and verify data exists
ALTER TABLE public.coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coupons DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with proper policies
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "coupons_select_policy" ON public.coupons;
DROP POLICY IF EXISTS "coupons_read" ON public.coupons;
DROP POLICY IF EXISTS "coupons_read_policy" ON public.coupons;
DROP POLICY IF EXISTS "user_coupons_select_policy" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_read" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_insert_policy" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_insert" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_update_policy" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_update" ON public.user_coupons;

-- Simple permissive policy for coupons - allow all to read active coupons
CREATE POLICY "allow_public_coupons_read" ON public.coupons
  FOR SELECT
  USING (is_active = true);

-- User coupons policies - only authenticated users can see/modify their own
CREATE POLICY "allow_user_coupons_read" ON public.user_coupons
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "allow_user_coupons_insert" ON public.user_coupons
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "allow_user_coupons_update" ON public.user_coupons
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verify coupons exist and are active
SELECT code, discount_percentage, is_active FROM public.coupons ORDER BY created_at DESC;
