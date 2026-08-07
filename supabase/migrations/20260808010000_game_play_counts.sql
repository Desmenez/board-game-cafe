-- Aggregate match counts for catalog ranking (service role only).
-- Avoids transferring every matches.game_id row to the app server.

create or replace function public.game_play_counts()
returns table (game_id text, play_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select m.game_id, count(*)::bigint as play_count
  from public.matches m
  group by m.game_id;
$$;

revoke all on function public.game_play_counts() from public;
grant execute on function public.game_play_counts() to service_role;
