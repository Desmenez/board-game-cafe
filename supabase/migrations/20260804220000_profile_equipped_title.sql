-- Equipped profile title (ฉายา).

alter table public.profiles
  add column if not exists equipped_title_id text;

comment on column public.profiles.equipped_title_id is
  'Catalog title id shown with the display name; null = none';
