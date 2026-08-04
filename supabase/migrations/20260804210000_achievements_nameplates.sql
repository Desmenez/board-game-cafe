-- Achievements unlock inventory + equipped nameplate on profiles.
-- Catalog (achievement / nameplate definitions) lives in app code, not DB.

-- ---------------------------------------------------------------------------
-- profiles.equipped_nameplate_id
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists equipped_nameplate_id text;

comment on column public.profiles.equipped_nameplate_id is
  'Catalog nameplate id the player shows on their name box; null = default';

-- ---------------------------------------------------------------------------
-- achievement_unlocks (written by game server service role)
-- ---------------------------------------------------------------------------

create table if not exists public.achievement_unlocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists achievement_unlocks_user_idx
  on public.achievement_unlocks (user_id, unlocked_at desc);

comment on table public.achievement_unlocks is
  'Granted achievement ids per account; reward cosmetics resolved via app catalog';

alter table public.achievement_unlocks enable row level security;

-- Own unlocks readable when signed in (profile cosmetics UI).
drop policy if exists achievement_unlocks_select_own on public.achievement_unlocks;
create policy achievement_unlocks_select_own
  on public.achievement_unlocks for select
  to authenticated
  using (user_id = (select auth.uid()));

-- No client INSERT/UPDATE/DELETE — service role persists grants after matches.
