import type {
  Flip7Action,
  Flip7AddModifier,
  Flip7Card,
  Flip7LastRoundSummary,
  Flip7ModalScriptItem,
  Flip7NumberValue,
  Flip7PlayerView,
  Flip7SpecialDrawBroadcast,
  GameDefinition,
  GameResult,
  Player,
} from 'shared';
import { GAME_THUMBNAIL_BY_ID } from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

const FLIP7_TARGET_SCORE = 200;
const FLIP7_BONUS = 15;

interface Flip7RoundPlayer {
  line: Flip7Card[];
  active: boolean;
  busted: boolean;
  stayed: boolean;
  flip7: boolean;
  secondChanceAvailable: number;
}

interface Flip7State {
  phase: 'playing' | 'game_over';
  playerOrder: string[];
  playerNames: Record<string, string>;
  scores: Record<string, number>;
  roundPlayers: Record<string, Flip7RoundPlayer>;
  roundNo: number;
  dealerIndex: number;
  currentTurnIndex: number;
  deck: Flip7Card[];
  discard: Flip7Card[];
  pendingAction:
    | {
        mode: 'action_target';
        sourcePlayerId: string;
        card:
          | { kind: 'action_freeze' }
          | { kind: 'action_discard' }
          | { kind: 'action_steal' }
          | { kind: 'action_flip_n'; count: 3 | 4 }
          | { kind: 'action_just_one_more' };
        choices: string[];
      }
    | {
        mode: 'second_chance_gift';
        sourcePlayerId: string;
        giftCard: Flip7Card;
        choices: string[];
      }
    | {
        mode: 'bust_second_chance';
        playerId: string;
        drawnDuplicate: Flip7Card;
      }
    | null;
  lastEvent: string;
  result?: GameResult;
  lastRoundSummary: Flip7LastRoundSummary | null;
  lastSpecialDraw: Flip7SpecialDrawBroadcast | null;
  modalScript: { id: string; items: Flip7ModalScriptItem[] } | null;
}

type Flip7FlipScriptCtx = {
  items: Flip7ModalScriptItem[];
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  flipIndex: number;
  flipTotal: number;
};

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function cloneCard(c: Flip7Card): Flip7Card {
  switch (c.kind) {
    case 'number':
      return { kind: 'number', value: c.value };
    case 'modifier_add':
      return { kind: 'modifier_add', value: c.value };
    case 'modifier_mul2':
      return { kind: 'modifier_mul2' };
    case 'second_chance':
      return { kind: 'second_chance' };
    case 'action_freeze':
      return { kind: 'action_freeze' };
    case 'action_discard':
      return { kind: 'action_discard' };
    case 'action_steal':
      return { kind: 'action_steal' };
    case 'action_flip_n':
      return { kind: 'action_flip_n', count: c.count };
    case 'action_just_one_more':
      return { kind: 'action_just_one_more' };
  }
}

function cloneModalScriptItem(it: Flip7ModalScriptItem): Flip7ModalScriptItem {
  if (it.kind === 'special_draw') return { ...it, card: cloneCard(it.card) };
  if (it.kind === 'flip_card') return { ...it, card: cloneCard(it.card) };
  if (it.kind === 'bust') return { ...it, card: cloneCard(it.card) };
  return { ...it };
}

function cloneModalScript(
  script: { id: string; items: Flip7ModalScriptItem[] } | null,
): { id: string; items: Flip7ModalScriptItem[] } | null {
  return script ? { id: script.id, items: script.items.map(cloneModalScriptItem) } : null;
}

function newBroadcastId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function setLastSpecialDraw(
  s: Flip7State,
  pid: string,
  card: Flip7Card,
  needsTarget: boolean,
): void {
  s.lastSpecialDraw = {
    id: newBroadcastId('sd'),
    playerId: pid,
    playerName: s.playerNames[pid] ?? pid,
    card: cloneCard(card),
    needsTarget,
  };
}

function maybeBroadcastSpecial(
  s: Flip7State,
  pid: string,
  card: Flip7Card,
  needsTarget: boolean,
  allowBroadcast: boolean,
): void {
  if (!allowBroadcast) return;
  setLastSpecialDraw(s, pid, card, needsTarget);
}

function canReceiveSecondChanceGift(rp: Flip7RoundPlayer): boolean {
  return (
    rp.active && rp.secondChanceAvailable === 0 && !rp.line.some((c) => c.kind === 'second_chance')
  );
}

function buildDeck(): Flip7Card[] {
  const d: Flip7Card[] = [];
  for (let n = 0 as Flip7NumberValue; n <= 12; n = (n + 1) as Flip7NumberValue) {
    const copies = n === 0 ? 1 : n;
    for (let i = 0; i < copies; i += 1) d.push({ kind: 'number', value: n });
  }
  const mods: Flip7AddModifier[] = [2, 4, 6, 8, 10];
  for (const v of mods) {
    d.push({ kind: 'modifier_add', value: v });
    d.push({ kind: 'modifier_add', value: v });
  }
  d.push({ kind: 'modifier_mul2' }, { kind: 'modifier_mul2' });
  d.push({ kind: 'second_chance' }, { kind: 'second_chance' }, { kind: 'second_chance' });
  d.push({ kind: 'action_freeze' }, { kind: 'action_freeze' });
  d.push({ kind: 'action_discard' }, { kind: 'action_discard' });
  d.push({ kind: 'action_steal' }, { kind: 'action_steal' });
  d.push({ kind: 'action_flip_n', count: 3 }, { kind: 'action_flip_n', count: 3 });
  d.push({ kind: 'action_flip_n', count: 4 });
  d.push({ kind: 'action_just_one_more' }, { kind: 'action_just_one_more' });
  return shuffle(d);
}

function emptyRoundPlayer(): Flip7RoundPlayer {
  return {
    line: [],
    active: true,
    busted: false,
    stayed: false,
    flip7: false,
    secondChanceAvailable: 0,
  };
}

function currentPlayerId(s: Flip7State): string {
  return s.playerOrder[s.currentTurnIndex]!;
}

function activePlayerIds(s: Flip7State): string[] {
  return s.playerOrder.filter((pid) => s.roundPlayers[pid]!.active);
}

function drawCard(s: Flip7State): Flip7Card {
  if (s.deck.length === 0) {
    if (s.discard.length === 0) throw new GameActionRejectedError('ไพ่หมดสำรับ');
    s.deck = shuffle(s.discard);
    s.discard = [];
  }
  const c = s.deck.pop();
  if (!c) throw new GameActionRejectedError('ไพ่หมดสำรับ');
  return c;
}

function hasNumberInLine(line: Flip7Card[], value: Flip7NumberValue): boolean {
  return line.some((c) => c.kind === 'number' && c.value === value);
}

function distinctNumberCount(line: Flip7Card[]): number {
  const seen: boolean[] = Array(13).fill(false);
  let count = 0;
  for (const c of line) {
    if (c.kind !== 'number') continue;
    if (!seen[c.value]) {
      seen[c.value] = true;
      count += 1;
    }
  }
  return count;
}

function previewScore(rp: Flip7RoundPlayer): number {
  if (rp.busted) return 0;
  const numberSum = rp.line.reduce((sum, c) => (c.kind === 'number' ? sum + c.value : sum), 0);
  const mulCount = rp.line.reduce((n, c) => (c.kind === 'modifier_mul2' ? n + 1 : n), 0);
  const addSum = rp.line.reduce((sum, c) => (c.kind === 'modifier_add' ? sum + c.value : sum), 0);
  return numberSum * 2 ** mulCount + addSum + (rp.flip7 ? FLIP7_BONUS : 0);
}

function applyStealToSource(s: Flip7State, sourceId: string, stolen: Flip7NumberValue): void {
  const src = s.roundPlayers[sourceId]!;
  if (!src.active) return;
  const has = hasNumberInLine(src.line, stolen);
  if (has) {
    if (src.secondChanceAvailable > 0) {
      src.secondChanceAvailable -= 1;
      const scIdx = src.line.findIndex((x) => x.kind === 'second_chance');
      if (scIdx >= 0) {
        const [sc] = src.line.splice(scIdx, 1);
        if (sc) s.discard.push(sc);
      }
      s.lastEvent = `${s.playerNames[sourceId]} ขโมยเลขซ้ำแต่ใช้ Second Chance`;
      return;
    }
    src.line.push({ kind: 'number', value: stolen });
    src.active = false;
    src.busted = true;
    s.lastEvent = `${s.playerNames[sourceId]} bust จากการขโมยเลขซ้ำ ${stolen}`;
    return;
  }
  src.line.push({ kind: 'number', value: stolen });
  if (distinctNumberCount(src.line) >= 7) {
    src.flip7 = true;
    src.active = false;
    s.lastEvent = `${s.playerNames[sourceId]} Flip 7 สำเร็จ (+${FLIP7_BONUS})`;
  }
}

/** Forced Flip 3/4 chain: optional `mergeInto` appends to an outer flip script (nested Flip). */
function executeFlipNForcedDraws(
  s: Flip7State,
  sourceId: string,
  targetId: string,
  action: { kind: 'action_flip_n'; count: 3 | 4 },
  mergeInto: Flip7FlipScriptCtx | null,
): void {
  const target = s.roundPlayers[targetId]!;
  const drawCount = action.count;
  s.lastEvent = `${s.playerNames[sourceId]} บังคับ ${s.playerNames[targetId]} จั่ว ${drawCount} ใบ`;

  const scriptItems = mergeInto?.items ?? ([] as Flip7ModalScriptItem[]);
  scriptItems.push({
    kind: 'special_draw',
    id: newBroadcastId('sd'),
    playerId: sourceId,
    playerName: s.playerNames[sourceId] ?? sourceId,
    card: cloneCard(action),
    needsTarget: false,
  });
  const flipCtx: Flip7FlipScriptCtx = {
    items: scriptItems,
    sourceId,
    sourceName: s.playerNames[sourceId] ?? sourceId,
    targetId,
    targetName: s.playerNames[targetId] ?? targetId,
    flipIndex: 0,
    flipTotal: drawCount,
  };
  for (let i = 0; i < drawCount; i += 1) {
    if (!target.active) break;
    flipCtx.flipIndex = i;
    const bustBefore = target.busted;
    resolveHitForPlayer(s, targetId, false, flipCtx);
    // Action card from forced flip can require target selection; pause chain until resolved.
    if (s.pendingAction) break;
    if (!bustBefore && target.busted) break;
  }
  if (!mergeInto) {
    s.modalScript = { id: newBroadcastId('ms'), items: scriptItems };
  }
}

function resolveActionCard(
  s: Flip7State,
  sourceId: string,
  targetId: string,
  action:
    | { kind: 'action_freeze' }
    | { kind: 'action_discard' }
    | { kind: 'action_steal' }
    | { kind: 'action_flip_n'; count: 3 | 4 }
    | { kind: 'action_just_one_more' },
): void {
  const target = s.roundPlayers[targetId]!;
  target.line.push(action);

  if (action.kind === 'action_freeze') {
    target.active = false;
    target.stayed = true;
    s.lastEvent = `${s.playerNames[sourceId]} ใช้ Freeze ใส่ ${s.playerNames[targetId]}`;
    return;
  }

  if (action.kind === 'action_discard') {
    const numbers = target.line
      .map((c, i) => ({ c, i }))
      .filter(
        (x): x is { c: { kind: 'number'; value: Flip7NumberValue }; i: number } =>
          x.c.kind === 'number',
      );
    if (numbers.length === 0) {
      s.lastEvent = `${s.playerNames[sourceId]} ใช้ Discard ใส่ ${s.playerNames[targetId]} แต่ไม่มีเลขให้ทิ้ง`;
      return;
    }
    let pick = numbers[0]!;
    for (const n of numbers) if (n.c.value > pick.c.value) pick = n;
    const [removed] = target.line.splice(pick.i, 1);
    if (removed) s.discard.push(removed);
    s.lastEvent = `${s.playerNames[sourceId]} ใช้ Discard ใส่ ${s.playerNames[targetId]} (ทิ้งเลข ${pick.c.value})`;
    return;
  }

  if (action.kind === 'action_steal') {
    const numbers = target.line.filter(
      (c): c is { kind: 'number'; value: Flip7NumberValue } => c.kind === 'number',
    );
    if (numbers.length === 0) {
      s.lastEvent = `${s.playerNames[sourceId]} ใช้ Steal ใส่ ${s.playerNames[targetId]} แต่ไม่มีเลขให้ขโมย`;
      return;
    }
    let max = numbers[0]!.value;
    for (const n of numbers) if (n.value > max) max = n.value;
    const idx = target.line.findIndex((c) => c.kind === 'number' && c.value === max);
    if (idx >= 0) {
      const [removed] = target.line.splice(idx, 1);
      if (removed) s.discard.push(removed);
      applyStealToSource(s, sourceId, max);
      if (!s.lastEvent.includes('bust'))
        s.lastEvent = `${s.playerNames[sourceId]} ขโมยเลข ${max} จาก ${s.playerNames[targetId]}`;
    }
    return;
  }

  if (action.kind === 'action_just_one_more') {
    s.lastEvent = `${s.playerNames[sourceId]} บังคับ ${s.playerNames[targetId]} จั่ว 1 ใบ`;
    const scriptItems: Flip7ModalScriptItem[] = [];
    const flipCtx: Flip7FlipScriptCtx = {
      items: scriptItems,
      sourceId,
      sourceName: s.playerNames[sourceId] ?? sourceId,
      targetId,
      targetName: s.playerNames[targetId] ?? targetId,
      flipIndex: 0,
      flipTotal: 1,
    };
    resolveHitForPlayer(s, targetId, false, flipCtx);
    s.modalScript = { id: newBroadcastId('ms'), items: scriptItems };
    return;
  }

  if (action.kind === 'action_flip_n') {
    executeFlipNForcedDraws(s, sourceId, targetId, action, null);
    return;
  }
}

function resolveHitForPlayer(
  s: Flip7State,
  pid: string,
  allowPendingAction: boolean,
  flipScriptCtx?: Flip7FlipScriptCtx,
): void {
  const rp = s.roundPlayers[pid]!;
  if (!rp.active) return;

  const allowBroadcast = allowPendingAction && !flipScriptCtx;

  const card = drawCard(s);
  if (flipScriptCtx) {
    flipScriptCtx.items.push({
      kind: 'flip_card',
      id: newBroadcastId('fc'),
      flipIndex: flipScriptCtx.flipIndex,
      flipTotal: flipScriptCtx.flipTotal,
      card: cloneCard(card),
      revealedPlayerId: pid,
      revealedPlayerName: s.playerNames[pid] ?? pid,
      sourcePlayerId: flipScriptCtx.sourceId,
      sourceName: flipScriptCtx.sourceName,
      targetPlayerId: flipScriptCtx.targetId,
      targetName: flipScriptCtx.targetName,
    });
  }

  if (card.kind === 'number') {
    if (hasNumberInLine(rp.line, card.value)) {
      if (rp.secondChanceAvailable > 0) {
        if (flipScriptCtx) {
          rp.secondChanceAvailable -= 1;
          s.discard.push(card);
          const scIdx = rp.line.findIndex((x) => x.kind === 'second_chance');
          if (scIdx >= 0) {
            const [sc] = rp.line.splice(scIdx, 1);
            if (sc) s.discard.push(sc);
          }
          s.lastEvent = `${s.playerNames[pid]} ใช้ Second Chance ป้องกันการ bust`;
          flipScriptCtx.items.push({
            kind: 'second_chance_consumed',
            id: newBroadcastId('scu'),
            playerId: pid,
            playerName: s.playerNames[pid] ?? pid,
          });
          return;
        }
        if (allowPendingAction) {
          s.pendingAction = {
            mode: 'bust_second_chance',
            playerId: pid,
            drawnDuplicate: cloneCard(card),
          };
          s.lastEvent = `${s.playerNames[pid]} เลขซ้ำ — เลือกใช้ Second Chance หรือ Bust`;
          return;
        }
        rp.secondChanceAvailable -= 1;
        s.discard.push(card);
        const scIdx = rp.line.findIndex((x) => x.kind === 'second_chance');
        if (scIdx >= 0) {
          const [sc] = rp.line.splice(scIdx, 1);
          if (sc) s.discard.push(sc);
        }
        s.lastEvent = `${s.playerNames[pid]} ใช้ Second Chance ป้องกันการ bust`;
        return;
      }
      rp.line.push(card);
      rp.active = false;
      rp.busted = true;
      s.lastEvent = `${s.playerNames[pid]} bust! ได้เลขซ้ำ ${card.value}`;
      if (flipScriptCtx) {
        flipScriptCtx.items.push({
          kind: 'bust',
          id: newBroadcastId('b'),
          playerId: pid,
          playerName: s.playerNames[pid] ?? pid,
          card: cloneCard(card),
        });
      }
      return;
    }
    rp.line.push(card);
    if (distinctNumberCount(rp.line) >= 7) {
      rp.flip7 = true;
      rp.active = false;
      s.lastEvent = `${s.playerNames[pid]} Flip 7 สำเร็จ (+${FLIP7_BONUS})`;
    } else {
      s.lastEvent = `${s.playerNames[pid]} จั่วเลข ${card.value}`;
    }
    return;
  }

  if (card.kind === 'modifier_add') {
    rp.line.push(card);
    s.lastEvent = `${s.playerNames[pid]} ได้การ์ด +${card.value}`;
    if (flipScriptCtx) {
      flipScriptCtx.items.push({
        kind: 'special_draw',
        id: newBroadcastId('sd'),
        playerId: pid,
        playerName: s.playerNames[pid] ?? pid,
        card: cloneCard(card),
        needsTarget: false,
      });
    }
    maybeBroadcastSpecial(s, pid, card, false, allowBroadcast);
    return;
  }

  if (card.kind === 'modifier_mul2') {
    rp.line.push(card);
    s.lastEvent = `${s.playerNames[pid]} ได้การ์ด x2`;
    if (flipScriptCtx) {
      flipScriptCtx.items.push({
        kind: 'special_draw',
        id: newBroadcastId('sd'),
        playerId: pid,
        playerName: s.playerNames[pid] ?? pid,
        card: cloneCard(card),
        needsTarget: false,
      });
    }
    maybeBroadcastSpecial(s, pid, card, false, allowBroadcast);
    return;
  }

  if (card.kind === 'second_chance') {
    if (rp.secondChanceAvailable > 0) {
      const othersAll = activePlayerIds(s).filter((id) => id !== pid);
      const others = othersAll.filter((id) => canReceiveSecondChanceGift(s.roundPlayers[id]!));
      if (others.length === 0) {
        s.discard.push(card);
        if (othersAll.length === 0) {
          s.lastEvent = `${s.playerNames[pid]} จั่ว Second Chance ซ้ำแต่เหลือคนเดียวที่ยังเล่น — ทิ้ง`;
        } else {
          s.lastEvent = `${s.playerNames[pid]} จั่ว Second Chance ซ้ำแต่ไม่มีผู้เล่นที่รับได้ — ทิ้ง`;
        }
        if (flipScriptCtx) {
          flipScriptCtx.items.push({
            kind: 'special_draw',
            id: newBroadcastId('sd'),
            playerId: pid,
            playerName: s.playerNames[pid] ?? pid,
            card: cloneCard(card),
            needsTarget: false,
          });
        }
        maybeBroadcastSpecial(s, pid, card, false, allowBroadcast);
        return;
      }
      if (others.length === 1) {
        const tid = others[0]!;
        const trp = s.roundPlayers[tid]!;
        trp.line.push(card);
        trp.secondChanceAvailable = 1;
        s.lastEvent = `${s.playerNames[pid]} มอบ Second Chance ให้ ${s.playerNames[tid]} (อัตโนมัติ)`;
        if (flipScriptCtx) {
          flipScriptCtx.items.push({
            kind: 'special_draw',
            id: newBroadcastId('sd'),
            playerId: pid,
            playerName: s.playerNames[pid] ?? pid,
            card: cloneCard(card),
            needsTarget: false,
          });
        }
        maybeBroadcastSpecial(s, pid, card, false, allowBroadcast);
        return;
      }
      s.pendingAction = {
        mode: 'second_chance_gift',
        sourcePlayerId: pid,
        giftCard: cloneCard(card),
        choices: others,
      };
      s.lastEvent = `${s.playerNames[pid]} จั่ว Second Chance ซ้ำ — เลือกมอบให้ผู้เล่นอื่น`;
      maybeBroadcastSpecial(s, pid, card, true, allowBroadcast);
      return;
    }
    rp.secondChanceAvailable = 1;
    rp.line.push(card);
    s.lastEvent = `${s.playerNames[pid]} ได้ Second Chance`;
    if (flipScriptCtx) {
      flipScriptCtx.items.push({
        kind: 'second_chance_acquired',
        id: newBroadcastId('sca'),
        playerId: pid,
        playerName: s.playerNames[pid] ?? pid,
      });
    }
    maybeBroadcastSpecial(s, pid, card, false, allowBroadcast);
    return;
  }

  if (
    card.kind === 'action_freeze' ||
    card.kind === 'action_discard' ||
    card.kind === 'action_steal' ||
    card.kind === 'action_flip_n' ||
    card.kind === 'action_just_one_more'
  ) {
    const choices = activePlayerIds(s);
    if (!allowPendingAction) {
      if (flipScriptCtx && choices.length > 1) {
        s.pendingAction = {
          mode: 'action_target',
          sourcePlayerId: pid,
          card,
          choices,
        };
        s.lastEvent = `${s.playerNames[pid]} ต้องเลือกเป้าหมายของการ์ดแอคชัน`;
        maybeBroadcastSpecial(s, pid, card, true, allowBroadcast);
        return;
      }
      const targetId = choices[0] ?? pid;
      if (card.kind === 'action_flip_n' && flipScriptCtx) {
        rp.line.push(card);
        maybeBroadcastSpecial(s, pid, card, false, allowBroadcast);
        executeFlipNForcedDraws(s, pid, targetId, card, flipScriptCtx);
        return;
      }
      if (flipScriptCtx) {
        flipScriptCtx.items.push({
          kind: 'special_draw',
          id: newBroadcastId('sd'),
          playerId: pid,
          playerName: s.playerNames[pid] ?? pid,
          card: cloneCard(card),
            needsTarget: false,
        });
      }
      maybeBroadcastSpecial(s, pid, card, false, allowBroadcast);
      resolveActionCard(s, pid, targetId, card);
      return;
    }
    if (choices.length === 1 && choices[0] === pid) {
      s.pendingAction = {
        mode: 'action_target',
        sourcePlayerId: pid,
        card,
        choices: [pid],
      };
      s.lastEvent = `${s.playerNames[pid]} ต้องเลือกเป้าหมายของการ์ดแอคชัน`;
      maybeBroadcastSpecial(s, pid, card, true, allowBroadcast);
      return;
    }
    if (choices.length <= 1) {
      const targetId = choices[0] ?? pid;
      if (card.kind === 'action_flip_n' && flipScriptCtx) {
        rp.line.push(card);
        maybeBroadcastSpecial(s, pid, card, false, allowBroadcast);
        executeFlipNForcedDraws(s, pid, targetId, card, flipScriptCtx);
        return;
      }
      if (flipScriptCtx) {
        flipScriptCtx.items.push({
          kind: 'special_draw',
          id: newBroadcastId('sd'),
          playerId: pid,
          playerName: s.playerNames[pid] ?? pid,
          card: cloneCard(card),
          needsTarget: false,
        });
      }
      maybeBroadcastSpecial(s, pid, card, false, allowBroadcast);
      resolveActionCard(s, pid, targetId, card);
      return;
    }
    s.pendingAction = {
      mode: 'action_target',
      sourcePlayerId: pid,
      card,
      choices,
    };
    s.lastEvent = `${s.playerNames[pid]} ต้องเลือกเป้าหมายของการ์ดแอคชัน`;
    maybeBroadcastSpecial(s, pid, card, true, allowBroadcast);
  }
}

function findNextActiveTurnIndex(s: Flip7State, startIndex: number): number {
  for (let i = 0; i < s.playerOrder.length; i += 1) {
    const idx = (startIndex + i) % s.playerOrder.length;
    const pid = s.playerOrder[idx]!;
    if (s.roundPlayers[pid]?.active) return idx;
  }
  return startIndex;
}

function shouldEndRound(s: Flip7State): boolean {
  const values = Object.values(s.roundPlayers);
  if (values.some((rp) => rp.flip7)) return true;
  return values.every((rp) => !rp.active);
}

type ScoreRoundRecapCtx =
  | { kind: 'player'; activeBefore: number; soleActiveId?: string }
  | { kind: 'auto' };

function scoreAndCloseRound(s: Flip7State, recapCtx: ScoreRoundRecapCtx): void {
  const endedRoundNo = s.roundNo;
  const roundPointsByPid: Record<string, number> = Object.fromEntries(
    s.playerOrder.map((pid) => [pid, previewScore(s.roundPlayers[pid]!)]),
  );
  const rows = s.playerOrder.map((pid) => {
    const rp = s.roundPlayers[pid]!;
    return {
      id: pid,
      name: s.playerNames[pid] ?? pid,
      roundPoints: roundPointsByPid[pid] ?? 0,
      busted: rp.busted,
      stayed: rp.stayed,
      flip7: rp.flip7,
    };
  });
  const endedWithFlip7 = rows.some((r) => r.flip7);
  const soleActiveBusted =
    recapCtx.kind === 'player' &&
    !!recapCtx.soleActiveId &&
    !!s.roundPlayers[recapCtx.soleActiveId]?.busted;
  const showRecapModal =
    recapCtx.kind === 'player' &&
    (recapCtx.activeBefore === 1 || soleActiveBusted) &&
    !endedWithFlip7;

  const n = s.playerOrder.length;
  const nextDealerIndex = (s.dealerIndex + 1) % n;
  const nextDealerId = s.playerOrder[nextDealerIndex]!;
  const nextDealerName = s.playerNames[nextDealerId] ?? nextDealerId;

  let soloEndingBust: Flip7LastRoundSummary['soloEndingBust'];
  if (showRecapModal && recapCtx.kind === 'player' && recapCtx.soleActiveId) {
    const sid = recapCtx.soleActiveId;
    const rp = s.roundPlayers[sid]!;
    if (rp.busted && rp.line.length > 0) {
      const raw = rp.line[rp.line.length - 1]!;
      soloEndingBust = {
        playerId: sid,
        playerName: s.playerNames[sid] ?? sid,
        card: cloneCard(raw),
      };
    }
  }

  const prefaceModalScript = cloneModalScript(s.modalScript);

  s.lastRoundSummary = {
    endedRoundNo,
    prefaceModalScript,
    rows,
    showRecapModal,
    nextDealerId,
    nextDealerName,
    soloEndingBust: soloEndingBust ?? null,
  };

  for (const pid of s.playerOrder) {
    s.scores[pid] = (s.scores[pid] ?? 0) + (roundPointsByPid[pid] ?? 0);
  }

  const reached = s.playerOrder.filter((pid) => (s.scores[pid] ?? 0) >= FLIP7_TARGET_SCORE);
  if (reached.length > 0) {
    let top = -Infinity;
    for (const pid of s.playerOrder) top = Math.max(top, s.scores[pid] ?? 0);
    const winners = s.playerOrder.filter((pid) => (s.scores[pid] ?? 0) === top);
    s.phase = 'game_over';
    s.result = {
      winners,
      reason:
        winners.length === 1
          ? `${s.playerNames[winners[0]!]} ชนะที่ ${top} คะแนน`
          : `เสมอที่ ${top} คะแนน`,
    };
    s.lastEvent = 'เกมจบแล้ว';
    return;
  }

  for (const pid of s.playerOrder) {
    s.discard.push(...s.roundPlayers[pid]!.line);
  }

  s.dealerIndex = (s.dealerIndex + 1) % s.playerOrder.length;
  startNewRound(s);
}

function startNewRound(s: Flip7State): void {
  s.roundNo += 1;
  s.modalScript = null;
  for (const pid of s.playerOrder) {
    s.roundPlayers[pid] = emptyRoundPlayer();
  }

  if (shouldEndRound(s)) {
    scoreAndCloseRound(s, { kind: 'auto' });
    return;
  }

  s.currentTurnIndex = findNextActiveTurnIndex(s, s.dealerIndex);
  s.lastEvent = `เริ่มรอบ ${s.roundNo} — มือว่าง จั่วการ์ดด้วย Hit ตาแรก ${s.playerNames[currentPlayerId(s)]}`;
}

function toView(s: Flip7State, viewerId: string): Flip7PlayerView {
  const players = s.playerOrder.map((pid) => {
    const rp = s.roundPlayers[pid]!;
    return {
      id: pid,
      name: s.playerNames[pid] ?? pid,
      totalScore: s.scores[pid] ?? 0,
      roundPreviewScore: previewScore(rp),
      active: rp.active,
      busted: rp.busted,
      stayed: rp.stayed,
      flip7: rp.flip7,
      lineCount: rp.line.length,
    };
  });
  return {
    phase: s.phase,
    myId: viewerId,
    round: s.roundNo,
    targetScore: FLIP7_TARGET_SCORE,
    dealerId: s.playerOrder[s.dealerIndex]!,
    currentPlayerId: currentPlayerId(s),
    players,
    tableLines: Object.fromEntries(
      s.playerOrder.map((pid) => [pid, [...s.roundPlayers[pid]!.line]]),
    ),
    deckRemaining: s.deck.length,
    discardCount: s.discard.length,
    lastEvent: s.lastEvent,
    canAct:
      s.phase === 'playing' &&
      currentPlayerId(s) === viewerId &&
      s.roundPlayers[viewerId]!.active &&
      (s.pendingAction == null
        ? true
        : s.pendingAction.mode === 'bust_second_chance'
          ? s.pendingAction.playerId === viewerId
          : s.pendingAction.sourcePlayerId === viewerId),
    pendingAction: s.pendingAction
      ? s.pendingAction.mode === 'action_target'
        ? {
            mode: 'action_target',
            kind: s.pendingAction.card.kind,
            sourcePlayerId: s.pendingAction.sourcePlayerId,
            targetOptions: s.pendingAction.choices.map((id) => ({
              id,
              name: s.playerNames[id] ?? id,
            })),
            drawCount:
              s.pendingAction.card.kind === 'action_flip_n'
                ? s.pendingAction.card.count
                : s.pendingAction.card.kind === 'action_just_one_more'
                  ? 1
                  : undefined,
          }
        : s.pendingAction.mode === 'second_chance_gift'
          ? {
              mode: 'second_chance_gift',
              sourcePlayerId: s.pendingAction.sourcePlayerId,
              targetOptions: s.pendingAction.choices.map((id) => ({
                id,
                name: s.playerNames[id] ?? id,
              })),
            }
          : {
              mode: 'bust_second_chance',
              playerId: s.pendingAction.playerId,
              duplicateCard: cloneCard(s.pendingAction.drawnDuplicate),
            }
      : undefined,
    gameResult: s.result ? { ...s.result } : undefined,
    lastRoundSummary: s.lastRoundSummary,
    lastSpecialDraw: s.lastSpecialDraw,
    modalScript: cloneModalScript(s.modalScript),
  };
}

export const flip7Game: GameDefinition<Flip7State, Flip7Action> = {
  id: 'flip7',
  name: 'Flip 7',
  description: 'Press your luck: Hit หรือ Stay, bust ถ้าเลขซ้ำ และสะสมให้ถึง 200 แต้ม',
  minPlayers: 2,
  maxPlayers: 18,
  thumbnail:
    GAME_THUMBNAIL_BY_ID.flip7 ??
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/cover_uj4rum',

  setup(players: Player[]): Flip7State {
    const playerOrder = shuffle(players.map((p) => p.id));
    const playerNames: Record<string, string> = {};
    const scores: Record<string, number> = {};
    const roundPlayers: Record<string, Flip7RoundPlayer> = {};
    for (const p of players) {
      playerNames[p.id] = p.name;
      scores[p.id] = 0;
      roundPlayers[p.id] = emptyRoundPlayer();
    }

    const s: Flip7State = {
      phase: 'playing',
      playerOrder,
      playerNames,
      scores,
      roundPlayers,
      roundNo: 0,
      dealerIndex: 0,
      currentTurnIndex: 0,
      deck: buildDeck(),
      discard: [],
      pendingAction: null,
      lastEvent: 'เริ่มเกม',
      lastRoundSummary: null,
      lastSpecialDraw: null,
      modalScript: null,
    };
    startNewRound(s);
    return s;
  },

  onAction(state: Flip7State, playerId: string, action: Flip7Action): Flip7State {
    const s: Flip7State = {
      ...state,
      playerOrder: [...state.playerOrder],
      playerNames: { ...state.playerNames },
      scores: { ...state.scores },
      roundPlayers: Object.fromEntries(
        Object.entries(state.roundPlayers).map(([pid, rp]) => [pid, { ...rp, line: [...rp.line] }]),
      ) as Flip7State['roundPlayers'],
      deck: [...state.deck],
      discard: [...state.discard],
      pendingAction: state.pendingAction
        ? state.pendingAction.mode === 'action_target'
          ? {
              mode: 'action_target',
              sourcePlayerId: state.pendingAction.sourcePlayerId,
              card: { ...state.pendingAction.card },
              choices: [...state.pendingAction.choices],
            }
          : state.pendingAction.mode === 'second_chance_gift'
            ? {
                mode: 'second_chance_gift',
                sourcePlayerId: state.pendingAction.sourcePlayerId,
                giftCard: cloneCard(state.pendingAction.giftCard),
                choices: [...state.pendingAction.choices],
              }
            : {
                mode: 'bust_second_chance',
                playerId: state.pendingAction.playerId,
                drawnDuplicate: cloneCard(state.pendingAction.drawnDuplicate),
              }
        : null,
      result: state.result ? { ...state.result } : undefined,
      lastRoundSummary: state.lastRoundSummary,
      lastSpecialDraw: state.lastSpecialDraw,
      modalScript: cloneModalScript(state.modalScript),
    };

    if (s.phase !== 'playing') throw new GameActionRejectedError('เกมจบแล้ว');
    const allowedByPending =
      s.pendingAction != null &&
      (s.pendingAction.mode === 'bust_second_chance'
        ? s.pendingAction.playerId === playerId
        : s.pendingAction.sourcePlayerId === playerId);
    if (currentPlayerId(s) !== playerId && !allowedByPending)
      throw new GameActionRejectedError('ยังไม่ถึงตาคุณ');
    if (!s.roundPlayers[playerId]!.active && !allowedByPending)
      throw new GameActionRejectedError('คุณไม่ได้อยู่ในรอบนี้แล้ว');

    if (s.pendingAction) {
      if (s.pendingAction.mode === 'bust_second_chance') {
        if (action.type !== 'resolve_bust_second_chance') {
          throw new GameActionRejectedError('ต้องเลือกใช้ Second Chance หรือ Bust');
        }
      } else if (action.type !== 'resolve_pending_action') {
        throw new GameActionRejectedError('ต้องเลือกเป้าหมายการ์ดแอคชันก่อน');
      }
    }

    if (action.type === 'hit' || action.type === 'stay') {
      s.modalScript = null;
    }
    if (
      action.type === 'hit' ||
      action.type === 'stay' ||
      action.type === 'resolve_pending_action' ||
      action.type === 'resolve_bust_second_chance'
    ) {
      s.lastSpecialDraw = null;
    }

    const activeIdsNow = s.playerOrder.filter((pid) => s.roundPlayers[pid]!.active);
    const activeBeforeAction = activeIdsNow.length;
    const soleActiveId = activeBeforeAction === 1 ? activeIdsNow[0] : undefined;

    if (action.type === 'hit') {
      resolveHitForPlayer(s, playerId, true);
    } else if (action.type === 'stay') {
      s.roundPlayers[playerId]!.active = false;
      s.roundPlayers[playerId]!.stayed = true;
      s.lastEvent = `${s.playerNames[playerId]} อยู่ (Stay)`;
    } else if (action.type === 'resolve_bust_second_chance') {
      const pa = s.pendingAction;
      if (!pa || pa.mode !== 'bust_second_chance') {
        throw new GameActionRejectedError('ไม่มีสถานะรอตัดสิน Bust');
      }
      if (pa.playerId !== playerId) throw new GameActionRejectedError('ไม่ใช่เทิร์นของคุณ');
      const rp = s.roundPlayers[playerId]!;
      if (action.useSecondChance) {
        if (rp.secondChanceAvailable <= 0) throw new GameActionRejectedError('ไม่มี Second Chance');
        rp.secondChanceAvailable -= 1;
        s.discard.push(cloneCard(pa.drawnDuplicate));
        const scIdx = rp.line.findIndex((x) => x.kind === 'second_chance');
        if (scIdx >= 0) {
          const [sc] = rp.line.splice(scIdx, 1);
          if (sc) s.discard.push(sc);
        }
        s.lastEvent = `${s.playerNames[playerId]} ใช้ Second Chance ป้องกันการ bust`;
      } else {
        rp.line.push(cloneCard(pa.drawnDuplicate));
        rp.active = false;
        rp.busted = true;
        s.lastEvent = `${s.playerNames[playerId]} bust! ได้เลขซ้ำ ${pa.drawnDuplicate.kind === 'number' ? pa.drawnDuplicate.value : '?'}`;
      }
      s.pendingAction = null;
      s.modalScript = null;
    } else if (action.type === 'resolve_pending_action') {
      const pa = s.pendingAction;
      if (!pa || pa.mode === 'bust_second_chance') {
        throw new GameActionRejectedError('ไม่มีการ์ดแอคชันรอเลือกเป้าหมาย');
      }
      if (pa.sourcePlayerId !== playerId)
        throw new GameActionRejectedError('ไม่มีการ์ดแอคชันรอเลือกเป้าหมาย');
      if (!pa.choices.includes(action.targetPlayerId))
        throw new GameActionRejectedError('เลือกเป้าหมายไม่ถูกต้อง');
      if (pa.mode === 'second_chance_gift') {
        const tgt = s.roundPlayers[action.targetPlayerId]!;
        tgt.line.push(cloneCard(pa.giftCard));
        tgt.secondChanceAvailable = 1;
        s.pendingAction = null;
        s.lastEvent = `${s.playerNames[playerId]} มอบ Second Chance ให้ ${s.playerNames[action.targetPlayerId]}`;
      } else {
        resolveActionCard(s, playerId, action.targetPlayerId, pa.card);
        s.pendingAction = null;
      }
    }

    if (shouldEndRound(s)) {
      scoreAndCloseRound(s, {
        kind: 'player',
        activeBefore: activeBeforeAction,
        soleActiveId,
      });
      return s;
    }

    if (s.pendingAction) return s;

    s.currentTurnIndex = findNextActiveTurnIndex(
      s,
      (s.currentTurnIndex + 1) % s.playerOrder.length,
    );
    return s;
  },

  getPlayerView(state: Flip7State, playerId: string): Flip7PlayerView {
    return toView(state, playerId);
  },

  isGameOver(state: Flip7State): GameResult | null {
    return state.phase === 'game_over' && state.result ? state.result : null;
  },
};
