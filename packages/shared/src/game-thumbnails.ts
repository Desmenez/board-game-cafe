/**
 * ปกเกม (URL เต็ม) — แก้หรือเพิ่มที่นี่ที่เดียว
 * ใช้กับ GET /api/games, ข้อมูลห้อง (gameMeta), และ Discord notify
 *
 * - key ต้องตรงกับ `GameDefinition.id` ของแต่ละเกม
 * - ถ้าเว้นว่าง `''` หรือไม่ใส่ key → ใช้ค่า `thumbnail` จาก engine เป็น fallback
 */

export const GAME_THUMBNAIL_BY_ID: Partial<Record<string, string>> = {
  avalon:
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1774628592/cover_pkoxtl',
  'exploding-kittens':
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1774699068/cover_awa2ej',
  insider:
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1775788472/cover_fucyzs.jpg',
  splendor:
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1777178930/cover_tsasdb.webp',
  'sheriff-of-nottingham':
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1775814353/cover_pwhivm',
  'welcome-to-the-dungeon':
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1776052607/cover_llot6w',
  'ticket-to-ride': 'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/cover_ouh48b',
  flip7: 'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/cover_uj4rum',
  abracawhat:
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1776529785/cover_edcqew',
  codenames:
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1777557982/cover_v1euj7.jpg',
  'one-night-ultimate-werewolf':
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1777643831/cover-1_k3n3lz.jpg',
  'panic-on-wall-street':
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/cover_klrqhw',
  'cup-the-crab':
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1778991655/cover_cvy1xh',
  similo:
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1779598181/cover_vhoutg.webp',
  'camel-up':
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1781249764/cover_nqk5ba',
  fugitive:
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1782402508/cover_vsaue7.webp',
  'love-letter': '',
};

/** URL ที่จะโชว์ในแคตตาล็อก / ห้อง — ค่าใน GAME_THUMBNAIL_BY_ID ชนะถ้ามีและไม่ว่าง */
export function resolveGameThumbnail(gameId: string, engineThumbnail: string): string {
  const u = GAME_THUMBNAIL_BY_ID[gameId];
  if (typeof u === 'string' && u.trim() !== '') return u.trim();
  return engineThumbnail;
}
