-- Lock liked_items to a single canonical column set so the app's SELECT/INSERT
-- never mismatch the table again (fixes "column liked_items.price does not exist").
-- Canonical columns the code uses: user_id, item_id, name, price, image, store_id, store_name.

create table if not exists public.liked_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  name text,
  price numeric,
  image text,
  store_id text,
  store_name text,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

-- Converge any pre-existing table (old or partial schema) to the canonical set.
alter table public.liked_items add column if not exists name text;
alter table public.liked_items add column if not exists price numeric;
alter table public.liked_items add column if not exists image text;
alter table public.liked_items add column if not exists store_id text;
alter table public.liked_items add column if not exists store_name text;

-- Backfill the new columns from old ones when those exist, so nothing is lost.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'liked_items' and column_name = 'item_name') then
    execute 'update public.liked_items set name = coalesce(name, item_name)';
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'liked_items' and column_name = 'image_url') then
    execute 'update public.liked_items set image = coalesce(image, image_url)';
  end if;
end $$;
