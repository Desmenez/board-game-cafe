-- Allow reading matches that appear on the public leaderboard so clients can
-- join match_players → matches.game_id for aggregates (anon + authenticated).
-- Rows are only visible when at least one seated account opted into leaderboard.

create policy matches_select_for_leaderboard
  on public.matches for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.match_players mp
      join public.profiles p on p.id = mp.user_id
      where mp.match_id = matches.id
        and mp.user_id is not null
        and p.show_on_leaderboard = true
    )
  );
