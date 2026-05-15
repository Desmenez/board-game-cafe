---
name: board-game-cafe-games
description: >-
  Adds or extends games in the Board Game Cafe monorepo: shared GameDefinition
  types, server engine + registration, React play view, RoomPage wiring, optional
  lobby options under components/game-lobby-options. Use when creating a new game,
  wiring gameId, implementing engine/setup/onAction/getPlayerView, or mirroring
  the game-lobby-options registry pattern.
---

# Board Game Cafe — adding or extending a game

Follow the same **string `gameId` everywhere** (hyphenated slug). Order matters: **shared compiles first** (`pnpm dev` runs `tsc --watch` on shared).

## 1. Shared (`packages/shared`)

- Add `packages/shared/src/types/<game>.ts`: full state shape, **action** union/type, **`XxxPlayerView`** (what `getPlayerView` returns for one seat). Export parsers/helpers for lobby options here when the host edits structured options.
- Re-export from `packages/shared/src/index.ts` (`export * from './types/<game>.js'`).
- Optional: add `GAME_THUMBNAIL_BY_ID[<gameId>]` in `packages/shared/src/game-thumbnails.ts` (Cloudinary URL); empty string falls back to the engine’s `thumbnail` path.

Canonical server contract: `GameDefinition` in `packages/shared/src/types/game.ts` (`setup`, `onAction`, `getPlayerView`, `isGameOver`).

## 2. Server (`packages/server`)

- New folder `packages/server/src/games/<game-slug>/`:
  - **`engine.ts`**: export a `GameDefinition` object (e.g. `myGame`) with `id`, `name`, `description`, `minPlayers`, `maxPlayers`, `thumbnail`, and the four lifecycle methods typed with your state/action types.
  - **`index.ts`**: `import { registerGame } from '../registry.js'` and `registerGame(myGame)` (same pattern as `packages/server/src/games/splendor/index.ts`).
- Add side-effect import to `packages/server/src/games/register-all.ts`.
- **`room-manager.ts`**: if the room needs default `lobbyOptions`, extend `defaultLobbyOptionsFor` with a `case '<gameId>': return { ... }`.
- **`socket-handlers.ts`**: only if the game needs **server timers**, **disconnect** special cases, or **non-standard action** routing beyond `getGame(room.gameId).onAction`. Most games need nothing extra.

## 3. Client — play UI (`packages/client`)

- Add `packages/client/src/games/<game-slug>/<GameName>Game.tsx` (and co-located `.css` if needed).
- Typical props (match existing games, e.g. Splendor):

  - `gameState: XxxPlayerView`
  - `myId: string`
  - `sendAction: (action: unknown) => void`
  - `onLeave: () => void`
  - often `onRestart?: () => void` when host can return to lobby
  - some games add `isHost` or similar

- Wire the component in **`packages/client/src/pages/RoomPage.tsx`**: import the `XxxPlayerView` type from `shared`, import the game component, add an `else if (room.gameId === '<gameId>')` branch consistent with siblings.

## 4. Client — lobby options (optional, same pattern as `components/game-lobby-options`)

Use when the host configures rules **before** start:

- **`packages/client/src/components/game-lobby-options/types.ts`**: `LobbyOptionsProps` is fixed — implement `isHost`, `onChange`, optional `playerCount`, `lobbyOptions`.
- Add `.../game-lobby-options/<game-slug>/MyLobbyOptions.tsx` (kebab-case folder names match other games).
- Register in **`registry.ts`**: `lobbyOptionsRegistry['<gameId>'] = MyLobbyOptions`. Unregistered ids get **`DefaultLobbyOptions`**.
- Game CSS from lobby panels may import from `../../../games/...` like Exploding Kittens lobby does.

## 5. Checklist before calling a game “done”

- [ ] `gameId` matches across shared, server `id`, RoomPage, registry, thumbnails, and any `room-manager` / `socket-handlers` branches.
- [ ] `register-all` imports the new game’s `index.ts`.
- [ ] `pnpm build` or at least `pnpm lint` after shared exports change.
- [ ] Read **`AGENTS.md`** for repo-wide rules (e.g. One Night Ultimate Werewolf UI constraints).

## Reference locations

| Concern | File / area |
|--------|----------------|
| Game plugin interface | `packages/shared/src/types/game.ts` |
| Server registration | `packages/server/src/games/registry.ts`, `register-all.ts` |
| Lobby options lookup | `packages/client/src/components/game-lobby-options/registry.ts` |
| In-game route | `packages/client/src/pages/RoomPage.tsx` |
| Default lobby payload | `packages/server/src/room-manager.ts` → `defaultLobbyOptionsFor` |
