-- Add image_urls array column to menu_items for multiple images (up to 3)
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';