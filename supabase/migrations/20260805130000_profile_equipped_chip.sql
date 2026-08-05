-- Equipped profile name chip (กรอบชื่อ).

alter table public.profiles
  add column if not exists equipped_chip_id text;

comment on column public.profiles.equipped_chip_id is
  'Catalog name chip id for .player-nameplate__label; null = none';
