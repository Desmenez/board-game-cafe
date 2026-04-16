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

/** มอบฮีโร่ไม่ซ้ำ — โหมดปกติ: ชนกันสุ่มคนรับ ที่เหลือได้จากคลาสที่ยังว่าง */
export function assignHeroesUniqueNormal(
  playerIds: string[],
  preferences: Record<string, WttdHeroClass>,
): Record<string, WttdHeroClass> {
  const assignment: Record<string, WttdHeroClass> = {};
  const unassigned = new Set(playerIds);
  const heroOrder = shuffle([...WTTD_HERO_CLASSES]);

  for (const H of heroOrder) {
    const contenders = [...unassigned].filter((id) => preferences[id] === H);
    if (contenders.length === 0) continue;
    if (contenders.length === 1) {
      const id = contenders[0]!;
      assignment[id] = H;
      unassigned.delete(id);
    } else {
      const winner = shuffle(contenders)[0]!;
      assignment[winner] = H;
      unassigned.delete(winner);
    }
  }

  const taken = new Set(Object.values(assignment));
  const freeHeroes = shuffle(WTTD_HERO_CLASSES.filter((h) => !taken.has(h)));
  const rest = shuffle([...unassigned]);
  for (let i = 0; i < rest.length; i += 1) {
    const hid = freeHeroes[i];
    if (!hid) break;
    assignment[rest[i]!] = hid;
  }
  return assignment;
}

/** สุ่มไม่ซ้ำ 1:1 */
export function assignHeroesRandomUnique(playerIds: string[]): Record<string, WttdHeroClass> {
  const heroes = shuffle([...WTTD_HERO_CLASSES]);
  const players = shuffle([...playerIds]);
  const out: Record<string, WttdHeroClass> = {};
  for (let i = 0; i < players.length; i += 1) {
    out[players[i]!] = heroes[i]!;
  }
  return out;
}

export function randomHeroClass(): WttdHeroClass {
  return shuffle([...WTTD_HERO_CLASSES])[0]!;
}
