-- Liked menu items: which menu items a user has liked.
-- Demo/slug items are handled client-side; only real UUID items land here.
-- Safe to run multiple times.

create table if not exists public.liked_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  item_name text,
  price numeric,
  image_url text,
  store_name text,
  store_href text,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create index if not exists liked_items_user_idx on public.liked_items (user_id);

-- Each user can only see/manage their own liked items.
alter table public.liked_items enable row level security;

drop policy if exists "liked_items_select_own" on public.liked_items;
create policy "liked_items_select_own" on public.liked_items
  for select using (auth.uid() = user_id);

drop policy if exists "liked_items_insert_own" on public.liked_items;
create policy "liked_items_insert_own" on public.liked_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "liked_items_delete_own" on public.liked_items;
create policy "liked_items_delete_own" on public.liked_items
  for delete using (auth.uid() = user_id);
