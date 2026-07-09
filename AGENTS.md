# AGENTS.md

Board Game Cafe — real-time multiplayer board game web app. pnpm monorepo, three packages:

- `packages/shared` — shared TypeScript types
- `packages/server` — Express + Socket.IO game server (port 3001)
- `packages/client` — React + Vite SPA (port 5173)

All game state is in-memory; no database or external services required. Commands live in the root and per-package `package.json`.

## Toolchain

Pinned via `mise.toml`: **Node 22 LTS**, **pnpm 9**. Run `mise install` to match. If you don't use mise, install Node 22 + pnpm 9 by hand — the pnpm lockfile is `lockfileVersion: 9.0`.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject` — e.g. `feat: add undercover`, `fix: camel track`. Common types: `feat`, `fix`, `chore`, `refactor`, `docs`, `format`.

## Non-obvious constraints

- `shared` must be compiled (`tsc`) before server or client can import its types. `pnpm dev` handles this via `tsc --watch`, and the client's `prebuild` script rebuilds shared before its own build.
- `esbuild` needs a postinstall script. Root `package.json` sets `pnpm.onlyBuiltDependencies: ["esbuild"]` so install works non-interactively.
- No env vars are required for local dev; defaults are hardcoded (server 3001, client 5173). See README for env var details.
- Game images come from a public Cloudinary CDN (cloud name `dpkqjlk3g`, folder `board-game-cafe/<gameId>/`) — no API keys for delivery. Browsing uploads and wiring URLs: [`.agents/design/cloudinary-assets.md`](.agents/design/cloudinary-assets.md).
- **One Night Ultimate Werewolf:** never expose UI or wire payloads that distinguish roles held by a seated player from roles that exist only on center cards (no idle/center-only badges, no `hasPlayerActors`-style hints). Night schedule may list roles in the deck; visuals and copy must stay neutral.
