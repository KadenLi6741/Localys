-- Search History: stores recent user searches for quick recall
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL CHECK (char_length(trim(search_query)) >= 1 AND char_length(search_query) <= 200),
  search_mode TEXT NOT NULL DEFAULT 'businesses' CHECK (search_mode IN ('businesses', 'videos')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by user, ordered by recency
CREATE INDEX IF NOT EXISTS idx_search_history_user_recent
  ON search_history (user_id, created_at DESC);

-- Unique constraint: same user + same query + same mode collapses (upsert pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_history_unique_query
  ON search_history (user_id, lower(trim(search_query)), search_mode);

-- RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own search history
CREATE POLICY "Users can view own search history"
  ON search_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own search history
CREATE POLICY "Users can insert own search history"
  ON search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own search history
CREATE POLICY "Users can delete own search history"
  ON search_history FOR DELETE
  USING (auth.uid() = user_id);

-- Users can update their own search history (for upsert / timestamp refresh)
CREATE POLICY "Users can update own search history"
  ON search_history FOR UPDATE
  USING (auth.uid() = user_id);
