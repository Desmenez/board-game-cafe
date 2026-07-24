-- Friend codes: allow full A–Z and 0–9 (including I/O/0/1).
-- Room codes stay on the ambiguous-safe alphabet; only profiles.handle changes.

alter table public.profiles
  drop constraint profiles_handle_friend_code;

alter table public.profiles
  add constraint profiles_handle_friend_code check (
    handle ~ '^[ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789]{6}$'
  );

create or replace function public.generate_friend_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  candidate text;
  i int;
  attempts int := 0;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate :=
        candidate || substr(alphabet, (1 + floor(random() * char_length(alphabet)))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles p where p.handle = candidate);
    attempts := attempts + 1;
    if attempts > 64 then
      raise exception 'could not allocate unique friend code';
    end if;
  end loop;
  return candidate;
end;
$$;
