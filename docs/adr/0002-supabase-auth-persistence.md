# 2. Optional accounts via Supabase Auth (Google) + portable Postgres schema

Date: 2026-07-21

## Status

Accepted

## Context

Board Game Cafe today is guest-only: seat identity is a client `playerToken` in
localStorage, and rooms live in server memory. We want optional Gmail login for
profiles, play history, friends, invites, and per-game leaderboards — while
guests and signed-in players still share the same rooms.

We host persistence on **Supabase Free** (Auth + Postgres). We expect we may
later move Auth and/or the database off Supabase, so the design must not depend
on Supabase-only extensions for business data.

## Decision

1. **Auth provider (now):** Supabase Auth with **Google OAuth only** (web first;
   Capacitor later). Do not implement custom Google OAuth/JWT in Express.
2. **Auth is optional for all gameplay.** Unset / empty Supabase env must leave
   the app fully usable (guest create/join/play, add games). Login UI hides;
   persistence and token verify no-op and must not throw into the socket path.
3. **Seat identity unchanged:** `Player.id` remains `playerToken`. Optional
   `userId` (`profiles.id`) is attached when a verified access token is present.
4. **Portable account key:** store Google `sub` as `profiles.google_sub` (unique).
   Business FKs reference `profiles.id`; migration off Supabase remaps via
   `google_sub` and drops `references auth.users`.
5. **App auth facade:** client and server talk to auth only through thin modules
   (`packages/client/src/auth/`, `packages/server/src/auth/`). UI and sockets do
   not import `@supabase/supabase-js` ad hoc.
6. **Schema:** standard Postgres types and constraints in `public` only. No
   business logic in Edge Functions, Vault, `pg_net`, or `pg_graphql`. Avatar
   recipes stay as `jsonb` (`PlayerAvatarConfig`). **Exception:** optional
   signed-in profile photos live in Supabase Storage bucket `avatars` with the
   public URL stored on `profiles.avatar_url` (client crops/compresses ≤500KB;
   no Image Transformation). Guests use DiceBear only.
7. **Writes:** match results are inserted by the game server with the service
   role. Clients use the anon key + RLS for profile/friends/invites.
8. **Friend codes (`profiles.handle`):** Immutable 6-character codes using the
   same alphabet as room codes (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), assigned at
   signup. Not editable by clients (DB trigger). Display name and avatar remain
   editable.
9. **Free-tier keep-alive:** external GitHub Actions cron pings the REST API
   daily with the anon key so inactivity pause (~7 days) does not freeze the
   project. `pg_cron` inside the project cannot wake a paused project.

## Consequences

- Guest play keeps working with zero Supabase env vars.
- Moving Auth later: users sign in with Google again; match on `google_sub`;
  replace facade implementations; remap `profiles.id` / drop `auth.users` FK.
- Moving DB later: `pg_dump` schema `public` (business tables); recreate auth
  elsewhere; do not assume a full Supabase project restore.
- OAuth redirect URLs must include local Vite and production Vercel (web only
  in the first ship).
- Operators must create the Supabase project, enable Google provider, and set
  GitHub secrets for the keep-alive workflow.

## Migration runbook (outline)

When leaving Supabase Auth and/or Postgres:

1. Export `public` tables (especially `profiles` with `google_sub`).
2. Provision new Auth; on first Google login, upsert profile by `google_sub`.
3. Remap foreign keys if `profiles.id` values change; drop `auth.users` FK.
4. Point facades at the new issuer; invalidate old Supabase sessions (re-login).
5. Re-home keep-alive (or drop it on a paid always-on host).
