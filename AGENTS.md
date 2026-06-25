# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Board Game Cafe is a real-time multiplayer board game web app using a pnpm monorepo with three packages:

- `packages/shared` — shared TypeScript types (must compile before client/server can use them)
- `packages/server` — Express + Socket.IO game server (port 3001)
- `packages/client` — React + Vite SPA (port 5173)

No database or external services are required; all game state is in-memory.

### Running the dev environment

```bash
pnpm dev        # starts shared (tsc --watch), server (tsx watch), and client (vite) in parallel
```

Or individually:

```bash
pnpm dev:server   # server only
pnpm dev:client   # client only
```

### Lint / Build / Format

See root `package.json` scripts. Key commands:

- `pnpm lint` — ESLint across all packages
- `pnpm build` — builds shared, then server and client
- `pnpm format:check` — Prettier check
- `pnpm format` — Prettier write

### Non-obvious notes

- The `shared` package must be compiled (`tsc`) before the server or client can import its types. `pnpm dev` handles this automatically via `tsc --watch`, and the client's `prebuild` script also rebuilds shared before building.
- `esbuild` requires a postinstall script. The root `package.json` has `pnpm.onlyBuiltDependencies` set to `["esbuild"]` to allow this non-interactively.
- No environment variables are required for local development; defaults are hardcoded (server on port 3001, client on port 5173). See the README for env var details.
- Game images are served from a public Cloudinary CDN (cloud name `dpkqjlk3g`, folder `board-game-cafe/<gameId>/`) — no API keys needed for delivery. How to browse uploads and wire URLs: [`.cursor/design/cloudinary-assets.md`](.cursor/design/cloudinary-assets.md).
- **One Night Ultimate Werewolf:** do not expose UI or wire payloads that distinguish roles held by a seated player from roles that exist only on center cards (no idle/center-only badges, no `hasPlayerActors`-style hints). Night schedule may list roles in the deck; visuals and copy must stay neutral.
