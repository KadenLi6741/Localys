-- Add video view tracking system
-- This migration adds view count tracking to videos

-- Add view_count column to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create video_views table to track individual views
-- (useful for preventing duplicate counts and getting analytics)
CREATE TABLE IF NOT EXISTS public.video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON public.video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user_id ON public.video_views(user_id);
CREATE INDEX IF NOT EXISTS idx_video_views_created_at ON public.video_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_views_video_id_user_id ON public.video_views(video_id, user_id);

-- Enable RLS on video_views
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can insert a view record (anonymous or logged in)
CREATE POLICY "Anyone can record a video view"
  ON public.video_views
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Anyone can read view records
CREATE POLICY "Video views are readable by everyone"
  ON public.video_views
  FOR SELECT
  USING (true);

-- Create function to safely increment video view count
CREATE OR REPLACE FUNCTION public.increment_video_view_count(
  p_video_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_view_record_id UUID;
BEGIN
  -- Check if this user/IP has already viewed this video in the last 1 hour
  -- (prevents spam/duplicate counts)
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_view_record_id
    FROM public.video_views
    WHERE video_id = p_video_id
      AND user_id = p_user_id
      AND created_at > NOW() - INTERVAL '1 hour'
    LIMIT 1;
    
    IF v_view_record_id IS NOT NULL THEN
      RETURN false; -- Already viewed recently
    END IF;
  ELSIF p_ip_address IS NOT NULL THEN
    SELECT id INTO v_view_record_id
    FROM public.video_views
    WHERE video_id = p_video_id
      AND ip_address = p_ip_address
      AND created_at > NOW() - INTERVAL '1 hour'
    LIMIT 1;
    
    IF v_view_record_id IS NOT NULL THEN
      RETURN false; -- Already viewed recently
    END IF;
  END IF;
  
  -- Record the view
  INSERT INTO public.video_views (video_id, user_id, ip_address)
  VALUES (p_video_id, p_user_id, p_ip_address);
  
  -- Increment the video's view count
  UPDATE public.videos
  SET view_count = view_count + 1
  WHERE id = p_video_id;
  
  RETURN true; -- View counted successfully
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.increment_video_view_count(UUID, UUID, TEXT) TO authenticated, anon;
