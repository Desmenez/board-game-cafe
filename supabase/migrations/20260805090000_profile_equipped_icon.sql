-- Equipped profile icon (เหรียญตรา).

alter table public.profiles
  add column if not exists equipped_icon_id text;

comment on column public.profiles.equipped_icon_id is
  'Catalog icon id shown as an avatar badge; null = none';
