-- Drop existing policies if they exist and recreate them to ensure they work properly
DROP POLICY IF EXISTS "coupons_read" ON public.coupons;
DROP POLICY IF EXISTS "user_coupons_read" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_insert" ON public.user_coupons;
DROP POLICY IF EXISTS "user_coupons_update" ON public.user_coupons;

-- RLS Policies for coupons - allow all users to read active coupons
CREATE POLICY "coupons_select_policy" ON public.coupons
  FOR SELECT
  USING (is_active = true);

-- RLS Policies for user_coupons - authenticated users can only see their own
CREATE POLICY "user_coupons_select_policy" ON public.user_coupons
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_coupons_insert_policy" ON public.user_coupons
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_coupons_update_policy" ON public.user_coupons
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
