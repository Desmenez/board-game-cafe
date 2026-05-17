import type { GameDefinition, GameResult, Player } from 'shared';
import type {
  OnuwAction,
  OnuwNightSecretView,
  OnuwNightStep,
  OnuwNightStepKind,
  OnuwPhase,
  OnuwPlayerView,
  OnuwRole,
  OnuwScriptCard,
} from 'shared';
import {
  GAME_THUMBNAIL_BY_ID,
  ONUW_NIGHT_STEP_MS,
  ONUW_ROLE_DESCRIPTION_TH,
  ONUW_SCRIPT_CARDS,
  ONUW_VOTE_PHASE_MS,
  onuwOrderedCompositionSlots,
  onuwTeamForRole,
  onuwValidCompositionSlotKeys,
  onuwVoteEliminationRevealPhaseDurationMs,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;

/** Doppel ก็อปแล้วต้องทำแอ็กชันในขั้น Doppel ทันที — ไม่ตื่นซ้ำในเฟสนี้อีก */
const ONUW_DOPPEL_INSTANT_COPIED_ROLES: ReadonlySet<OnuwRole> = new Set([
  'seer',
  'robber',
  'troublemaker',
  'drunk',
]);

/** ค่าใน `votes[playerId]` เมื่อเลือกไม่โหวตใคร — ไม่ชนกับรหัสผู้เล่น */
const ONUW_VOTE_ABSTAIN = '__onuw_vote_abstain__';

/** ลำดับตื่นตามกล่องหลัก — ข้ามขั้นที่ไม่มีผู้เล่น */
const NIGHT_KIND_ORDER: readonly OnuwNightStepKind[] = [
  'doppelganger',
  'werewolf',
  'minion',
  'mason',
  'seer',
  'robber',
  'troublemaker',
  'drunk',
  'insomniac',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** สุ่มการ์ดเข้าเกม — ตามกฎต้องมีหมาป่าอย่างน้อย 1 ใบในกองที่เล่นเสมอ */
function pickGameCards(playerCount: number): OnuwScriptCard[] {
  const need = playerCount + 3;
  if (need > ONUW_SCRIPT_CARDS.length) {
    throw new Error('ONUW: script deck smaller than players + center');
  }

  const wolfIndices: number[] = [];
  for (let i = 0; i < ONUW_SCRIPT_CARDS.length; i += 1) {
    if (ONUW_SCRIPT_CARDS[i]!.role === 'werewolf') wolfIndices.push(i);
  }
  if (wolfIndices.length < 1) {
    throw new Error('ONUW: script needs at least one werewolf card');
  }

  const wolfPick = wolfIndices[Math.floor(Math.random() * wolfIndices.length)]!;
  const mandatory = ONUW_SCRIPT_CARDS[wolfPick]!;
  const pool: OnuwScriptCard[] = [];
  for (let i = 0; i < ONUW_SCRIPT_CARDS.length; i += 1) {
    if (i !== wolfPick) pool.push(ONUW_SCRIPT_CARDS[i]!);
  }
  const rest = shuffle(pool).slice(0, need - 1);
  return shuffle([mandatory, ...rest]);
}

function buildSeatCardIndex(
  playerIds: string[],
  gameCards: OnuwScriptCard[],
): Record<string, number> {
  const indices = shuffle(gameCards.map((_, i) => i));
  const out: Record<string, number> = {};
  playerIds.forEach((pid, i) => {
    out[pid] = indices[i]!;
  });
  out.center_0 = indices[playerIds.length]!;
  out.center_1 = indices[playerIds.length + 1]!;
  out.center_2 = indices[playerIds.length + 2]!;
  return out;
}

function roleAtSeat(s: OnuwState, seat: string): OnuwRole {
  const idx = s.seatCardIndex[seat];
  if (idx === undefined) throw new Error('bad seat');
  return s.gameCards[idx]!.role;
}

function cardAtSeat(s: OnuwState, seat: string): OnuwScriptCard {
  return s.gameCards[s.seatCardIndex[seat]!]!;
}

function swapSeats(s: OnuwState, a: string, b: string): void {
  const ia = s.seatCardIndex[a];
  const ib = s.seatCardIndex[b];
  if (ia === undefined || ib === undefined) return;
  s.seatCardIndex[a] = ib;
  s.seatCardIndex[b] = ia;
}

function roleAtNightBegin(s: OnuwState, playerId: string): OnuwRole {
  const idx = s.nightBeginSeatCardIndex[playerId];
  if (idx === undefined) return 'villager';
  return s.gameCards[idx]!.role;
}

function cardAtNightBegin(s: OnuwState, playerId: string): OnuwScriptCard {
  const idx = s.nightBeginSeatCardIndex[playerId];
  if (idx === undefined) return s.gameCards[0]!;
  return s.gameCards[idx]!;
}

/** บทบาทที่ผู้เล่น «สวม» ระหว่างคืน — Doppel ใช้การ์ดที่ดูจากผู้อื่นตอนเริ่มคืน */
function effectiveNightRole(s: OnuwState, playerId: string): OnuwRole | undefined {
  const dealt = roleAtNightBegin(s, playerId);
  if (dealt === 'doppelganger') {
    return s.doppelCopiedRole[playerId];
  }
  return dealt;
}

function skipDoppelWhoDidInstantRole(
  s: OnuwState,
  playerId: string,
  phaseKind: OnuwNightStepKind,
): boolean {
  if (roleAtNightBegin(s, playerId) !== 'doppelganger') return false;
  if (!s.doppelInstantNightDone[playerId]) return false;
  return (
    phaseKind === 'seer' ||
    phaseKind === 'robber' ||
    phaseKind === 'troublemaker' ||
    phaseKind === 'drunk'
  );
}

function collectActors(s: OnuwState, kind: OnuwNightStepKind): string[] {
  const pids = s.players.map((p) => p.id);
  switch (kind) {
    case 'doppelganger':
      return pids.filter((id) => roleAtNightBegin(s, id) === 'doppelganger');
    case 'werewolf':
      return pids.filter((id) => effectiveNightRole(s, id) === 'werewolf');
    case 'minion': {
      const anyWolfPlayer = pids.some((id) => effectiveNightRole(s, id) === 'werewolf');
      if (!anyWolfPlayer) return [];
      return pids.filter(
        (id) => roleAtNightBegin(s, id) === 'minion' || effectiveNightRole(s, id) === 'minion',
      );
    }
    case 'mason':
      return pids.filter((id) => effectiveNightRole(s, id) === 'mason');
    case 'seer':
      return pids.filter(
        (id) => effectiveNightRole(s, id) === 'seer' && !skipDoppelWhoDidInstantRole(s, id, 'seer'),
      );
    case 'robber':
      return pids.filter(
        (id) =>
          effectiveNightRole(s, id) === 'robber' && !skipDoppelWhoDidInstantRole(s, id, 'robber'),
      );
    case 'troublemaker':
      return pids.filter(
        (id) =>
          effectiveNightRole(s, id) === 'troublemaker' &&
          !skipDoppelWhoDidInstantRole(s, id, 'troublemaker'),
      );
    case 'drunk':
      return pids.filter(
        (id) =>
          effectiveNightRole(s, id) === 'drunk' && !skipDoppelWhoDidInstantRole(s, id, 'drunk'),
      );
    case 'insomniac':
      return pids.filter((id) => effectiveNightRole(s, id) === 'insomniac');
    default:
      return [];
  }
}

function nightKindAppearsInDeck(kind: OnuwNightStepKind, gameCards: OnuwScriptCard[]): boolean {
  const roles = new Set(gameCards.map((c) => c.role));
  switch (kind) {
    case 'doppelganger':
      return roles.has('doppelganger');
    case 'werewolf':
      return roles.has('werewolf');
    case 'minion':
      return roles.has('minion');
    case 'mason':
      return roles.has('mason');
    case 'seer':
      return roles.has('seer');
    case 'robber':
      return roles.has('robber');
    case 'troublemaker':
      return roles.has('troublemaker');
    case 'drunk':
      return roles.has('drunk');
    case 'insomniac':
      return roles.has('insomniac');
    default:
      return false;
  }
}

/** ลำดับขั้นคืน = บทที่มีในการ์ดชุดนี้ (ไม่ข้าม — ขั้นไม่มีผู้เล่นจะจับเวลารอเท่านั้น) */
function buildNightSchedule(gameCards: OnuwScriptCard[]): OnuwNightStepKind[] {
  const out: OnuwNightStepKind[] = [];
  for (const kind of NIGHT_KIND_ORDER) {
    if (nightKindAppearsInDeck(kind, gameCards)) out.push(kind);
  }
  return out;
}

function setNightStepDeadline(s: OnuwState): void {
  if (s.phase === 'night') {
    s.nightStepEndsAtMs = Date.now() + ONUW_NIGHT_STEP_MS;
  } else {
    s.nightStepEndsAtMs = null;
  }
}

/** ลำดับแอ็กชันในเฟสเดียวกัน (หลายคนที่เป็นบทบาทเดียวกัน) */
function orderedActorsForStep(s: OnuwState, actorIds: string[]): string[] {
  const order = s.players.map((p) => p.id);
  return actorIds.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function nextActorPending(s: OnuwState, orderedActorIds: string[]): string | undefined {
  return orderedActorIds.find((id) => !s.nightAckInStep[id]);
}

function summarizeRolesInPlay(
  cards: OnuwScriptCard[],
): { role: OnuwRole; count: number; artKeys: string[] }[] {
  const map = new Map<OnuwRole, { count: number; artKeys: string[] }>();
  for (const c of cards) {
    const cur = map.get(c.role) ?? { count: 0, artKeys: [] };
    cur.count += 1;
    cur.artKeys.push(c.artKey);
    map.set(c.role, cur);
  }
  const roles: OnuwRole[] = [
    'werewolf',
    'doppelganger',
    'minion',
    'mason',
    'seer',
    'robber',
    'troublemaker',
    'drunk',
    'insomniac',
    'hunter',
    'tanner',
    'villager',
  ];
  const out: { role: OnuwRole; count: number; artKeys: string[] }[] = [];
  for (const r of roles) {
    const v = map.get(r);
    if (v && v.count > 0) out.push({ role: r, count: v.count, artKeys: v.artKeys });
  }
  return out;
}

export interface OnuwState {
  phase: OnuwPhase;
  players: { id: string; name: string }[];
  gameCards: OnuwScriptCard[];
  seatCardIndex: Record<string, number>;
  /** สำเนาตอนเริ่มกลางคืน — ใช้เปรียบเทียบ Insomniac / ใครตื่น */
  nightBeginSeatCardIndex: Record<string, number>;
  /** Doppelgänger เท่านั้น — บทบาทที่ดูจากผู้เล่นเป้าหมายตอนเริ่มคืน */
  doppelCopiedRole: Partial<Record<string, OnuwRole>>;
  /** Doppel ที่ทำแอ็กชัน Seer/Robber/TM/Drunk ในขั้น Doppel แล้ว — ข้ามเฟสหลัก */
  doppelInstantNightDone: Record<string, boolean>;
  compositionAck: Record<string, boolean>;
  roleAck: Record<string, boolean>;
  /** ลำดับขั้นคืนตามการ์ดในเกม (ไม่ข้าม) */
  nightScheduleKinds: OnuwNightStepKind[];
  /** ดัชนีใน `nightScheduleKinds` */
  nightStepIndex: number;
  /** เวลาหมดขั้นปัจจุบัน (Unix ms) */
  nightStepEndsAtMs: number | null;
  /** เก็บว่าใครกด night_ack ในเทิร์นปัจจุบันแล้ว */
  nightAckInStep: Record<string, boolean>;
  nightSecrets: Record<string, OnuwNightSecretView | undefined>;
  dayReady: Record<string, boolean>;
  /** กลางวัน/โหวต — ผู้เล่นเลือกช่องการ์ดบทที่มั่นใจ (slotKey จาก onuwOrderedCompositionSlots) */
  dayRoleConfidence: Record<string, string>;
  votes: Record<string, string>;
  /** เฟสโหวต — เวลาครบกำหนดให้ทุกคนยืนยันโหวต */
  votePhaseEndsAtMs: number | null;
  /** หลังโหวตเสร็จ — แสดงการ์ดผู้ถูกโหวต ก่อนไป Hunter / สรุปผล */
  voteEliminationRevealEndsAtMs: number | null;
  voteEliminatedIds: string[];
  /** Hunter ที่ถูกโหวตและยังต้องยิง — ใครในชุดนี้ก็ส่งยิงได้ (ไม่บังคับลำดับที่นั่ง) */
  hunterPendingShooters: string[];
  /** ผู้เล่นที่ถูก Hunter ยิง (สะสมทุกนัดยิง) */
  hunterShotVictimIds: string[];
  /** เปิดการ์ดผู้ถูกยิงล่าสุด — ทุกคนรับทราบก่อนจบหรือก่อน Hunter คนถัดไป */
  hunterRevealTargetId: string | null;
  hunterRevealAck: Record<string, boolean>;
  outcome: GameResult | null;
  lastEvent: string;
}

function cloneSeatIndex(src: Record<string, number>): Record<string, number> {
  return { ...src };
}

function emptyNightSecrets(): Record<string, OnuwNightSecretView | undefined> {
  return {};
}

function currentNightStep(s: OnuwState): OnuwNightStep | null {
  if (s.nightStepIndex >= s.nightScheduleKinds.length) return null;
  const kind = s.nightScheduleKinds[s.nightStepIndex]!;
  const actorIds = collectActors(s, kind);
  return { kind, actorIds };
}

/** ผู้เล่นยังต้องทำแอ็กชันในขั้นคืนปัจจุบันหรือไม่ — ใช้สำหรับ `nightActors` ให้ client ซ่อนปุ่มหลังยืนยันแล้ว */
function canViewerActCurrentNightStep(s: OnuwState, viewerId: string): boolean {
  const step = currentNightStep(s);
  if (!step || !step.actorIds.includes(viewerId)) return false;
  if (s.nightAckInStep[viewerId]) return false;

  switch (step.kind) {
    case 'seer':
    case 'robber':
    case 'troublemaker':
    case 'drunk':
    case 'insomniac': {
      const ord = orderedActorsForStep(s, step.actorIds);
      const next = nextActorPending(s, ord);
      return viewerId === next;
    }
    default:
      return true;
  }
}

function advanceNightStep(s: OnuwState): void {
  s.nightAckInStep = {};
  s.nightStepIndex += 1;
}

/** หลังจบคืน — กลางวัน + โหวตพร้อมกัน จับเวลาเดียวกับเฟสโหวต */
function enterDiscussionVotePhase(s: OnuwState): void {
  s.phase = 'vote';
  s.votes = {};
  s.votePhaseEndsAtMs = Date.now() + ONUW_VOTE_PHASE_MS;
  s.voteEliminationRevealEndsAtMs = null;
  s.dayRoleConfidence = {};
  s.dayReady = {};
  s.nightStepEndsAtMs = null;
  s.lastEvent = 'คืนจบ — กลางวัน: พูดคุยและโหวต';
}

function maybeFinishNight(s: OnuwState): void {
  if (s.nightStepIndex >= s.nightScheduleKinds.length) {
    enterDiscussionVotePhase(s);
  }
}

/** คำนวณผู้ถูกโหวตออก — เสมอหัวแถวล้วนๆ (เช่น 2–2) = ไม่มีใครตาย; มีคะแนนรองลงมา (เช่น 2–2–1) = คนที่ได้สูงสุดทุกคนตาย */
function computeVoteEliminations(playerIds: string[], votes: Record<string, string>): string[] {
  const tally = new Map<string, number>();
  for (const pid of playerIds) {
    const t = votes[pid];
    if (!t || t === ONUW_VOTE_ABSTAIN) continue;
    tally.set(t, (tally.get(t) ?? 0) + 1);
  }
  if (tally.size === 0) return [];

  let max = -1;
  for (const [, c] of tally) {
    if (c > max) max = c;
  }

  const tops = [...tally.entries()].filter(([, c]) => c === max).map(([id]) => id);
  if (tops.length === 1) return tops;

  const hasMiddleTier = [...tally.values()].some((c) => c > 0 && c < max);
  if (hasMiddleTier) return tops;
  return [];
}

/** มีการ์ดมนุษย์หมาป่าอยู่หน้าที่นั่งผู้เล่น (หลังคืน) — ไม่นับกองกลาง */
function anyWerewolfAmongPlayers(s: OnuwState): boolean {
  return s.players.some((p) => roleAtSeat(s, p.id) === 'werewolf');
}

function allAckedInStep(s: OnuwState, actorIds: string[]): boolean {
  return actorIds.every((id) => s.nightAckInStep[id] === true);
}

function resolveGameResult(
  s: OnuwState,
  eliminatedFromVote: string[],
  hunterVictims: string[],
): GameResult {
  const dead = new Set<string>([...eliminatedFromVote, ...hunterVictims]);

  const roleOf = (pid: string) => roleAtSeat(s, pid);

  if (
    eliminatedFromVote.length === 1 &&
    hunterVictims.length === 0 &&
    roleOf(eliminatedFromVote[0]!) === 'tanner'
  ) {
    return {
      winners: [eliminatedFromVote[0]!],
      reason: 'ทันเนอร์ถูกโหวตออก — ชนะคนเดียว',
    };
  }

  if (!anyWerewolfAmongPlayers(s)) {
    if (dead.size === 0) {
      const winners = s.players
        .filter((p) => onuwTeamForRole(roleOf(p.id)) !== 'werewolf_team')
        .map((p) => p.id);
      return {
        winners,
        reason: 'ไม่มีผู้เล่นที่เป็นมนุษย์หมาป่า — ไม่มีผู้ถูกกำจัด — ฝ่ายหมู่บ้านชนะ',
      };
    }
    return {
      winners: [],
      reason: 'ไม่มีผู้เล่นที่เป็นมนุษย์หมาป่าแต่มีผู้ถูกกำจัด — ฝ่ายหมู่บ้านแพ้',
    };
  }

  const anyWolfDead = [...dead].some((id) => roleOf(id) === 'werewolf');
  if (anyWolfDead) {
    const winners = s.players
      .filter((p) => !dead.has(p.id))
      .filter((p) => {
        const r = roleOf(p.id);
        if (r === 'tanner') return false;
        return onuwTeamForRole(r) !== 'werewolf_team';
      })
      .map((p) => p.id);
    return {
      winners,
      reason: 'มีมนุษย์หมาป่าถูกกำจัด — ฝ่ายหมู่บ้านชนะ',
    };
  }

  const winners = s.players
    .filter((p) => !dead.has(p.id) && onuwTeamForRole(roleOf(p.id)) === 'werewolf_team')
    .map((p) => p.id);
  return {
    winners,
    reason: 'ไม่มีหมาป่าถูกกำจัด — ฝ่ายมารชนะ',
  };
}

function cloneOnuwStateForMutation(state: OnuwState): OnuwState {
  return {
    ...state,
    compositionAck: { ...state.compositionAck },
    roleAck: { ...state.roleAck },
    seatCardIndex: { ...state.seatCardIndex },
    nightBeginSeatCardIndex: { ...state.nightBeginSeatCardIndex },
    doppelCopiedRole: { ...state.doppelCopiedRole },
    doppelInstantNightDone: { ...state.doppelInstantNightDone },
    nightAckInStep: { ...state.nightAckInStep },
    nightSecrets: { ...state.nightSecrets },
    dayReady: { ...state.dayReady },
    dayRoleConfidence: { ...state.dayRoleConfidence },
    votes: { ...state.votes },
    nightScheduleKinds: [...state.nightScheduleKinds],
    voteEliminatedIds: [...state.voteEliminatedIds],
    hunterPendingShooters: [...state.hunterPendingShooters],
    hunterShotVictimIds: [...state.hunterShotVictimIds],
    hunterRevealAck: { ...state.hunterRevealAck },
    players: state.players.map((p) => ({ ...p })),
  };
}

/** Hunter หน้าที่นั่ง หรือ Doppel ที่ก็อป Hunter (การ์ดยังเป็น Doppel ที่นั่ง) — ถูกโหวตแล้วยิงต่อได้ */
function isHunterWhenEliminatedByVote(s: OnuwState, playerId: string): boolean {
  const r = roleAtSeat(s, playerId);
  if (r === 'hunter') return true;
  if (r === 'doppelganger' && s.doppelCopiedRole[playerId] === 'hunter') return true;
  return false;
}

/** Hunter ในชุดผู้ถูกโหวต (ลำดับตามชุดผู้ถูกโหวต — ไม่เกี่ยวกับการเลือกยิง) */
function huntersAmongVoteDead(s: OnuwState, eliminatedIds: string[]): string[] {
  return eliminatedIds.filter((id) => isHunterWhenEliminatedByVote(s, id));
}

function applyNightSeerPeekAction(
  s: OnuwState,
  playerId: string,
  playerIds: string[],
  stepActorIds: string[],
  action:
    | { type: 'night_seer_peek_player'; targetId: string }
    | { type: 'night_seer_peek_center'; indexA: 0 | 1 | 2; indexB: 0 | 1 | 2 },
): void {
  const actors = new Set(stepActorIds);
  if (!actors.has(playerId)) throw new GameActionRejectedError('ไม่ใช่เทิร์นของคุณ');
  if (s.nightAckInStep[playerId]) throw new GameActionRejectedError('ทำขั้นนี้แล้ว — รอจบเวลาขั้น');
  const ord = orderedActorsForStep(s, stepActorIds);
  const next = nextActorPending(s, ord);
  if (playerId !== next) throw new GameActionRejectedError('รอคิวหมอดูคนก่อนหน้า');
  if (action.type === 'night_seer_peek_player') {
    if (action.targetId === playerId) throw new GameActionRejectedError('ดูผู้อื่นเท่านั้น');
    if (!playerIds.includes(action.targetId))
      throw new GameActionRejectedError('เป้าหมายไม่ถูกต้อง');
    const sawCard = cardAtSeat(s, action.targetId);
    const tn = s.players.find((p) => p.id === action.targetId)?.name ?? '?';
    s.nightSecrets[playerId] = {
      kind: 'seer_player',
      targetName: tn,
      sawRole: sawCard.role,
      sawArtKey: sawCard.artKey,
    };
  } else {
    const { indexA, indexB } = action;
    if (indexA === indexB) throw new GameActionRejectedError('เลือกสองช่องที่ต่างกัน');
    const ca = cardAtSeat(s, `center_${indexA}`);
    const cb = cardAtSeat(s, `center_${indexB}`);
    s.nightSecrets[playerId] = {
      kind: 'seer_center',
      roles: [ca.role, cb.role],
      artKeys: [ca.artKey, cb.artKey],
    };
  }
  s.nightAckInStep[playerId] = true;
}

function applyNightRobberSwapAction(
  s: OnuwState,
  playerId: string,
  playerIds: string[],
  stepActorIds: string[],
  action: { type: 'night_robber_swap'; targetId: string },
): void {
  const actors = new Set(stepActorIds);
  if (!actors.has(playerId)) throw new GameActionRejectedError('ไม่ใช่เทิร์นของคุณ');
  if (s.nightAckInStep[playerId]) throw new GameActionRejectedError('ทำขั้นนี้แล้ว — รอจบเวลาขั้น');
  const ord = orderedActorsForStep(s, stepActorIds);
  const next = nextActorPending(s, ord);
  if (playerId !== next) throw new GameActionRejectedError('รอคิวโจรคนก่อนหน้า');
  if (action.targetId === playerId) throw new GameActionRejectedError('เลือกผู้อื่น');
  if (!playerIds.includes(action.targetId)) throw new GameActionRejectedError('เป้าหมายไม่ถูกต้อง');
  swapSeats(s, playerId, action.targetId);
  const newCard = cardAtSeat(s, playerId);
  const tn = s.players.find((p) => p.id === action.targetId)?.name ?? '?';
  s.nightSecrets[playerId] = {
    kind: 'robber_swap',
    tookFromName: tn,
    newRole: newCard.role,
    newRoleArtKey: newCard.artKey,
  };
  s.nightAckInStep[playerId] = true;
}

function applyNightTroublemakerSwapAction(
  s: OnuwState,
  playerId: string,
  playerIds: string[],
  stepActorIds: string[],
  action: { type: 'night_troublemaker_swap'; playerAId: string; playerBId: string },
): void {
  const actors = new Set(stepActorIds);
  if (!actors.has(playerId)) throw new GameActionRejectedError('ไม่ใช่เทิร์นของคุณ');
  if (s.nightAckInStep[playerId]) throw new GameActionRejectedError('ทำขั้นนี้แล้ว — รอจบเวลาขั้น');
  const ord = orderedActorsForStep(s, stepActorIds);
  const next = nextActorPending(s, ord);
  if (playerId !== next) throw new GameActionRejectedError('รอคิวคนสร้างปัญหาคนก่อนหน้า');
  const { playerAId, playerBId } = action;
  if (playerAId === playerBId) throw new GameActionRejectedError('ต้องเป็นคนละคน');
  if (playerAId === playerId || playerBId === playerId)
    throw new GameActionRejectedError('เลือกแค่ผู้อื่น');
  if (!playerIds.includes(playerAId) || !playerIds.includes(playerBId)) {
    throw new GameActionRejectedError('เป้าหมายไม่ถูกต้อง');
  }
  swapSeats(s, playerAId, playerBId);
  const na = s.players.find((p) => p.id === playerAId)?.name ?? '?';
  const nb = s.players.find((p) => p.id === playerBId)?.name ?? '?';
  s.nightSecrets[playerId] = { kind: 'troublemaker_done', swappedNames: [na, nb] };
  s.nightAckInStep[playerId] = true;
}

function applyNightDrunkTakeCenterAction(
  s: OnuwState,
  playerId: string,
  stepActorIds: string[],
  action: { type: 'night_drunk_take_center'; centerIndex: 0 | 1 | 2 },
): void {
  const actors = new Set(stepActorIds);
  if (!actors.has(playerId)) throw new GameActionRejectedError('ไม่ใช่เทิร์นของคุณ');
  if (s.nightAckInStep[playerId]) throw new GameActionRejectedError('ทำขั้นนี้แล้ว — รอจบเวลาขั้น');
  const ord = orderedActorsForStep(s, stepActorIds);
  const next = nextActorPending(s, ord);
  if (playerId !== next) throw new GameActionRejectedError('รอคิวคนเมาคนก่อนหน้า');
  const ci = action.centerIndex;
  swapSeats(s, playerId, `center_${ci}`);
  s.nightSecrets[playerId] = {
    kind: 'drunk_done',
    noteTh: 'การ์ดของคุณถูกสลับกับการ์ดกลาง — คุณยังไม่รู้ว่าตอนนี้เป็นใคร',
  };
  s.nightAckInStep[playerId] = true;
}

function finalizeVoteIntoHunterShotOrGameOver(s: OnuwState): void {
  const eliminated = s.voteEliminatedIds;
  const huntersDead = huntersAmongVoteDead(s, eliminated);
  if (huntersDead.length > 0) {
    s.phase = 'hunter_shot';
    s.hunterPendingShooters = huntersDead;
    s.hunterShotVictimIds = [];
    const nh = huntersDead.length;
    s.lastEvent =
      nh === 1
        ? `${s.players.find((p) => p.id === huntersDead[0])?.name ?? '?'} เป็น Hunter — เลือกยิงผู้เล่นที่ยังอยู่ในเกมหนึ่งคน`
        : `มี Hunter ${nh} คนในผู้ถูกโหวต — เลือกยิงผู้เล่นที่ยังไม่ถูกโหวต แล้วเปิดการ์ดคนที่ถูกยิงทีละนัด`;
  } else {
    s.outcome = resolveGameResult(s, eliminated, []);
    s.phase = 'game_over';
    s.lastEvent =
      eliminated.length === 0 ? 'โหวตเสมอกันที่หัว — ไม่มีใครถูกกำจัด — สรุปผล' : 'สรุปผล';
  }
}

function advanceNightAndDeadline(s: OnuwState): void {
  advanceNightStep(s);
  maybeFinishNight(s);
  if (s.phase === 'night') setNightStepDeadline(s);
}

/**
 * เรียกเมื่อหมดเวลาขั้นกลางคืน — ขั้นไม่มีผู้เล่นจะเลื่อนต่อ; มีผู้เล่นแต่ไม่ครบแอ็กชันจบเกมและไม่มีผู้ชนะ (ทุกคนแพ้)
 */
export function applyOnuwNightStepExpiry(state: OnuwState): OnuwState {
  if (state.phase !== 'night' || state.outcome) return state;
  if (state.nightStepEndsAtMs == null || Date.now() < state.nightStepEndsAtMs) return state;

  const s = cloneOnuwStateForMutation(state);
  const step = currentNightStep(s);
  if (!step) {
    maybeFinishNight(s);
    return s;
  }

  if (step.actorIds.length === 0) {
    advanceNightAndDeadline(s);
    return s;
  }

  if (allAckedInStep(s, step.actorIds)) {
    advanceNightAndDeadline(s);
    return s;
  }

  const ord = orderedActorsForStep(s, step.actorIds);
  const pending = ord.filter((id) => !s.nightAckInStep[id]);
  const forfeiter = pending[0]!;
  const nm = s.players.find((p) => p.id === forfeiter)?.name ?? '?';
  const rf = effectiveNightRole(s, forfeiter) ?? roleAtNightBegin(s, forfeiter);
  s.outcome = {
    winners: [],
    reason: `${nm} (${rf}) ไม่ทำแอ็กชันกลางคืนภายในเวลา — ทุกคนแพ้`,
  };
  s.phase = 'game_over';
  s.nightStepEndsAtMs = null;
  s.lastEvent = 'เกมจบ — หมดเวลาทำแอ็กชันกลางคืน';
  return s;
}

/**
 * เฟสโหวตหมดเวลาแล้วแต่ยังมีคนไม่ยืนยันโหวต — ทุกคนแพ้
 */
export function applyOnuwVotePhaseExpiry(state: OnuwState): OnuwState {
  if (state.phase !== 'vote' || state.outcome) return state;
  if (state.votePhaseEndsAtMs == null || Date.now() < state.votePhaseEndsAtMs) return state;
  const allVoted = state.players.every((p) => Boolean(state.votes[p.id]));
  if (allVoted) return state;

  const s = cloneOnuwStateForMutation(state);
  s.outcome = {
    winners: [],
    reason: 'หมดเวลาโหวต — ไม่ครบทุกคนยืนยันโหวตหรือไม่โหวต — ทุกคนแพ้',
  };
  s.phase = 'game_over';
  s.votePhaseEndsAtMs = null;
  s.lastEvent = 'หมดเวลาโหวต — เกมจบ';
  return s;
}

/** หมดเวลาเฟสเปิดการ์ดผู้ถูกโหวต — ไป Hunter หรือสรุปผล */
export function applyOnuwVoteEliminationRevealExpiry(state: OnuwState): OnuwState {
  if (state.phase !== 'vote_elimination_reveal' || state.outcome) return state;
  if (
    state.voteEliminationRevealEndsAtMs == null ||
    Date.now() < state.voteEliminationRevealEndsAtMs
  ) {
    return state;
  }
  const s = cloneOnuwStateForMutation(state);
  s.voteEliminationRevealEndsAtMs = null;
  finalizeVoteIntoHunterShotOrGameOver(s);
  return s;
}

export const oneNightUltimateWerewolfGame: GameDefinition<OnuwState, OnuwAction> = {
  id: 'one-night-ultimate-werewolf',
  name: 'One Night Ultimate Werewolf',
  description: 'คืนเดียวรู้ผล — กลางคืนบทบาทลับเปลี่ยนการ์ด กลางวันโหวตจับคนร้าย',
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  thumbnail: GAME_THUMBNAIL_BY_ID['one-night-ultimate-werewolf'] ?? '',

  setup(players: Player[]): OnuwState {
    if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
      throw new Error(`ต้องมีผู้เล่น ${MIN_PLAYERS}-${MAX_PLAYERS} คน`);
    }
    const gameCards = pickGameCards(players.length);
    const ps = players.map((p) => ({ id: p.id, name: p.name }));
    const ids = ps.map((p) => p.id);
    const seatCardIndex = buildSeatCardIndex(ids, gameCards);
    return {
      phase: 'composition',
      players: ps,
      gameCards,
      seatCardIndex,
      nightBeginSeatCardIndex: {},
      doppelCopiedRole: {},
      doppelInstantNightDone: {},
      compositionAck: {},
      roleAck: {},
      nightScheduleKinds: [],
      nightStepIndex: 0,
      nightStepEndsAtMs: null,
      nightAckInStep: {},
      nightSecrets: emptyNightSecrets(),
      dayReady: {},
      dayRoleConfidence: {},
      votes: {},
      votePhaseEndsAtMs: null,
      voteEliminationRevealEndsAtMs: null,
      voteEliminatedIds: [],
      hunterPendingShooters: [],
      hunterShotVictimIds: [],
      hunterRevealTargetId: null,
      hunterRevealAck: {},
      outcome: null,
      lastEvent: 'ดูการ์ดที่ใช้ในเกมนี้ — กดรับทราบเมื่อพร้อม',
    };
  },

  onAction(state: OnuwState, playerId: string, action: OnuwAction): OnuwState {
    if (state.outcome) throw new GameActionRejectedError('เกมจบแล้ว');
    const s = cloneOnuwStateForMutation(state);

    const playerIds = s.players.map((p) => p.id);
    if (!playerIds.includes(playerId)) throw new GameActionRejectedError('ไม่พบผู้เล่น');

    if (action.type === 'day_role_confidence') {
      if (s.phase !== 'vote') {
        throw new GameActionRejectedError('เลือกการ์ดบทได้เฉพาะช่วงกลางวัน/โหวต');
      }
      const slotKey = action.slotKey;
      const rip = summarizeRolesInPlay(s.gameCards);
      if (slotKey != null) {
        const valid = onuwValidCompositionSlotKeys(rip);
        if (!valid.has(slotKey)) throw new GameActionRejectedError('การ์ดไม่ถูกต้อง');
        s.dayRoleConfidence[playerId] = slotKey;
      } else {
        delete s.dayRoleConfidence[playerId];
      }
      const pn = s.players.find((p) => p.id === playerId)?.name ?? '?';
      s.lastEvent = slotKey != null ? `${pn} เลือกการ์ดบทที่มั่นใจ` : `${pn} ยกเลิกการเลือกการ์ดบท`;
      return s;
    }

    if (s.phase === 'composition') {
      if (action.type !== 'acknowledge_composition') {
        throw new GameActionRejectedError('กดรับทราบการ์ดในเกมก่อน');
      }
      s.compositionAck[playerId] = true;
      const total = s.players.length;
      let cur = 0;
      for (const p of s.players) {
        if (s.compositionAck[p.id]) cur += 1;
      }
      s.lastEvent = `รับทราบการ์ดในเกม ${cur}/${total}`;
      if (cur === total) {
        s.phase = 'role_reveal';
        s.roleAck = {};
        for (const p of s.players) s.roleAck[p.id] = false;
        s.lastEvent = 'เปิดดูบทบาทของคุณ — กดรับทราบเมื่อจำได้แล้ว';
      }
      return s;
    }

    if (s.phase === 'role_reveal') {
      if (action.type !== 'acknowledge_role') throw new GameActionRejectedError('รับทราบบทบาทก่อน');
      s.roleAck[playerId] = true;
      let cur = 0;
      for (const p of s.players) {
        if (s.roleAck[p.id]) cur += 1;
      }
      const total = s.players.length;
      s.lastEvent = `รับทราบบทบาท ${cur}/${total}`;
      if (cur === total) {
        s.phase = 'night';
        s.nightBeginSeatCardIndex = cloneSeatIndex(s.seatCardIndex);
        s.doppelCopiedRole = {};
        s.doppelInstantNightDone = {};
        s.nightAckInStep = {};
        s.nightSecrets = emptyNightSecrets();
        s.nightScheduleKinds = buildNightSchedule(s.gameCards);
        s.nightStepIndex = 0;
        if (s.nightScheduleKinds.length === 0) {
          enterDiscussionVotePhase(s);
          s.lastEvent = 'ไม่มีขั้นกลางคืนในการ์ดชุดนี้ — เริ่มกลางวันและโหวต';
        } else {
          setNightStepDeadline(s);
          s.lastEvent = 'เริ่มกลางคืน — แต่ละขั้นมีเวลาจำกัด';
        }
      }
      return s;
    }

    if (s.phase === 'night') {
      const step = currentNightStep(s);
      if (!step) {
        maybeFinishNight(s);
        return s;
      }

      const actors = new Set(step.actorIds);

      if (step.kind === 'doppelganger') {
        const copied = s.doppelCopiedRole[playerId];
        const pendingInstantFollowUp =
          copied != null &&
          ONUW_DOPPEL_INSTANT_COPIED_ROLES.has(copied) &&
          !s.nightAckInStep[playerId];

        if (pendingInstantFollowUp) {
          if (!actors.has(playerId)) throw new GameActionRejectedError('ไม่ใช่เทิร์นของคุณ');
          if (action.type === 'night_doppel_peek') {
            throw new GameActionRejectedError('คุณดูการ์ดแล้ว — ทำแอ็กชันบทที่ก็อปในขั้นนี้ต่อ');
          }
          switch (copied) {
            case 'seer': {
              if (
                action.type !== 'night_seer_peek_player' &&
                action.type !== 'night_seer_peek_center'
              ) {
                throw new GameActionRejectedError('เลือกดูผู้เล่นหนึ่งคนหรือการ์ดกลางสองใบ');
              }
              applyNightSeerPeekAction(s, playerId, playerIds, step.actorIds, action);
              s.doppelInstantNightDone[playerId] = true;
              s.lastEvent = 'Doppelgänger (หมอดู) ดูการ์ดแล้ว — ไม่ตื่นซ้ำในขั้นหมอดู';
              return s;
            }
            case 'robber': {
              if (action.type !== 'night_robber_swap') {
                throw new GameActionRejectedError('เลือกผู้เล่นเพื่อสลับการ์ด');
              }
              applyNightRobberSwapAction(s, playerId, playerIds, step.actorIds, action);
              s.doppelInstantNightDone[playerId] = true;
              s.lastEvent = 'Doppelgänger (โจร) สลับการ์ดแล้ว — ไม่ตื่นซ้ำในขั้นโจร';
              return s;
            }
            case 'troublemaker': {
              if (action.type !== 'night_troublemaker_swap') {
                throw new GameActionRejectedError('เลือกผู้เล่นสองคน');
              }
              applyNightTroublemakerSwapAction(s, playerId, playerIds, step.actorIds, action);
              s.doppelInstantNightDone[playerId] = true;
              s.lastEvent = 'Doppelgänger (คนสร้างปัญหา) สลับการ์ดแล้ว — ไม่ตื่นซ้ำในขั้นนั้น';
              return s;
            }
            case 'drunk': {
              if (action.type !== 'night_drunk_take_center') {
                throw new GameActionRejectedError('เลือกการ์ดกลางหนึ่งใบ');
              }
              applyNightDrunkTakeCenterAction(s, playerId, step.actorIds, action);
              s.doppelInstantNightDone[playerId] = true;
              s.lastEvent = 'Doppelgänger (คนเมา) สลับกับกลางแล้ว — ไม่ตื่นซ้ำในขั้นคนเมา';
              return s;
            }
            default:
              break;
          }
        }

        if (action.type !== 'night_doppel_peek') {
          throw new GameActionRejectedError('เลือกผู้เล่นเพื่อดูการ์ด');
        }
        if (!actors.has(playerId)) throw new GameActionRejectedError('ไม่ใช่เทิร์นของคุณ');
        if (s.nightAckInStep[playerId])
          throw new GameActionRejectedError('ทำขั้นนี้แล้ว — รอจบเวลาขั้น');
        if (action.targetId === playerId) throw new GameActionRejectedError('เลือกผู้อื่น');
        if (!playerIds.includes(action.targetId))
          throw new GameActionRejectedError('เป้าหมายไม่ถูกต้อง');
        const sawCard = cardAtNightBegin(s, action.targetId);
        const saw = sawCard.role;
        const tn = s.players.find((p) => p.id === action.targetId)?.name ?? '?';
        s.doppelCopiedRole[playerId] = saw;
        s.nightSecrets[playerId] = {
          kind: 'doppel_peek',
          targetName: tn,
          sawRole: saw,
          sawArtKey: sawCard.artKey,
        };
        if (!ONUW_DOPPEL_INSTANT_COPIED_ROLES.has(saw)) {
          s.nightAckInStep[playerId] = true;
        }
        s.lastEvent = ONUW_DOPPEL_INSTANT_COPIED_ROLES.has(saw)
          ? 'Doppelgänger ดูการ์ดแล้ว — ทำแอ็กชันบทที่ก็อปในขั้นนี้ต่อ'
          : 'Doppelgänger ดูการ์ดแล้ว — สวมบทบาทตามที่เห็นตลอดคืนนี้';
        return s;
      }

      if (step.kind === 'werewolf') {
        if (step.actorIds.length >= 2) {
          if (action.type !== 'night_ack')
            throw new GameActionRejectedError('กดยืนยันหลังดูเพื่อน');
          if (!actors.has(playerId)) throw new GameActionRejectedError('ไม่ใช่เทิร์นของคุณ');
          if (s.nightAckInStep[playerId])
            throw new GameActionRejectedError('ทำขั้นนี้แล้ว — รอจบเวลาขั้น');
          const names = step.actorIds
            .filter((id) => id !== playerId)
            .map((id) => s.players.find((p) => p.id === id)?.name ?? '?');
          s.nightSecrets[playerId] = { kind: 'wolf_pack', teammateNames: names };
          s.nightAckInStep[playerId] = true;
          s.lastEvent = 'หมาป่ารู้ทีมแล้ว';
          return s;
        }
        const lone = step.actorIds[0]!;
        if (action.type === 'night_ack')
          throw new GameActionRejectedError('เลือกการ์ดกลางหนึ่งใบที่จะดู');
        if (action.type !== 'night_wolf_peek_center')
          throw new GameActionRejectedError('เลือกการ์ดกลาง');
        if (playerId !== lone) throw new GameActionRejectedError('ไม่ใช่เทิร์นของคุณ');
        if (s.nightAckInStep[playerId])
          throw new GameActionRejectedError('ทำขั้นนี้แล้ว — รอจบเวลาขั้น');
        const ci = action.centerIndex;
        const seat = `center_${ci}` as const;
        const sawCard = cardAtSeat(s, seat);
        s.nightSecrets[playerId] = {
          kind: 'wolf_solo',
          centerIndex: ci,
          sawRole: sawCard.role,
          sawArtKey: sawCard.artKey,
        };
        s.nightAckInStep[playerId] = true;
        s.lastEvent = 'หมาป่าโดดเดี่ยวดูการ์ดกลางแล้ว';
        return s;
      }

      if (step.kind === 'minion') {
        if (action.type !== 'night_ack') throw new GameActionRejectedError('กดยืนยัน');
        if (!actors.has(playerId)) throw new GameActionRejectedError('ไม่ใช่เทิร์นของคุณ');
        if (s.nightAckInStep[playerId])
          throw new GameActionRejectedError('ทำขั้นนี้แล้ว — รอจบเวลาขั้น');
        const wolfNames = playerIds
          .filter((id) => effectiveNightRole(s, id) === 'werewolf')
          .map((id) => s.players.find((p) => p.id === id)?.name ?? '?');
        s.nightSecrets[playerId] = { kind: 'minion_peek', werewolfNames: wolfNames };
        s.nightAckInStep[playerId] = true;
        s.lastEvent = 'ลูกสมุนเห็นหมาป่าแล้ว';
        return s;
      }

      if (step.kind === 'mason') {
        if (action.type !== 'night_ack') throw new GameActionRejectedError('กดยืนยัน');
        if (!actors.has(playerId)) throw new GameActionRejectedError('ไม่ใช่เทิร์นของคุณ');
        if (s.nightAckInStep[playerId])
          throw new GameActionRejectedError('ทำขั้นนี้แล้ว — รอจบเวลาขั้น');
        const masonNames = step.actorIds
          .filter((id) => id !== playerId)
          .map((id) => s.players.find((p) => p.id === id)?.name ?? '?');
        s.nightSecrets[playerId] = { kind: 'mason_peek', masonNames };
        s.nightAckInStep[playerId] = true;
        s.lastEvent = 'ช่างหินเห็นเพื่อนแล้ว';
        return s;
      }

      if (step.kind === 'seer') {
        if (action.type !== 'night_seer_peek_player' && action.type !== 'night_seer_peek_center') {
          throw new GameActionRejectedError('เลือกดูผู้เล่นหนึ่งคนหรือการ์ดกลางสองใบ');
        }
        applyNightSeerPeekAction(s, playerId, playerIds, step.actorIds, action);
        s.lastEvent = 'หมอดูทำงานแล้ว';
        return s;
      }

      if (step.kind === 'robber') {
        if (action.type !== 'night_robber_swap')
          throw new GameActionRejectedError('เลือกผู้เล่นเพื่อสลับการ์ด');
        applyNightRobberSwapAction(s, playerId, playerIds, step.actorIds, action);
        s.lastEvent = 'โจรสลับการ์ดแล้ว';
        return s;
      }

      if (step.kind === 'troublemaker') {
        if (action.type !== 'night_troublemaker_swap')
          throw new GameActionRejectedError('เลือกผู้เล่นสองคน');
        applyNightTroublemakerSwapAction(s, playerId, playerIds, step.actorIds, action);
        s.lastEvent = 'คนสร้างปัญหาสลับการ์ดแล้ว';
        return s;
      }

      if (step.kind === 'drunk') {
        if (action.type !== 'night_drunk_take_center')
          throw new GameActionRejectedError('เลือกการ์ดกลางหนึ่งใบ');
        applyNightDrunkTakeCenterAction(s, playerId, step.actorIds, action);
        s.lastEvent = 'คนเมาสลับกับกลางแล้ว';
        return s;
      }

      if (step.kind === 'insomniac') {
        if (!actors.has(playerId)) throw new GameActionRejectedError('ไม่ใช่เทิร์นของคุณ');
        if (s.nightAckInStep[playerId])
          throw new GameActionRejectedError('ทำขั้นนี้แล้ว — รอจบเวลาขั้น');
        const ord = orderedActorsForStep(s, step.actorIds);
        const next = nextActorPending(s, ord);
        if (playerId !== next) throw new GameActionRejectedError('รอคิวคนนอนไม่หลับคนก่อนหน้า');
        if (action.type !== 'night_ack')
          throw new GameActionRejectedError('กดยืนยันหลังดูการ์ดตัวเอง');
        const startedIdx = s.nightBeginSeatCardIndex[playerId];
        const endedIdx = s.seatCardIndex[playerId];
        const startedCard = s.gameCards[startedIdx!]!;
        const endedCard = s.gameCards[endedIdx!]!;
        s.nightSecrets[playerId] = {
          kind: 'insomniac',
          startedAs: startedCard.role,
          endedAs: endedCard.role,
          startedArtKey: startedCard.artKey,
          endedArtKey: endedCard.artKey,
        };
        s.nightAckInStep[playerId] = true;
        s.lastEvent = 'คนนอนไม่หลับตรวจการ์ดแล้ว';
        return s;
      }

      throw new GameActionRejectedError('การกระทำไม่ถูกต้อง');
    }

    if (s.phase === 'vote') {
      const tryFinishVotePhase = (): void => {
        let cur = 0;
        for (const p of s.players) {
          if (s.votes[p.id]) cur += 1;
        }
        s.lastEvent = `โหวตแล้ว ${cur}/${s.players.length}`;
        if (cur === s.players.length) {
          s.votePhaseEndsAtMs = null;
          const eliminated = computeVoteEliminations(playerIds, s.votes);
          s.voteEliminatedIds = eliminated;
          if (eliminated.length > 0) {
            s.phase = 'vote_elimination_reveal';
            s.voteEliminationRevealEndsAtMs =
              Date.now() + onuwVoteEliminationRevealPhaseDurationMs(eliminated.length);
            s.lastEvent = 'เปิดการ์ดผู้ถูกโหวตออก';
          } else {
            finalizeVoteIntoHunterShotOrGameOver(s);
          }
        }
      };

      if (action.type === 'vote_abstain') {
        s.votes[playerId] = ONUW_VOTE_ABSTAIN;
        tryFinishVotePhase();
        return s;
      }

      if (action.type !== 'vote') throw new GameActionRejectedError('เลือกผู้เล่นเพื่อโหวต');
      if (!playerIds.includes(action.targetId))
        throw new GameActionRejectedError('เป้าหมายไม่ถูกต้อง');
      if (action.targetId === playerId) throw new GameActionRejectedError('โหวตผู้อื่นเท่านั้น');
      s.votes[playerId] = action.targetId;
      tryFinishVotePhase();
      return s;
    }

    if (s.phase === 'hunter_shot') {
      if (action.type !== 'hunter_shoot') throw new GameActionRejectedError('เลือกผู้เล่นที่จะยิง');
      if (!s.hunterPendingShooters.includes(playerId)) {
        throw new GameActionRejectedError('เฉพาะ Hunter ที่ถูกโหวตและยังไม่ได้ยิง');
      }
      if (!playerIds.includes(action.targetId))
        throw new GameActionRejectedError('เป้าหมายไม่ถูกต้อง');
      if (action.targetId === playerId) throw new GameActionRejectedError('เลือกผู้อื่น');
      const alreadyOut = new Set([...s.voteEliminatedIds, ...s.hunterShotVictimIds]);
      if (alreadyOut.has(action.targetId)) {
        throw new GameActionRejectedError(
          'เลือกผู้เล่นที่ยังไม่ถูกโหวต (และยังไม่ถูก Hunter ยิงในรอบนี้)',
        );
      }
      s.hunterShotVictimIds.push(action.targetId);
      s.hunterPendingShooters = s.hunterPendingShooters.filter((id) => id !== playerId);
      s.hunterRevealTargetId = action.targetId;
      s.hunterRevealAck = {};
      for (const p of s.players) s.hunterRevealAck[p.id] = false;
      s.phase = 'hunter_reveal';
      s.lastEvent = 'เปิดการ์ดผู้ถูก Hunter ยิง — กดรับทราบเมื่อดูแล้ว';
      return s;
    }

    if (s.phase === 'hunter_reveal') {
      if (action.type !== 'acknowledge_hunter_reveal') {
        throw new GameActionRejectedError('กดรับทราบหลังดูการ์ด');
      }
      if (s.hunterRevealTargetId == null) throw new GameActionRejectedError('สถานะไม่ถูกต้อง');
      s.hunterRevealAck[playerId] = true;
      let cur = 0;
      for (const p of s.players) {
        if (s.hunterRevealAck[p.id]) cur += 1;
      }
      s.lastEvent = `ดูการ์ดผู้ถูกยิงแล้ว ${cur}/${s.players.length}`;
      if (cur === s.players.length) {
        s.hunterRevealTargetId = null;
        s.hunterRevealAck = {};
        if (s.hunterPendingShooters.length > 0) {
          s.phase = 'hunter_shot';
          const names = s.hunterPendingShooters
            .map((id) => s.players.find((p) => p.id === id)?.name ?? '?')
            .join(' · ');
          s.lastEvent = `รอ Hunter ที่ยังไม่ยิงเลือกเป้าหมาย: ${names}`;
        } else {
          s.outcome = resolveGameResult(s, s.voteEliminatedIds, s.hunterShotVictimIds);
          s.phase = 'game_over';
          s.lastEvent = 'สรุปผล';
        }
      }
      return s;
    }

    throw new GameActionRejectedError('ไม่สามารถทำในเฟสนี้');
  },

  getPlayerView(state: OnuwState, viewerId: string): unknown {
    return toPlayerView(state, viewerId);
  },

  isGameOver(state: OnuwState): GameResult | null {
    return state.outcome;
  },
};

function toPlayerView(state: OnuwState, viewerId: string): OnuwPlayerView {
  const gameCards = state.gameCards;
  const rolesInPlay = summarizeRolesInPlay(gameCards);

  let compositionAckProgress: OnuwPlayerView['compositionAckProgress'] = null;
  let hasAcknowledgedComposition = false;
  if (state.phase === 'composition') {
    let c = 0;
    for (const p of state.players) {
      if (state.compositionAck[p.id]) c += 1;
    }
    compositionAckProgress = { current: c, total: state.players.length };
    hasAcknowledgedComposition = state.compositionAck[viewerId] === true;
  }

  let roleRevealProgress: OnuwPlayerView['roleRevealProgress'] = null;
  let hasAcknowledgedRole = false;
  if (state.phase === 'role_reveal') {
    let c = 0;
    for (const p of state.players) {
      if (state.roleAck[p.id]) c += 1;
    }
    roleRevealProgress = { current: c, total: state.players.length };
    hasAcknowledgedRole = state.roleAck[viewerId] === true;
  }

  /** กลางคืนแสดงการ์ดตอนเริ่มคืน — การ์ดหน้าที่นั่งอาจถูกสลับระหว่างคืน */
  const myCardCurrent = cardAtSeat(state, viewerId);
  const myCardForPanel =
    state.phase === 'night' ? cardAtNightBegin(state, viewerId) : myCardCurrent;
  const showMyRolePanel =
    state.phase === 'role_reveal' || state.phase === 'game_over' || state.phase === 'night';
  const myRole = showMyRolePanel ? myCardForPanel.role : null;
  const myRoleArtKey = showMyRolePanel ? myCardForPanel.artKey : null;

  const step = currentNightStep(state);
  const nightStepIndex: number | null = state.phase === 'night' ? state.nightStepIndex : null;
  const nightStepEndsAtMs: number | null = state.phase === 'night' ? state.nightStepEndsAtMs : null;
  const nightSteps: OnuwPlayerView['nightSteps'] =
    state.phase === 'night' ? state.nightScheduleKinds.map((kind) => ({ kind })) : null;
  const currentNightKind: OnuwNightStepKind | null = step?.kind ?? null;
  const nightActors: string[] | null =
    state.phase === 'night'
      ? canViewerActCurrentNightStep(state, viewerId)
        ? [viewerId]
        : []
      : null;
  const nightWolfIsPack: boolean | null =
    state.phase === 'night' && step?.kind === 'werewolf' ? step.actorIds.length >= 2 : null;
  let nightPromptTh: string | null = null;
  if (state.phase === 'night' && step) {
    nightPromptTh = nightPromptFor(step, state);
  }

  let nightSecretView: OnuwNightSecretView | null = state.nightSecrets[viewerId] ?? null;
  if (state.phase !== 'night') nightSecretView = null;

  const dayReadyProgress: OnuwPlayerView['dayReadyProgress'] = null;

  let voteProgress: OnuwPlayerView['voteProgress'] = null;
  let votePhaseEndsAtMs: OnuwPlayerView['votePhaseEndsAtMs'] = null;
  let voteEliminationRevealEndsAtMs: OnuwPlayerView['voteEliminationRevealEndsAtMs'] = null;
  let voteParticipantStatus: OnuwPlayerView['voteParticipantStatus'] = null;
  let myVoteTargetId: OnuwPlayerView['myVoteTargetId'] = null;
  let myVoteAbstained: OnuwPlayerView['myVoteAbstained'] = false;
  if (state.phase === 'vote') {
    let c = 0;
    for (const p of state.players) {
      if (state.votes[p.id]) c += 1;
    }
    voteProgress = { current: c, total: state.players.length };
    votePhaseEndsAtMs = state.votePhaseEndsAtMs;
    voteParticipantStatus = state.players.map((p) => ({
      playerId: p.id,
      name: p.name,
      hasVoted: Boolean(state.votes[p.id]),
    }));
    const v = state.votes[viewerId];
    myVoteAbstained = v === ONUW_VOTE_ABSTAIN;
    myVoteTargetId = v && v !== ONUW_VOTE_ABSTAIN ? v : null;
  }

  let revealEliminations: OnuwPlayerView['revealEliminations'] = [];
  if (state.phase === 'vote_elimination_reveal') {
    voteEliminationRevealEndsAtMs = state.voteEliminationRevealEndsAtMs;
    revealEliminations = state.voteEliminatedIds.map((id) => ({
      playerId: id,
      role: roleAtSeat(state, id),
      artKey: cardAtSeat(state, id).artKey,
    }));
  }

  let myRoleConfidenceSlotKey: OnuwPlayerView['myRoleConfidenceSlotKey'] = null;
  let roleConfidenceSlots: OnuwPlayerView['roleConfidenceSlots'] = null;
  if (state.phase === 'vote') {
    const rip = summarizeRolesInPlay(state.gameCards);
    const ordered = onuwOrderedCompositionSlots(rip);
    const bySlot = new Map<string, { playerId: string; name: string }[]>();
    for (const p of state.players) {
      const sk = state.dayRoleConfidence[p.id];
      if (!sk) continue;
      if (!bySlot.has(sk)) bySlot.set(sk, []);
      bySlot.get(sk)!.push({ playerId: p.id, name: p.name });
    }
    roleConfidenceSlots = ordered.map((slot) => ({
      slotKey: slot.slotKey,
      pickers: bySlot.get(slot.slotKey) ?? [],
    }));
    myRoleConfidenceSlotKey = state.dayRoleConfidence[viewerId] ?? null;
  }

  const hunterPendingShooterIds: OnuwPlayerView['hunterPendingShooterIds'] =
    state.phase === 'hunter_shot' ? [...state.hunterPendingShooters] : null;
  const hunterMustShoot =
    state.phase === 'hunter_shot' && state.hunterPendingShooters.includes(viewerId);
  const hunterExcludedTargetIds: OnuwPlayerView['hunterExcludedTargetIds'] =
    state.phase === 'hunter_shot'
      ? [...state.voteEliminatedIds, ...state.hunterShotVictimIds]
      : null;

  let hunterRevealCard: OnuwPlayerView['hunterRevealCard'] = null;
  let hunterRevealAckProgress: OnuwPlayerView['hunterRevealAckProgress'] = null;
  let hasAcknowledgedHunterReveal = false;
  if (state.phase === 'hunter_reveal' && state.hunterRevealTargetId != null) {
    const tid = state.hunterRevealTargetId;
    const c = cardAtSeat(state, tid);
    hunterRevealCard = { playerId: tid, role: c.role, artKey: c.artKey };
    let ca = 0;
    for (const p of state.players) {
      if (state.hunterRevealAck[p.id]) ca += 1;
    }
    hunterRevealAckProgress = { current: ca, total: state.players.length };
    hasAcknowledgedHunterReveal = state.hunterRevealAck[viewerId] === true;
  }

  let hunterShotReveals: OnuwPlayerView['hunterShotReveals'] = [];
  let morningRoster: OnuwPlayerView['morningRoster'] = null;

  if (state.phase === 'game_over') {
    morningRoster = state.players.map((p) => {
      const c = cardAtSeat(state, p.id);
      return { playerId: p.id, name: p.name, role: c.role, artKey: c.artKey };
    });
    if (state.voteEliminatedIds.length > 0) {
      revealEliminations = state.voteEliminatedIds.map((id) => ({
        playerId: id,
        role: roleAtSeat(state, id),
        artKey: cardAtSeat(state, id).artKey,
      }));
    }
    hunterShotReveals = state.hunterShotVictimIds.map((id) => ({
      playerId: id,
      role: roleAtSeat(state, id),
      artKey: cardAtSeat(state, id).artKey,
    }));
  }

  const gameResult = state.outcome
    ? { winners: state.outcome.winners, reason: state.outcome.reason }
    : null;

  return {
    phase: state.phase,
    players: state.players.map((p) => ({ id: p.id, name: p.name })),
    rolesInPlay,
    compositionAckProgress,
    hasAcknowledgedComposition,
    roleRevealProgress,
    hasAcknowledgedRole,
    myRole,
    myRoleArtKey,
    myRoleDescriptionTh: myRole ? ONUW_ROLE_DESCRIPTION_TH[myRole] : null,
    nightStepIndex,
    nightSteps,
    nightStepEndsAtMs,
    currentNightKind,
    nightActors,
    nightWolfIsPack,
    nightPromptTh,
    nightSecretView,
    dayReadyProgress,
    voteProgress,
    votePhaseEndsAtMs,
    voteEliminationRevealEndsAtMs,
    voteParticipantStatus,
    myVoteTargetId,
    myVoteAbstained,
    myRoleConfidenceSlotKey,
    roleConfidenceSlots,
    hunterMustShoot,
    hunterPendingShooterIds,
    hunterExcludedTargetIds,
    hunterRevealCard,
    hunterRevealAckProgress,
    hasAcknowledgedHunterReveal,
    revealEliminations,
    hunterShotReveals,
    morningRoster,
    gameResult,
    lastEvent: state.lastEvent,
  };
}

function nightPromptFor(step: OnuwNightStep, s: OnuwState): string {
  switch (step.kind) {
    case 'doppelganger':
      return 'Doppelgänger — เลือกผู้เล่นหนึ่งคนเพื่อดูการ์ดของเขา ถ้าก็อปหมอดู/โจร/คนสร้างปัญหา/คนเมา ให้ทำแอ็กชันนั้นในขั้นนี้ต่อทันที (จะไม่ตื่นซ้ำในขั้นหลักของบทนั้น)';
    case 'werewolf':
      return step.actorIds.length >= 2
        ? 'มนุษย์หมาป่า — ดูเพื่อนร่วมทีม แล้วกดยืนยัน'
        : 'มนุษย์หมาป่าโดดเดี่ยว — เลือกการ์ดกลาง 1 ใบเพื่อดู';
    case 'minion':
      return 'ลูกสมุน — ดูว่าใครเป็นมนุษย์หมาป่า แล้วกดยืนยัน';
    case 'mason':
      return 'ช่างหิน — ดูเพื่อนช่างหิน (ถ้ามี) แล้วกดยืนยัน';
    case 'seer':
      return 'หมอดู — เลือกดูการ์ดผู้เล่นหนึ่งคน หรือการ์ดกลางสองใบ';
    case 'robber':
      return 'โจร — เลือกผู้เล่นหนึ่งคนเพื่อสลับการ์ดกับเขา';
    case 'troublemaker':
      return 'คนสร้างปัญหา — เลือกผู้เล่นสองคน (ไม่รวมคุณ) เพื่อสลับการ์ดของพวกเขา';
    case 'drunk':
      return 'คนเมา — เลือกการ์ดกลางหนึ่งใบเพื่อสลับกับการ์ดของคุณ (ไม่ดูหน้าการ์ด)';
    case 'insomniac':
      return 'คนนอนไม่หลับ — ถ้าคุณเป็นบทนี้ตั้งแต่เริ่มคืน ให้ดูการ์ดของคุณหน้าที่นั่งว่าเปลี่ยนหรือไม่ แล้วกดยืนยัน';
    default:
      return s.lastEvent;
  }
}
