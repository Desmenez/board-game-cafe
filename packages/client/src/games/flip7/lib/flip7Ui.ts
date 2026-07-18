import type {
  Flip7Card,
  Flip7LastRoundSummaryRow,
  Flip7ModalScript,
  Flip7ModalScriptItem,
  Flip7PendingActionView,
  Flip7PublicPlayer,
  Flip7SpecialDrawBroadcast,
} from 'shared';
import { imageMap } from '../../../imageMap';

/** Match Avalon `RoleReveal` flip feel (CSS 3D card). */
export const F7_FORCED_FLIP_DURATION_SEC = 1;
export const F7_FORCED_FLIP_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const F7_FORCED_FLIP_INTRO_MS = 320;
export const F7_FORCED_FLIP_END_DWELL_MS = 550;

export type Flip7SpecialUi = Flip7SpecialDrawBroadcast & { titleOverride?: string };

export type Flip7FlipCardItem = Extract<Flip7ModalScriptItem, { kind: 'flip_card' }>;

export type Flip7LineRevealPlan = {
  baseByPlayer: Record<string, Flip7Card[]>;
  tailByPlayer: Record<string, Flip7Card[]>;
  /** JOM: การ์ดแอคชันไม่อยู่ใน `items` — โชว์บนแถวก่อน flip แรก */
  initialRevealCountByPlayer?: Record<string, number>;
};

export type Flip7GameOverBoardRow = {
  id: string;
  name: string;
  totalScore: number;
  isWinner: boolean;
  place: number;
};

/** +2…+10 และ x2 ใน `imageMap.flip7.special` — ไม่แสดง special modal */
export function isFlip7ModifierStackCard(c: Flip7Card): boolean {
  return c.kind === 'modifier_add' || c.kind === 'modifier_mul2';
}

export function flip7RecapStatusPill(r: Flip7LastRoundSummaryRow): { mod: string; label: string } {
  if (r.flip7) return { mod: 'flip7', label: 'Flip 7!' };
  if (r.busted) return { mod: 'bust', label: 'BUST' };
  if (r.stayed) return { mod: 'stay', label: 'Stay' };
  return { mod: 'none', label: '—' };
}

/** เลขบนการ์ด number ที่มากที่สุดบนแถว (ไม่นับ modifier / action / SC) */
export function flip7MaxNumberValueOnLine(line: Flip7Card[]): number | null {
  let max: number | null = null;
  for (const c of line) {
    if (c.kind === 'number') {
      if (max === null || c.value > max) max = c.value;
    }
  }
  return max;
}

/** บรรทัดย่อบนปุ่มเลือกเป้า — แต้ม + เลขสูงสุดบนแถว (สอดคล้องกับ `line` ที่โชว์บนกระดาน) */
export function flip7TargetChoiceMeta(
  playerId: string,
  players: Flip7PublicPlayer[],
  line: Flip7Card[],
): string | null {
  const p = players.find((x) => x.id === playerId);
  if (!p) return null;
  const maxNum = flip7MaxNumberValueOnLine(line);
  const high = maxNum !== null ? ` · เลขสูงสุดบนมือ ${maxNum}` : ' · ยังไม่มีเลขบนแถว';
  return `แต้มรวม ${p.totalScore} · รอบนี้ ${p.roundPreviewScore}${high}`;
}

function cardEquals(a: Flip7Card, b: Flip7Card): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function linesMatchTail(full: Flip7Card[], tail: Flip7Card[]): boolean {
  if (tail.length > full.length) return false;
  for (let i = 0; i < tail.length; i++) {
    if (!cardEquals(full[full.length - tail.length + i]!, tail[i]!)) return false;
  }
  return true;
}

/** แยก base / tail ตามลำดับใน `modalScript` เพื่อโชว์บนแถวทีละใบ — ถ้าไม่ตรงกับ state จริงคืน null */
export function computeLineRevealFromScript(
  script: Flip7ModalScript,
  tableLines: Record<string, Flip7Card[]>,
): Flip7LineRevealPlan | null {
  if (script.items.some((i) => i.kind === 'second_chance_consumed')) return null;

  const flipCards = script.items.filter((i): i is Flip7FlipCardItem => i.kind === 'flip_card');
  const hasLeadingActionSpecial = script.items.some(
    (i) =>
      i.kind === 'special_draw' &&
      (i.card.kind === 'action_flip_n' || i.card.kind === 'action_just_one_more'),
  );

  if (flipCards.length > 0 && !hasLeadingActionSpecial) {
    const pid = flipCards[0]!.revealedPlayerId;
    const draws = flipCards.map((f) => f.card);
    const full = tableLines[pid] ?? [];
    if (full.length < draws.length + 1) return null;
    const actionIdx = full.length - draws.length - 1;
    const ac = full[actionIdx]!;
    if (ac.kind !== 'action_just_one_more' && ac.kind !== 'action_flip_n') return null;
    const tail = [ac, ...draws];
    if (!linesMatchTail(full, tail)) return null;
    return {
      baseByPlayer: { [pid]: full.slice(0, actionIdx) },
      tailByPlayer: { [pid]: tail },
      initialRevealCountByPlayer: { [pid]: 1 },
    };
  }

  const defaultFlipTarget = flipCards[0]?.targetPlayerId;

  const tailByPlayer: Record<string, Flip7Card[]> = {};
  const add = (pid: string, c: Flip7Card) => {
    if (!tailByPlayer[pid]) tailByPlayer[pid] = [];
    tailByPlayer[pid].push(c);
  };

  for (const item of script.items) {
    if (item.kind === 'special_draw') {
      const c = item.card;
      if (c.kind === 'action_flip_n' || c.kind === 'action_just_one_more') {
        if (!defaultFlipTarget) return null;
        add(defaultFlipTarget, c);
      } else if (isFlip7ModifierStackCard(c)) {
        add(item.playerId, c);
      } else if (c.kind === 'second_chance') {
        add(item.playerId, c);
      }
    } else if (item.kind === 'flip_card') {
      add(item.revealedPlayerId, item.card);
    } else if (item.kind === 'second_chance_acquired') {
      add(item.playerId, { kind: 'second_chance' });
    }
  }

  if (Object.keys(tailByPlayer).length === 0) return null;

  const baseByPlayer: Record<string, Flip7Card[]> = {};
  for (const pid of Object.keys(tailByPlayer)) {
    const full = tableLines[pid] ?? [];
    const tail = tailByPlayer[pid]!;
    if (!linesMatchTail(full, tail)) return null;
    baseByPlayer[pid] = full.slice(0, full.length - tail.length);
  }
  return { baseByPlayer, tailByPlayer };
}

export function cardLabel(c: Flip7Card): string {
  if (c.kind === 'number') return `${c.value}`;
  if (c.kind === 'modifier_add') return `+${c.value}`;
  if (c.kind === 'modifier_mul2') return 'x2';
  if (c.kind === 'second_chance') return 'Second Chance';
  if (c.kind === 'action_freeze') return 'Freeze';
  if (c.kind === 'action_discard') return 'Discard';
  if (c.kind === 'action_steal') return 'Steal';
  if (c.kind === 'action_flip_n') return `Flip ${c.count}`;
  return 'Just One More';
}

export function cardImage(c: Flip7Card): string {
  const assets = imageMap.flip7;
  if (c.kind === 'number') return assets.number[c.value];
  if (c.kind === 'modifier_add') {
    if (c.value === 2) return assets.special.plus2;
    if (c.value === 4) return assets.special.plus4;
    if (c.value === 6) return assets.special.plus6;
    if (c.value === 8) return assets.special.plus8;
    return assets.special.plus10;
  }
  if (c.kind === 'modifier_mul2') return assets.special.x2;
  if (c.kind === 'second_chance') return assets.special.secondChance;
  if (c.kind === 'action_freeze') return assets.special.freeze;
  if (c.kind === 'action_discard') return assets.special.discard;
  if (c.kind === 'action_steal') return assets.special.steal;
  if (c.kind === 'action_flip_n')
    return c.count === 3 ? assets.special.flip3 : assets.special.flip4;
  return assets.special.justOneMore;
}

export function pendingActionToDrawnCard(pa: Flip7PendingActionView): Flip7Card {
  if (pa.mode === 'bust_second_chance') return pa.duplicateCard;
  if (pa.mode === 'second_chance_gift') return { kind: 'second_chance' };
  if (pa.kind === 'action_flip_n')
    return { kind: 'action_flip_n', count: pa.drawCount === 4 ? 4 : 3 };
  if (pa.kind === 'action_freeze') return { kind: 'action_freeze' };
  if (pa.kind === 'action_discard') return { kind: 'action_discard' };
  if (pa.kind === 'action_steal') return { kind: 'action_steal' };
  return { kind: 'action_just_one_more' };
}

export function cardBackSrc(): string {
  return imageMap.flip7.cardBack;
}

export function specialCardDescription(card: Flip7Card): { title: string; body: string } {
  if (card.kind === 'modifier_add') {
    return {
      title: `การ์ด +${card.value}`,
      body: `บวก ${card.value} แต้มเข้าผลรวมเลขหน้าไพ่เมื่อจบรอบ (นับหลังคูณ x2 ตามจำนวนใบ x2)`,
    };
  }
  if (card.kind === 'modifier_mul2') {
    return {
      title: 'การ์ด x2',
      body: 'คูณผลรวมของเลขทั้งหมดบนโต๊ะด้วย 2 (ซ้อนกับใบ x2 ใบอื่นได้)',
    };
  }
  if (card.kind === 'second_chance') {
    return {
      title: 'Second Chance',
      body: 'เมื่อจั่วเลขซ้ำจะใช้การ์ดนี้แทนการ bust ได้หนึ่งครั้ง (การ์ด Second Chance จะถูกทิ้ง)',
    };
  }
  if (card.kind === 'action_freeze') {
    return {
      title: 'Freeze',
      body: 'บังคับให้เป้าหมายหยุดจั่วทันที (เหมือน Stay) และการ์ดนี้ยังอยู่บนแถวของเป้าหมาย',
    };
  }
  if (card.kind === 'action_discard') {
    return { title: 'Discard', body: 'บังคับให้เป้าหมายทิ้งเลขบนแถวที่มีค่าสูงสุดหนึ่งใบ' };
  }
  if (card.kind === 'action_steal') {
    return {
      title: 'Steal',
      body: 'ขโมยเลขสูงสุดจากแถวเป้าหมายมาใส่มือผู้ใช้การ์ด (ถ้าเลขซ้ำในมือตัวเองจะ bust หรือใช้ Second Chance)',
    };
  }
  if (card.kind === 'action_flip_n') {
    return {
      title: `Flip ${card.count}`,
      body: `บังคับให้เป้าหมายจั่วทันที ${card.count} ใบติดกัน — ถ้าเลขซ้ำจะ bust (หรือใช้ Second Chance)`,
    };
  }
  return {
    title: 'Just One More',
    body: 'บังคับให้เป้าหมายจั่วอีก 1 ใบ',
  };
}

export function buildFlip7GameOverBoard(
  players: Flip7PublicPlayer[],
  winners: string[],
): Flip7GameOverBoardRow[] {
  const winnerSet = new Set(winners);
  return [...players]
    .map((p) => ({
      id: p.id,
      name: p.name,
      totalScore: p.totalScore,
      isWinner: winnerSet.has(p.id),
    }))
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.name.localeCompare(b.name, 'th');
    })
    .map((row, i) => ({ ...row, place: i + 1 }));
}
