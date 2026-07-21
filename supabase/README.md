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

| Where | Variable | Notes |
| ----- | -------- | ----- |
| Client | `VITE_SUPABASE_URL` | Project URL (optional) |
| Client | `VITE_SUPABASE_ANON_KEY` | Public anon / publishable key (optional) |
| Server | `SUPABASE_URL` | Same project URL (optional) |
| Server | `SUPABASE_SERVICE_ROLE_KEY` | Server only — match writes (optional) |

Without these vars, the app stays guest-only.

## Keep-alive (free tier)

Free projects can pause after ~7 days of low activity. The workflow
[`.github/workflows/supabase-keepalive.yml`](../.github/workflows/supabase-keepalive.yml)
pings REST daily. Add GitHub repo secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
