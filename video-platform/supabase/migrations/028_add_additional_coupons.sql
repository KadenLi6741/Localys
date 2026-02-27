-- Add more coupons to the system
-- First Order coupon - 20% off
INSERT INTO public.coupons (code, discount_percentage, max_uses, is_active)
VALUES (
  'FIRSTORDER',
  20,
  500,
  TRUE
) ON CONFLICT (code) DO NOTHING;

-- 15% off coupon - General purpose
INSERT INTO public.coupons (code, discount_percentage, max_uses, is_active)
VALUES (
  'SAVE15',
  15,
  1000,
  TRUE
) ON CONFLICT (code) DO NOTHING;
