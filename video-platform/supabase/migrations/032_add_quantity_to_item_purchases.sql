-- Add quantity column to item_purchases for multi-item order support
ALTER TABLE public.item_purchases
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;