-- Ensure coupons exist and are active
-- Delete any existing coupons first to avoid conflicts
DELETE FROM public.coupons WHERE code IN ('LOCALYS2026', 'FIRSTORDER', 'SAVE15');

-- Insert the three main coupons
INSERT INTO public.coupons (code, discount_percentage, max_uses, is_active, created_at)
VALUES
  ('LOCALYS2026', 20, 1000, true, NOW()),
  ('FIRSTORDER', 20, 500, true, NOW()),
  ('SAVE15', 15, 1000, true, NOW());

-- Verify they were inserted
SELECT id, code, discount_percentage, max_uses, is_active, created_at FROM public.coupons ORDER BY created_at DESC;
