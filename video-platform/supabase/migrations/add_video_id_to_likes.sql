-- Add video_id column to likes table to support liking plain videos (without business_id)
-- Note: This makes business_id optional instead of required

-- First, modify the business_id constraint to allow NULL
ALTER TABLE public.likes 
  DROP CONSTRAINT IF EXISTS likes_business_id_fkey CASCADE;

ALTER TABLE public.likes
  ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES videos(id) ON DELETE CASCADE;

-- Re-add the business_id foreign key (now allowing NULL)
ALTER TABLE public.likes
  ADD CONSTRAINT likes_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_likes_video ON public.likes(video_id);
CREATE INDEX IF NOT EXISTS idx_likes_business ON public.likes(business_id);

-- Create unique constraints for both types
CREATE UNIQUE INDEX IF NOT EXISTS uq_likes_user_business ON public.likes(user_id, business_id) WHERE business_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_likes_user_video ON public.likes(user_id, video_id) WHERE video_id IS NOT NULL;

-- Add check constraint to ensure at least one of business_id or video_id is present
ALTER TABLE public.likes
  ADD CONSTRAINT likes_has_target CHECK (
    (business_id IS NOT NULL) OR (video_id IS NOT NULL)
  );

-- Ensure RLS is enabled
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
