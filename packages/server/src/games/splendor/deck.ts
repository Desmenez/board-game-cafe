import type { SplendorGem, SplendorGems } from 'shared';

export interface SplendorDevCardDef {
  id: string;
  level: 1 | 2 | 3;
  bonus: SplendorGem;
  prestige: number;
  cost: SplendorGems;
}

export interface SplendorNobleDef {
  id: string;
  prestige: number;
  requires: SplendorGems;
}

const GEMS: SplendorGem[] = ['white', 'blue', 'green', 'red', 'black'];

function z(): SplendorGems {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0 };
}

function norm(p: Partial<SplendorGems>): SplendorGems {
  return { ...z(), ...p };
}

/**
 * สำรับพัฒนาการ — จำนวน 40 / 30 / 20 ตามเกมจริง
 * รูปแบบราคาเป็นเทมเพลตสังเคราะห์ (สมดุลเล่นได้) แทนที่ด้วยข้อมูลจากกล่องได้ภายหลัง
 */
export function buildDevelopmentDeck(): SplendorDevCardDef[] {
  const cards: SplendorDevCardDef[] = [];
  let nid = 0;

  const l1: [number, SplendorGems][] = [
    [0, norm({ white: 1, blue: 1, green: 1, red: 1 })],
    [0, norm({ white: 1, green: 2, red: 1, black: 1 })],
    [0, norm({ white: 2, blue: 2, black: 2 })],
    [0, norm({ white: 1, blue: 2, green: 2 })],
    [1, norm({ green: 1, red: 2, black: 2 })],
    [0, norm({ green: 2, black: 3 })],
    [0, norm({ white: 2, green: 3 })],
    [0, norm({ red: 3, black: 1 })],
  ];

  for (const bonus of GEMS) {
    for (const [prestige, cost] of l1) {
      cards.push({ id: `d${nid++}`, level: 1, bonus, prestige, cost: { ...cost } });
    }
  }

  const l2: [number, SplendorGems][] = [
    [1, norm({ white: 2, blue: 2, green: 3 })],
    [1, norm({ white: 3, blue: 2, green: 2, black: 1 })],
    [2, norm({ blue: 2, green: 3, red: 3 })],
    [2, norm({ green: 2, red: 1, black: 4 })],
    [2, norm({ green: 5, red: 1, black: 2 })],
    [3, norm({ white: 2, blue: 1, red: 4 })],
  ];

  for (const bonus of GEMS) {
    for (const [prestige, cost] of l2) {
      cards.push({ id: `d${nid++}`, level: 2, bonus, prestige, cost: { ...cost } });
    }
  }

  const l3: [number, SplendorGems][] = [
    [3, norm({ white: 3, blue: 3, green: 5 })],
    [4, norm({ white: 3, blue: 3, green: 3, red: 3 })],
    [4, norm({ blue: 6, green: 3, black: 3 })],
    [5, norm({ white: 7, blue: 3, green: 3 })],
  ];

  for (const bonus of GEMS) {
    for (const [prestige, cost] of l3) {
      cards.push({ id: `d${nid++}`, level: 3, bonus, prestige, cost: { ...cost } });
    }
  }

  return cards;
}

export function buildNoblesDeck(): SplendorNobleDef[] {
  return [
    { id: 'n0', prestige: 3, requires: norm({ white: 4, blue: 4 }) },
    { id: 'n1', prestige: 3, requires: norm({ blue: 4, green: 4 }) },
    { id: 'n2', prestige: 3, requires: norm({ green: 4, red: 4 }) },
    { id: 'n3', prestige: 3, requires: norm({ red: 4, black: 4 }) },
    { id: 'n4', prestige: 3, requires: norm({ black: 4, white: 4 }) },
    { id: 'n5', prestige: 3, requires: norm({ white: 3, blue: 3, green: 3 }) },
    { id: 'n6', prestige: 3, requires: norm({ blue: 3, green: 3, red: 3 }) },
    { id: 'n7', prestige: 3, requires: norm({ green: 3, red: 3, black: 3 }) },
    { id: 'n8', prestige: 3, requires: norm({ red: 3, black: 3, white: 3 }) },
    { id: 'n9', prestige: 3, requires: norm({ black: 3, white: 3, blue: 3 }) },
  ];
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
