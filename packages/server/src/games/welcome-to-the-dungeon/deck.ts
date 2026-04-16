import type { WttdMonsterPower } from 'shared';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** สำรับมอนสเตอร์ — พลัง 1–5 อย่างละ 2 ใบ; พลัง 6, 7, 9 อย่างละ 1 ใบ */
export function buildMonsterDeck(): WttdMonsterPower[] {
  const d: WttdMonsterPower[] = [];
  const doublePowers: WttdMonsterPower[] = [1, 2, 3, 4, 5];
  for (let k = 0; k < 2; k += 1) {
    d.push(...doublePowers);
  }
  d.push(6, 7, 9);
  return shuffle(d);
}
