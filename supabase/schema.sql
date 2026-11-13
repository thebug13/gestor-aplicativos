create table if not exists public.app_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  url text not null check (url ~ '^https?://'),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keeps existing installations compatible when this schema is run again.
alter table public.app_links add column if not exists image_path text;
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

-- Private Storage bucket for user-selected link icons (PNG, JPEG, WEBP; max 2 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('app-link-images', 'app-link-images', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their link images" on storage.objects;
create policy "Users can read their link images"
  on storage.objects for select to authenticated
  using (bucket_id = 'app-link-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can add their link images" on storage.objects;
create policy "Users can add their link images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'app-link-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can update their link images" on storage.objects;
create policy "Users can update their link images"
  on storage.objects for update to authenticated
  using (bucket_id = 'app-link-images' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'app-link-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can delete their link images" on storage.objects;
create policy "Users can delete their link images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'app-link-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
