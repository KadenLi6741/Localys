-- =====================================================
-- Floor Plans & Restaurant Tables
-- =====================================================

CREATE TABLE IF NOT EXISTS public.floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main Floor',
  layout_data JSONB DEFAULT '{"walls":[],"decorations":[],"sections":[]}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  shape TEXT NOT NULL DEFAULT 'square'
    CHECK (shape IN ('round', 'square', 'rectangular')),
  capacity INTEGER NOT NULL DEFAULT 4,
  section TEXT DEFAULT 'indoor',
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  width REAL NOT NULL DEFAULT 80,
  height REAL NOT NULL DEFAULT 80,
  rotation REAL DEFAULT 0,
  status TEXT DEFAULT 'available'
    CHECK (status IN ('available', 'reserved', 'occupied', 'unavailable')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_floor_plans_business_id ON public.floor_plans(business_id);
CREATE INDEX idx_restaurant_tables_floor_plan ON public.restaurant_tables(floor_plan_id);
CREATE INDEX idx_restaurant_tables_business ON public.restaurant_tables(business_id);
CREATE INDEX idx_restaurant_tables_status ON public.restaurant_tables(status);

ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "floor_plans_read" ON public.floor_plans FOR SELECT USING (true);
CREATE POLICY "restaurant_tables_read" ON public.restaurant_tables FOR SELECT USING (true);

CREATE POLICY "floor_plans_insert" ON public.floor_plans FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );
CREATE POLICY "floor_plans_update" ON public.floor_plans FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );
CREATE POLICY "floor_plans_delete" ON public.floor_plans FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

CREATE POLICY "restaurant_tables_insert" ON public.restaurant_tables FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );
CREATE POLICY "restaurant_tables_update" ON public.restaurant_tables FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );
CREATE POLICY "restaurant_tables_delete" ON public.restaurant_tables FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );
