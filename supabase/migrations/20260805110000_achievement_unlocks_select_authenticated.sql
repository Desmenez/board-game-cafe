-- Public profile badge row: authenticated users may read anyone's unlocks
-- (icons/titles shown on friend/lobby profile cards). Writes stay service-role only.

drop policy if exists achievement_unlocks_select_own on public.achievement_unlocks;
drop policy if exists achievement_unlocks_select_authenticated on public.achievement_unlocks;

create policy achievement_unlocks_select_authenticated
  on public.achievement_unlocks for select
  to authenticated
  using (true);
