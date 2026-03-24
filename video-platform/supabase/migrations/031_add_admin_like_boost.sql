-- Add admin_like_boost column to videos table for admin mode like persistence
ALTER TABLE videos ADD COLUMN IF NOT EXISTS admin_like_boost INTEGER NOT NULL DEFAULT 0;

-- RPC to atomically increment admin_like_boost
CREATE OR REPLACE FUNCTION increment_admin_like_boost(p_video_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE videos SET admin_like_boost = admin_like_boost + 1 WHERE id = p_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
