-- =====================================================
-- Busy Times Analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS public.busy_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  busyness_level INTEGER NOT NULL DEFAULT 0
    CHECK (busyness_level >= 0 AND busyness_level <= 100),
  source TEXT DEFAULT 'seed' CHECK (source IN ('seed', 'computed')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, day_of_week, hour)
);

CREATE INDEX idx_busy_times_business ON public.busy_times(business_id);
CREATE INDEX idx_busy_times_day ON public.busy_times(day_of_week);

ALTER TABLE public.busy_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "busy_times_read" ON public.busy_times FOR SELECT USING (true);

CREATE POLICY "busy_times_insert" ON public.busy_times FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );
CREATE POLICY "busy_times_update" ON public.busy_times FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.seed_busy_times(p_business_id UUID)
RETURNS void AS $$
DECLARE
  d INTEGER;
  h INTEGER;
  base_level INTEGER;
BEGIN
  FOR d IN 0..6 LOOP
    FOR h IN 0..23 LOOP
      base_level := CASE
        WHEN h BETWEEN 0 AND 6 THEN 0
        WHEN h BETWEEN 7 AND 9 THEN 10 + floor(random() * 15)::int
        WHEN h = 10 THEN 25 + floor(random() * 20)::int
        WHEN h BETWEEN 11 AND 13 THEN 60 + floor(random() * 35)::int
        WHEN h BETWEEN 14 AND 16 THEN 20 + floor(random() * 25)::int
        WHEN h = 17 THEN 40 + floor(random() * 25)::int
        WHEN h BETWEEN 18 AND 20 THEN 65 + floor(random() * 35)::int
        WHEN h BETWEEN 21 AND 22 THEN 30 + floor(random() * 25)::int
        WHEN h = 23 THEN 5 + floor(random() * 15)::int
        ELSE 0
      END;

      IF d IN (0, 5, 6) THEN
        base_level := LEAST(100, base_level + 10 + floor(random() * 10)::int);
      END IF;

      INSERT INTO public.busy_times (business_id, day_of_week, hour, busyness_level, source)
      VALUES (p_business_id, d, h, base_level, 'seed')
      ON CONFLICT (business_id, day_of_week, hour) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
