import type {
  AbracaAction,
  AbracaDieContext,
  AbracaPlayerView,
  AbracaSpellRank,
  AbracaSpellReveal,
  GameDefinition,
  GameResult,
  Player,
} from 'shared';
import { GAME_THUMBNAIL_BY_ID } from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

const TARGET_TOWER = 8 as const;
const MAX_LIFE = 6;
const HAND_SIZE = 5;
const SECRET_COUNT = 4;

/** Stones removed from game before dealing (see box Game Preparation) */
const REMOVE_FOR_PLAYERS: Record<number, number> = {
  2: 12,
  3: 6,
  4: 4,
  5: 0,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function buildFullStoneBag(): number[] {
  const bag: number[] = [];
  for (let r = 1; r <= 8; r += 1) {
    for (let k = 0; k < r; k += 1) bag.push(r);
  }
  return bag;
}

function rollD6(): 1 | 2 | 3 | 4 | 5 | 6 {
  return (1 + Math.floor(Math.random() * 6)) as 1 | 2 | 3 | 4 | 5 | 6;
}

function clampLife(n: number): number {
  return Math.max(0, Math.min(MAX_LIFE, n));
}

interface AbracaState {
  phase: 'playing' | 'game_over';
  roundNo: number;
  playerOrder: string[];
  playerNames: Record<string, string>;
  /** Who starts this round (index into playerOrder) */
  roundStartTurnIndex: number;
  currentTurnIndex: number;
  hands: Record<string, number[]>;
  life: Record<string, number>;
  tower: Record<string, number>;
  /** Secret stones taken this round — ranks (owner knows in view) */
  secretHeld: Record<string, number[]>;
  drawPile: number[];
  secretPile: number[];
  stonesOnBoard: Record<number, number>;
  lastCastRank: number | null;
  successfulCastsThisTurn: number;
  subPhase: 'normal' | 'pick_secret';
  lastDieRoll: { value: 1 | 2 | 3 | 4 | 5 | 6; context: AbracaDieContext } | null;
  lastEvent: string;
  result: GameResult | null;
  /** Index of player who took the last turn (for next round starter) */
  lastTurnPlayerIndex: number;
  /** Tower movement applied last round — tiebreak at game end */
  lastRoundDeltas: Record<string, number> | null;
  lastSpellReveal: AbracaSpellReveal | null;
  spellRevealSeq: number;
}

function idxRight(order: string[], pid: string): number {
  const i = order.indexOf(pid);
  if (i < 0) return 0;
  return (i + 1) % order.length;
}

function idxLeft(order: string[], pid: string): number {
  const i = order.indexOf(pid);
  if (i < 0) return 0;
  return (i - 1 + order.length) % order.length;
}

function neighborRight(order: string[], pid: string): string {
  return order[idxRight(order, pid)]!;
}

function neighborLeft(order: string[], pid: string): string {
  return order[idxLeft(order, pid)]!;
}

function removeOneStone(hand: number[], rank: number): boolean {
  const i = hand.indexOf(rank);
  if (i < 0) return false;
  hand.splice(i, 1);
  return true;
}

function countRank(hand: readonly number[], rank: number): number {
  return hand.filter((x) => x === rank).length;
}

function pushSpellReveal<O extends Omit<AbracaSpellReveal, 'seq'>>(
  s: AbracaState,
  reveal: O,
): void {
  s.spellRevealSeq += 1;
  s.lastSpellReveal = { ...reveal, seq: s.spellRevealSeq } as AbracaSpellReveal;
}

function setupRound(s: AbracaState): void {
  const n = s.playerOrder.length;
  let bag = shuffle(buildFullStoneBag());
  const removeN = REMOVE_FOR_PLAYERS[n] ?? 0;
  if (removeN > 0) {
    bag = bag.slice(removeN);
  }
  s.secretPile = bag.splice(0, SECRET_COUNT);
  s.drawPile = bag;
  s.stonesOnBoard = {};
  s.secretHeld = Object.fromEntries(s.playerOrder.map((id) => [id, [] as number[]]));
  s.lastCastRank = null;
  s.successfulCastsThisTurn = 0;
  s.subPhase = 'normal';
  s.lastDieRoll = null;
  s.lastSpellReveal = null;
  s.spellRevealSeq = 0;

  for (const id of s.playerOrder) {
    s.hands[id] = [];
    s.life[id] = MAX_LIFE;
  }

  for (const id of s.playerOrder) {
    for (let k = 0; k < HAND_SIZE; k += 1) {
      const c = s.drawPile.pop();
      if (c !== undefined) s.hands[id].push(c);
    }
  }

  s.currentTurnIndex = s.roundStartTurnIndex % n;
  s.lastTurnPlayerIndex = s.currentTurnIndex;
}

function advanceToNextTurn(s: AbracaState): void {
  const n = s.playerOrder.length;
  s.lastTurnPlayerIndex = s.currentTurnIndex;
  s.currentTurnIndex = (s.currentTurnIndex + 1) % n;
  s.lastCastRank = null;
  s.successfulCastsThisTurn = 0;
  s.subPhase = 'normal';
  s.lastDieRoll = null;
}

function gainLife(s: AbracaState, pid: string, amt: number): void {
  s.life[pid] = clampLife((s.life[pid] ?? 0) + amt);
}

function loseLife(s: AbracaState, pid: string, amt: number): void {
  s.life[pid] = clampLife((s.life[pid] ?? 0) - amt);
}

function endRoundAndMaybeGame(
  s: AbracaState,
  opts: {
    kind: 'empty_hand' | 'knockout';
    /** +3 bonus recipient (knockout) or empty-hand winner */
    winnerId: string;
    /** You eliminated yourself — survivors +1 only, no +3 */
    soleLoserId?: string;
  },
): void {
  const { kind, winnerId } = opts;
  const n = s.playerOrder.length;
  const deltas: Record<string, number> = Object.fromEntries(s.playerOrder.map((id) => [id, 0]));

  /** ผู้ที่เลือดหมดไม่ได้คะแนนจาก secret stone (กติกากล่อง) */
  const secretBonus = (pid: string) => {
    if ((s.life[pid] ?? 0) <= 0) return 0;
    if (kind === 'empty_hand' && pid !== winnerId) return 0;
    return s.secretHeld[pid]?.length ?? 0;
  };

  if (kind === 'empty_hand') {
    for (const id of s.playerOrder) {
      if (id === winnerId) {
        deltas[id] = 3 + secretBonus(id);
      } else {
        deltas[id] = 0;
        s.life[id] = 0;
      }
    }
  } else if (opts.soleLoserId) {
    const sole = opts.soleLoserId;
    for (const id of s.playerOrder) {
      if (id === sole) deltas[id] = 0;
      else if ((s.life[id] ?? 0) > 0) deltas[id] = 1 + secretBonus(id);
      else deltas[id] = 0;
    }
  } else {
    const w = winnerId;
    for (const id of s.playerOrder) {
      if (id === w) deltas[id] = 3 + secretBonus(id);
      else if ((s.life[id] ?? 0) > 0) deltas[id] = 1 + secretBonus(id);
      else deltas[id] = 0;
    }
  }

  s.lastRoundDeltas = { ...deltas };

  for (const id of s.playerOrder) {
    s.tower[id] = Math.min(TARGET_TOWER, (s.tower[id] ?? 0) + (deltas[id] ?? 0));
  }

  const leaders = s.playerOrder.filter((id) => (s.tower[id] ?? 0) >= TARGET_TOWER);
  if (leaders.length > 0) {
    const ld = s.lastRoundDeltas ?? deltas;
    let winnersList: string[];
    let reason: string;
    if (leaders.length === 1) {
      const w = leaders[0]!;
      winnersList = [w];
      reason = `${s.playerNames[w] ?? w} ถึงชั้น ${TARGET_TOWER} ก่อน`;
    } else {
      const maxDelta = Math.max(...leaders.map((id) => ld[id] ?? 0));
      const topByDelta = leaders.filter((id) => (ld[id] ?? 0) === maxDelta);
      if (topByDelta.length === 1) {
        const w = topByDelta[0]!;
        winnersList = [w];
        reason = `หลายคนถึงชั้น ${TARGET_TOWER} — ผู้ได้แต้มขึ้นหอมากที่สุดในรอบนี้ชนะ`;
      } else {
        const maxLife = Math.max(...topByDelta.map((id) => s.life[id] ?? 0));
        const topByLife = topByDelta.filter((id) => (s.life[id] ?? 0) === maxLife);
        if (topByLife.length === 1) {
          const w = topByLife[0]!;
          winnersList = [w];
          reason = `หลายคนถึงชั้น ${TARGET_TOWER} — ตัดสินจากเลือดที่เหลือ`;
        } else {
          winnersList = [...topByLife];
          reason = `หลายคนถึงชั้น ${TARGET_TOWER} — แต้มรอบและเลือดเท่ากัน · แชร์ชัยชนะ`;
        }
      }
    }
    s.phase = 'game_over';
    s.result = { winners: winnersList, reason };
    s.lastEvent = reason;
    return;
  }

  s.roundNo += 1;
  /** Next round: first player = ซ้ายของผู้ที่กำลังเป็นตอนจบรอบ (กติกา: ต่อจากเทิร์นสุดท้ายของรอบที่แล้ว) */
  s.roundStartTurnIndex = (s.currentTurnIndex + 1) % n;
  setupRound(s);
  if (kind === 'empty_hand') {
    s.lastEvent = `จบรอบ — ${s.playerNames[winnerId]} ใช้หมดมือ · เริ่มรอบ ${s.roundNo}`;
  } else if (opts.soleLoserId) {
    s.lastEvent = `จบรอบ — ${s.playerNames[opts.soleLoserId]} แพ้เพียงลำพัง · เริ่มรอบ ${s.roundNo}`;
  } else {
    s.lastEvent = `จบรอบ — ${s.playerNames[winnerId]} ได้คะแนนรอบนี้ · เริ่มรอบ ${s.roundNo}`;
  }
}

function checkRoundEndAfterKnockout(s: AbracaState, casterId: string): void {
  if (s.phase !== 'playing') return;

  const dead = s.playerOrder.filter((id) => (s.life[id] ?? 0) <= 0);
  if (dead.length === 0) return;

  const casterAlive = (s.life[casterId] ?? 0) > 0;
  const survivors = s.playerOrder.filter((id) => (s.life[id] ?? 0) > 0);

  /** ทำให้ตัวเองหมดเลือดคนเดียว = sole loser — ผู้รอดได้ +1 เท่านั้น */
  if (dead.length === 1 && dead[0] === casterId) {
    endRoundAndMaybeGame(s, {
      kind: 'knockout',
      winnerId: casterId,
      soleLoserId: casterId,
    });
    return;
  }

  /** ผู้ร่ายยังมีเลือด = เป็นผู้ “โจมตีจนรอบจบ” ได้ +3 */
  if (casterAlive) {
    endRoundAndMaybeGame(s, { kind: 'knockout', winnerId: casterId });
    return;
  }

  /** กรณีหายาก: ผู้ร่ายตายไปแล้วแต่มีผู้รอด — ผู้รอดคนสุดท้ายชนะรอบ */
  if (survivors.length === 1) {
    endRoundAndMaybeGame(s, { kind: 'knockout', winnerId: survivors[0]! });
  }
}

function resolveSpellEffect(s: AbracaState, casterId: string, rank: AbracaSpellRank): void {
  const order = s.playerOrder;
  const others = order.filter((id) => id !== casterId);

  switch (rank) {
    case 1: {
      const v = rollD6();
      s.lastDieRoll = { value: v, context: 'dragon_success' };
      for (const id of others) loseLife(s, id, v);
      s.lastEvent = `${s.playerNames[casterId]} ร่ายมังกรโบราณ — ทอยได้ ${v} — ผู้อื่นเสียเลือดคนละ ${v}`;
      break;
    }
    case 2:
      for (const id of others) loseLife(s, id, 1);
      gainLife(s, casterId, 1);
      s.lastEvent = `${s.playerNames[casterId]} ร่ายนักเดินทางแห่งความมืด`;
      break;
    case 3: {
      const v = rollD6();
      s.lastDieRoll = { value: v, context: 'sweet_dream' };
      gainLife(s, casterId, v);
      s.lastEvent = `${s.playerNames[casterId]} ร่ายความฝันหวาน — ฟื้นฟู ${v} (สูงสุด ${MAX_LIFE})`;
      break;
    }
    case 4:
      if (s.secretPile.length === 0) {
        s.lastEvent = `${s.playerNames[casterId]} ร่ายนักร้องราตรี — ไม่มี Secret stone เหลือ`;
      } else {
        s.subPhase = 'pick_secret';
        s.lastEvent = `${s.playerNames[casterId]} ร่ายนักร้องราตรี — เลือก Secret stone`;
      }
      break;
    case 5:
      if (order.length === 2) {
        const other = others[0]!;
        loseLife(s, other, 1);
      } else {
        loseLife(s, neighborLeft(order, casterId), 1);
        loseLife(s, neighborRight(order, casterId), 1);
      }
      s.lastEvent = `${s.playerNames[casterId]} ร่ายพายุสายฟ้า`;
      break;
    case 6:
      loseLife(s, neighborLeft(order, casterId), 1);
      s.lastEvent = `${s.playerNames[casterId]} ร่ายพายุหิมะ`;
      break;
    case 7:
      loseLife(s, neighborRight(order, casterId), 1);
      s.lastEvent = `${s.playerNames[casterId]} ร่ายลูกไฟ`;
      break;
    case 8:
      gainLife(s, casterId, 1);
      s.lastEvent = `${s.playerNames[casterId]} ร่ายเครื่องดื่มวิเศษ`;
      break;
    default:
      break;
  }
}

function toView(s: AbracaState, viewerId: string): AbracaPlayerView {
  const currentPlayerId = s.playerOrder[s.currentTurnIndex]!;
  const othersHands: Record<string, number[]> = {};
  for (const id of s.playerOrder) {
    if (id !== viewerId) {
      othersHands[id] = [...(s.hands[id] ?? [])].sort((a, b) => a - b);
    }
  }

  return {
    phase: s.phase,
    myId: viewerId,
    roundNo: s.roundNo,
    targetTowerFloor: TARGET_TOWER,
    players: s.playerOrder.map((id) => ({
      id,
      name: s.playerNames[id] ?? id,
      life: s.life[id] ?? 0,
      towerFloor: s.tower[id] ?? 0,
      handSize: s.hands[id]?.length ?? 0,
    })),
    othersHands,
    playerOrder: [...s.playerOrder],
    currentPlayerId,
    lastCastRankThisTurn: s.lastCastRank,
    successfulCastsThisTurn: s.successfulCastsThisTurn,
    stonesOnBoardThisRound: { ...s.stonesOnBoard },
    drawPileCount: s.drawPile.length,
    secretPileCount: s.secretPile.length,
    subPhase: s.subPhase,
    pickSecretCount: s.subPhase === 'pick_secret' ? s.secretPile.length : 0,
    lastEvent: s.lastEvent,
    gameResult: s.result ?? undefined,
    lastDieRoll: s.lastDieRoll,
    mySecretRanks: [...(s.secretHeld[viewerId] ?? [])],
    lastSpellReveal: s.lastSpellReveal,
  };
}

function setupInitial(players: Player[]): AbracaState {
  const playerOrder = players.map((p) => p.id);
  const playerNames = Object.fromEntries(players.map((p) => [p.id, p.name]));
  const s: AbracaState = {
    phase: 'playing',
    roundNo: 1,
    playerOrder,
    playerNames,
    roundStartTurnIndex: 0,
    currentTurnIndex: 0,
    hands: Object.fromEntries(playerOrder.map((id) => [id, [] as number[]])),
    life: Object.fromEntries(playerOrder.map((id) => [id, MAX_LIFE])),
    tower: Object.fromEntries(playerOrder.map((id) => [id, 0])),
    secretHeld: Object.fromEntries(playerOrder.map((id) => [id, [] as number[]])),
    drawPile: [],
    secretPile: [],
    stonesOnBoard: {},
    lastCastRank: null,
    successfulCastsThisTurn: 0,
    subPhase: 'normal',
    lastDieRoll: null,
    lastEvent: '',
    result: null,
    lastTurnPlayerIndex: 0,
    lastRoundDeltas: null,
    lastSpellReveal: null,
    spellRevealSeq: 0,
  };
  setupRound(s);
  s.lastEvent = 'เริ่มเกม — ดูมือของผู้อื่นเท่านั้น (คุณมองไม่เห็นมือตัวเอง)';
  return s;
}

function onAction(s: AbracaState, playerId: string, action: AbracaAction): AbracaState {
  if (s.phase === 'game_over') throw new GameActionRejectedError('เกมจบแล้ว');

  const cur = s.playerOrder[s.currentTurnIndex]!;
  if (playerId !== cur) throw new GameActionRejectedError('ยังไม่ถึงตาคุณ');

  if (action.type === 'end_turn') {
    if (s.subPhase === 'pick_secret')
      throw new GameActionRejectedError('ต้องเลือก Secret stone ก่อน');
    if (s.successfulCastsThisTurn < 1)
      throw new GameActionRejectedError('ต้องร่ายเวทสำเร็จอย่างน้อยหนึ่งครั้งก่อนจบเทิร์น');
    advanceToNextTurn(s);
    s.lastEvent = `สิ้นเทิร์น — ถึงตา ${s.playerNames[s.playerOrder[s.currentTurnIndex]!]}`;
    return s;
  }

  if (action.type === 'pick_secret') {
    if (s.subPhase !== 'pick_secret') throw new GameActionRejectedError('ไม่มีขั้นตอนเลือก Secret');
    const idx = action.index;
    if (idx < 0 || idx >= s.secretPile.length)
      throw new GameActionRejectedError('เลขกองไม่ถูกต้อง');
    const stone = s.secretPile.splice(idx, 1)[0];
    if (stone === undefined) throw new GameActionRejectedError('ไม่มีหิน');
    s.secretHeld[playerId]!.push(stone);
    s.subPhase = 'normal';
    s.lastEvent = `${s.playerNames[playerId]} เก็บ Secret stone แล้ว`;
    if ((s.hands[playerId]?.length ?? 0) === 0) {
      endRoundAndMaybeGame(s, { kind: 'empty_hand', winnerId: playerId });
    } else {
      checkRoundEndAfterKnockout(s, playerId);
    }
    return s;
  }

  if (action.type === 'cast_spell') {
    if (s.subPhase === 'pick_secret')
      throw new GameActionRejectedError('ต้องเลือก Secret stone ก่อน');
    const rank = action.spellRank;
    if (rank < 1 || rank > 8) throw new GameActionRejectedError('เลขสเปลล์ไม่ถูกต้อง');
    if (s.lastCastRank !== null && rank < s.lastCastRank) {
      loseLife(s, playerId, 1);
      pushSpellReveal(s, {
        outcome: 'fail_chain',
        playerId,
        spellRank: rank as AbracaSpellRank,
        chainRequiredRank: s.lastCastRank,
      });
      s.lastEvent = `${s.playerNames[playerId]} พยายามร่ายเลขต่ำกว่าลำดับ — เสียเลือด 1`;
      advanceToNextTurn(s);
      return s;
    }

    const hand = s.hands[playerId] ?? [];
    const has = countRank(hand, rank) >= 1;
    if (!has) {
      if (rank === 1) {
        const v = rollD6();
        s.lastDieRoll = { value: v, context: 'dragon_fail' };
        loseLife(s, playerId, v);
        pushSpellReveal(s, {
          outcome: 'fail_dragon',
          playerId,
          spellRank: 1,
          dragonDamage: v,
        });
        s.lastEvent = `${s.playerNames[playerId]} ร่ายมังกรไม่สำเร็จ — ทอยได้ ${v} เสียเลือด ${v}`;
      } else {
        loseLife(s, playerId, 1);
        s.lastDieRoll = null;
        pushSpellReveal(s, {
          outcome: 'fail_no_stone',
          playerId,
          spellRank: rank as AbracaSpellRank,
        });
        s.lastEvent = `${s.playerNames[playerId]} ร่ายไม่สำเร็จ — เสียเลือด 1`;
      }
      checkRoundEndAfterKnockout(s, playerId);
      if (s.phase === 'playing') {
        advanceToNextTurn(s);
      }
      return s;
    }

    removeOneStone(hand, rank);
    s.stonesOnBoard[rank] = (s.stonesOnBoard[rank] ?? 0) + 1;
    s.lastCastRank = rank;
    s.successfulCastsThisTurn += 1;
    pushSpellReveal(s, {
      outcome: 'success',
      playerId,
      spellRank: rank as AbracaSpellRank,
    });

    if ((s.hands[playerId]?.length ?? 0) === 0) {
      endRoundAndMaybeGame(s, { kind: 'empty_hand', winnerId: playerId });
      return s;
    }

    resolveSpellEffect(s, playerId, rank as AbracaSpellRank);

    if ((s.subPhase as 'normal' | 'pick_secret') === 'pick_secret') {
      return s;
    }

    checkRoundEndAfterKnockout(s, playerId);
    return s;
  }

  return s;
}

function isGameOver(s: AbracaState): GameResult | null {
  return s.result;
}

export const abracawhatGame: GameDefinition<AbracaState, AbracaAction> = {
  id: 'abracawhat',
  name: 'Abracada…What?',
  description:
    'ร่ายเวทด้วยการเดาเลขในมือที่มองไม่เห็น — อ่านมือคนอื่น คาดการณ์ และกดดันคู่แข่งขึ้นหอให้ถึงชั้น 8',
  minPlayers: 2,
  maxPlayers: 5,
  thumbnail: GAME_THUMBNAIL_BY_ID.abracawhat ?? '',
  setup: (players: Player[]) => setupInitial(players),
  onAction: (state: AbracaState, playerId: string, action: AbracaAction) =>
    onAction(state, playerId, action),
  getPlayerView: (state: AbracaState, playerId: string) => toView(state, playerId),
  isGameOver: (state: AbracaState) => isGameOver(state),
};
