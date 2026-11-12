create table if not exists public.app_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  url text not null check (url ~ '^https?://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_links_user_id_idx on public.app_links (user_id);
alter table public.app_links enable row level security;

revoke all on table public.app_links from anon;
grant select, insert, update, delete on table public.app_links to authenticated;

drop policy if exists "Users can read their links" on public.app_links;
create policy "Users can read their links"
  on public.app_links for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their links" on public.app_links;
create policy "Users can add their links"
  on public.app_links for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their links" on public.app_links;
create policy "Users can update their links"
  on public.app_links for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their links" on public.app_links;
create policy "Users can delete their links"
  on public.app_links for delete to authenticated
  using ((select auth.uid()) = user_id);
