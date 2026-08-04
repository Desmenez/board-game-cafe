-- Fix 42P17: infinite recursion in match_players RLS for authenticated clients.
--
-- match_players_select_own_or_same_match used EXISTS (SELECT … FROM match_players),
-- which re-enters the same policy. Leaderboard (and history) queries then 500 when
-- the browser sends a logged-in JWT; anon-only requests were unaffected.
--
-- Resolve with a SECURITY DEFINER helper that reads seats without RLS.

create or replace function public.is_match_participant(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.match_players mp
    where mp.match_id = p_match_id
      and mp.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_match_participant(uuid) from public;
grant execute on function public.is_match_participant(uuid) to authenticated;

drop policy if exists match_players_select_own_or_same_match on public.match_players;

create policy match_players_select_own_or_same_match
  on public.match_players for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_match_participant(match_id)
  );
