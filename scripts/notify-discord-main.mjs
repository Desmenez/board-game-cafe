/**
 * GitHub Actions: ส่งข้อความไป Discord เมื่อมี push เข้า main
 *
 * ชื่อเกม + รูปปกจาก listGames() (เดียวกับ GET /api/games) — URL ปกตั้งใน packages/shared/src/game-thumbnails.ts
 * ต้อง build ก่อนรัน: pnpm --filter shared build && pnpm --filter server build
 *
 * Env: DISCORD_WEBHOOK_URL (required); SITE_BASE_URL ใช้เฉพาะถ้า thumbnail ยังเป็น path แบบ relative จาก engine
 *      GITHUB_BEFORE, GITHUB_AFTER, MANUAL_DIFF, GITHUB_*
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CLIENT_PREFIX = 'packages/client/src/games/';
const SERVER_PREFIX = 'packages/server/src/games/';
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
  return execSync(`git ${args}`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }).trim();
}

async function loadRegistry() {
  const registerAll = pathToFileURL(join(root, 'packages/server/dist/games/register-all.js')).href;
  const registryMod = pathToFileURL(join(root, 'packages/server/dist/games/registry.js')).href;
  const folderMod = pathToFileURL(join(root, 'packages/server/dist/games/folder-to-game-id.js')).href;
  try {
    await import(registerAll);
    const { listGames } = await import(registryMod);
    const { folderSegmentToGameId } = await import(folderMod);
    const list = listGames();
    const byId = new Map(list.map((g) => [g.id, g]));
    return { byId, folderSegmentToGameId };
  } catch (e) {
    console.error(
      'โหลด registry ไม่ได้ — รัน: pnpm --filter shared build && pnpm --filter server build',
    );
    console.error(e);
    process.exit(1);
  }
}

/** @param {{ thumbnail: string }} meta */
function resolveThumbnailForDiscord(meta) {
  const t = meta.thumbnail;
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  const base = process.env.SITE_BASE_URL?.replace(/\/$/, '');
  if (!base) return null;
  return `${base}${t.startsWith('/') ? t : `/${t}`}`;
}

/** @returns {Map<string, Set<string>>} gameId -> set of 'A'|'M'|'D'|'R'|... */
function parseDiff(folderSegmentToGameId) {
  const before = process.env.GITHUB_BEFORE || '';
  const after = process.env.GITHUB_AFTER || 'HEAD';
  const manual = process.env.MANUAL_DIFF === '1';

  let raw;
  try {
    if (manual) {
      try {
        const parent = git(`rev-parse ${after}^`);
        raw = git(`diff --name-status ${parent} ${after}`);
      } catch {
        raw = git(`show --name-status --format="" ${after}`);
      }
    } else {
      let range;
      if (!before || /^0+$/.test(before)) {
        range = `${EMPTY_TREE} ${after}`;
      } else {
        range = `${before} ${after}`;
      }
      raw = git(`diff --name-status ${range}`);
    }
  } catch {
    console.error('git diff failed');
    process.exit(1);
  }

  const byGame = new Map();

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const tab = line.indexOf('\t');
    if (tab === -1) continue;
    const status = line.slice(0, tab).trim();
    const path = line.slice(tab + 1).split('\t').pop();
    if (!path) continue;

    let gameId = null;
    if (path.startsWith(CLIENT_PREFIX)) {
      const folder = path.slice(CLIENT_PREFIX.length).split('/')[0];
      gameId = folderSegmentToGameId(folder, 'client');
    } else if (path.startsWith(SERVER_PREFIX)) {
      const folder = path.slice(SERVER_PREFIX.length).split('/')[0];
      gameId = folderSegmentToGameId(folder, 'server');
    }
    if (!gameId) continue;

    const flag = status.charAt(0);
    if (!byGame.has(gameId)) byGame.set(gameId, new Set());
    byGame.get(gameId).add(flag);
  }

  return byGame;
}

function describeChange(flags) {
  const has = (c) => flags.has(c);
  const parts = [];
  if (has('A')) parts.push('เพิ่มไฟล์');
  if (has('M')) parts.push('แก้ไข');
  if (has('D')) parts.push('ลบไฟล์');
  if (has('R')) parts.push('ย้าย/เปลี่ยนชื่อ');
  if (has('C')) parts.push('คัดลอก');
  return parts.length ? parts.join(' · ') : 'เปลี่ยนแปลง';
}

async function buildPayload(registry) {
  const { byId, folderSegmentToGameId } = registry;
  const repo = process.env.GITHUB_REPOSITORY || '';
  const sha = process.env.GITHUB_SHA || '';
  const actor = process.env.GITHUB_ACTOR || 'unknown';
  const shortSha = sha.slice(0, 7);
  const commitUrl = repo ? `https://github.com/${repo}/commit/${sha}` : '';
  const compareUrl =
    process.env.GITHUB_BEFORE && !/^0+$/.test(process.env.GITHUB_BEFORE) && repo
      ? `https://github.com/${repo}/compare/${process.env.GITHUB_BEFORE}...${sha}`
      : commitUrl;

  const byGame = parseDiff(folderSegmentToGameId);
  const embeds = [];

  const title = 'ขึ้น main แล้ว — Board Game Cafe';
  let description = `[\`${shortSha}\`](${commitUrl}) โดย **${actor}**`;
  if (compareUrl && compareUrl !== commitUrl) {
    description += ` · [ดู diff](${compareUrl})`;
  }

  embeds.push({
    title,
    url: commitUrl || undefined,
    description,
    color: 0x5865f2,
    timestamp: new Date().toISOString(),
  });

  if (byGame.size === 0) {
    embeds[0].description += '\n\n_ไม่มีไฟล์ใต้ `packages/*/src/games/` ในรอบนี้_';
  } else {
    const lines = [];
    const sortedIds = [...byGame.keys()].sort((a, b) => {
      const na = byId.get(a)?.name ?? a;
      const nb = byId.get(b)?.name ?? b;
      return na.localeCompare(nb, 'th');
    });
    for (const id of sortedIds) {
      const flags = byGame.get(id);
      const meta = byId.get(id);
      const label = meta?.name ?? id;
      const note = meta ? '' : ' _(ยังไม่อยู่ใน registry — เพิ่มใน `register-all.ts`)_';
      lines.push(`**${label}** — ${describeChange(flags)}${note}`);
    }
    embeds[0].description += `\n\n**เกมที่เกี่ยวข้อง**\n${lines.join('\n')}`;
  }

  let n = 0;
  const sortedForThumb = [...byGame.keys()].sort((a, b) => {
    const na = byId.get(a)?.name ?? a;
    const nb = byId.get(b)?.name ?? b;
    return na.localeCompare(nb, 'th');
  });
  for (const id of sortedForThumb) {
    if (n >= 9) break;
    const meta = byId.get(id);
    if (!meta) continue;
    const img = resolveThumbnailForDiscord(meta);
    if (!img) continue;
    n += 1;
    embeds.push({
      title: meta.name,
      thumbnail: { url: img },
      color: 0x2b2d31,
    });
  }

  return {
    username: 'Board Game Cafe',
    embeds,
  };
}

const url = process.env.DISCORD_WEBHOOK_URL;
if (!url) {
  console.error('Missing DISCORD_WEBHOOK_URL');
  process.exit(1);
}

const registry = await loadRegistry();
const body = await buildPayload(registry);
const res = await fetch(`${url}?wait=true`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

if (!res.ok) {
  const text = await res.text();
  console.error('Discord error:', res.status, text);
  process.exit(1);
}

console.log('Discord notification sent.');
