-- Add coin system to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coin_balance INTEGER DEFAULT 100;

-- Add promotion fields to videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS boost_value FLOAT DEFAULT 1.0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS coins_spent_on_promotion INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS last_promoted_at TIMESTAMP WITH TIME ZONE;

-- Create promotion history table
CREATE TABLE IF NOT EXISTS public.promotion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  coins_spent INTEGER NOT NULL,
  previous_boost FLOAT NOT NULL,
  new_boost FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on promotion_history
ALTER TABLE public.promotion_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for promotion_history
CREATE POLICY "Users can view their own promotion history"
  ON public.promotion_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create promotion records for their videos"
  ON public.promotion_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_promotion_history_user_id ON public.promotion_history(user_id);
CREATE INDEX idx_promotion_history_video_id ON public.promotion_history(video_id);
CREATE INDEX idx_videos_boost_value ON public.videos(boost_value DESC);
