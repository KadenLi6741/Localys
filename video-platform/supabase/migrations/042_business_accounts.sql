-- =============================================================================
-- 042_business_accounts.sql  —  Phase 5A: unified account model
-- -----------------------------------------------------------------------------
-- Goal: ONE source of truth for "is this user a business + what's their store".
--   • businesses table (owned by a user via owner_id)  = the business entity
--   • profiles.account_type ('customer' | 'business')   = which mode/UI to show
--
-- This script is ADDITIVE + IDEMPOTENT + GUARDED so it is safe to run against
-- the existing (manually-created) schema. It will NOT drop or rewrite existing
-- data. Re-running it is safe.
--
-- HOW TO RUN:
--   1. Open Supabase → SQL Editor → paste this whole file.
--   2. Find your auth user id:   select id, email from auth.users order by created_at;
--   3. Replace the OWNER_USER_ID placeholder near the bottom with that id.
--   4. Run.
-- =============================================================================

-- 1) profiles.account_type ----------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'customer';

-- 2) businesses table (created only if missing; columns ensured either way) ----
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT DEFAULT 'general',
  category TEXT,
  description TEXT,
  address TEXT,
  contact TEXT,
  business_hours JSONB,
  profile_picture_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  price_range_min NUMERIC,
  price_range_max NUMERIC,
  average_rating NUMERIC DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure every column the app uses exists even if the table pre-existed.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'general';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_hours JSONB;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category);

-- 3) RLS: anyone can read businesses; only the owner can write -----------------
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "businesses_select" ON public.businesses;
CREATE POLICY "businesses_select" ON public.businesses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "businesses_insert_own" ON public.businesses;
CREATE POLICY "businesses_insert_own" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "businesses_update_own" ON public.businesses;
CREATE POLICY "businesses_update_own" ON public.businesses
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "businesses_delete_own" ON public.businesses;
CREATE POLICY "businesses_delete_own" ON public.businesses
  FOR DELETE USING (auth.uid() = owner_id);

-- 4) Backfill: turn existing profile-storefronts (profiles.type set) into -------
--    businesses rows so the reconciled Home keeps showing them. Guarded so it
--    only runs if profiles.type exists, and never duplicates.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'type'
  ) THEN
    INSERT INTO public.businesses (owner_id, business_name, business_type, category, profile_picture_url)
    SELECT p.id,
           COALESCE(p.full_name, p.username, 'My business'),
           p.type,
           p.type,
           p.profile_picture_url
    FROM public.profiles p
    WHERE p.type IN ('food', 'retail', 'service')
      AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = p.id);
  END IF;
END $$;

-- Every business owner is a business account.
UPDATE public.profiles
SET account_type = 'business'
WHERE id IN (SELECT owner_id FROM public.businesses)
  AND account_type <> 'business';

-- 5) DEMO SEED ----------------------------------------------------------------
-- Replace 'OWNER_USER_ID' with your auth user id (see "HOW TO RUN" above).
-- Guarded + idempotent: re-running won't create duplicates.
DO $$
DECLARE
  v_owner_text TEXT := 'OWNER_USER_ID';   -- <-- EDIT THIS (paste your auth user id)
  v_owner    UUID;
  v_business UUID;
  v_menu     UUID;
BEGIN
  -- Guard runs BEFORE any uuid cast, so forgetting to edit skips cleanly
  -- instead of erroring with "invalid input syntax for type uuid".
  IF v_owner_text IS NULL OR v_owner_text = 'OWNER_USER_ID' THEN
    RAISE NOTICE 'Skipping demo seed: set OWNER_USER_ID first.';
    RETURN;
  END IF;
  v_owner := v_owner_text::uuid;

  -- demo business
  SELECT id INTO v_business FROM public.businesses
   WHERE owner_id = v_owner AND business_name = 'Localys Demo Café' LIMIT 1;
  IF v_business IS NULL THEN
    INSERT INTO public.businesses
      (owner_id, business_name, business_type, category, description, address, contact, profile_picture_url, average_rating, total_reviews)
    VALUES
      (v_owner, 'Localys Demo Café', 'food', 'cafes',
       'A cosy neighbourhood café serving fresh coffee and pastries.',
       '123 Main Street', 'hello@demo.cafe',
       'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=240&q=80', 4.7, 3)
    RETURNING id INTO v_business;
  END IF;

  UPDATE public.profiles SET account_type = 'business' WHERE id = v_owner;

  -- demo menu + items
  SELECT id INTO v_menu FROM public.menus WHERE business_id = v_business LIMIT 1;
  IF v_menu IS NULL THEN
    INSERT INTO public.menus (user_id, business_id, menu_name, category)
    VALUES (v_owner, v_business, 'Main Menu', 'Café')
    RETURNING id INTO v_menu;

    INSERT INTO public.menu_items (menu_id, user_id, item_name, description, price, category)
    VALUES
      (v_menu, v_owner, 'Flat White', 'Double-shot espresso with steamed milk', 4.50, 'Drinks'),
      (v_menu, v_owner, 'Almond Croissant', 'Buttery croissant with almond filling', 5.00, 'Bakery');
  END IF;

  -- demo reviews — only if the reviews table uses the business_id schema (008).
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'business_id'
  ) THEN
    INSERT INTO public.reviews (business_id, user_id, rating, review_text)
    VALUES (v_business, v_owner, 5, 'Great coffee and friendly staff!')
    ON CONFLICT (business_id, user_id) DO NOTHING;
  END IF;
END $$;
