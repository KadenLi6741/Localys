-- =============================================================
-- Reviews table + trigger to keep businesses.average_rating in sync
-- =============================================================

-- 1. Create the reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, user_id)  -- one review per user per business
);

-- 2. Indexes
CREATE INDEX idx_reviews_business_id ON reviews(business_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- 3. Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "reviews_select" ON reviews
  FOR SELECT USING (true);

-- Users can insert their own review
CREATE POLICY "reviews_insert" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own review
CREATE POLICY "reviews_update" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own review
CREATE POLICY "reviews_delete" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Trigger function to recalculate businesses.average_rating & total_reviews
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
DECLARE
  _business_id UUID;
BEGIN
  _business_id := COALESCE(NEW.business_id, OLD.business_id);

  UPDATE businesses
  SET
    average_rating = sub.avg_rating,
    total_reviews  = sub.cnt
  FROM (
    SELECT
      ROUND(AVG(rating)::numeric, 2) AS avg_rating,
      COUNT(*)::integer AS cnt
    FROM reviews
    WHERE business_id = _business_id
  ) sub
  WHERE businesses.id = _business_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach trigger on insert/update/delete
CREATE TRIGGER trg_update_business_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_business_rating();

-- 6. updated_at auto-update
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();
