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

## Game art (Cloudinary)

Uploads live in Media Library folder **`board-game-cafe/<gameId>/`** (same slug as `gameId`). Full workflow: [`.agents/design/cloudinary-assets.md`](../../design/cloudinary-assets.md).

**Discover assets (Cursor):** use Cloudinary asset-mgmt MCP — `search-folders`, then `search-assets` with `asset_folder:"board-game-cafe/<gameId>"`. Read `public_id`, `version`, and `secure_url` from results.

**Wire into code:**

| Asset                     | Where                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| Lobby / catalog cover     | `packages/shared/src/game-thumbnails.ts`                                                      |
| Cards, board, in-game UI  | `packages/client/src/imageMap.ts` (`cloudinaryImage`)                                         |
| Many cards / shared deck  | `packages/shared` — `*_CLOUD_VERSION` + public ID lists (see `similo-deck.ts`, `camel-up.ts`) |
| Engine fallback thumbnail | `engine.ts` → `thumbnail`                                                                     |

URL base: `https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/{version}/{public_id}` — no API keys for delivery.

## 2. Server (`packages/server`)

- New folder `packages/server/src/games/<game-slug>/`:
  - **`engine.ts`**: export a `GameDefinition` object (e.g. `myGame`) with `id`, `name`, `description`, `minPlayers`, `maxPlayers`, `thumbnail`, and the four lifecycle methods typed with your state/action types.
  - **`index.ts`**: `import { registerGame } from '../registry.js'` and `registerGame(myGame)` (same pattern as `packages/server/src/games/splendor/index.ts`).
- Add side-effect import to `packages/server/src/games/register-all.ts`.
- **`room-manager.ts`**: if the room needs default `lobbyOptions`, extend `defaultLobbyOptionsFor` with a `case '<gameId>': return { ... }`.
- **`socket-handlers.ts`**: only if the game needs **server timers**, **disconnect** special cases, or **non-standard action** routing beyond `getGame(room.gameId).onAction`. Most games need nothing extra.

## 3. Client — play UI (`packages/client`)

### Game shell (required for new games)

Wrap every play view in shared components from `packages/client/src/components/game-shell/`:

- **`GameShell`** — root `page container`; no custom `100dvh` / gradient page background.
- **`GamePlayHeader`** — game title (top-left), optional `subtitle` / `trailing`, leave + restart.
- **`GameOverModal`** — end-of-game overlay + confetti + **`GameOverActions`** (put rankings in `children`).
- **`GameOverActions`** — only when not using `GameOverModal` (legacy).

Full spec: [`.agents/design/game-ui.md`](../../design/game-ui.md). Rule: [`.cursor/rules/game-ui-design.mdc`](../../../.cursor/rules/game-ui-design.mdc).

Reference: any game under `packages/client/src/games/` (e.g. [`cup-the-crab/CupTheCrabGame.tsx`](../../../packages/client/src/games/cup-the-crab/CupTheCrabGame.tsx), [`codenames/CodenamesGame.tsx`](../../../packages/client/src/games/codenames/CodenamesGame.tsx) for `trailing` + themed header class).

### Private player hand (when migrating card games)

For games with a **hidden hand**, use [`PlayerHand`](../../../packages/client/src/components/player-hand/) (Tabletopia-style bottom dock). Spec: [`.agents/design/player-hand.md`](../../design/player-hand.md). Dev demo: `/dev/player-hand`.

- Reserve bottom space with `PLAYER_HAND_DOCK_RESERVE_PX` on `GameShell`.
- `dragMode`: `none` (click to select/play), `reorder` (sort hand), or `play` (drag to board — game provides outer `DndContext`).
- **Do not** render opponent hands; server `getPlayerView` must omit their cards.

Existing games still use legacy hand UI until migrated in a separate PR.

- Add `packages/client/src/games/<game-slug>/<GameName>Game.tsx` (and co-located `.css` if needed).
- Typical props (match existing games, e.g. Codenames):
  - `gameState: XxxPlayerView`
  - `myId: string`
  - `sendAction: (action: unknown) => void`
  - `onLeave: () => void` — **required**; opens the shared leave confirm modal in `RoomPage`
  - `onRestart?: () => void` — optional on the type, but **RoomPage passes it for the host only** (`isHost ? requestRestartToLobby : undefined`); non-hosts never get a restart button
  - some games add `isHost` when UI must branch beyond `onRestart` being undefined

- Wire the component in **`packages/client/src/pages/RoomPage.tsx`**: import the `XxxPlayerView` type from `shared`, import the game component, add an `else if (room.gameId === '<gameId>')` branch consistent with siblings.

### Session controls (leave / restart)

Every in-game view must expose **leave** and **restart-to-lobby** in a consistent way. Confirm dialogs live in [`RoomPage.tsx`](packages/client/src/pages/RoomPage.tsx) — game components only call the callbacks.

**RoomPage wiring (required for new games)**

```tsx
onLeave={requestLeaveFromGame}
onRestart={isHost ? requestRestartToLobby : undefined}
```

**During play**

- Show **ออกจากห้อง** (or short **ออก** in a compact header) wired to `onLeave` — visible to **all** players for the whole session.
- If `onRestart` is defined (host only), show **รีห้อง** in the header or an equivalent session menu. Clicking it opens the shared “กลับไปล็อบบี้?” modal; do not call `socket.restartGame()` from the game component.

**Game over (required)**

When `phase === 'game_over'` (or your game’s terminal state), show a dedicated end screen or modal with:

| Seat                       | Restart                                                      | Leave                             |
| -------------------------- | ------------------------------------------------------------ | --------------------------------- |
| Host (`onRestart` defined) | Button **รีห้อง** → `onRestart`                              | Button **ออกจากห้อง** → `onLeave` |
| Non-host                   | Short copy e.g. **รอหัวห้องกด «รีห้อง»** (no restart button) | Button **ออกจากห้อง** → `onLeave` |

Both actions must remain available at game over — do not hide leave behind scores only, and do not end the session with restart alone.

**Reference implementation:** `GameOverActions` from `components/game-shell` (labels + `RotateCcw` / `LogOut` icons). Legacy: `CodenamesGameOverActions` in [`CodenamesGame.tsx`](packages/client/src/games/codenames/CodenamesGame.tsx).

**Copy conventions**

- Leave: **ออกจากห้อง** (game over / modals); **ออก** acceptable in a dense in-play header.
- Restart: **รีห้อง** on the button; RoomPage modal title stays **กลับไปล็อบบี้?** (do not duplicate that modal inside the game).

## 4. Client — lobby options (optional, same pattern as `components/game-lobby-options`)

Use when the host configures rules **before** start:

- **`packages/client/src/components/game-lobby-options/types.ts`**: `LobbyOptionsProps` is fixed — implement `isHost`, `onChange`, optional `playerCount`, `lobbyOptions`.
- Add `.../game-lobby-options/<game-slug>/MyLobbyOptions.tsx` (kebab-case folder names match other games).
- Register in **`registry.ts`**: `lobbyOptionsRegistry['<gameId>'] = MyLobbyOptions`. Unregistered ids get **`DefaultLobbyOptions`**.
- Game CSS from lobby panels may import from `../../../games/...` like Exploding Kittens lobby does.

## 5. Checklist before calling a game “done”

- [ ] `gameId` matches across shared, server `id`, RoomPage, registry, thumbnails, and any `room-manager` / `socket-handlers` branches.
- [ ] `register-all` imports the new game’s `index.ts`.
- [ ] `RoomPage` passes `onLeave` and `onRestart={isHost ? requestRestartToLobby : undefined}`.
- [ ] In-play header: leave for everyone; restart only when `onRestart` is set.
- [ ] Game-over UI: host sees restart + leave; non-host sees wait copy + leave (see Session controls above).
- [ ] Play view uses `GameShell` + `GamePlayHeader` (+ `GameOverActions` when terminal).
- [ ] If the game has a private hand: `PlayerHand` + `PLAYER_HAND_DOCK_RESERVE_PX` (see player-hand design doc).
- [ ] `pnpm build` or at least `pnpm lint` after shared exports change.
- [ ] Cloudinary art wired: cover in `game-thumbnails.ts`, gameplay assets in `imageMap.ts` / shared types (see [cloudinary-assets.md](../../design/cloudinary-assets.md)).
- [ ] Read **`AGENTS.md`** for repo-wide rules (e.g. One Night Ultimate Werewolf UI constraints).

## Reference locations

| Concern                   | File / area                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Game plugin interface     | `packages/shared/src/types/game.ts`                                                        |
| Server registration       | `packages/server/src/games/registry.ts`, `register-all.ts`                                 |
| Lobby options lookup      | `packages/client/src/components/game-lobby-options/registry.ts`                            |
| In-game route             | `packages/client/src/pages/RoomPage.tsx`                                                   |
| Leave / restart modals    | `packages/client/src/pages/RoomPage.tsx` (`requestLeaveFromGame`, `requestRestartToLobby`) |
| Game-over actions pattern | `packages/client/src/games/codenames/CodenamesGame.tsx` → `CodenamesGameOverActions`       |
| Default lobby payload     | `packages/server/src/room-manager.ts` → `defaultLobbyOptionsFor`                           |
| Game art (Cloudinary)     | `.agents/design/cloudinary-assets.md`, `game-thumbnails.ts`, `imageMap.ts`                 |
