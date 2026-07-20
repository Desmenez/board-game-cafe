# Board Game Cafe

Monorepo สำหรับแอปเว็บ “เล่นบอร์ดเกม” แบบเรียลไทม์ ผ่าน **Socket.IO** (รองรับหลายเกมผ่าน plugin)

## ภาพรวม

โปรเจกต์นี้ประกอบด้วย

- `packages/client` : ฝั่งเว็บ (React + Vite)
- `packages/server` : เซิร์ฟเวอร์เกม (Express + Socket.IO)
- `packages/shared` : Type กลาง + Interface ของ “เกม” (ใช้ร่วมกันทั้ง client/server)

เกมที่มีตอนนี้ (ตัวอย่าง): Avalon, Codenames, Exploding Kittens, Splendor, One Night Ultimate Werewolf, Sheriff of Nottingham และอื่นๆ — ดูรายการเต็มได้จาก `GET /api/games` หรือหน้า Home

## โครงสร้างโปรเจกต์

- `packages/client`  
  หน้า Home/Room และหน้าจอเล่นเกม (เช่น เฟส Role Reveal, Team Building, Voting, Quest, Assassination)
- `packages/server`  
  สร้าง/จัดการห้อง (`room`) และคุมสถานะเกมผ่าน engine ของแต่ละเกม
- `packages/shared`  
  นิยาม interface ของเกม (`GameDefinition`) และชนิดข้อมูลของ event/room

## เริ่มใช้งาน (Quick Start)

ต้องมี `Node.js` และ `pnpm`

1. ติดตั้ง dependency

```bash
pnpm install
```

2. รันแบบ dev ทั้งระบบ (client + server + shared)
   > `pnpm dev` จะรัน dev script ทุก package แบบขนาน รวมถึง `shared` ที่ทำ `tsc --watch`

```bash
pnpm dev
```

3. เปิดเว็บ

- เปิด `http://localhost:5173`

เซิร์ฟเวอร์จะรันที่ `http://localhost:3001` (ค่าเริ่มต้น)

## รูปภาพเกม (Cloudinary)

รูปปกและการ์ดเกมโฮสต์บน **Cloudinary CDN** (cloud name `dpkqjlk3g`) จัดเป็นโฟลเดอร์ตามเกม:

```text
board-game-cafe/<gameId>/
```

`<gameId>` ต้องตรงกับ slug ของเกมในโค้ด (เช่น `codenames`, `camel-up`, `fugitive`) เกมที่มีการ์ดเยอะอาจมี subfolder เช่น `board-game-cafe/similo/animals`, `board-game-cafe/splendor/level-one`

### URL ที่ใช้ในแอป

```text
https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/{version}/{public_id}.{นามสกุล}
```

- `q_auto` / `f_auto` — ปรับคุณภาพและฟอร์แมตอัตโนมัติ
- `{version}` — เช่น `v1782402508` (ใช้ pin เป็น `*_CLOUD_VERSION` เมื่ออัปโหลดชุดเดียวกัน)
- `{public_id}` — ชื่อที่ Cloudinary ให้หลังอัปโหลด (มักลงท้ายสุ่ม เช่น `cover_vsaue7`)

ไม่ต้องตั้ง API key สำหรับแสดงรูปใน client/server

### ผูกรูปเข้าโค้ด

| ใช้ทำอะไร                  | ไฟล์                                                         |
| -------------------------- | ------------------------------------------------------------ |
| ปกในล็อบบี้ / รายการเกม    | `packages/shared/src/game-thumbnails.ts`                     |
| การ์ด กระดาน UI ในเกม      | `packages/client/src/imageMap.ts`                            |
| เด็คการ์ดจำนวนมาก (shared) | เช่น `packages/shared/src/similo-deck.ts`, `types/<game>.ts` |
| thumbnail สำรองฝั่ง server | `packages/server/src/games/<slug>/engine.ts`                 |

### ดึงรายการรูปหลังอัปโหลด (Cursor)

เปิด Cloudinary plugin ใน Cursor แล้วให้ AI:

1. ค้นโฟลเดอร์ด้วย MCP `search-folders` (เห็น `board-game-cafe/...`)
2. ค้นรูปในเกมด้วย `search-assets` และ expression  
   `resource_type:image AND asset_folder:"board-game-cafe/<gameId>"`
3. นำ `public_id` และ `version` จากผลลัพธ์ไปใส่ในไฟล์ด้านบน

เอกสารเต็ม (convention, ตัวอย่างเกม, checklist): [`.agents/design/cloudinary-assets.md`](.agents/design/cloudinary-assets.md)

ตัวอย่าง prompt:

```text
ดึงรูปจาก Cloudinary โฟลเดอร์ board-game-cafe/fugitive แล้ว wire เข้า game-thumbnails และ imageMap
```

## Environment Variables

### Server

- `PORT` (default `3001`)
- `CLIENT_URL` (default `http://localhost:5173`) ใช้ตั้งค่า CORS — คั่นด้วย comma ได้หลาย origin เช่นเว็บ production + Capacitor (`https://localhost`, `capacitor://localhost`)

  ตัวอย่าง production สำหรับ board-game-cafe:

  ```text
  CLIENT_URL=https://board-game-cafe-client.vercel.app,https://localhost,capacitor://localhost
  ```

### Client

- `VITE_SERVER_URL` (default `http://localhost:3001`)

## Android (Capacitor debug APK)

แอปโหลด UI จาก **Vercel** (`server.url` ใน [`packages/client/capacitor.config.ts`](packages/client/capacitor.config.ts)) ดังนั้นหลัง push `main`:

- **Web** → Vercel deploy อัตโนมัติ → เปิดแอปแล้วได้ UI ใหม่ (ไม่ต้อง build APK ใหม่)
- **Server** → Docker Hub + Watchtower บน Mini
- **APK ใหม่จำเป็นเมื่อ** เปลี่ยน native เช่น icon, permission, Capacitor plugin, หรือ `server.url`

### Build APK ครั้งแรก / หลังเปลี่ยน native

1. คัดลอก `packages/client/.env.production.example` → `.env.production` แล้วตั้ง `VITE_SERVER_URL` (ใช้ตอน sync bundle สำรอง; runtime หลักมาจาก Vercel ที่มี env ของตัวเอง)
2. บน production ตั้ง `CLIENT_URL` ตามด้านบน (ต้องมี origin ของ Vercel)
3. จาก root:

```bash
pnpm --filter client cap:sync
cd packages/client/android && ./gradlew assembleDebug
```

APK: `packages/client/android-artifacts/app-debug.apk` (หลัง copy) หรือ  
`packages/client/android/app/build/outputs/apk/debug/app-debug.apk`

เปิด Android Studio ด้วย `pnpm --filter client cap:open`

ไอคอนจาก `public/favicon.svg`: `pnpm --filter client cap:icons` แล้ว assembleDebug อีกครั้ง

## REST API (ฝั่ง server)

- `GET /api/health`  
  คืนค่า `status: ok` และ timestamp
- `GET /api/games`  
  คืนรายการเกมที่ระบบรองรับ (เช่น `id`, `name`, `minPlayers`, `maxPlayers`)

## Socket.IO Events

### Client -> Server

- `create-room`  
  Payload: `{ gameId, playerName, playerToken? }`  
  Callback: `{ success, code?, error?, playerToken? }`
- `join-room`  
  Payload: `{ code, playerName, playerToken? }`  
  Callback: `{ success, error?, reconnected? }`
- `leave-room`
- `start-game`  
  (เฉพาะ host เท่านั้น)
- `game-action`  
  ส่ง action ของ “เกมนั้นๆ” (โครงสร้างขึ้นกับเกม)

### Server -> Client

- `room-updated` : อัปเดตข้อมูลห้อง (ผู้เล่น/host/สถานะ)
- `game-started` : เกมเริ่มแล้ว
- `game-state` : ส่ง “มุมมองของผู้เล่น” (ซ่อนข้อมูลลับตาม role)
- `game-over` : ส่งผลผู้ชนะ/เหตุผล
- `error` : ข้อความ error
- `player-disconnected` : ผู้เล่นหลุดการเชื่อมต่อ

## การกลับเข้าเกม (Reconnect) + Player Token

- ฝั่ง client เก็บ `playerToken` และ `playerName` ใน `localStorage` แยกตาม `room code`
- ฝั่ง server อนุญาตให้ reconnect ได้ภายใน **10 นาที** หลังหลุดการเชื่อมต่อ

## เพิ่มเกมใหม่ (Add New Games)

แต่ละเกมเป็น **plugin** ที่ใช้ `gameId` (slug แบบ kebab-case เช่น `cup-the-crab`) เดียวกันทั้ง shared, server และ client

### ก่อนเริ่ม — เตรียมอะไรบ้าง

1. **ชื่อเกม + `gameId`** — ใช้ slug ภาษาอังกฤษตัวเล็กคั่นด้วย `-` (เช่น `my-new-game`)
2. **จำนวนผู้เล่น** — `minPlayers` / `maxPlayers`
3. **กติกาและเฟส** — ลำดับเทิร์น, ข้อมูลลับ (role/card ในมือ), เงื่อนไขจบเกม
4. **Action ที่ผู้เล่นทำได้** — รายการ action ที่ client ส่งผ่าน `game-action` (เช่น `play-card`, `vote`, `end-turn`)
5. **รูปภาพ** — อัปโหลดไป `board-game-cafe/<gameId>/` บน Cloudinary แล้ว wire ตาม [รูปภาพเกม (Cloudinary)](#รูปภาพเกม-cloudinary)
6. **ตัวอย่างเกมอ้างอิง** — เลือกเกมที่มีโครงสร้างใกล้เคียงใน repo แล้วให้ AI ลอก pattern

| ประเภทเกม              | เกมอ้างอิงใน repo            |
| ---------------------- | ---------------------------- |
| ง่าย / party           | `cup-the-crab`, `name-it`    |
| ซ่อนข้อมูลลับ (role)   | `avalon`, `insider`          |
| เกมการ์ดในมือ          | `exploding-kittens`, `flip7` |
| กระดาน + lobby options | `splendor`, `ticket-to-ride` |
| ทีม / คำอธิบาย         | `codenames`, `hues-and-cues` |

เอกสารเชิงลึกสำหรับ AI และนักพัฒนา: [`.agents/skills/board-game-cafe-games/SKILL.md`](.agents/skills/board-game-cafe-games/SKILL.md)

### ลำดับการ implement (ทำตามนี้)

**ลำดับสำคัญ:** `packages/shared` ต้อง compile ก่อน (`pnpm dev` รัน `tsc --watch` ให้อัตโนมัติ)

#### 1. Shared — types กลาง (`packages/shared`)

- สร้าง `packages/shared/src/types/<game>.ts`
  - state เต็ม (`XxxGameState`)
  - union ของ action (`XxxAction`)
  - มุมมองต่อผู้เล่น (`XxxPlayerView`) — สิ่งที่ `getPlayerView` ส่งกลับ (ไม่มีข้อมูลลับของคนอื่น)
- export จาก `packages/shared/src/index.ts`
- (ถ้ามี) เพิ่ม thumbnail ใน `packages/shared/src/game-thumbnails.ts`

Interface หลัก: `GameDefinition` ใน `packages/shared/src/types/game.ts` — ต้องมี `setup`, `onAction`, `getPlayerView`, `isGameOver`

#### 2. Server — engine (`packages/server`)

- สร้างโฟลเดอร์ `packages/server/src/games/<game-slug>/`
  - `engine.ts` — export object ที่เป็น `GameDefinition` (`id`, `name`, `description`, `minPlayers`, `maxPlayers`, `thumbnail` + 4 method)
  - `index.ts` — `registerGame(myGame)`
- เพิ่ม `import './<game-slug>/index.js'` ใน `packages/server/src/games/register-all.ts`
- (ถ้ามี lobby options) เพิ่ม default ใน `packages/server/src/room-manager.ts` → `defaultLobbyOptionsFor`
- (เฉพาะเกมที่มี timer / disconnect พิเศษ) แก้ `packages/server/src/socket-handlers.ts` — เกมส่วนใหญ่ไม่ต้องแก้

#### 3. Client — หน้าเล่น (`packages/client`)

- สร้าง `packages/client/src/games/<game-slug>/<GameName>Game.tsx` (+ `.css` ถ้าต้องการ)
- ใช้ shell ร่วมจาก `components/game-shell/`:
  - `GameShell` — layout หลัก
  - `GamePlayHeader` — ชื่อเกม, ปุ่มออก / รีห้อง
  - `GameOverModal` — จบเกม + confetti
- เกมที่มีการ์ดในมือ: ดู `components/player-hand/` และ `.agents/design/player-hand.md`
- wire ใน `packages/client/src/pages/RoomPage.tsx`:

```tsx
onLeave={requestLeaveFromGame}
onRestart={isHost ? requestRestartToLobby : undefined}
```

- (ถ้ามีตั้งค่าก่อนเริ่ม) สร้าง `components/game-lobby-options/<game-slug>/` แล้วลงทะเบียนใน `registry.ts`

#### 4. ตรวจก่อนปิดงาน

- [ ] `gameId` ตรงกันทุกที่ (shared, server `id`, RoomPage, lobby registry, thumbnails)
- [ ] `register-all.ts` import เกมใหม่แล้ว
- [ ] ทุกคนเห็นปุ่ม **ออกจากห้อง**; หัวห้องเห็น **รีห้อง**; จบเกมแล้ว non-host เห็นข้อความรอหัวห้อง
- [ ] `pnpm lint` หรือ `pnpm build` ผ่าน

### ใช้ Cursor / AI ช่วยสร้างเกม — prompt แนะนำ

อ้างอิง skill ใน repo โดยใส่ `@.agents/skills/board-game-cafe-games/SKILL.md` ในแชท หรือบอกให้ agent อ่าน skill นั้นก่อน implement

#### Prompt เริ่มเกมใหม่ทั้งชุด (แนะนำ)

คัดลอกแล้วแก้ส่วนใน `[...]`:

```text
เพิ่มเกมใหม่ใน Board Game Cafe ตาม skill board-game-cafe-games

เกม: [ชื่อเกมที่แสดง]
gameId: [kebab-case-slug]
ผู้เล่น: [min]–[max] คน
อ้างอิง pattern จาก: [เช่น cup-the-crab หรือ codenames]

กติกาย่อ:
- [เฟส / ลำดับเทิร์น]
- [ข้อมูลลับอะไรบ้าง]
- [เงื่อนไขชนะ]

Actions ที่ต้องรองรับ:
- [action-1]: [คำอธิบาย]
- [action-2]: [คำอธิบาย]

Lobby options (ถ้ามี):
- [ตัวเลือกที่หัวห้องตั้งก่อนเริ่ม]

UI:
- [อธิบายหน้าจอหลัก / องค์ประกอบสำคัญ]
- ใช้ GameShell + GamePlayHeader + GameOverModal

ทำครบ shared → server → client → RoomPage และรัน pnpm lint
```

#### Prompt แยกเป็นขั้น (เกมซับซ้อน)

**ขั้น 1 — types + engine**

```text
สร้างเกม [gameId] ขั้นแรก: shared types (state, action, PlayerView) และ server engine
ใน packages/server/src/games/[game-slug]/ ตาม board-game-cafe-games skill
ยังไม่ต้องทำ UI
```

**ขั้น 2 — UI**

```text
สร้างหน้าเล่น React สำหรับ [gameId] ใน packages/client/src/games/[game-slug]/
wire RoomPage, ใช้ GameShell/GamePlayHeader/GameOverModal
อ้างอิง [ชื่อเกมอ้างอิง]Game.tsx
```

**ขั้น 3 — lobby (ถ้ามี)**

```text
เพิ่ม lobby options สำหรับ [gameId]: component ใน game-lobby-options,
registry, และ defaultLobbyOptionsFor บน server
```

#### Prompt ขยายเกมที่มีอยู่

```text
ขยายเกม [gameId]: [อธิบายฟีเจอร์ เช่น เพิ่ม action discard, เพิ่มเฟส voting]
อัปเดต shared types, server onAction, และ client UI ให้สอดคล้องกัน
อย่าเปลี่ยน gameId
```

#### สิ่งที่ควรใส่ใน prompt เสมอ

- **`gameId`** ที่ต้องการ (slug เดียวทั้ง repo)
- **เกมอ้างอิง** ใน monorepo นี้ (ไม่ใช่โค้ดจากที่อื่น)
- **รายการ action** และ **ข้อมูลลับ** ชัดเจน
- บอกว่าใช้ **GameShell** และ session controls มาตรฐาน (ออก / รีห้อง)

#### สิ่งที่ไม่ควรพึ่ง AI อย่างเดียว

- กติกาที่ซับซ้อน — แนบ rule summary หรือ edge case เอง
- เกมที่มี timer ฝั่ง server — ระบุ timeout และพฤติกรรม disconnect
- One Night Ultimate Werewolf — ห้าม UI ที่บอกว่า role อยู่กับผู้เล่นหรืออยู่กลางโต๊ะ (ดู `AGENTS.md`)

## Build

```bash
pnpm build
```

## หมายเหตุ

ไฟล์ build อย่าง `dist/` และโฟลเดอร์ cache จะถูกละเว้นผ่าน `.gitignore` แล้ว
