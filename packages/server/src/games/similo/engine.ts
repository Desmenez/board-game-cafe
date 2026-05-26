import type {
  GameDefinition,
  GameResult,
  Player,
  SimiloAction,
  SimiloGameMode,
  SimiloLobbyOptions,
  SimiloOrientation,
  SimiloPhase,
  SimiloPlayerView,
} from 'shared';
import {
  GAME_THUMBNAIL_BY_ID,
  SIMILO_ANIMAL_CHARACTER_PUBLIC_IDS,
  formatSimiloCharacterLabel,
  parseSimiloLobbyOptions,
  similoAnimalImageUrl,
  similoRemovalsForRound,
  SIMILO_MAX_ROUNDS,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

const MAX_EVENT_LOG = 24;
const DEFAULT_DISCUSS_MS = 3 * 60 * 1000;

type GridCell = {
  index: number;
  characterId: string;
  removed: boolean;
};

type HandCard = {
  instanceId: string;
  characterId: string;
};

type PlayedClue = {
  round: number;
  characterId: string;
  orientation: SimiloOrientation;
};

type RoundResolution = {
  round: number;
  removalsByGuesser: Record<string, number[]>;
  playersEliminated: Array<{ playerId: string; reason: 'secret' | 'timeout' }>;
};

export type SimiloState = {
  phase: SimiloPhase;
  gameMode: SimiloGameMode;
  players: Array<{ id: string; name: string }>;
  clueGiverId: string;
  eliminatedByPlayer: Record<string, boolean>;
  round: number;
  secretCharacterId: string;
  grid: GridCell[];
  drawPile: string[];
  clueHand: HandCard[];
  playedClues: PlayedClue[];
  discussEndsAtMs: number | null;
  discussPicksByPlayer: Record<string, number[]>;
  discussConfirmedByPlayer: Record<string, boolean>;
  /** การ์ดที่แต่ละคนทายเลือกเอาออก (กระดานส่วนตัว — สะสมทุกรอบ) */
  guesserEliminatedIndices: Record<string, number[]>;
  roundResolutions: RoundResolution[];
  /** ผู้เล่นที่ถูกคัดออกระหว่าง discuss รอบปัจจุบัน (ก่อนบันทึกลง roundResolutions) */
  pendingRoundPlayerEliminations: Array<{ playerId: string; reason: 'secret' | 'timeout' }>;
  eventLog: string[];
  lastEvent: string;
  result: GameResult | null;
  abortReason: string | null;
  discussDurationMs: number;
};

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function pushLog(s: SimiloState, message: string): void {
  s.lastEvent = message;
  s.eventLog = [...s.eventLog, message].slice(-MAX_EVENT_LOG);
}

function nextInstanceId(): string {
  return `h_${Math.random().toString(36).slice(2, 11)}`;
}

function activeGuessers(s: SimiloState): string[] {
  return s.players
    .map((p) => p.id)
    .filter((id) => id !== s.clueGiverId && !s.eliminatedByPlayer[id]);
}

function removalsRequired(s: SimiloState): number {
  if (s.gameMode === 'team') return 1;
  return similoRemovalsForRound(s.round);
}

function allPlayerIds(s: SimiloState): string[] {
  return s.players.map((p) => p.id);
}

/** โหมดทีม — ทุกคนทายเลือกการ์ด index เดียวกัน (คนละ 1 ใบ) */
function teamDiscussPickIndex(s: SimiloState): number | null {
  const guessers = activeGuessers(s);
  if (guessers.length === 0) return null;
  const firstPicks = s.discussPicksByPlayer[guessers[0]!] ?? [];
  if (firstPicks.length !== 1) return null;
  const idx = firstPicks[0]!;
  for (const gid of guessers) {
    const picks = s.discussPicksByPlayer[gid] ?? [];
    if (picks.length !== 1 || picks[0] !== idx) return null;
  }
  return idx;
}

function teamDiscussAligned(s: SimiloState): boolean {
  return s.gameMode === 'team' && teamDiscussPickIndex(s) !== null;
}

function pickRandomPlayerId(players: Array<{ id: string }>): string {
  const ids = players.map((p) => p.id);
  if (ids.length === 0) {
    throw new Error('Similo setup requires at least one player');
  }
  return ids[Math.floor(Math.random() * ids.length)]!;
}

function resolveClueGiverId(players: Array<{ id: string }>, opts: SimiloLobbyOptions): string {
  if (opts.clueGiverMode === 'manual' && opts.clueGiverPlayerId) {
    const found = players.find((p) => p.id === opts.clueGiverPlayerId);
    if (found) return found.id;
  }
  return pickRandomPlayerId(players);
}

/** ตัวละครที่อยู่บนกระดาน 4×3 — มือคำใบ้ต้องไม่ซ้ำกับชุดนี้ */
function boardCharacterIdSet(s: SimiloState): Set<string> {
  return new Set(s.grid.map((c) => c.characterId));
}

function buildClueDrawPile(boardIds: Set<string>): string[] {
  return shuffle(SIMILO_ANIMAL_CHARACTER_PUBLIC_IDS.filter((id) => !boardIds.has(id)));
}

function drawFromPile(s: SimiloState, count: number): HandCard[] {
  const onBoard = boardCharacterIdSet(s);
  const drawn: HandCard[] = [];
  let guard = 0;
  const guardLimit = Math.max(s.drawPile.length, count) + SIMILO_ANIMAL_CHARACTER_PUBLIC_IDS.length;
  while (drawn.length < count && s.drawPile.length > 0 && guard < guardLimit) {
    guard += 1;
    const characterId = s.drawPile.shift()!;
    if (onBoard.has(characterId)) continue;
    drawn.push({ instanceId: nextInstanceId(), characterId });
  }
  return drawn;
}

/** คืนการ์ดที่หลุดเข้ามือทั้งที่อยู่บนกระดาน (กันสถานะเสีย / regression) */
function sanitizeClueHand(s: SimiloState): void {
  const onBoard = boardCharacterIdSet(s);
  let removed = 0;
  s.clueHand = s.clueHand.filter((c) => {
    if (!onBoard.has(c.characterId)) return true;
    removed += 1;
    return false;
  });
  if (removed > 0) {
    s.clueHand.push(...drawFromPile(s, removed));
    pushLog(s, 'ปรับมือคำใบ้ — ตัดการ์ดที่ซ้ำกับกระดาน');
  }
}

function startDiscussPhase(s: SimiloState, discussDurationMs: number): void {
  s.phase = 'discuss';
  s.discussPicksByPlayer = {};
  s.discussConfirmedByPlayer = {};
  for (const id of activeGuessers(s)) {
    s.discussPicksByPlayer[id] = [];
    s.discussConfirmedByPlayer[id] = false;
  }
  const ms = discussDurationMs > 0 ? discussDurationMs : DEFAULT_DISCUSS_MS;
  s.discussEndsAtMs = Date.now() + ms;
  pushLog(s, `รอบ ${s.round}: คนทายเลือกการ์ดที่จะเอาออก (${removalsRequired(s)} ใบ)`);
}

function remainingGridCells(s: SimiloState): GridCell[] {
  return s.grid.filter((c) => !c.removed);
}

/** รวมการ์ดที่แต่ละคนทายยืนยันแล้ว — คนละเลือก คนละเอาออก */
function collectChosenRemovalIndices(s: SimiloState): number[] {
  const guessers = activeGuessers(s).filter((id) => s.discussConfirmedByPlayer[id]);
  const chosen = new Set<number>();
  for (const gid of guessers) {
    for (const idx of s.discussPicksByPlayer[gid] ?? []) {
      const cell = s.grid[idx];
      if (cell && !cell.removed) chosen.add(idx);
    }
  }
  return [...chosen];
}

function indicesToRemove(s: SimiloState): number[] {
  const chosen = collectChosenRemovalIndices(s);
  const remaining = remainingGridCells(s);

  // เหลือคู่สุดท้าย (ลับ + อีก 1) — เอาออกจากกระดานได้เพียง 1 ใบที่ไม่ใช่ลับ
  if (remaining.length === 2) {
    const secretIdx = remaining.find((c) => c.characterId === s.secretCharacterId)?.index;
    if (secretIdx !== undefined) {
      const nonSecretChosen = chosen.filter((idx) => idx !== secretIdx);
      if (nonSecretChosen.length > 0) {
        return [nonSecretChosen[0]!];
      }
      return chosen.filter((idx) => idx === secretIdx);
    }
  }

  return chosen;
}

function applySecretPickerEliminations(s: SimiloState, secretIdx: number): void {
  for (const gid of activeGuessers(s)) {
    const picks = s.discussPicksByPlayer[gid] ?? [];
    if (!picks.includes(secretIdx) || s.eliminatedByPlayer[gid]) continue;
    s.eliminatedByPlayer[gid] = true;
    pushPendingPlayerElimination(s, gid, 'secret');
    const name = s.players.find((p) => p.id === gid)?.name ?? 'ผู้เล่น';
    pushLog(s, `${name} เลือกตัวละครลับ — ถูกคัดออก`);
  }
}

function recordGuesserEliminations(s: SimiloState): void {
  for (const gid of activeGuessers(s)) {
    const picks = s.discussPicksByPlayer[gid] ?? [];
    if (picks.length === 0) continue;
    const list = s.guesserEliminatedIndices[gid] ?? [];
    for (const idx of picks) {
      if (!list.includes(idx)) list.push(idx);
    }
    s.guesserEliminatedIndices[gid] = list;
  }
}

function checkWinAfterRemoval(s: SimiloState): boolean {
  const remaining = s.grid.filter((c) => !c.removed);
  return remaining.length === 1 && remaining[0]!.characterId === s.secretCharacterId;
}

/** คนใบ้ + คนทายที่ทายถูกในรอบที่ชนะ (ไม่เลือกตัวละครลับ / ช่วยเอาการ์ดผิดออก) */
function winnersForSuccessfulGuess(
  s: SimiloState,
  removedIndices: number[],
  secretIdx: number | undefined,
): string[] {
  if (s.gameMode === 'team') {
    return allPlayerIds(s);
  }

  const winners = new Set<string>([s.clueGiverId]);
  if (secretIdx === undefined) return [...winners];

  const secretWasRemoved = removedIndices.includes(secretIdx);
  const onlySecretRemains =
    remainingGridCells(s).length === 1 &&
    remainingGridCells(s)[0]!.characterId === s.secretCharacterId;

  // เหลือแค่ตัวละครลับ — ทุกคนทายที่ยืนยันและไม่ได้เลือกลับชนะ (เช่น B เลือกถูก, C เลือก Frog แพ้)
  if (onlySecretRemains && !secretWasRemoved) {
    for (const [gid, picks] of Object.entries(s.discussPicksByPlayer)) {
      if (!s.discussConfirmedByPlayer[gid]) continue;
      if (gid === s.clueGiverId) continue;
      if (!picks.includes(secretIdx)) winners.add(gid);
    }
    return [...winners];
  }

  for (const [gid, picks] of Object.entries(s.discussPicksByPlayer)) {
    if (!s.discussConfirmedByPlayer[gid]) continue;
    if (gid === s.clueGiverId) continue;
    const guessedRight = picks.some((idx) => removedIndices.includes(idx) && idx !== secretIdx);
    if (guessedRight) winners.add(gid);
  }
  return [...winners];
}

function endGame(s: SimiloState, winners: string[], reason: string): void {
  s.phase = 'game_over';
  s.discussEndsAtMs = null;
  s.result = { winners, reason };
  pushLog(s, reason);
}

function pushPendingPlayerElimination(
  s: SimiloState,
  playerId: string,
  reason: 'secret' | 'timeout',
): void {
  if (s.pendingRoundPlayerEliminations.some((e) => e.playerId === playerId)) return;
  s.pendingRoundPlayerEliminations.push({ playerId, reason });
}

function applyDiscussResolution(s: SimiloState): void {
  const removalsByGuesser: Record<string, number[]> = {};
  for (const [gid, picks] of Object.entries(s.discussPicksByPlayer)) {
    if (picks.length > 0) removalsByGuesser[gid] = [...picks];
  }

  recordGuesserEliminations(s);
  const secretIdx = s.grid.find((c) => c.characterId === s.secretCharacterId && !c.removed)?.index;
  if (secretIdx !== undefined) {
    applySecretPickerEliminations(s, secretIdx);
  }
  const removedIndices = indicesToRemove(s);

  for (const idx of removedIndices) {
    const cell = s.grid[idx];
    if (cell) cell.removed = true;
  }

  const removedLabels = removedIndices
    .map((i) => formatSimiloCharacterLabel(s.grid[i]!.characterId))
    .join(', ');
  pushLog(s, `เอาการ์ดออก: ${removedLabels || '—'}`);

  s.roundResolutions.push({
    round: s.round,
    removalsByGuesser,
    playersEliminated: [...s.pendingRoundPlayerEliminations],
  });
  s.pendingRoundPlayerEliminations = [];

  const onlySecretLeft = checkWinAfterRemoval(s);

  // ชนะได้หลังจบ discuss รอบสุดท้ายเท่านั้น — รอบ 1–4 ยังเล่นต่อแม้เหลือแค่ตัวละครลับ
  if (onlySecretLeft && s.round >= SIMILO_MAX_ROUNDS) {
    const winners = winnersForSuccessfulGuess(s, removedIndices, secretIdx);
    const winReason =
      s.gameMode === 'team'
        ? 'เหลือเฉพาะตัวละครลับ — ทีมชนะ!'
        : 'เหลือเฉพาะตัวละครลับ — คนใบ้และคนทายที่เลือกถูกชนะ!';
    endGame(s, winners, winReason);
    return;
  }

  const remainingGuessers = activeGuessers(s);
  if (remainingGuessers.length === 0) {
    endGame(s, [], 'คนทายถูกคัดออกหมด — แพ้');
    return;
  }

  if (s.round >= SIMILO_MAX_ROUNDS) {
    endGame(s, [], 'จบ 5 รอบแล้วยังทายไม่ถูก — แพ้');
    return;
  }

  s.round += 1;
  s.phase = 'play_clue';
  s.discussEndsAtMs = null;
  s.discussPicksByPlayer = {};
  s.discussConfirmedByPlayer = {};
  pushLog(s, `เริ่มรอบ ${s.round} — รอ Clue Giver เล่นการ์ดใบใบ`);
}

export function applySimiloDiscussExpiry(state: SimiloState): SimiloState {
  if (state.phase !== 'discuss') return state;
  const s = state;
  const now = Date.now();
  if (s.discussEndsAtMs == null || now < s.discussEndsAtMs) return state;

  const guessers = activeGuessers(s);
  const timedOut = guessers.filter((id) => !s.discussConfirmedByPlayer[id]);

  if (s.gameMode === 'team') {
    if (timedOut.length > 0) {
      endGame(s, [], 'มีคนทายไม่ยืนยันก่อนหมดเวลา — แพ้ทั้งหมด');
      return s;
    }
  } else {
    for (const id of timedOut) {
      s.eliminatedByPlayer[id] = true;
      pushPendingPlayerElimination(s, id, 'timeout');
      const name = s.players.find((p) => p.id === id)?.name ?? 'ผู้เล่น';
      pushLog(s, `${name} ไม่ยืนยันก่อนหมดเวลา — ถูกคัดออก`);
    }
    if (activeGuessers(s).length === 0) {
      endGame(s, [], 'คนทายถูกคัดออกหมด — แพ้');
      return s;
    }
  }

  const unconfirmed = activeGuessers(s).filter((id) => !s.discussConfirmedByPlayer[id]);
  if (unconfirmed.length > 0) return s;

  applyDiscussResolution(s);
  return s;
}

function toCharacterView(characterId: string) {
  return {
    id: characterId,
    label: formatSimiloCharacterLabel(characterId),
    imageUrl: similoAnimalImageUrl(characterId),
  };
}

function toRoundResolutionView(state: SimiloState, res: RoundResolution) {
  return {
    playersEliminated: res.playersEliminated.map((e) => ({
      playerId: e.playerId,
      playerName: state.players.find((p) => p.id === e.playerId)?.name ?? 'ผู้เล่น',
      reason: e.reason,
    })),
    removalsByGuesser: Object.entries(res.removalsByGuesser).map(([guesserId, indices]) => ({
      guesserId,
      guesserName: state.players.find((p) => p.id === guesserId)?.name ?? 'ผู้เล่น',
      cards: indices.map((idx) => {
        const cell = state.grid[idx];
        const characterId = cell?.characterId ?? '';
        return toCharacterView(characterId);
      }),
    })),
  };
}

function toPlayerView(state: SimiloState, playerId: string): SimiloPlayerView {
  const isClueGiver = playerId === state.clueGiverId;
  const eliminated = Boolean(state.eliminatedByPlayer[playerId]);
  const guessers = activeGuessers(state);
  const confirmedCount = guessers.filter((id) => state.discussConfirmedByPlayer[id]).length;

  let canAct = false;
  let canConfirmDiscuss = false;
  if (state.phase === 'play_clue' && isClueGiver) {
    canAct = true;
  }
  if (state.phase === 'discuss' && !isClueGiver && !eliminated) {
    canAct = !state.discussConfirmedByPlayer[playerId];
    const picks = state.discussPicksByPlayer[playerId] ?? [];
    const need = removalsRequired(state);
    const teamReady = state.gameMode !== 'team' || teamDiscussAligned(state);
    canConfirmDiscuss =
      canAct && picks.length === need && teamReady && !state.discussConfirmedByPlayer[playerId];
  }

  const revealSecret = isClueGiver && state.phase !== 'game_over' && state.phase !== 'aborted';

  const view: SimiloPlayerView = {
    phase: state.phase,
    myId: playerId,
    gameMode: state.gameMode,
    clueGiverId: state.clueGiverId,
    myRole: isClueGiver ? 'clue_giver' : 'guesser',
    eliminated,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.id === state.clueGiverId ? 'clue_giver' : 'guesser',
      eliminated: Boolean(state.eliminatedByPlayer[p.id]),
    })),
    round: state.round,
    removalsRequired: removalsRequired(state),
    grid: state.grid.map((c) => {
      const personalEliminated =
        !isClueGiver && !eliminated ? (state.guesserEliminatedIndices[playerId] ?? []) : [];
      const discussPicks =
        state.phase === 'discuss' && !isClueGiver && !eliminated
          ? (state.discussPicksByPlayer[playerId] ?? [])
          : [];
      const grayedForViewer =
        personalEliminated.includes(c.index) || discussPicks.includes(c.index);
      return {
        index: c.index,
        characterId: c.characterId,
        label: formatSimiloCharacterLabel(c.characterId),
        imageUrl: similoAnimalImageUrl(c.characterId),
        removed: c.removed,
        grayedForViewer: grayedForViewer || undefined,
      };
    }),
    playedClues: state.playedClues.map((cl) => {
      const resolution = state.roundResolutions.find((r) => r.round === cl.round);
      return {
        round: cl.round,
        characterId: cl.characterId,
        label: formatSimiloCharacterLabel(cl.characterId),
        imageUrl: similoAnimalImageUrl(cl.characterId),
        orientation: cl.orientation,
        roundResolution: resolution ? toRoundResolutionView(state, resolution) : undefined,
      };
    }),
    discussConfirmed: Boolean(state.discussConfirmedByPlayer[playerId]),
    discussProgress: { confirmed: confirmedCount, total: guessers.length },
    discussEndsAtMs: state.discussEndsAtMs,
    canAct,
    canConfirmDiscuss,
    teamDiscussAligned:
      state.phase === 'discuss' && state.gameMode === 'team' ? teamDiscussAligned(state) : undefined,
    eventLog: state.eventLog,
    lastEvent: state.lastEvent,
    gameResult: state.result ?? undefined,
    abortReason: state.abortReason ?? undefined,
  };

  if (revealSecret) {
    view.secretCharacter = toCharacterView(state.secretCharacterId);
  }

  if (isClueGiver && state.phase !== 'game_over' && state.phase !== 'aborted') {
    view.clueHand = state.clueHand.map((h) => ({
      instanceId: h.instanceId,
      characterId: h.characterId,
      label: formatSimiloCharacterLabel(h.characterId),
      imageUrl: similoAnimalImageUrl(h.characterId),
    }));
  }

  if (isClueGiver || state.phase === 'discuss') {
    view.discussGuessers = activeGuessers(state).map((id) => {
      const seat = state.players.find((p) => p.id === id);
      const allPicks = state.discussPicksByPlayer[id] ?? [];
      const eliminatedIndices = [...(state.guesserEliminatedIndices[id] ?? [])];
      const picksVisible =
        isClueGiver || id === playerId || state.gameMode === 'team';
      const picks = picksVisible ? [...allPicks] : [];
      return {
        id,
        name: seat?.name ?? 'ผู้เล่น',
        confirmed: Boolean(state.discussConfirmedByPlayer[id]),
        picks,
        eliminatedIndices,
      };
    });
    if (!isClueGiver && !eliminated) {
      view.myDiscussPicks = [...(state.discussPicksByPlayer[playerId] ?? [])];
    }
  }

  if (state.phase === 'game_over') {
    view.secretCharacter = toCharacterView(state.secretCharacterId);
    view.gameOverReveal = {
      secretCharacterId: state.secretCharacterId,
      secretLabel: formatSimiloCharacterLabel(state.secretCharacterId),
      secretImageUrl: similoAnimalImageUrl(state.secretCharacterId),
    };
  }

  return view;
}

export const similoGame: GameDefinition<SimiloState, SimiloAction> = {
  id: 'similo',
  name: 'Similo',
  description:
    'เกมร่วมมือทายตัวละครลับ — Clue Giver ให้คำใบ้ด้วยการ์ดแนวตั้ง (คล้าย) หรือแนวนอน (ต่าง)',
  minPlayers: 2,
  maxPlayers: 99,
  thumbnail:
    GAME_THUMBNAIL_BY_ID.similo ?? similoAnimalImageUrl(SIMILO_ANIMAL_CHARACTER_PUBLIC_IDS[0]!),

  setup(players: Player[], options?: unknown): SimiloState {
    const seated = players.map((p) => ({ id: p.id, name: p.name }));
    const opts = parseSimiloLobbyOptions(options);
    const clueGiverId = resolveClueGiverId(seated, opts);
    const deck = shuffle([...SIMILO_ANIMAL_CHARACTER_PUBLIC_IDS]);
    const secretCharacterId = deck.shift()!;
    const gridPool = deck.splice(0, 11);
    const gridIds = shuffle([secretCharacterId, ...gridPool]);
    const boardIds = new Set(gridIds);
    const grid: GridCell[] = gridIds.map((characterId, index) => ({
      index,
      characterId,
      removed: false,
    }));
    const drawPile = buildClueDrawPile(boardIds);
    const discussDurationMs = opts.discussMinutes * 60 * 1000;
    const state: SimiloState = {
      discussDurationMs,
      phase: 'play_clue',
      gameMode: opts.gameMode,
      players: seated,
      clueGiverId,
      eliminatedByPlayer: {},
      round: 1,
      secretCharacterId,
      grid,
      drawPile,
      clueHand: [],
      playedClues: [],
      discussEndsAtMs: null,
      discussPicksByPlayer: {},
      discussConfirmedByPlayer: {},
      guesserEliminatedIndices: {},
      roundResolutions: [],
      pendingRoundPlayerEliminations: [],
      eventLog: [],
      lastEvent: '',
      result: null,
      abortReason: null,
    };
    state.clueHand.push(...drawFromPile(state, 5));
    sanitizeClueHand(state);
    const giverName = seated.find((p) => p.id === clueGiverId)?.name ?? 'Clue Giver';
    pushLog(
      state,
      `เริ่มเกม — ${giverName} เป็น Clue Giver (${opts.gameMode === 'team' ? 'โหมดทีม' : 'โหมดแข่งขัน'})`,
    );
    return state;
  },

  onAction(state: SimiloState, playerId: string, action: SimiloAction): SimiloState {
    if (state.phase === 'aborted' || state.phase === 'game_over') {
      throw new GameActionRejectedError('เกมจบแล้ว');
    }
    if (state.eliminatedByPlayer[playerId] && playerId !== state.clueGiverId) {
      throw new GameActionRejectedError('คุณถูกคัดออกแล้ว');
    }

    const s = state;

    if (action.type === 'play_clue') {
      if (s.phase !== 'play_clue') throw new GameActionRejectedError('ไม่ใช่ขั้นเล่นการ์ดใบใบ');
      if (playerId !== s.clueGiverId) {
        throw new GameActionRejectedError('เฉพาะ Clue Giver เท่านั้น');
      }
      const cardIdx = s.clueHand.findIndex((c) => c.instanceId === action.handInstanceId);
      if (cardIdx < 0) throw new GameActionRejectedError('ไม่มีการ์ดนี้บนมือ');
      const [played] = s.clueHand.splice(cardIdx, 1);
      if (boardCharacterIdSet(s).has(played!.characterId)) {
        throw new GameActionRejectedError('การ์ดนี้อยู่บนกระดานแล้ว — เลือกการ์ดอื่น');
      }
      s.playedClues.push({
        round: s.round,
        characterId: played!.characterId,
        orientation: action.orientation,
      });
      const drawn = drawFromPile(s, 1);
      s.clueHand.push(...drawn);
      sanitizeClueHand(s);
      const oriLabel = action.orientation === 'similar' ? 'คล้าย (แนวตั้ง)' : 'ต่าง (แนวนอน)';
      pushLog(
        s,
        `Clue Giver เล่น ${formatSimiloCharacterLabel(played!.characterId)} — ${oriLabel}`,
      );
      startDiscussPhase(s, s.discussDurationMs);
      return s;
    }

    if (action.type === 'toggle_discuss_pick') {
      if (s.phase !== 'discuss') throw new GameActionRejectedError('ไม่ใช่ขั้นอภิปราย');
      if (playerId === s.clueGiverId) {
        throw new GameActionRejectedError('Clue Giver ไม่สามารถเลือกการ์ดได้');
      }
      if (s.discussConfirmedByPlayer[playerId]) {
        throw new GameActionRejectedError('ยืนยันแล้ว แก้ไขไม่ได้');
      }
      const cell = s.grid[action.gridIndex];
      if (!cell) {
        throw new GameActionRejectedError('ไม่พบการ์ด');
      }
      const myPastEliminated = s.guesserEliminatedIndices[playerId] ?? [];
      if (myPastEliminated.includes(action.gridIndex)) {
        throw new GameActionRejectedError('การ์ดนี้คุณเอาออกจากรอบก่อนแล้ว');
      }
      const need = removalsRequired(s);
      const picks = [...(s.discussPicksByPlayer[playerId] ?? [])];
      const pos = picks.indexOf(action.gridIndex);
      if (pos >= 0) {
        picks.splice(pos, 1);
      } else if (picks.length < need) {
        picks.push(action.gridIndex);
      } else if (s.gameMode === 'team' && need === 1) {
        picks.length = 0;
        picks.push(action.gridIndex);
      } else {
        throw new GameActionRejectedError(`เลือกได้สูงสุด ${need} ใบ`);
      }
      s.discussPicksByPlayer[playerId] = picks;
      return s;
    }

    if (action.type === 'confirm_discuss') {
      if (s.phase !== 'discuss') throw new GameActionRejectedError('ไม่ใช่ขั้นอภิปราย');
      if (playerId === s.clueGiverId) {
        throw new GameActionRejectedError('Clue Giver ไม่สามารถยืนยันได้');
      }
      if (s.discussConfirmedByPlayer[playerId]) {
        throw new GameActionRejectedError('ยืนยันแล้ว');
      }
      const picks = s.discussPicksByPlayer[playerId] ?? [];
      const need = removalsRequired(s);
      if (picks.length !== need) {
        throw new GameActionRejectedError(`ต้องเลือก ${need} การ์ดก่อนยืนยัน`);
      }
      if (s.gameMode === 'team' && !teamDiscussAligned(s)) {
        throw new GameActionRejectedError('คนทายทุกคนต้องเลือกการ์ดใบเดียวกันก่อนยืนยัน');
      }
      s.discussConfirmedByPlayer[playerId] = true;
      const name = s.players.find((p) => p.id === playerId)?.name ?? 'ผู้เล่น';
      pushLog(s, `${name} ยืนยันการเลือกแล้ว`);

      const guessers = activeGuessers(s);
      const allConfirmed = guessers.every((id) => s.discussConfirmedByPlayer[id]);
      if (allConfirmed) {
        applyDiscussResolution(s);
      }
      return s;
    }

    return state;
  },

  getPlayerView(state: SimiloState, playerId: string): SimiloPlayerView {
    return toPlayerView(state, playerId);
  },

  isGameOver(state: SimiloState): GameResult | null {
    return state.result;
  },
};
