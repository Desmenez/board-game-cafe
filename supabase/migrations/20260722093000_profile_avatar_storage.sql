-- Profile photo uploads via Supabase Storage (Free tier).
-- Client crops/compresses to ≤500KB before upload — no Image Transformation (Pro).

-- ---------------------------------------------------------------------------
-- profiles.avatar_url
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'Public HTTPS URL of uploaded profile photo in storage bucket avatars; null = DiceBear only';

-- ---------------------------------------------------------------------------
-- Storage bucket: avatars (public read)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  512000,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- storage.objects RLS — own folder only ({userId}/…)
-- ---------------------------------------------------------------------------

drop policy if exists avatars_select_public on storage.objects;
create policy avatars_select_public
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
