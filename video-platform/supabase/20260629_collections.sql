-- ================================================================
-- Localy Lists: user-curated sets of restaurants, where each
-- restaurant can carry a shareable "order combo" (title, text,
-- chosen items, photos). A list can be posted to the homepage.
--
-- - `collections`        one curated list (owner, title, cover, posted flag)
-- - `collection_entries` a restaurant in a list + its order combo
-- - `collection_likes`   per-user like on a list; a trigger keeps
--                        `collections.like_count` in sync
--
-- Restaurants are referenced by their manifest `store_slug` (the same
-- key used by store_allergens) rather than a hard FK, so demo-only
-- stores with no profile row can still be curated. Display fields are
-- denormalized onto the entry so the homepage row needs no joins.
-- ================================================================

-- ── A curated list ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name     TEXT,                       -- denormalized for display
  title           TEXT NOT NULL,
  description     TEXT,
  cover_image_url TEXT,
  is_posted       BOOLEAN NOT NULL DEFAULT false,
  like_count      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS collections_user_idx   ON collections (user_id);
CREATE INDEX IF NOT EXISTS collections_posted_idx ON collections (is_posted, created_at DESC);

-- ── A restaurant in a list + its order combo ──────────────────────
CREATE TABLE IF NOT EXISTS collection_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id        UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  store_slug           TEXT NOT NULL,          -- manifest slug / restaurant key
  restaurant_name      TEXT NOT NULL,          -- denormalized
  restaurant_image_url TEXT,                   -- denormalized
  combo_title          TEXT,
  combo_body           TEXT,
  combo_price          NUMERIC,                -- total price of the combo
  combo_serves         INT,                    -- how many people it feeds
  combo_items          JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ name, price }]
  combo_image_urls     TEXT[] NOT NULL DEFAULT '{}',
  sort_order           INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (collection_id, store_slug)
);

CREATE INDEX IF NOT EXISTS collection_entries_collection_idx
  ON collection_entries (collection_id);

-- Idempotent add for environments where the table was created before these
-- combo fields existed.
ALTER TABLE collection_entries ADD COLUMN IF NOT EXISTS combo_price  NUMERIC;
ALTER TABLE collection_entries ADD COLUMN IF NOT EXISTS combo_serves INT;

-- ── Per-user likes on a list ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_likes (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_id, user_id)
);

-- Keep collections.like_count in sync with collection_likes rows.
CREATE OR REPLACE FUNCTION sync_collection_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE collections SET like_count = like_count + 1 WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE collections SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS collection_likes_count ON collection_likes;
CREATE TRIGGER collection_likes_count
  AFTER INSERT OR DELETE ON collection_likes
  FOR EACH ROW EXECUTE FUNCTION sync_collection_like_count();

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE collections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_likes   ENABLE ROW LEVEL SECURITY;

-- collections: posted lists are world-readable (homepage, signed out too);
-- a user always sees their own; writes are owner-only.
DROP POLICY IF EXISTS "collections: read posted or own" ON collections;
CREATE POLICY "collections: read posted or own"
  ON collections FOR SELECT
  USING (is_posted OR auth.uid() = user_id);

DROP POLICY IF EXISTS "collections: insert own" ON collections;
CREATE POLICY "collections: insert own"
  ON collections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "collections: update own" ON collections;
CREATE POLICY "collections: update own"
  ON collections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "collections: delete own" ON collections;
CREATE POLICY "collections: delete own"
  ON collections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- collection_entries: visible when the parent list is; writable when the
-- parent list is owned by the caller.
DROP POLICY IF EXISTS "entries: read with parent" ON collection_entries;
CREATE POLICY "entries: read with parent"
  ON collection_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_id AND (c.is_posted OR c.user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "entries: write with owned parent" ON collection_entries;
CREATE POLICY "entries: write with owned parent"
  ON collection_entries FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_id AND c.user_id = auth.uid()
  ));

-- collection_likes: counts are world-readable; a user manages only their own like.
DROP POLICY IF EXISTS "likes: public read" ON collection_likes;
CREATE POLICY "likes: public read"
  ON collection_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "likes: insert own" ON collection_likes;
CREATE POLICY "likes: insert own"
  ON collection_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "likes: delete own" ON collection_likes;
CREATE POLICY "likes: delete own"
  ON collection_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
