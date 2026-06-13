-- Ensure trust-score dependencies exist on businesses
-- This migration is intentionally idempotent for partially upgraded databases.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER NOT NULL DEFAULT 0;

-- Keep rating values sane when present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'businesses_average_rating_range'
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_average_rating_range
      CHECK (average_rating IS NULL OR (average_rating >= 0 AND average_rating <= 5));
  END IF;
END $$;

