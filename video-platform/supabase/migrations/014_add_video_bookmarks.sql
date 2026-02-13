-- Create video bookmarks table
CREATE TABLE IF NOT EXISTS public.video_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one bookmark per user per video
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.video_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own bookmarks"
  ON public.video_bookmarks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks for themselves"
  ON public.video_bookmarks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON public.video_bookmarks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_video_bookmarks_user_id ON public.video_bookmarks(user_id);
CREATE INDEX idx_video_bookmarks_video_id ON public.video_bookmarks(video_id);
