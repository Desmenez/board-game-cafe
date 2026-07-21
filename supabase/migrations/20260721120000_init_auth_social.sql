-- Board Game Cafe — auth-linked social schema (standard Postgres).
-- Apply via Supabase SQL editor or `supabase db push` after linking a project.
-- Business tables live in `public` and must remain dump/restore portable.
-- FK to auth.users is host-local; drop it when migrating off Supabase Auth.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  google_sub text not null,
  handle text not null,
  display_name text not null,
  avatar_config jsonb not null,
  show_on_leaderboard boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_google_sub_unique unique (google_sub),
  constraint profiles_handle_length check (char_length(handle) between 2 and 32),
  constraint profiles_handle_no_space check (handle !~ '[[:space:]]'),
  constraint profiles_handle_no_special check (handle !~ '[@/#]'),
  constraint profiles_display_name_length check (char_length(trim(display_name)) between 1 and 48)
);

create unique index profiles_handle_lower_idx on public.profiles (lower(handle));

create index profiles_leaderboard_idx
  on public.profiles (id)
  where show_on_leaderboard = true;

-- ---------------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------------

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_status_check check (status in ('pending', 'accepted', 'blocked')),
  constraint friendships_not_self check (requester_id <> addressee_id),
  constraint friendships_pair_unique unique (requester_id, addressee_id)
);

create index friendships_addressee_status_idx on public.friendships (addressee_id, status);
create index friendships_requester_status_idx on public.friendships (requester_id, status);

-- ---------------------------------------------------------------------------
-- matches / match_players (written by game server service role)
-- ---------------------------------------------------------------------------

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  room_code text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null default now(),
  result_reason text not null default ''
);

create index matches_game_ended_idx on public.matches (game_id, ended_at desc);

create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  player_token text not null,
  display_name text not null,
  is_winner boolean not null default false,
  placement int,
  constraint match_players_placement_positive check (placement is null or placement >= 1)
);

create index match_players_user_idx on public.match_players (user_id, match_id);
create index match_players_match_idx on public.match_players (match_id);

-- ---------------------------------------------------------------------------
-- game_invites
-- ---------------------------------------------------------------------------

create table public.game_invites (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  room_code text not null,
  game_id text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint game_invites_status_check
    check (status in ('pending', 'accepted', 'declined', 'expired')),
  constraint game_invites_not_self check (from_user_id <> to_user_id)
);

create index game_invites_to_pending_idx
  on public.game_invites (to_user_id, status, expires_at);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger friendships_set_updated_at
  before update on public.friendships
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup (Google)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_sub text;
  raw_name text;
  base_handle text;
  candidate text;
  suffix int := 0;
  default_avatar jsonb := jsonb_build_object(
    'version', 2,
    'seed', 'player',
    'background', 'amber',
    'flip', false,
    'baseColor', 'f9c9b6',
    'hair', 'fonze',
    'hairColor', '77311d',
    'eyes', 'eyes',
    'eyeShadowColor', 'ffffff',
    'eyebrows', 'up',
    'nose', 'curve',
    'ears', 'attached',
    'earrings', 'none',
    'earringColor', '000000',
    'glasses', 'none',
    'glassesColor', '000000',
    'facialHair', 'none',
    'clothes', 'crew',
    'shirtColor', '6bd9e9'
  );
begin
  raw_sub := coalesce(
    new.raw_user_meta_data ->> 'sub',
    new.raw_app_meta_data ->> 'provider_id',
    new.id::text
  );

  raw_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, 'player'), '@', 1),
    'player'
  );

  -- Strip whitespace and forbidden chars; keep Unicode letters (incl. Thai).
  base_handle := regexp_replace(raw_name, '[[:space:]@/#]+', '', 'g');
  if char_length(base_handle) < 2 then
    base_handle := 'player';
  end if;
  base_handle := left(base_handle, 24);

  candidate := base_handle;
  while exists (select 1 from public.profiles p where lower(p.handle) = lower(candidate)) loop
    suffix := suffix + 1;
    candidate := left(base_handle, 28) || suffix::text;
  end loop;

  insert into public.profiles (id, google_sub, handle, display_name, avatar_config)
  values (
    new.id,
    raw_sub,
    candidate,
    left(raw_name, 48),
    default_avatar
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.game_invites enable row level security;

-- profiles
create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (true);

create policy profiles_select_leaderboard_anon
  on public.profiles for select
  to anon
  using (show_on_leaderboard = true);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- friendships
create policy friendships_select_involved
  on public.friendships for select
  to authenticated
  using (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
  );

create policy friendships_insert_as_requester
  on public.friendships for insert
  to authenticated
  with check (requester_id = (select auth.uid()));

create policy friendships_update_involved
  on public.friendships for update
  to authenticated
  using (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
  )
  with check (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
  );

create policy friendships_delete_involved
  on public.friendships for delete
  to authenticated
  using (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
  );

-- matches: read for participants; no client insert/update/delete
create policy matches_select_participant
  on public.matches for select
  to authenticated
  using (
    exists (
      select 1
      from public.match_players mp
      where mp.match_id = matches.id
        and mp.user_id = (select auth.uid())
    )
  );

create policy match_players_select_own_or_same_match
  on public.match_players for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.match_players mine
      where mine.match_id = match_players.match_id
        and mine.user_id = (select auth.uid())
    )
  );

-- Public leaderboard aggregates: anon/authenticated can read winning rows'
-- profile-visible players via a narrow select on match_players joined in app.
-- Allow reading match_players rows whose user opted into leaderboard.
create policy match_players_select_leaderboard
  on public.match_players for select
  to anon, authenticated
  using (
    user_id is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = match_players.user_id
        and p.show_on_leaderboard = true
    )
  );

-- game_invites
create policy game_invites_select_involved
  on public.game_invites for select
  to authenticated
  using (
    from_user_id = (select auth.uid())
    or to_user_id = (select auth.uid())
  );

create policy game_invites_insert_as_sender
  on public.game_invites for insert
  to authenticated
  with check (from_user_id = (select auth.uid()));

create policy game_invites_update_involved
  on public.game_invites for update
  to authenticated
  using (
    from_user_id = (select auth.uid())
    or to_user_id = (select auth.uid())
  )
  with check (
    from_user_id = (select auth.uid())
    or to_user_id = (select auth.uid())
  );

-- service_role bypasses RLS by default — used by game server for match inserts.
