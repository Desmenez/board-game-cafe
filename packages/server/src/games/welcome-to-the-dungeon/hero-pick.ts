import type { WttdHeroClass } from 'shared';
import { WTTD_HERO_CLASSES } from 'shared';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function randomHeroClass(): WttdHeroClass {
  return shuffle([...WTTD_HERO_CLASSES])[0]!;
}

/** ทุกคนได้ฮีโร่คลาสเดียวกัน — สุ่มคลาสเดียว */
export function assignSharedHeroRandom(playerIds: string[]): Record<string, WttdHeroClass> {
  const h = randomHeroClass();
  const out: Record<string, WttdHeroClass> = {};
  for (const id of playerIds) {
    out[id] = h;
  }
  return out;
}

/**
 * โหมดเลือก — ถ้าทุกคนเลือกคลาสเดียวกันใช้คลาสนั้น
 * ถ้าไม่ตรงกัน สุ่มจากคลาสที่มีคนเลือก (ไม่สุ่มจากคลาสที่ไม่มีใครเลือก)
 */
export function resolveSharedHeroFromVotes(
  playerIds: string[],
  prefs: Record<string, WttdHeroClass>,
): WttdHeroClass {
  const firstId = playerIds[0];
  if (firstId == null) return randomHeroClass();
  const first = prefs[firstId];
  if (first == null) return randomHeroClass();
  let allSame = true;
  for (const id of playerIds) {
    if (prefs[id] !== first) {
      allSame = false;
      break;
    }
  }
  if (allSame) return first;
  const distinct = [...new Set(playerIds.map((id) => prefs[id]!))];
  return shuffle(distinct)[0]!;
}
