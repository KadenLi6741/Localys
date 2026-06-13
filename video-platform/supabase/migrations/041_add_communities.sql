-- Communities + community threads.
-- Apply this (supabase db push, or run in the SQL editor) then reload the
-- PostgREST schema cache (Dashboard → API → "Reload schema", or
-- NOTIFY pgrst, 'reload schema';). After it's applied, threads can be linked
-- to a community via shoutouts.community_id.

-- 1) Communities table
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 1 AND 24),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
  description TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities (slug);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view communities"
  ON communities FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- 2) Link threads (shoutouts) to a community (nullable = general thread)
ALTER TABLE shoutouts
  ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shoutouts_community ON shoutouts (community_id, created_at DESC);
