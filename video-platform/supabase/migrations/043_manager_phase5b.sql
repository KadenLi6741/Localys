-- =============================================================================
-- 043_manager_phase5b.sql  —  Phase 5B: Localys Manager data layer
-- -----------------------------------------------------------------------------
-- Adds the ONE genuinely-new table Phase 5B needs (review_replies) so a business
-- owner can reply to their customers' reviews, with owner-only RLS. Then seeds
-- demo data (orders, an extra review, a reply, two threads) onto the demo
-- business so the Manager's sections are not empty for the competition demo.
--
-- ADDITIVE + IDEMPOTENT + GUARDED — safe to run (and re-run) on the live schema.
--
-- HOW TO RUN:
--   1. Open Supabase → SQL Editor → paste this whole file.
--   2. Make sure OWNER_USER_ID below is your auth user id (same one used in 042).
--      Find it with:  select id, email from auth.users order by created_at;
--   3. Run.  (If you leave the placeholder, the demo seed self-skips cleanly;
--      the review_replies table + RLS still get created.)
-- =============================================================================

-- 1) review_replies — a business owner's reply to a customer review ------------
CREATE TABLE IF NOT EXISTS public.review_replies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reply_text  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist even if the table pre-existed in some form.
ALTER TABLE public.review_replies ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.review_replies ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.review_replies ADD COLUMN IF NOT EXISTS reply_text TEXT;
ALTER TABLE public.review_replies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- One reply per review (an owner answers each review once).
CREATE UNIQUE INDEX IF NOT EXISTS review_replies_review_id_unique ON public.review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_business_id ON public.review_replies(business_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_owner_id ON public.review_replies(owner_id);

-- 2) RLS: anyone can READ replies (customers see them); only the business owner
--    can WRITE, and only under a business they actually own. --------------------
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_replies_select" ON public.review_replies;
CREATE POLICY "review_replies_select" ON public.review_replies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "review_replies_insert_own" ON public.review_replies;
CREATE POLICY "review_replies_insert_own" ON public.review_replies
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = review_replies.business_id AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "review_replies_update_own" ON public.review_replies;
CREATE POLICY "review_replies_update_own" ON public.review_replies
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "review_replies_delete_own" ON public.review_replies;
CREATE POLICY "review_replies_delete_own" ON public.review_replies
  FOR DELETE USING (auth.uid() = owner_id);

-- 3) Make sure item_purchases allows the statuses the app uses (idempotent) ----
ALTER TABLE public.item_purchases DROP CONSTRAINT IF EXISTS item_purchases_status_check;
ALTER TABLE public.item_purchases ADD CONSTRAINT item_purchases_status_check
  CHECK (status IN ('pending', 'paid', 'completed', 'failed', 'cancelled'));

-- 4) DEMO SEED ----------------------------------------------------------------
-- Populates the demo business so Dashboard / Orders / Feedback / Content are not
-- empty. Guarded (TEXT check BEFORE any uuid cast) + idempotent.
DO $$
DECLARE
  v_owner_text TEXT := 'cc0f8539-c58a-48c1-ba49-42f846a608b3';  -- <-- your auth user id (same as 042)
  v_owner      UUID;
  v_buyer      UUID;
  v_reviewer   UUID;
  v_business   UUID;
  v_item1_id   UUID; v_item1_name TEXT; v_item1_price NUMERIC;
  v_item2_id   UUID; v_item2_name TEXT; v_item2_price NUMERIC;
  v_review     UUID;
  v_has_business_id BOOLEAN;
  v_has_item_id     BOOLEAN;
BEGIN
  IF v_owner_text IS NULL OR v_owner_text = 'OWNER_USER_ID' THEN
    RAISE NOTICE 'Skipping demo seed: set OWNER_USER_ID first.';
    RETURN;
  END IF;
  v_owner := v_owner_text::uuid;

  -- the demo business (prefer the named one, else any business this user owns)
  SELECT id INTO v_business FROM public.businesses
   WHERE owner_id = v_owner AND business_name = 'Localys Demo Café' LIMIT 1;
  IF v_business IS NULL THEN
    SELECT id INTO v_business FROM public.businesses WHERE owner_id = v_owner
     ORDER BY created_at LIMIT 1;
  END IF;
  IF v_business IS NULL THEN
    RAISE NOTICE 'Skipping demo seed: no business found for this owner (run 042 first).';
    RETURN;
  END IF;

  -- a buyer/reviewer that is NOT the owner if one exists, else fall back to owner
  SELECT id INTO v_buyer FROM public.profiles WHERE id <> v_owner LIMIT 1;
  v_buyer := COALESCE(v_buyer, v_owner);
  v_reviewer := v_buyer;

  -- the owner's first two menu items (for orders/reviews)
  SELECT id, item_name, price INTO v_item1_id, v_item1_name, v_item1_price
    FROM public.menu_items WHERE user_id = v_owner ORDER BY created_at LIMIT 1;
  SELECT id, item_name, price INTO v_item2_id, v_item2_name, v_item2_price
    FROM public.menu_items WHERE user_id = v_owner ORDER BY created_at OFFSET 1 LIMIT 1;

  -- 4a) demo orders ----------------------------------------------------------
  IF v_item1_id IS NOT NULL THEN
    INSERT INTO public.item_purchases
      (item_id, seller_id, buyer_id, item_name, price, stripe_session_id, status, purchased_at)
    SELECT v_item1_id, v_owner, v_buyer, v_item1_name, v_item1_price,
           'demo_seed_order_1', 'completed', now() - interval '2 days'
    WHERE NOT EXISTS (SELECT 1 FROM public.item_purchases WHERE stripe_session_id = 'demo_seed_order_1');

    INSERT INTO public.item_purchases
      (item_id, seller_id, buyer_id, item_name, price, stripe_session_id, status, purchased_at, verification_token)
    SELECT v_item1_id, v_owner, v_buyer, v_item1_name, v_item1_price,
           'demo_seed_order_3', 'paid', now() - interval '3 hours', 'DEMO-TOKEN-3'
    WHERE NOT EXISTS (SELECT 1 FROM public.item_purchases WHERE stripe_session_id = 'demo_seed_order_3');
  END IF;

  IF v_item2_id IS NOT NULL THEN
    INSERT INTO public.item_purchases
      (item_id, seller_id, buyer_id, item_name, price, stripe_session_id, status, purchased_at)
    SELECT v_item2_id, v_owner, v_buyer, v_item2_name, v_item2_price,
           'demo_seed_order_2', 'completed', now() - interval '1 day'
    WHERE NOT EXISTS (SELECT 1 FROM public.item_purchases WHERE stripe_session_id = 'demo_seed_order_2');
  END IF;

  -- which reviews schema is live? (008 = business_id, 035 = item_id)
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='reviews' AND column_name='business_id')
    INTO v_has_business_id;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='reviews' AND column_name='item_id')
    INTO v_has_item_id;

  -- 4b) ensure at least one review exists for this business ------------------
  IF v_has_business_id THEN
    INSERT INTO public.reviews (business_id, user_id, rating, review_text)
    SELECT v_business, v_reviewer, 5, 'Great coffee and friendly staff!'
    WHERE NOT EXISTS (SELECT 1 FROM public.reviews WHERE business_id = v_business AND user_id = v_reviewer);
    SELECT id INTO v_review FROM public.reviews WHERE business_id = v_business ORDER BY created_at LIMIT 1;
  ELSIF v_has_item_id AND v_item1_id IS NOT NULL THEN
    INSERT INTO public.reviews (item_id, user_id, content, rating)
    SELECT v_item1_id, v_reviewer, 'Lovely spot — the flat white is excellent!', 5
    WHERE NOT EXISTS (SELECT 1 FROM public.reviews WHERE item_id = v_item1_id AND user_id = v_reviewer);
    SELECT id INTO v_review FROM public.reviews WHERE item_id = v_item1_id ORDER BY created_at LIMIT 1;
  END IF;

  -- 4c) demo owner reply to that review -------------------------------------
  IF v_review IS NOT NULL THEN
    INSERT INTO public.review_replies (review_id, business_id, owner_id, reply_text)
    SELECT v_review, v_business, v_owner, 'Thank you so much for the kind words — see you again soon!'
    WHERE NOT EXISTS (SELECT 1 FROM public.review_replies WHERE review_id = v_review);
  END IF;

  -- 4d) demo threads (shoutouts) for the Content section --------------------
  -- NOTE: shoutouts.business_id FK -> profiles(id) (the legacy profile-as-business
  -- model), NOT businesses(id). So use the owner's profile id (v_owner) here.
  INSERT INTO public.shoutouts (user_id, business_name, business_id, text, star_rating)
  SELECT v_owner, 'Localys Demo Café', v_owner, 'Fresh batch of almond croissants just came out of the oven!', 5
  WHERE NOT EXISTS (
    SELECT 1 FROM public.shoutouts WHERE user_id = v_owner AND text LIKE 'Fresh batch of almond croissants%'
  );

  INSERT INTO public.shoutouts (user_id, business_name, business_id, text, star_rating)
  SELECT v_owner, 'Localys Demo Café', v_owner, 'New seasonal menu drops this weekend — come say hi!', 5
  WHERE NOT EXISTS (
    SELECT 1 FROM public.shoutouts WHERE user_id = v_owner AND text LIKE 'New seasonal menu drops%'
  );
END $$;
