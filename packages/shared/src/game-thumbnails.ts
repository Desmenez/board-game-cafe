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
  splendor: '',
  'sheriff-of-nottingham':
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1775814353/cover_pwhivm',
  'welcome-to-the-dungeon':
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1776052607/cover_llot6w',
  'ticket-to-ride':
    'https://upload.wikimedia.org/wikipedia/commons/5/5b/Ticket_to_Ride_Board_Game.jpg',
  flip7: 'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/cover_uj4rum',
  abracawhat:
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1776529785/cover_edcqew',
};

/** URL ที่จะโชว์ในแคตตาล็อก / ห้อง — ค่าใน GAME_THUMBNAIL_BY_ID ชนะถ้ามีและไม่ว่าง */
export function resolveGameThumbnail(gameId: string, engineThumbnail: string): string {
  const u = GAME_THUMBNAIL_BY_ID[gameId];
  if (typeof u === 'string' && u.trim() !== '') return u.trim();
  return engineThumbnail;
}
