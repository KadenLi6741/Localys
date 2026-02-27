-- Disable RLS on coupons table to allow public read access
ALTER TABLE public.coupons DISABLE ROW LEVEL SECURITY;

-- Now re-enable and create a very simple policy
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "allow_public_coupons_read" ON public.coupons;
DROP POLICY IF EXISTS "coupons_select_policy" ON public.coupons;
DROP POLICY IF EXISTS "coupons_read_policy" ON public.coupons;
DROP POLICY IF EXISTS "coupons_read" ON public.coupons;

-- Create a single permissive policy - allow ALL reads
CREATE POLICY "coupons_allow_public_read" ON public.coupons
  FOR SELECT
  USING (true);

-- Verify the policy exists
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'coupons';
