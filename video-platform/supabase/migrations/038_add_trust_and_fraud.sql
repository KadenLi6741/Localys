-- Trust metrics: last_active on profiles, spam tracking
-- 1. Add last_active_at column to profiles for "Last active X ago" display
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_last_active
  ON profiles (last_active_at DESC);

-- 2. Spam / fraud flags table for tracking flagged content
CREATE TABLE IF NOT EXISTS content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_type TEXT NOT NULL CHECK (flag_type IN ('duplicate_listing', 'spam_review', 'fake_account', 'rate_limit')),
  target_type TEXT NOT NULL CHECK (target_type IN ('menu_item', 'review', 'profile', 'video')),
  target_id UUID NOT NULL,
  flagged_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_content_flags_status ON content_flags (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_flags_user ON content_flags (flagged_user_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_target ON content_flags (target_type, target_id);

-- RLS for content_flags (admin readable, system insertable)
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert flags"
  ON content_flags FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own flags"
  ON content_flags FOR SELECT
  USING (auth.uid() = flagged_user_id);

-- 3. Rate limit tracking for spam detection
CREATE TABLE IF NOT EXISTS user_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('review', 'question', 'message', 'listing')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action
  ON user_rate_limits (user_id, action_type, created_at DESC);

ALTER TABLE user_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits"
  ON user_rate_limits FOR ALL
  USING (true);
