-- =====================================================
-- Pre-Order System
-- =====================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS upfront_payment_pct INTEGER DEFAULT 100
    CHECK (upfront_payment_pct >= 0 AND upfront_payment_pct <= 100);

CREATE TABLE IF NOT EXISTS public.preorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT UNIQUE NOT NULL,
  qr_token TEXT UNIQUE NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL DEFAULT 'dine-in'
    CHECK (order_type IN ('dine-in', 'pickup')),
  scheduled_time TIMESTAMPTZ NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  upfront_pct INTEGER NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_remaining DECIMAL(10,2) NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment',
      'confirmed',
      'preparing',
      'ready',
      'arrived',
      'completed',
      'cancelled'
    )),
  notes TEXT,
  confirmed_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.preorder_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preorder_id UUID NOT NULL REFERENCES public.preorders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  item_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_preorders_business ON public.preorders(business_id);
CREATE INDEX idx_preorders_customer ON public.preorders(customer_id);
CREATE INDEX idx_preorders_table ON public.preorders(table_id);
CREATE INDEX idx_preorders_status ON public.preorders(status);
CREATE INDEX idx_preorders_scheduled ON public.preorders(scheduled_time);
CREATE INDEX idx_preorders_qr_token ON public.preorders(qr_token);
CREATE INDEX idx_preorders_order_code ON public.preorders(order_code);
CREATE INDEX idx_preorder_items_preorder ON public.preorder_items(preorder_id);

ALTER TABLE public.preorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preorder_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preorders_select" ON public.preorders FOR SELECT
  USING (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

CREATE POLICY "preorders_insert" ON public.preorders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "preorders_update" ON public.preorders FOR UPDATE
  USING (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

CREATE POLICY "preorder_items_select" ON public.preorder_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.preorders po
      WHERE po.id = preorder_id
        AND (po.customer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.businesses WHERE id = po.business_id AND owner_id = auth.uid()))
    )
  );

CREATE POLICY "preorder_items_insert" ON public.preorder_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.preorders po
      WHERE po.id = preorder_id AND po.customer_id = auth.uid()
    )
  );
