-- Email consents: which customers opted in (at checkout) to receive emails /
-- notifications from a specific business. Powers the business "Localy Emails"
-- dashboard. Opt-in is per (customer, business). Safe to run multiple times.
--
-- business_id is TEXT (not uuid) so demo/slug sellers (e.g. "jays-burger") can be
-- stored without crashing checkout; real businesses store their profile uuid.

create table if not exists public.email_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  user_name text,
  business_id text not null,
  business_name text,
  opted_in boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, business_id)
);

create index if not exists email_consents_business_idx on public.email_consents (business_id);
create index if not exists email_consents_user_idx on public.email_consents (user_id);

alter table public.email_consents enable row level security;

-- The customer can read/manage their own consent; the business can read the
-- consents addressed to it (business_id == its own profile/auth id).
drop policy if exists "email_consents_select" on public.email_consents;
create policy "email_consents_select" on public.email_consents
  for select using (auth.uid() = user_id or auth.uid()::text = business_id);

drop policy if exists "email_consents_insert_own" on public.email_consents;
create policy "email_consents_insert_own" on public.email_consents
  for insert with check (auth.uid() = user_id);

drop policy if exists "email_consents_update_own" on public.email_consents;
create policy "email_consents_update_own" on public.email_consents
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
