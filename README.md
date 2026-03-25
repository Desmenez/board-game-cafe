# Board Game Cafe

Monorepo สำหรับแอปเว็บ “เล่นบอร์ดเกม” แบบเรียลไทม์ ผ่าน **Socket.IO** (รองรับหลายเกมผ่าน plugin)

## ภาพรวม

โปรเจกต์นี้ประกอบด้วย

- `packages/client` : ฝั่งเว็บ (React + Vite)
- `packages/server` : เซิร์ฟเวอร์เกม (Express + Socket.IO)
- `packages/shared` : Type กลาง + Interface ของ “เกม” (ใช้ร่วมกันทั้ง client/server)

เกมที่มีตอนนี้: **Avalon** (`The Resistance: Avalon`)

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

## Environment Variables

### Server

- `PORT` (default `3001`)
- `CLIENT_URL` (default `http://localhost:5173`) ใช้ตั้งค่า CORS

### Client

- `VITE_SERVER_URL` (default `http://localhost:3001`)

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
- ฝั่ง server อนุญาตให้ reconnect ได้ภายใน **30 นาที** หลังหลุดการเชื่อมต่อ

## เพิ่มเกมใหม่ (Add New Games)

1. สร้าง engine ของเกมใน `packages/server/src/games/<your-game>/...`
2. ทำให้ export เป็น `GameDefinition` โดยอย่างน้อยต้อง implement
   - `setup`
   - `onAction`
   - `getPlayerView` (ซ่อนข้อมูลลับ)
   - `isGameOver`
3. ลงทะเบียนใน `packages/server/src/games/<your-game>/index.ts` ผ่าน `registerGame(...)`

## Build

```bash
pnpm build
```

## หมายเหตุ

ไฟล์ build อย่าง `dist/` และโฟลเดอร์ cache จะถูกละเว้นผ่าน `.gitignore` แล้ว
