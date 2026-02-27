-- Add image_url and rating columns to comments table
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS rating SMALLINT;

-- Add constraint for rating (1-5 stars) - check if constraint doesn't already exist
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.comments
    ADD CONSTRAINT rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
  EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
  END;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS comments_image_url_idx ON public.comments(image_url);
CREATE INDEX IF NOT EXISTS comments_rating_idx ON public.comments(rating);

-- Add comments to explain the fields
COMMENT ON COLUMN public.comments.image_url IS 'Optional URL of an image attached to the comment';
COMMENT ON COLUMN public.comments.rating IS 'Optional star rating (1-5) for the business from the commenter';
