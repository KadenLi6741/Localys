-- Add INSERT policy for user_coupons to allow users to activate coupons
CREATE POLICY "user_coupons_insert" ON public.user_coupons
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Insert the LOCALYS2026 coupon if it doesn't exist
INSERT INTO public.coupons (code, discount_percentage, max_uses, is_active)
VALUES (
  'LOCALYS2026',
  20,
  1000,
  TRUE
) ON CONFLICT (code) DO NOTHING;
