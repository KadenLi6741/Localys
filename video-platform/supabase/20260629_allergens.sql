-- ================================================================
-- Allergens: common-allergen reference list, per-store allergen
-- tags (curated), and per-user allergy selections.
--
-- - `allergens`        reference table of the common allergens (public read)
-- - `store_allergens`  which allergens a store contains, keyed by the manifest
--                      store slug (public read). Curated for the demo
--                      restaurants; the app auto-detects allergens for any
--                      store not listed here (see lib/allergens.ts).
-- - `user_allergies`   each user's selected allergies (RLS: own rows only)
-- ================================================================

-- ── Reference: common allergens (FDA "Big 9", gluten labelled for clarity) ──
CREATE TABLE IF NOT EXISTS allergens (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  icon        TEXT,            -- emoji shown in chips/badges
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0
);

INSERT INTO allergens (key, label, icon, description, sort_order) VALUES
  ('milk',      'Milk / Dairy', '🥛', 'Milk, cheese, butter, cream, yogurt',        1),
  ('eggs',      'Eggs',         '🥚', 'Eggs and egg-based items (mayo, custard)',   2),
  ('peanuts',   'Peanuts',      '🥜', 'Peanuts and peanut-derived sauces',          3),
  ('tree_nuts', 'Tree Nuts',    '🌰', 'Almonds, walnuts, cashews, pecans, etc.',    4),
  ('soy',       'Soy',          '🫘', 'Soy, tofu, edamame, miso, soy sauce',        5),
  ('gluten',    'Gluten / Wheat','🌾', 'Wheat, bread, pasta, batter, breading',     6),
  ('fish',      'Fish',         '🐟', 'Finned fish (salmon, tuna, cod, fish sauce)',7),
  ('shellfish', 'Shellfish',    '🦐', 'Shrimp, crab, lobster, clams, etc.',         8),
  ('sesame',    'Sesame',       '🌱', 'Sesame seeds, tahini, hummus',               9)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label,
      icon = EXCLUDED.icon,
      description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order;

-- ── Per-store allergen tags (keyed by manifest slug) ──────────────
CREATE TABLE IF NOT EXISTS store_allergens (
  store_slug   TEXT NOT NULL,
  allergen_key TEXT NOT NULL REFERENCES allergens(key) ON DELETE CASCADE,
  PRIMARY KEY (store_slug, allergen_key)
);

CREATE INDEX IF NOT EXISTS store_allergens_slug_idx ON store_allergens (store_slug);

-- Curated tags for the demo restaurants. Auto-detection (lib/allergens.ts)
-- covers any store not listed here.
INSERT INTO store_allergens (store_slug, allergen_key) VALUES
  -- Amy's Fish & Chips: battered fish + shrimp + chips
  ('amys-fish-and-chips', 'fish'),
  ('amys-fish-and-chips', 'shellfish'),
  ('amys-fish-and-chips', 'gluten'),
  ('amys-fish-and-chips', 'eggs'),
  -- Holy Smoke Barbecue: buns, BBQ sauce, baked beans
  ('holy-smoke-barbecue', 'gluten'),
  ('holy-smoke-barbecue', 'soy'),
  -- Pho Nga Son: Vietnamese — fish sauce, shrimp, peanut garnish, fried rolls
  ('pho-nga-son', 'fish'),
  ('pho-nga-son', 'shellfish'),
  ('pho-nga-son', 'soy'),
  ('pho-nga-son', 'peanuts'),
  ('pho-nga-son', 'gluten'),
  ('pho-nga-son', 'eggs'),
  -- Jay's Burger: bun, cheese, mayo, sesame bun, pudding
  ('jays-burger', 'gluten'),
  ('jays-burger', 'milk'),
  ('jays-burger', 'eggs'),
  ('jays-burger', 'sesame'),
  ('jays-burger', 'soy')
ON CONFLICT (store_slug, allergen_key) DO NOTHING;

-- ── Per-user allergy selections ───────────────────────────────────
CREATE TABLE IF NOT EXISTS user_allergies (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allergen_key TEXT NOT NULL REFERENCES allergens(key) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, allergen_key)
);

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE allergens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_allergies  ENABLE ROW LEVEL SECURITY;

-- Reference tables: world-readable, no writes from clients.
DROP POLICY IF EXISTS "allergens: public read" ON allergens;
CREATE POLICY "allergens: public read"
  ON allergens FOR SELECT USING (true);

DROP POLICY IF EXISTS "store_allergens: public read" ON store_allergens;
CREATE POLICY "store_allergens: public read"
  ON store_allergens FOR SELECT USING (true);

-- user_allergies: each user manages only their own rows.
DROP POLICY IF EXISTS "user_allergies: select own" ON user_allergies;
CREATE POLICY "user_allergies: select own"
  ON user_allergies FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_allergies: insert own" ON user_allergies;
CREATE POLICY "user_allergies: insert own"
  ON user_allergies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_allergies: delete own" ON user_allergies;
CREATE POLICY "user_allergies: delete own"
  ON user_allergies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
