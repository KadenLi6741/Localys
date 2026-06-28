-- =============================================================
-- Localys — Row Level Security Policies
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor).
--
-- IMPORTANT BEFORE RUNNING:
--   1. Verify uncertain column names below (marked with ⚠️) against
--      your Supabase Table Editor. Wrong names create policies that
--      silently block all access.
--   2. Test on a staging project first if possible.
--   3. Routes that use SUPABASE_SERVICE_ROLE_KEY bypass RLS automatically
--      — those are: webhooks/stripe, orders/complete, verify-purchase,
--      verify-item-purchase, checkout-item (coupon lookup).
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Enable RLS on every table
-- ---------------------------------------------------------------
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_bookmarks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coupons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_purchases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_purchases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports            ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 2. Profiles — public read, owner update
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "profiles: public read" ON public.profiles;
CREATE POLICY "profiles: public read"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "profiles: owner update" ON public.profiles;
CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------
-- 3. Videos — public read, owner write
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "videos: public read" ON public.videos;
CREATE POLICY "videos: public read"
  ON public.videos FOR SELECT USING (true);

DROP POLICY IF EXISTS "videos: owner insert" ON public.videos;
CREATE POLICY "videos: owner insert"
  ON public.videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "videos: owner update" ON public.videos;
CREATE POLICY "videos: owner update"
  ON public.videos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "videos: owner delete" ON public.videos;
CREATE POLICY "videos: owner delete"
  ON public.videos FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 4. Comments — public read, auth insert, owner delete
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "comments: public read" ON public.comments;
CREATE POLICY "comments: public read"
  ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "comments: auth insert" ON public.comments;
CREATE POLICY "comments: auth insert"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments: owner delete" ON public.comments;
CREATE POLICY "comments: owner delete"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 5. Comment likes
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "comment_likes: public read" ON public.comment_likes;
CREATE POLICY "comment_likes: public read"
  ON public.comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "comment_likes: auth insert" ON public.comment_likes;
CREATE POLICY "comment_likes: auth insert"
  ON public.comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comment_likes: owner delete" ON public.comment_likes;
CREATE POLICY "comment_likes: owner delete"
  ON public.comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 6. Likes (video/business likes)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "likes: public read" ON public.likes;
CREATE POLICY "likes: public read"
  ON public.likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "likes: auth insert" ON public.likes;
CREATE POLICY "likes: auth insert"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "likes: owner delete" ON public.likes;
CREATE POLICY "likes: owner delete"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 7. Video bookmarks — owner only
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "video_bookmarks: owner all" ON public.video_bookmarks;
CREATE POLICY "video_bookmarks: owner all"
  ON public.video_bookmarks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 8. Video views — public read, anon insert (for view counting)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "video_views: public read" ON public.video_views;
CREATE POLICY "video_views: public read"
  ON public.video_views FOR SELECT USING (true);

DROP POLICY IF EXISTS "video_views: anon insert" ON public.video_views;
CREATE POLICY "video_views: anon insert"
  ON public.video_views FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------
-- 9. Businesses — public read, owner write
-- ⚠️ Verify column name: assumes `user_id` on businesses table
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "businesses: public read" ON public.businesses;
CREATE POLICY "businesses: public read"
  ON public.businesses FOR SELECT USING (true);

DROP POLICY IF EXISTS "businesses: owner insert" ON public.businesses;
CREATE POLICY "businesses: owner insert"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);  -- ⚠️ confirm column name

DROP POLICY IF EXISTS "businesses: owner update" ON public.businesses;
CREATE POLICY "businesses: owner update"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = user_id);  -- ⚠️ confirm column name

DROP POLICY IF EXISTS "businesses: owner delete" ON public.businesses;
CREATE POLICY "businesses: owner delete"
  ON public.businesses FOR DELETE
  USING (auth.uid() = user_id);  -- ⚠️ confirm column name

-- ---------------------------------------------------------------
-- 10. Business locations — public read, owner write
-- ⚠️ Verify join column: assumes business_locations.business_id -> businesses.id
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "business_locations: public read" ON public.business_locations;
CREATE POLICY "business_locations: public read"
  ON public.business_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "business_locations: owner insert" ON public.business_locations;
CREATE POLICY "business_locations: owner insert"
  ON public.business_locations FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.businesses WHERE id = business_id)
  );

DROP POLICY IF EXISTS "business_locations: owner update" ON public.business_locations;
CREATE POLICY "business_locations: owner update"
  ON public.business_locations FOR UPDATE
  USING (
    auth.uid() = (SELECT user_id FROM public.businesses WHERE id = business_id)
  );

-- ---------------------------------------------------------------
-- 11. Menus — public read, business owner write
-- ⚠️ Verify join column: assumes menus.business_id -> businesses.id
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "menus: public read" ON public.menus;
CREATE POLICY "menus: public read"
  ON public.menus FOR SELECT USING (true);

DROP POLICY IF EXISTS "menus: owner insert" ON public.menus;
CREATE POLICY "menus: owner insert"
  ON public.menus FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.businesses WHERE id = business_id)
  );

DROP POLICY IF EXISTS "menus: owner update" ON public.menus;
CREATE POLICY "menus: owner update"
  ON public.menus FOR UPDATE
  USING (
    auth.uid() = (SELECT user_id FROM public.businesses WHERE id = business_id)
  );

DROP POLICY IF EXISTS "menus: owner delete" ON public.menus;
CREATE POLICY "menus: owner delete"
  ON public.menus FOR DELETE
  USING (
    auth.uid() = (SELECT user_id FROM public.businesses WHERE id = business_id)
  );

-- ---------------------------------------------------------------
-- 12. Menu items — public read, business owner write
-- ⚠️ Verify join: menu_items.menu_id -> menus.business_id -> businesses.user_id
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "menu_items: public read" ON public.menu_items;
CREATE POLICY "menu_items: public read"
  ON public.menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "menu_items: owner insert" ON public.menu_items;
CREATE POLICY "menu_items: owner insert"
  ON public.menu_items FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT b.user_id FROM public.businesses b
      JOIN public.menus m ON m.business_id = b.id
      WHERE m.id = menu_id
    )
  );

DROP POLICY IF EXISTS "menu_items: owner update" ON public.menu_items;
CREATE POLICY "menu_items: owner update"
  ON public.menu_items FOR UPDATE
  USING (
    auth.uid() = (
      SELECT b.user_id FROM public.businesses b
      JOIN public.menus m ON m.business_id = b.id
      WHERE m.id = menu_id
    )
  );

DROP POLICY IF EXISTS "menu_items: owner delete" ON public.menu_items;
CREATE POLICY "menu_items: owner delete"
  ON public.menu_items FOR DELETE
  USING (
    auth.uid() = (
      SELECT b.user_id FROM public.businesses b
      JOIN public.menus m ON m.business_id = b.id
      WHERE m.id = menu_id
    )
  );

-- ---------------------------------------------------------------
-- 13. Chats — only members can read
-- ⚠️ Assumes chat_members table has (chat_id, user_id) columns
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "chats: members read" ON public.chats;
CREATE POLICY "chats: members read"
  ON public.chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chats: auth insert" ON public.chats;
CREATE POLICY "chats: auth insert"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 14. Chat members — only members can see membership
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "chat_members: members read" ON public.chat_members;
CREATE POLICY "chat_members: members read"
  ON public.chat_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chat_id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_members: auth insert" ON public.chat_members;
CREATE POLICY "chat_members: auth insert"
  ON public.chat_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 15. Messages — only chat participants can read/send
-- ⚠️ Verify column names: assumes messages.chat_id and messages.sender_id
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "messages: members read" ON public.messages;
CREATE POLICY "messages: members read"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chat_id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages: members insert" ON public.messages;
CREATE POLICY "messages: members insert"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND  -- ⚠️ confirm column name
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chat_id AND cm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- 16. Conversations
-- ⚠️ Verify column names: assumes participant_one and participant_two
--    If schema uses a participants join table, rewrite accordingly.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "conversations: participants read" ON public.conversations;
CREATE POLICY "conversations: participants read"
  ON public.conversations FOR SELECT
  USING (
    auth.uid() = participant_one OR auth.uid() = participant_two  -- ⚠️ confirm column names
  );

DROP POLICY IF EXISTS "conversations: auth insert" ON public.conversations;
CREATE POLICY "conversations: auth insert"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 17. Coupons — public read, seller write
-- ⚠️ Verify column name: assumes coupons.seller_id (or owner_id)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "coupons: public read" ON public.coupons;
CREATE POLICY "coupons: public read"
  ON public.coupons FOR SELECT USING (true);

DROP POLICY IF EXISTS "coupons: seller insert" ON public.coupons;
CREATE POLICY "coupons: seller insert"
  ON public.coupons FOR INSERT
  WITH CHECK (auth.uid() = seller_id);  -- ⚠️ confirm column name

DROP POLICY IF EXISTS "coupons: seller update" ON public.coupons;
CREATE POLICY "coupons: seller update"
  ON public.coupons FOR UPDATE
  USING (auth.uid() = seller_id);  -- ⚠️ confirm column name

-- ---------------------------------------------------------------
-- 18. User coupons — owner read only
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "user_coupons: owner read" ON public.user_coupons;
CREATE POLICY "user_coupons: owner read"
  ON public.user_coupons FOR SELECT
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 19. Financial records — no INSERT/UPDATE policy for anon/authed.
--     Only SUPABASE_SERVICE_ROLE_KEY writes these (bypasses RLS).
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "coin_purchases: owner read" ON public.coin_purchases;
CREATE POLICY "coin_purchases: owner read"
  ON public.coin_purchases FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "item_purchases: buyer or seller read" ON public.item_purchases;
CREATE POLICY "item_purchases: buyer or seller read"
  ON public.item_purchases FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ---------------------------------------------------------------
-- 20. Follows — public read, owner write
-- ⚠️ Verify column name: assumes follows.follower_id
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "follows: public read" ON public.follows;
CREATE POLICY "follows: public read"
  ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "follows: owner insert" ON public.follows;
CREATE POLICY "follows: owner insert"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);  -- ⚠️ confirm column name

DROP POLICY IF EXISTS "follows: owner delete" ON public.follows;
CREATE POLICY "follows: owner delete"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);  -- ⚠️ confirm column name

-- ---------------------------------------------------------------
-- 21. Promotion history — owner read only
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "promotion_history: owner read" ON public.promotion_history;
CREATE POLICY "promotion_history: owner read"
  ON public.promotion_history FOR SELECT
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 22. Reports — authenticated insert only; no SELECT for anyone
--     (admins read via service role)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "reports: auth insert" ON public.reports;
CREATE POLICY "reports: auth insert"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================
-- Done. Verify with:
--   SET ROLE anon;
--   SELECT * FROM coin_purchases; -- should return 0 rows
--   SELECT * FROM profiles LIMIT 5; -- should return rows
-- =============================================================
