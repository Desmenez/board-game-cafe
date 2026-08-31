-- Account session mirror and live GamePlayer connection history.
-- Supabase Auth remains the authentication authority; this table lets the
-- game server audit/revoke its own admission records without ever involving
-- guests or storing a raw bearer token.

create table public.app_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key_hash text not null unique,
  user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create index app_auth_sessions_user_active_idx
  on public.app_auth_sessions (user_id, last_active_at desc)
  where revoked_at is null;

-- GamePlayer is deliberately separate from authentication. `player_id` is the
-- stable id referenced by in-memory game state; an account claim changes only
-- the identity columns, never this id.
create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  game_id text not null,
  player_id text not null,
  user_id uuid references public.profiles (id) on delete set null,
  guest_id text,
  player_snapshot jsonb not null,
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  disconnected_at timestamptz,
  constraint game_players_identity_check check (
    (user_id is not null and guest_id is null)
    or (user_id is null and guest_id is not null)
  ),
  constraint game_players_room_player_unique unique (room_code, player_id)
);

create index game_players_user_active_idx on public.game_players (user_id, last_active_at desc);
create index game_players_guest_active_idx on public.game_players (guest_id, last_active_at desc);

create table public.game_player_connections (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  game_id text not null,
  player_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  auth_session_key_hash text not null references public.app_auth_sessions (session_key_hash),
  socket_id text not null,
  connected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disconnected_at timestamptz,
  replaced_at timestamptz
);

create index game_player_connections_user_idx
  on public.game_player_connections (user_id, connected_at desc);

create unique index game_player_connections_one_active_player_idx
  on public.game_player_connections (room_code, player_id)
  where disconnected_at is null;

create unique index game_player_connections_one_active_user_idx
  on public.game_player_connections (room_code, user_id)
  where disconnected_at is null;

alter table public.app_auth_sessions enable row level security;
alter table public.game_players enable row level security;
alter table public.game_player_connections enable row level security;

-- Only the game server service role writes these tables. Users do not receive
-- session identifiers or connection metadata through the public data API.
