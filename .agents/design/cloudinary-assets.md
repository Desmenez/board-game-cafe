# Game art — Cloudinary

Canonical CDN for all game images. Assets are organized **one folder per game** under `board-game-cafe/<gameId>/` in the Cloudinary Media Library (`gameId` = kebab-case slug, same as `GameDefinition.id`).

## Account

| Setting     | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| Cloud name  | `dpkqjlk3g`                                                         |
| Root folder | `board-game-cafe/`                                                  |
| Delivery    | Public CDN — **no API keys** needed in client or server for display |

Optimized delivery URL pattern:

```text
https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/{version}/{public_id}.{ext}
```

- `q_auto` — auto quality
- `f_auto` — auto format (WebP/AVIF where supported)
- `{version}` — upload version prefix, e.g. `v1782402508` (pin when a game batch shares one upload session)
- `{public_id}` — Cloudinary public ID (often `cover_xxxx`, `back-card_xxxx`, or card name + random suffix)

Subfolders for large games (examples): `board-game-cafe/similo/animals`, `board-game-cafe/splendor/level-one`, `board-game-cafe/camel-up/card`. The **folder path is metadata** (`asset_folder`); URLs still use `version/public_id`, not the folder path.

## Browsing assets (Cursor + Cloudinary MCP)

With the Cloudinary plugin enabled in Cursor, an agent can list folders and assets without manual copy-paste from the dashboard.

1. Authenticate the **asset-mgmt** MCP server if prompted (`mcp_auth`).
2. **List game folders**

   Tool: `search-folders` — returns paths like `board-game-cafe/codenames`, `board-game-cafe/fugitive`.

3. **List images in one game**

   Tool: `search-assets` with expression:

   ```text
   resource_type:image AND asset_folder:"board-game-cafe/<gameId>"
   ```

   Request fields: `public_id`, `asset_folder`, `secure_url`, `version`.

4. **Read `public_id` and `version`** from each resource and wire them into code (see below).

Example prompt for AI:

```text
ดึงรูปจาก Cloudinary โฟลเดอร์ board-game-cafe/fugitive แล้ว wire เข้า imageMap และ game-thumbnails สำหรับเกม fugitive
```

## Where to wire URLs in code

| Purpose                           | File                                                      | Notes                                                                                           |
| --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Lobby / API catalog cover         | `packages/shared/src/game-thumbnails.ts`                  | Key = `gameId`. Empty string → fallback to engine `thumbnail`.                                  |
| In-game UI (cards, board, tokens) | `packages/client/src/imageMap.ts`                         | Use `cloudinaryImage(publicId)` helper; add a game section to `imageMap`.                       |
| Server-only thumbnail             | `packages/server/src/games/<slug>/engine.ts`              | `thumbnail` field on `GameDefinition` (used when `game-thumbnails` has no entry).               |
| Shared deck / many cards          | `packages/shared/src/types/<game>.ts` or `similo-deck.ts` | Export `*_CLOUD_VERSION` + public ID lists; build URLs in shared so server/client stay in sync. |

### `CLOUD_VERSION` convention

When many assets were uploaded together, pin a version constant (from any asset’s `version` in that batch):

```ts
export const MY_GAME_CLOUD_VERSION = 'v1782402508';
```

Then build paths as `` `${MY_GAME_CLOUD_VERSION}/${publicId}` `` (see `CAMEL_UP_CLOUD_VERSION`, `CUP_THE_CRAB_CLOUD_VERSION`, `ONUW_CLOUD_VERSION` in `packages/shared`).

Games with a single cover and few cards may use full URLs or unpinned `public_id` only (see Flip 7, Ticket to Ride in `imageMap.ts`).

### `imageMap.ts` helper

```ts
const cloudName = 'dpkqjlk3g';
const cloudinaryBase = `https://res.cloudinary.com/${cloudName}/image/upload/q_auto/f_auto`;

function cloudinaryImage(publicId: string): string {
  return `${cloudinaryBase}/${publicId}`;
}
```

Optional env override: `VITE_CLOUDINARY_CLOUD_NAME` in `packages/client/.env.example` (defaults are hardcoded in repo today).

## Upload checklist (new game or new art)

1. Upload images to **`board-game-cafe/<gameId>/`** (match slug exactly).
2. Prefer consistent names: `cover`, `back-card`, card faces (`11`, `green-5`, `bear_nyzp7n`, etc.). Cloudinary appends a unique suffix to `public_id` on upload — **use the final `public_id` from the API**, not the original filename.
3. Note one **`version`** from the batch for `*_CLOUD_VERSION` if needed.
4. Add cover to `GAME_THUMBNAIL_BY_ID[gameId]` in `game-thumbnails.ts`.
5. Map gameplay art in `imageMap.ts` (client) and/or shared types.
6. Set `thumbnail` on the server engine if the shared map entry is empty.

## Reference implementations

| Game               | Pattern                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Similo             | Many decks — `similo-deck.ts`, per-deck `SIMILO_*_CLOUD_VERSION`, `similoAnimalImageUrl()` |
| Camel Up           | `CAMEL_UP_CLOUD_VERSION` + nested `imageMap.camelUp`                                       |
| Cup the Crab       | `CUP_THE_CRAB_CLOUD_VERSION` + cup value → URL map                                         |
| One Night Werewolf | `ONUW_CLOUD_VERSION` + `onuwRoleCardUrl(artKey)`                                           |
| Codenames / Avalon | Version-pinned folder in `imageMap`                                                        |

## AI agent notes

- Read this doc when adding a game or wiring art after an upload.
- Cross-link: [board-game-cafe-games SKILL](../skills/board-game-cafe-games/SKILL.md) checklist includes thumbnails and `imageMap`.
- Do not commit Cloudinary API secrets; MCP auth is local to the developer’s Cursor session.
