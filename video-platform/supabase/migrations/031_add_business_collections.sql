-- =====================================================
-- Business Collections
-- =====================================================
-- Public, shareable lists of business profiles with likes.
-- Collection items reference public.profiles(id) because this app already
-- treats business accounts as profile records with type food/retail/service.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.business_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  image_class TEXT DEFAULT 'from-[#39302A] via-[#82643D] to-[#E1BE76]',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_collections_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT business_collections_title_length CHECK (char_length(trim(title)) BETWEEN 3 AND 120),
  CONSTRAINT business_collections_description_length CHECK (description IS NULL OR char_length(description) <= 500)
);

CREATE TABLE IF NOT EXISTS public.business_collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES public.business_collections(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_collection_items_unique_business UNIQUE (collection_id, business_id),
  CONSTRAINT business_collection_items_note_length CHECK (note IS NULL OR char_length(note) <= 280)
);

CREATE TABLE IF NOT EXISTS public.business_collection_likes (
  collection_id UUID NOT NULL REFERENCES public.business_collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_collections_public_created
  ON public.business_collections(is_public, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_collections_owner
  ON public.business_collections(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_collection_items_collection_sort
  ON public.business_collection_items(collection_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_business_collection_items_business
  ON public.business_collection_items(business_id);

CREATE INDEX IF NOT EXISTS idx_business_collection_likes_user
  ON public.business_collection_likes(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_collections_updated_at ON public.business_collections;
CREATE TRIGGER business_collections_updated_at
  BEFORE UPDATE ON public.business_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.business_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_collection_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read public business collections" ON public.business_collections;
CREATE POLICY "Public can read public business collections"
  ON public.business_collections
  FOR SELECT
  USING (is_public = TRUE OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own business collections" ON public.business_collections;
CREATE POLICY "Users can create their own business collections"
  ON public.business_collections
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own business collections" ON public.business_collections;
CREATE POLICY "Users can update their own business collections"
  ON public.business_collections
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own business collections" ON public.business_collections;
CREATE POLICY "Users can delete their own business collections"
  ON public.business_collections
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Public can read public business collection items" ON public.business_collection_items;
CREATE POLICY "Public can read public business collection items"
  ON public.business_collection_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_collections c
      WHERE c.id = business_collection_items.collection_id
        AND (c.is_public = TRUE OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Collection owners can add items" ON public.business_collection_items;
CREATE POLICY "Collection owners can add items"
  ON public.business_collection_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.business_collections c
      WHERE c.id = business_collection_items.collection_id
        AND c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Collection owners can update items" ON public.business_collection_items;
CREATE POLICY "Collection owners can update items"
  ON public.business_collection_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_collections c
      WHERE c.id = business_collection_items.collection_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.business_collections c
      WHERE c.id = business_collection_items.collection_id
        AND c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Collection owners can delete items" ON public.business_collection_items;
CREATE POLICY "Collection owners can delete items"
  ON public.business_collection_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_collections c
      WHERE c.id = business_collection_items.collection_id
        AND c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read collection likes" ON public.business_collection_likes;
CREATE POLICY "Authenticated users can read collection likes"
  ON public.business_collection_likes
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Users can like collections as themselves" ON public.business_collection_likes;
CREATE POLICY "Users can like collections as themselves"
  ON public.business_collection_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.business_collections c
      WHERE c.id = business_collection_likes.collection_id
        AND c.is_public = TRUE
    )
  );

DROP POLICY IF EXISTS "Users can unlike collections as themselves" ON public.business_collection_likes;
CREATE POLICY "Users can unlike collections as themselves"
  ON public.business_collection_likes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE VIEW public.business_collection_stats AS
SELECT
  c.id,
  c.slug,
  c.title,
  c.owner_id,
  c.is_public,
  COUNT(DISTINCT i.business_id) AS businesses_count,
  COUNT(DISTINCT l.user_id) AS likes_count
FROM public.business_collections c
LEFT JOIN public.business_collection_items i ON i.collection_id = c.id
LEFT JOIN public.business_collection_likes l ON l.collection_id = c.id
GROUP BY c.id;

-- Optional seed data. Replace the owner_id placeholders with an existing
-- profile id before running, or create collections through the app/admin SQL.
--
-- INSERT INTO public.business_collections (owner_id, slug, title, description, image_class)
-- VALUES
--   ('00000000-0000-0000-0000-000000000000', 'best-study-cafes', 'Best study cafes', 'Quiet tables, reliable coffee, and a good rhythm for getting work done.', 'from-[#39302A] via-[#82643D] to-[#E1BE76]'),
--   ('00000000-0000-0000-0000-000000000000', 'hidden-gems', 'Hidden gems', 'Small spots locals keep recommending after one good visit.', 'from-[#234338] via-[#6BAF7A] to-[#D7E9D2]'),
--   ('00000000-0000-0000-0000-000000000000', 'weekend-markets', 'Weekend markets', 'Markets, pop-ups, and maker-friendly stops for a slower weekend loop.', 'from-[#A65F25] via-[#F5A623] to-[#F5D496]');
--
-- INSERT INTO public.business_collection_items (collection_id, business_id, note, sort_order)
-- SELECT c.id, p.id, 'Why this business belongs in the collection.', 1
-- FROM public.business_collections c
-- JOIN public.profiles p ON p.type IN ('food', 'retail', 'service')
-- WHERE c.slug = 'best-study-cafes'
-- LIMIT 1;
