import type { GameDefinition, GameResult, Player } from 'shared';
import type {
  CsFilesAction,
  CsFilesInvestigationSubPhase,
  CsFilesKnownInfo,
  CsFilesLobbyOptions,
  CsFilesPhase,
  CsFilesPlayerView,
  CsFilesRole,
  CsFilesSceneTile,
  CsFilesSceneTileDef,
  CsFilesSeat,
  CsFilesSolution,
} from 'shared';
import {
  CS_FILES_BLUE_CARDS,
  CS_FILES_BROWN_CARDS,
  CS_FILES_CAUSE_OF_DEATH_CARD,
  CS_FILES_LOCATION_CARDS,
  CS_FILES_SITUATION_CARDS,
  parseCsFilesLobbyOptions,
} from 'shared';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function pickNUnique<T>(pool: readonly T[], n: number): T[] {
  if (n > pool.length) {
    throw new Error(`Need ${n} items but pool has ${pool.length}`);
  }
  return shuffle([...pool]).slice(0, n);
}

function pickRandomPlayerId(players: Array<{ id: string }>): string {
  if (players.length === 0) {
    throw new Error('CS Files setup requires at least one player');
  }
  return players[Math.floor(Math.random() * players.length)]!.id;
}

function resolveForensicId(players: Array<{ id: string }>, opts: CsFilesLobbyOptions): string {
  if (opts.forensicMode === 'manual' && opts.forensicPlayerId) {
    const found = players.find((p) => p.id === opts.forensicPlayerId);
    if (found) return found.id;
  }
  return pickRandomPlayerId(players);
}

function buildRoleList(playerCount: number, opts: CsFilesLobbyOptions): CsFilesRole[] {
  const roles: CsFilesRole[] = ['forensic', 'murderer'];
  if (playerCount >= 6 && opts.includeAccomplice) {
    roles.push('accomplice');
    if (opts.includeWitness) roles.push('witness');
  }
  while (roles.length < playerCount) roles.push('investigator');
  return roles;
}

function tileFromDef(def: CsFilesSceneTileDef, instanceId: string): CsFilesSceneTile {
  return {
    id: instanceId,
    kind: def.kind,
    label: def.label,
    options: [...def.options],
    pinIndex: null,
  };
}

function startInvestigationRound1(state: CsFilesState): void {
  const loc = pickNUnique(CS_FILES_LOCATION_CARDS, 1)[0]!;
  const cause = CS_FILES_CAUSE_OF_DEATH_CARD;
  const situations = pickNUnique(CS_FILES_SITUATION_CARDS, 4);
  state.sceneTiles = [
    tileFromDef(loc, `tile-${loc.id}`),
    tileFromDef(cause, `tile-${cause.id}`),
    ...situations.map((s, i) => tileFromDef(s, `tile-${s.id}-${i}`)),
  ];
  state.usedSituationDefIds = situations.map((s) => s.id);
  state.tilesNeedingPin = state.sceneTiles.map((t) => t.id);
  state.pendingSituationTile = null;
  state.pendingSituationDefId = null;
  state.investigationRound = 1;
  state.investigationSubPhase = 'placing_pins';
  state.currentSpeakerIndex = 0;
  state.lastEvent = 'รอบที่ 1 — นักนิติฯ วางหมุดบนแผ่นสถานการณ์ทั้ง 6 แผ่น';
}

export interface CsFilesState {
  phase: CsFilesPhase;
  seats: CsFilesSeat[];
  playerIdSet: Record<string, true>;
  forensicId: string;
  murdererId: string;
  accompliceId: string | null;
  witnessId: string | null;
  roleRevealAllRoles: CsFilesRole[];
  compositionAcknowledged: Record<string, true>;
  compositionAcknowledgeCount: number;
  roleAcknowledged: Record<string, true>;
  roleAcknowledgeCount: number;
  solution: CsFilesSolution | null;
  /** ช่วง night_crime — ฆาตกรเลือกค้างไว้ (สมรู้ร่วมคิดเห็นได้) */
  crimeDraft: { evidenceCardId: string | null; meansCardId: string | null } | null;
  /** ช่วง witness_hunt — ฆาตกรเลือกเป้าค้างไว้ (ทุกคนเห็น) */
  witnessHuntDraft: string | null;
  /** พยานรู้คู่ฝ่ายร้ายตั้งแต่ setup — ไม่แยกว่าใครเป็นฆาตกร */
  witnessShownEvilIds: string[] | null;
  investigationRound: number;
  investigationSubPhase: CsFilesInvestigationSubPhase;
  sceneTiles: CsFilesSceneTile[];
  tilesNeedingPin: string[];
  usedSituationDefIds: string[];
  /** แผ่นสถานการณ์ใหม่รอรอบ 2–3 — นิติฯ เลือกแผ่นเก่าแทนที่ */
  pendingSituationTile: CsFilesSceneTile | null;
  pendingSituationDefId: string | null;
  /** cardId → playerIds ที่ปักหมุด (ตัดชอยส์) */
  cardPins: Record<string, string[]>;
  presentationOrder: string[];
  currentSpeakerIndex: number;
  discussionDurationMs: number;
  turnDurationMs: number;
  discussionEndsAtMs: number | null;
  turnEndsAtMs: number | null;
  lastSolveResult: {
    playerId: string;
    playerName: string;
    correct: boolean;
    targetPlayerId: string;
    targetPlayerName: string;
    evidenceCardId: string;
    meansCardId: string;
  } | null;
  solvedById: string | null;
  lastEvent: string;
  outcome: GameResult | null;
}

function goodTeamIds(state: CsFilesState): string[] {
  return state.seats
    .filter((s) => s.role === 'forensic' || s.role === 'investigator' || s.role === 'witness')
    .map((s) => s.id);
}

function evilTeamIds(state: CsFilesState): string[] {
  return state.seats
    .filter((s) => s.role === 'murderer' || s.role === 'accomplice')
    .map((s) => s.id);
}

function isLastInvestigationRound(state: CsFilesState): boolean {
  return state.investigationRound >= 3;
}

function speakerMustSolve(state: CsFilesState, speakerId: string): boolean {
  if (!isLastInvestigationRound(state)) return false;
  const seat = state.seats.find((s) => s.id === speakerId);
  return Boolean(seat?.hasBadge);
}

/** สุ่มแผ่นสถานการณ์ใหม่ แล้วให้นิติฯ เลือกแผ่นเก่าที่จะแทนที่ */
function beginSituationReplace(state: CsFilesState): void {
  const available = CS_FILES_SITUATION_CARDS.filter(
    (s) => !state.usedSituationDefIds.includes(s.id),
  );
  const pool = available.length > 0 ? available : CS_FILES_SITUATION_CARDS;
  const next = pickNUnique(pool, 1)[0]!;
  const instanceId = `tile-${next.id}-r${state.investigationRound}-pending`;
  state.pendingSituationDefId = next.id;
  state.pendingSituationTile = tileFromDef(next, instanceId);
  state.tilesNeedingPin = [];
  state.investigationSubPhase = 'replacing_situation';
  state.lastEvent = `รอบที่ ${state.investigationRound} — นักนิติฯ ได้แผ่นใหม่ «${next.label}» เลือกแผ่นสถานการณ์เก่าที่จะแทนที่ (ห้ามเปลี่ยนสถานที่/สาเหตุการตาย)`;
}

function applySituationReplace(state: CsFilesState, oldTileId: string): boolean {
  if (!state.pendingSituationTile || !state.pendingSituationDefId) return false;
  const old = state.sceneTiles.find((t) => t.id === oldTileId);
  if (!old || old.kind !== 'situation') return false;

  const defId = state.pendingSituationDefId;
  const def = CS_FILES_SITUATION_CARDS.find((s) => s.id === defId);
  if (!def) return false;

  const instanceId = `tile-${defId}-r${state.investigationRound}`;
  const newTile = tileFromDef(def, instanceId);

  state.sceneTiles = state.sceneTiles.map((t) => (t.id === oldTileId ? newTile : t));
  if (!state.usedSituationDefIds.includes(defId)) {
    state.usedSituationDefIds = [...state.usedSituationDefIds, defId];
  }
  state.pendingSituationTile = null;
  state.pendingSituationDefId = null;
  state.tilesNeedingPin = [instanceId];
  state.investigationSubPhase = 'placing_pins';
  state.lastEvent = `รอบที่ ${state.investigationRound} — แทนที่ «${old.label}» ด้วย «${newTile.label}» — วางหมุดบนแผ่นใหม่`;
  return true;
}

/** เริ่มตาคนปัจจุบัน — ข้ามคนที่หมดสิทธิ์ในรอบสุดท้าย */
function startCurrentSpeakerTurn(state: CsFilesState): void {
  while (state.currentSpeakerIndex < state.presentationOrder.length) {
    const id = state.presentationOrder[state.currentSpeakerIndex]!;
    const seat = state.seats.find((s) => s.id === id);
    if (isLastInvestigationRound(state) && seat && !seat.hasBadge) {
      state.currentSpeakerIndex += 1;
      continue;
    }
    break;
  }

  if (state.currentSpeakerIndex >= state.presentationOrder.length) {
    afterPresentationComplete(state);
    return;
  }

  const speakerId = state.presentationOrder[state.currentSpeakerIndex]!;
  const name = state.seats.find((s) => s.id === speakerId)?.name ?? '';
  state.discussionEndsAtMs = null;
  state.turnEndsAtMs = Date.now() + state.turnDurationMs;
  const force = speakerMustSolve(state, speakerId);
  state.lastEvent = force
    ? `รอบสืบสวน (รอบสุดท้าย) — ถึงตา ${name} ต้องไขคดี`
    : `รอบสืบสวน — ถึงตา ${name} (ไขคดีหรือผ่าน)`;
}

function beginPresenting(state: CsFilesState): void {
  state.investigationSubPhase = 'presenting';
  state.currentSpeakerIndex = 0;
  state.discussionEndsAtMs = null;
  startCurrentSpeakerTurn(state);
}

function passCurrentSpeaker(state: CsFilesState): void {
  state.currentSpeakerIndex += 1;
  startCurrentSpeakerTurn(state);
}

function afterPresentationComplete(state: CsFilesState): void {
  state.turnEndsAtMs = null;
  state.discussionEndsAtMs = null;
  if (state.investigationRound >= 3) {
    state.phase = 'game_over';
    state.outcome = {
      winners: evilTeamIds(state),
      reason: 'จบรอบที่ 3 แล้วยังไม่มีใครไขคดีถูก — ฆาตกรและผู้สมรู้ร่วมคิดชนะ',
    };
    state.lastEvent = state.outcome.reason;
    return;
  }
  state.investigationRound += 1;
  state.investigationSubPhase = 'replacing_situation';
  state.currentSpeakerIndex = 0;
  beginSituationReplace(state);
}

function beginDiscussion(state: CsFilesState): void {
  state.investigationSubPhase = 'discussion';
  state.turnEndsAtMs = null;
  state.discussionEndsAtMs = Date.now() + state.discussionDurationMs;
  state.lastEvent = `รอบที่ ${state.investigationRound} — อภิปราย (ยกเว้นนักนิติฯ)`;
}

function endWithGoodWin(state: CsFilesState, solvedById: string): void {
  state.turnEndsAtMs = null;
  state.discussionEndsAtMs = null;
  state.solvedById = solvedById;
  if (state.witnessId) {
    state.phase = 'witness_hunt';
    state.witnessHuntDraft = null;
    state.lastEvent = 'ไขคดีสำเร็จ — ฆาตกรมีโอกาสชี้ตัวพยาน';
    return;
  }
  state.phase = 'game_over';
  state.outcome = {
    winners: goodTeamIds(state),
    reason: 'ไขคดีถูกทั้งหลักฐานและวิธีฆ่า — ฝ่ายนักสืบและนักนิติวิทยาศาสตร์ชนะ',
  };
  state.lastEvent = state.outcome.reason;
}

/** เรียกจากเซิร์ฟเวอร์เมื่อหมดเวลาอภิปราย / รอบสืบสวน */
export function applyCsFilesTimerExpiry(state: CsFilesState): CsFilesState {
  if (state.outcome || state.phase !== 'investigation') return state;
  const now = Date.now();
  const s: CsFilesState = {
    ...state,
    seats: state.seats.map((seat) => ({
      ...seat,
      brownCards: [...seat.brownCards],
      blueCards: [...seat.blueCards],
    })),
    sceneTiles: state.sceneTiles.map((t) => ({ ...t, options: [...t.options] })),
    tilesNeedingPin: [...state.tilesNeedingPin],
    usedSituationDefIds: [...state.usedSituationDefIds],
    presentationOrder: [...state.presentationOrder],
    pendingSituationTile: state.pendingSituationTile
      ? { ...state.pendingSituationTile, options: [...state.pendingSituationTile.options] }
      : null,
    cardPins: Object.fromEntries(Object.entries(state.cardPins).map(([k, v]) => [k, [...v]])),
  };

  if (
    s.investigationSubPhase === 'discussion' &&
    s.discussionEndsAtMs != null &&
    now >= s.discussionEndsAtMs
  ) {
    beginPresenting(s);
    return s;
  }

  if (s.investigationSubPhase === 'presenting' && s.turnEndsAtMs != null && now >= s.turnEndsAtMs) {
    // หมดเวลา = ผ่านอัตโนมัติ (แม้รอบสุดท้าย — ไม่ค้างเกม)
    passCurrentSpeaker(s);
    return s;
  }

  return state;
}

function toPlayerView(state: CsFilesState, viewerId: string): CsFilesPlayerView {
  const me = state.seats.find((s) => s.id === viewerId);
  const myRole = me?.role ?? 'investigator';
  const revealed = state.phase === 'game_over' && state.outcome != null;
  /** นักนิติฯ เปิดเผยตัวตั้งแต่ช่วง role_reveal เป็นต้นไป */
  const forensicPublic = state.phase === 'composition' ? null : state.forensicId;

  const showSolution =
    revealed || myRole === 'forensic' || myRole === 'murderer' || myRole === 'accomplice';

  const knownInfo: CsFilesKnownInfo[] = [];
  if (myRole === 'accomplice') {
    const murderer = state.seats.find((s) => s.id === state.murdererId);
    if (murderer) {
      knownInfo.push({ id: murderer.id, name: murderer.name, detail: 'ฆาตกร' });
    }
  }
  if (myRole === 'witness' && state.witnessShownEvilIds) {
    for (const id of state.witnessShownEvilIds) {
      const seat = state.seats.find((s) => s.id === id);
      if (seat) knownInfo.push({ id: seat.id, name: seat.name, detail: 'ฝ่ายร้าย' });
    }
  }
  if (myRole === 'forensic') {
    for (const id of [state.murdererId, state.accompliceId].filter(Boolean) as string[]) {
      const seat = state.seats.find((s) => s.id === id);
      if (seat) {
        knownInfo.push({
          id: seat.id,
          name: seat.name,
          detail: seat.role === 'murderer' ? 'ฆาตกร' : 'ผู้สมรู้ร่วมคิด',
        });
      }
    }
  }

  const view: CsFilesPlayerView = {
    phase: state.phase,
    players: state.seats.map((s) => ({ id: s.id, name: s.name })),
    seats: state.seats.map((s) => ({
      id: s.id,
      name: s.name,
      brownCards: s.brownCards,
      blueCards: s.blueCards,
      hasBadge: s.hasBadge,
    })),
    forensicId: forensicPublic,
    myRole,
    myId: viewerId,
    roleRevealAllRoles: state.roleRevealAllRoles,
    lastEvent: state.lastEvent,
    lastSolveResult: state.lastSolveResult,
  };

  if (showSolution && state.solution) {
    view.solution = state.solution;
  }

  if (
    state.phase === 'night_crime' &&
    state.crimeDraft &&
    (myRole === 'murderer' || myRole === 'accomplice')
  ) {
    view.crimeDraft = state.crimeDraft;
  }

  if (state.phase === 'witness_hunt') {
    view.witnessHuntDraft = state.witnessHuntDraft;
  }

  // ฆาตกรไม่รู้สมรู้ร่วมคิดระหว่างเกม — ยกเว้น witness_hunt (กันชี้ผิดเป้าที่รู้ว่าไม่ใช่พยาน)
  // สมรู้ร่วมคิดรู้ฆาตกร; นิติฯ รู้ทั้งคู่; ช่วงชี้พยานทุกคนรู้ว่าใครเป็นฆาตกร
  if (myRole === 'forensic') {
    view.murdererId = state.murdererId;
    view.accompliceId = state.accompliceId;
  } else if (myRole === 'accomplice') {
    view.murdererId = state.murdererId;
  } else if (myRole === 'murderer' && state.phase === 'witness_hunt') {
    view.accompliceId = state.accompliceId;
  }

  if (state.phase === 'witness_hunt') {
    view.murdererId = state.murdererId;
  }

  if (myRole === 'witness') {
    view.evilPairIds = state.witnessShownEvilIds ?? undefined;
    view.witnessShownEvilIds = state.witnessShownEvilIds;
  }

  if (knownInfo.length > 0) view.knownInfo = knownInfo;

  if (state.phase === 'composition') {
    view.hasAcknowledgedComposition = state.compositionAcknowledged[viewerId] === true;
    view.compositionAcknowledgeProgress = {
      current: state.compositionAcknowledgeCount,
      total: state.seats.length,
    };
  }

  if (state.phase === 'role_reveal') {
    view.hasAcknowledgedRole = state.roleAcknowledged[viewerId] === true;
    view.roleAcknowledgeProgress = {
      current: state.roleAcknowledgeCount,
      total: state.seats.length,
    };
  }

  if (state.phase === 'investigation' || state.phase === 'witness_hunt' || revealed) {
    view.investigationRound = state.investigationRound;
    view.investigationSubPhase = state.investigationSubPhase;
    view.sceneTiles = state.sceneTiles;
    view.tilesNeedingPin = state.tilesNeedingPin;
    view.pendingSituationTile =
      state.investigationSubPhase === 'replacing_situation' ? state.pendingSituationTile : null;
    const cardPinsView: Record<string, { id: string; name: string }[]> = {};
    for (const [cardId, playerIds] of Object.entries(state.cardPins)) {
      cardPinsView[cardId] = playerIds
        .map((id) => {
          const seat = state.seats.find((x) => x.id === id);
          return seat ? { id: seat.id, name: seat.name } : null;
        })
        .filter((x): x is { id: string; name: string } => x != null);
    }
    view.cardPins = cardPinsView;
    view.presentationOrder = state.presentationOrder;
    const currentSpeakerId =
      state.investigationSubPhase === 'presenting'
        ? (state.presentationOrder[state.currentSpeakerIndex] ?? null)
        : null;
    view.currentSpeakerId = currentSpeakerId;
    view.discussionEndsAtMs =
      state.investigationSubPhase === 'discussion' ? state.discussionEndsAtMs : null;
    view.turnEndsAtMs = state.investigationSubPhase === 'presenting' ? state.turnEndsAtMs : null;
    if (
      currentSpeakerId != null &&
      state.investigationSubPhase === 'presenting' &&
      viewerId === currentSpeakerId
    ) {
      view.mustSolveThisTurn = speakerMustSolve(state, currentSpeakerId);
    }
  }

  view.forensicId = forensicPublic;

  if (revealed && state.outcome) {
    view.gameResult = state.outcome;
    const roles: Record<string, CsFilesRole> = {};
    for (const s of state.seats) roles[s.id] = s.role;
    view.gameOverReveal = {
      roles,
      solution: state.solution!,
      witnessId: state.witnessId,
      solvedById: state.solvedById,
    };
  }

  return view;
}

export const csFilesGame: GameDefinition<CsFilesState, CsFilesAction> = {
  id: 'cs-files',
  name: 'CS Files',
  description: 'สืบสวนคดีฆาตกรรม 4–12 คน — หาหลักฐานและวิธีฆ่าจากคำใบ้ของนักนิติวิทยาศาสตร์',
  minPlayers: 4,
  maxPlayers: 12,
  thumbnail: '/games/cs-files/thumbnail.png',

  setup(players: Player[], options?: unknown): CsFilesState {
    const opts = parseCsFilesLobbyOptions(options, players.length);
    const roleList = buildRoleList(players.length, opts);
    const otherRoles = shuffle(roleList.filter((r) => r !== 'forensic'));
    const forensicId = resolveForensicId(players, opts);
    const brownPool = shuffle([...CS_FILES_BROWN_CARDS]);
    const bluePool = shuffle([...CS_FILES_BLUE_CARDS]);
    /** นักนิติฯ ไม่ได้การ์ดหลักฐาน/วิธีฆ่า — แจกเฉพาะผู้เล่นที่เหลือ */
    const need = (players.length - 1) * 4;
    if (brownPool.length < need) {
      throw new Error('Not enough brown evidence cards for this player count');
    }
    if (bluePool.length < need) {
      throw new Error('Not enough blue means cards for this player count');
    }

    let otherIdx = 0;
    const seats: CsFilesSeat[] = players.map((p) => {
      const role = p.id === forensicId ? 'forensic' : otherRoles[otherIdx++]!;
      const isForensic = role === 'forensic';
      const brownCards = isForensic ? [] : brownPool.splice(0, 4);
      const blueCards = isForensic ? [] : bluePool.splice(0, 4);
      return {
        id: p.id,
        name: p.name,
        role,
        brownCards,
        blueCards,
        hasBadge: !isForensic,
      };
    });

    const murdererId = seats.find((s) => s.role === 'murderer')!.id;
    const accompliceId = seats.find((s) => s.role === 'accomplice')?.id ?? null;
    const witnessId = seats.find((s) => s.role === 'witness')?.id ?? null;

    // พยานรู้คู่ฝ่ายร้ายตั้งแต่เริ่ม (ไม่แยกว่าใครเป็นฆาตกร) — ไม่ต้องให้นิติฯ ชี้
    const witnessShownEvilIds =
      witnessId && accompliceId ? (shuffle([murdererId, accompliceId]) as [string, string]) : null;

    // Presentation order: everyone except forensic
    const presentationOrder = seats.filter((s) => s.role !== 'forensic').map((s) => s.id);

    return {
      phase: 'composition',
      seats,
      playerIdSet: Object.fromEntries(seats.map((s) => [s.id, true as const])),
      forensicId,
      murdererId,
      accompliceId,
      witnessId,
      roleRevealAllRoles: roleList,
      compositionAcknowledged: {},
      compositionAcknowledgeCount: 0,
      roleAcknowledged: {},
      roleAcknowledgeCount: 0,
      solution: null,
      crimeDraft: null,
      witnessHuntDraft: null,
      witnessShownEvilIds,
      investigationRound: 0,
      investigationSubPhase: 'placing_pins',
      sceneTiles: [],
      tilesNeedingPin: [],
      usedSituationDefIds: [],
      pendingSituationTile: null,
      pendingSituationDefId: null,
      cardPins: {},
      presentationOrder,
      currentSpeakerIndex: 0,
      discussionDurationMs: opts.discussionMinutes * 60 * 1000,
      turnDurationMs: opts.turnSeconds * 1000,
      discussionEndsAtMs: null,
      turnEndsAtMs: null,
      lastSolveResult: null,
      solvedById: null,
      lastEvent: 'เปิดเผยบทบาทในเกม — รับทราบให้ครบก่อนเปิดไพ่ตัวเอง',
      outcome: null,
    };
  },

  onAction(state: CsFilesState, playerId: string, action: CsFilesAction): CsFilesState {
    if (state.outcome && state.phase === 'game_over') return state;
    if (!state.playerIdSet[playerId]) return state;

    const s: CsFilesState = {
      ...state,
      seats: state.seats.map((seat) => ({
        ...seat,
        brownCards: [...seat.brownCards],
        blueCards: [...seat.blueCards],
      })),
      compositionAcknowledged: { ...state.compositionAcknowledged },
      roleAcknowledged: { ...state.roleAcknowledged },
      sceneTiles: state.sceneTiles.map((t) => ({ ...t, options: [...t.options] })),
      tilesNeedingPin: [...state.tilesNeedingPin],
      usedSituationDefIds: [...state.usedSituationDefIds],
      presentationOrder: [...state.presentationOrder],
      pendingSituationTile: state.pendingSituationTile
        ? { ...state.pendingSituationTile, options: [...state.pendingSituationTile.options] }
        : null,
      cardPins: Object.fromEntries(Object.entries(state.cardPins).map(([k, v]) => [k, [...v]])),
      witnessShownEvilIds: state.witnessShownEvilIds ? [...state.witnessShownEvilIds] : null,
      solution: state.solution ? { ...state.solution } : null,
      crimeDraft: state.crimeDraft ? { ...state.crimeDraft } : null,
      witnessHuntDraft: state.witnessHuntDraft,
      lastSolveResult: state.lastSolveResult ? { ...state.lastSolveResult } : null,
      outcome: state.outcome ? { ...state.outcome, winners: [...state.outcome.winners] } : null,
    };

    if (action.type === 'acknowledge_composition') {
      if (s.phase !== 'composition') return state;
      if (s.compositionAcknowledged[playerId]) return state;
      s.compositionAcknowledged[playerId] = true;
      s.compositionAcknowledgeCount += 1;
      if (s.compositionAcknowledgeCount >= s.seats.length) {
        s.phase = 'role_reveal';
        s.lastEvent = 'เปิดไพ่บทบาทของคุณ — รับทราบให้ครบก่อนเริ่มก่อเหตุ';
      }
      return s;
    }

    if (action.type === 'acknowledge_role') {
      if (s.phase !== 'role_reveal') return state;
      if (s.roleAcknowledged[playerId]) return state;
      s.roleAcknowledged[playerId] = true;
      s.roleAcknowledgeCount += 1;
      if (s.roleAcknowledgeCount >= s.seats.length) {
        s.phase = 'night_crime';
        s.lastEvent = 'ช่วงก่อเหตุ — ฆาตกรเลือกหลักฐานและวิธีฆ่า';
      }
      return s;
    }

    if (action.type === 'murderer_set_crime_draft') {
      if (s.phase !== 'night_crime') return state;
      if (playerId !== s.murdererId) return state;
      const murderer = s.seats.find((seat) => seat.id === s.murdererId)!;
      const evidenceOk =
        action.evidenceCardId == null ||
        murderer.brownCards.some((c) => c.id === action.evidenceCardId);
      const meansOk =
        action.meansCardId == null || murderer.blueCards.some((c) => c.id === action.meansCardId);
      if (!evidenceOk || !meansOk) return state;
      s.crimeDraft = {
        evidenceCardId: action.evidenceCardId,
        meansCardId: action.meansCardId,
      };
      return s;
    }

    if (action.type === 'murderer_select_solution') {
      if (s.phase !== 'night_crime') return state;
      if (playerId !== s.murdererId) return state;
      const murderer = s.seats.find((seat) => seat.id === s.murdererId)!;
      const hasEvidence = murderer.brownCards.some((c) => c.id === action.evidenceCardId);
      const hasMeans = murderer.blueCards.some((c) => c.id === action.meansCardId);
      if (!hasEvidence || !hasMeans) return state;
      s.solution = {
        ownerId: s.murdererId,
        evidenceCardId: action.evidenceCardId,
        meansCardId: action.meansCardId,
      };
      s.crimeDraft = null;
      s.phase = 'investigation';
      startInvestigationRound1(s);
      return s;
    }

    if (action.type === 'forensic_place_pin') {
      if (s.phase !== 'investigation' || s.investigationSubPhase !== 'placing_pins') {
        return state;
      }
      if (playerId !== s.forensicId) return state;
      if (!s.tilesNeedingPin.includes(action.tileId)) return state;
      const tile = s.sceneTiles.find((t) => t.id === action.tileId);
      if (!tile) return state;
      if (action.optionIndex < 0 || action.optionIndex >= tile.options.length) return state;
      tile.pinIndex = action.optionIndex;
      s.lastEvent = `วางหมุดบน «${tile.label}» → ${tile.options[action.optionIndex]}`;
      return s;
    }

    if (action.type === 'forensic_confirm_pins') {
      if (s.phase !== 'investigation' || s.investigationSubPhase !== 'placing_pins') {
        return state;
      }
      if (playerId !== s.forensicId) return state;
      const allPinned = s.tilesNeedingPin.every((id) => {
        const t = s.sceneTiles.find((tile) => tile.id === id);
        return t != null && t.pinIndex != null;
      });
      if (!allPinned) {
        s.lastEvent = 'วางหมุดให้ครบบนแผ่นที่ต้องวางก่อน';
        return s;
      }
      s.tilesNeedingPin = [];
      beginDiscussion(s);
      return s;
    }

    if (action.type === 'forensic_replace_situation') {
      if (s.phase !== 'investigation' || s.investigationSubPhase !== 'replacing_situation') {
        return state;
      }
      if (playerId !== s.forensicId) return state;
      if (!applySituationReplace(s, action.tileId)) {
        s.lastEvent = 'เลือกได้เฉพาะแผ่นสถานการณ์ (ห้ามเปลี่ยนสถานที่/สาเหตุการตาย)';
        return s;
      }
      return s;
    }

    if (action.type === 'advance_to_presenting') {
      if (s.phase !== 'investigation' || s.investigationSubPhase !== 'discussion') {
        return state;
      }
      beginPresenting(s);
      return s;
    }

    if (action.type === 'pass_turn' || action.type === 'finish_presentation_turn') {
      if (s.phase !== 'investigation' || s.investigationSubPhase !== 'presenting') {
        return state;
      }
      const current = s.presentationOrder[s.currentSpeakerIndex];
      if (playerId !== current) return state;
      if (current && speakerMustSolve(s, current)) {
        s.lastEvent = 'รอบสุดท้าย — ห้ามผ่าน ต้องไขคดี';
        return s;
      }
      passCurrentSpeaker(s);
      return s;
    }

    if (action.type === 'toggle_card_pin') {
      if (s.phase !== 'investigation' && s.phase !== 'witness_hunt') return state;
      if (playerId === s.forensicId) return state;
      const cardExists = s.seats.some(
        (seat) =>
          seat.brownCards.some((c) => c.id === action.cardId) ||
          seat.blueCards.some((c) => c.id === action.cardId),
      );
      if (!cardExists) return state;

      const current = s.cardPins[action.cardId] ?? [];
      const pinned = current.includes(playerId);
      if (pinned) {
        const next = current.filter((id) => id !== playerId);
        if (next.length === 0) {
          const rest = { ...s.cardPins };
          delete rest[action.cardId];
          s.cardPins = rest;
        } else {
          s.cardPins = { ...s.cardPins, [action.cardId]: next };
        }
      } else {
        s.cardPins = { ...s.cardPins, [action.cardId]: [...current, playerId] };
      }
      return s;
    }

    if (action.type === 'solve_attempt') {
      if (s.phase !== 'investigation' || s.investigationSubPhase !== 'presenting') {
        return state;
      }
      if (playerId === s.forensicId) return state;
      const current = s.presentationOrder[s.currentSpeakerIndex];
      if (playerId !== current) return state;
      const seat = s.seats.find((x) => x.id === playerId);
      if (!seat || !seat.hasBadge) return state;
      if (!s.solution) return state;

      const target = s.seats.find((x) => x.id === action.targetPlayerId);
      if (!target) return state;
      if (action.targetPlayerId === playerId) return state;
      if (action.targetPlayerId === s.forensicId) return state;
      const hasE = target.brownCards.some((c) => c.id === action.evidenceCardId);
      const hasM = target.blueCards.some((c) => c.id === action.meansCardId);
      if (!hasE || !hasM) return state;

      seat.hasBadge = false;
      const correct =
        action.targetPlayerId === s.solution.ownerId &&
        action.evidenceCardId === s.solution.evidenceCardId &&
        action.meansCardId === s.solution.meansCardId;

      s.lastSolveResult = {
        playerId,
        playerName: seat.name,
        correct,
        targetPlayerId: action.targetPlayerId,
        targetPlayerName: target.name,
        evidenceCardId: action.evidenceCardId,
        meansCardId: action.meansCardId,
      };

      if (correct) {
        endWithGoodWin(s, playerId);
      } else {
        s.lastEvent = `${seat.name} ไขคดี — ไม่ถูก (หมดสิทธิ์ตอบ)`;
        passCurrentSpeaker(s);
      }
      return s;
    }

    if (action.type === 'murderer_set_witness_draft') {
      if (s.phase !== 'witness_hunt') return state;
      if (playerId !== s.murdererId) return state;
      if (action.targetId != null) {
        if (!s.playerIdSet[action.targetId]) return state;
        if (action.targetId === s.murdererId) return state;
        if (action.targetId === s.forensicId) return state;
        if (s.accompliceId != null && action.targetId === s.accompliceId) return state;
      }
      s.witnessHuntDraft = action.targetId;
      return s;
    }

    if (action.type === 'murderer_accuse_witness') {
      if (s.phase !== 'witness_hunt') return state;
      if (playerId !== s.murdererId) return state;
      if (!s.playerIdSet[action.targetId]) return state;
      if (action.targetId === s.murdererId) return state;
      if (action.targetId === s.forensicId) return state;
      if (s.accompliceId != null && action.targetId === s.accompliceId) return state;

      const hit = s.witnessId != null && action.targetId === s.witnessId;
      s.witnessHuntDraft = null;
      s.phase = 'game_over';
      if (hit) {
        s.outcome = {
          winners: evilTeamIds(s),
          reason: 'ฆาตกรชี้พยานถูก — ฝ่ายฆาตกรพลิกชนะ',
        };
      } else {
        s.outcome = {
          winners: goodTeamIds(s),
          reason: 'ฆาตกรชี้พยานผิด — ฝ่ายนักสืบและพยานชนะ',
        };
      }
      s.lastEvent = s.outcome.reason;
      return s;
    }

    return state;
  },

  getPlayerView(state: CsFilesState, playerId: string) {
    return toPlayerView(state, playerId);
  },

  isGameOver(state: CsFilesState): GameResult | null {
    return state.outcome;
  },
};
