# Supabase (Auth + Postgres)

Optional accounts for Board Game Cafe. Live gameplay stays on the Socket.IO
server; this project stores profiles, history, friends, invites, and
leaderboards.

See [ADR 0002](../docs/adr/0002-supabase-auth-persistence.md).

## Guest-only local dev (default)

**You do not need Supabase to run or develop this app.**

- Leave client `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` empty or unset
- Leave server `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` empty or unset
- `pnpm dev` → create/join rooms, play, and **add new games** as usual
- Login button stays hidden; match history is not persisted
- Auth helpers must no-op / return null — they must never block socket create/join

Only configure Supabase when you are working on account features.

## Friend codes

`profiles.handle` is an **immutable 6-character friend code** (room-code alphabet),
assigned at signup. Users edit `display_name` / avatar only.

Greenfield / reset DB: apply the single migration
`20260721120000_init_auth_social.sql` (via CI `db push` or SQL Editor), then:

```sql
NOTIFY pgrst, 'reload schema';
```

## One-time setup (when you want login)

1. Create a free project at [supabase.com](https://supabase.com).
2. **Authentication → Providers → Google:** enable and paste Google OAuth
   Client ID / Secret from Google Cloud Console.
3. **Authentication → URL configuration:** add redirect URLs:
   - `http://localhost:5173/**`
   - production Vercel origin, e.g. `https://board-game-cafe-client.vercel.app/**`
4. Disable Email/Password (and any other providers) so login is Google-only.
5. Apply the migration in [`migrations/`](migrations/) via the SQL Editor
   (paste file contents) or Supabase CLI (`supabase link` + `supabase db push`).
6. Copy Project URL + `anon` key into client env; `service_role` into server env
   only (never ship `service_role` to the browser).

## Env vars

| Where  | Variable                    | Notes                                    |
| ------ | --------------------------- | ---------------------------------------- |
| Client | `VITE_SUPABASE_URL`         | Project URL (optional)                   |
| Client | `VITE_SUPABASE_ANON_KEY`    | Public anon / publishable key (optional) |
| Server | `SUPABASE_URL`              | Same project URL (optional)              |
| Server | `SUPABASE_SERVICE_ROLE_KEY` | Server only — match writes (optional)    |

Without these vars, the app stays guest-only.

## Troubleshooting: `PGRST002` / schema cache

If the client logs `PGRST002: Could not query the database for the schema cache`
(profile fetch/update fails), PostgREST cannot talk to Postgres — not an app UI bug.

1. Open the Supabase Dashboard and confirm the project is **not paused** (restore if needed).
2. In **SQL Editor**, run:

```sql
NOTIFY pgrst, 'reload schema';
```

3. **Project Settings → Data API → Exposed schemas** should include `public` (and only schemas that exist).
4. Retry saving the profile in the app (client retries briefly on PGRST002 already).

## Migrate on merge to `main` (GitHub Actions)

Workflow: [`.github/workflows/supabase-migrate.yml`](../.github/workflows/supabase-migrate.yml)

Runs `supabase db push` when `supabase/migrations/**` changes on `main` (or via
**Actions → Supabase migrate → Run workflow**).

### Secrets (exact names)

| Secret                  | Where to get it                                 |
| ----------------------- | ----------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | Supabase Account → Access Tokens                |
| `SUPABASE_PROJECT_ID`   | Dashboard URL: `…/project/<this-ref>`           |
| `SUPABASE_DB_PASSWORD`  | Project Settings → Database → Database password |

If any secret is missing, the job **skips** (exit 0) so guest-only forks stay green.

These are **not** the same as keepalive (`SUPABASE_URL` + `SUPABASE_ANON_KEY`) or
app `service_role`.

### If you already ran the SQL in the Dashboard

CI will try to apply `20260721120000_init_auth_social.sql` again and may fail
with “already exists”. Mark it as applied once (locally, linked to the project):

```bash
supabase link --project-ref <project-id>
supabase migration repair 20260721120000 --status applied
```

Then future migrations from git will push normally.

## Keep-alive (free tier)

Free projects can pause after ~7 days of low activity. The workflow
[`.github/workflows/supabase-keepalive.yml`](../.github/workflows/supabase-keepalive.yml)
pings REST daily. Add GitHub repo secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
