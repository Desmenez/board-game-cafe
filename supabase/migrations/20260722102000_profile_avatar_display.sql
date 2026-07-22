-- Prefer character (DiceBear) vs photo (Storage URL) when rendering avatars.

alter table public.profiles
  add column if not exists avatar_display text not null default 'character';

alter table public.profiles
  drop constraint if exists profiles_avatar_display_check;

alter table public.profiles
  add constraint profiles_avatar_display_check
  check (avatar_display in ('character', 'photo'));

-- Existing uploads should keep showing as photos until the user switches mode.
update public.profiles
set avatar_display = 'photo'
where avatar_url is not null
  and nullif(trim(avatar_url), '') is not null
  and avatar_display = 'character';

comment on column public.profiles.avatar_display is
  'character = DiceBear Micah; photo = profiles.avatar_url when present';
