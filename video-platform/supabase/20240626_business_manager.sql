-- ================================================================
-- Business Manager: info fields, group orders, scheduled orders,
-- seller promo codes
-- ================================================================

-- ── Part 1: Business contact info ────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone      TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address    TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS misc_info  TEXT;

-- ── Part 3: Group orders ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id   UUID NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'placed', 'cancelled')),
  join_code   TEXT UNIQUE NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id   UUID NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name        TEXT,
  item_id          TEXT NOT NULL,
  item_name        TEXT NOT NULL,
  price            NUMERIC NOT NULL,
  quantity         INT NOT NULL DEFAULT 1,
  special_requests TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Part 4: Scheduled + group-tagged orders ───────────────────────
ALTER TABLE item_purchases ADD COLUMN IF NOT EXISTS scheduled_at    TIMESTAMPTZ;
ALTER TABLE item_purchases ADD COLUMN IF NOT EXISTS group_order_id  UUID;

-- ── Part 5: Seller promo codes ────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  discount_type   TEXT NOT NULL DEFAULT 'percent'
                    CHECK (discount_type IN ('percent', 'fixed')),
  discount_value  NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses        INT,
  used_count      INT NOT NULL DEFAULT 0,
  expiry_date     DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (seller_id, code)
);

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE group_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes       ENABLE ROW LEVEL SECURITY;

-- group_orders
DROP POLICY IF EXISTS "go_select"  ON group_orders;
DROP POLICY IF EXISTS "go_insert"  ON group_orders;
DROP POLICY IF EXISTS "go_update"  ON group_orders;

CREATE POLICY "go_select"
  ON group_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "go_insert"
  ON group_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "go_update"
  ON group_orders FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = seller_id);

-- group_order_items
DROP POLICY IF EXISTS "goi_select" ON group_order_items;
DROP POLICY IF EXISTS "goi_insert" ON group_order_items;
DROP POLICY IF EXISTS "goi_delete" ON group_order_items;

CREATE POLICY "goi_select"
  ON group_order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "goi_insert"
  ON group_order_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goi_delete"
  ON group_order_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- promo_codes
DROP POLICY IF EXISTS "pc_seller_all"     ON promo_codes;
DROP POLICY IF EXISTS "pc_customer_read"  ON promo_codes;

CREATE POLICY "pc_seller_all"
  ON promo_codes FOR ALL TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "pc_customer_read"
  ON promo_codes FOR SELECT TO authenticated
  USING (is_active = true);
