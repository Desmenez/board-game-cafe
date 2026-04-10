import type { GameDefinition, GameResult, Player } from 'shared';
import type {
  NameItAction,
  NameItActiveRound,
  NameItBreedId,
  NameItBreedState,
  NameItCard,
  NameItLastPlay,
  NameItPlayerView,
} from 'shared';
import {
  NAME_IT_BREED_LABELS,
  NAME_IT_BREEDS,
  defaultDogNameFromBreedLabel,
  normalizeToUppercase,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';
import { buildNameItDeck, shuffle } from './deck.js';

/** ตรงกับ `imageMap.nameIt` ฝั่ง client (ไม่ import client) */
const NAME_IT_IMAGE_BASE =
  'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1775560713';
const NAME_IT_COVER_IMAGE_URL = `${NAME_IT_IMAGE_BASE}/cover_y4pidu.jpg`;

const RACE_MS = 20_000;
/** การ์ดพิเศษ (แมว / Gluta / Gollum) — จำกัดเวลาเล่น */
const SPECIAL_RACE_MS = 10_000;
const NAME_MS = 30_000;
/** หลังกดผิด (พิมพ์ชื่อ / Gluta กดพันธุ์ผิด) */
const GUESS_COOLDOWN_MS = 2_000;

function isSpecialCardKind(card: NameItCard): boolean {
  return (
    card.kind === 'special_cat' || card.kind === 'special_gluta' || card.kind === 'special_gollum'
  );
}

/** หมดเวลาการ์ดพิเศษโดยยังไม่มีผู้ชนะ — ทุกคน -1 */
function applySpecialCardTimeoutPenalty(s: NameItState, ar: NameItActiveRound): void {
  const sub = ar.subPhase;
  let shouldPenalize = false;
  if (sub === 'race_cat' && !ar.catWinnerId) shouldPenalize = true;
  else if (sub === 'race_dog_name' && !ar.firstGuessWinnerId) shouldPenalize = true;
  else if (sub === 'race_owner_display_name' && !ar.firstGuessWinnerId) shouldPenalize = true;

  if (shouldPenalize) {
    for (const id of s.playerOrder) {
      s.scores[id] = (s.scores[id] ?? 0) - 1;
    }
    s.lastEvent = 'หมดเวลา (การ์ดพิเศษ) ไม่ทันเล่น — ทุกคน -1';
  } else {
    s.lastEvent = `หมดเวลา ${SPECIAL_RACE_MS / 1000} วินาที — สลับสิทธิ์จั่ว`;
  }
}

export interface NameItState {
  phase: 'playing' | 'game_over';
  playerOrder: string[];
  playerNames: Record<string, string>;
  drawerIndex: number;
  deck: NameItCard[];
  discard: NameItCard[];
  scores: Record<string, number>;
  breeds: Record<NameItBreedId, NameItBreedState>;
  /** รอบที่จบล่าสุด (ไม่นับ Gollum ที่ข้าม) — ใช้เมื่อจั่ว Gollum */
  lastPlay: NameItLastPlay | null;
  breedDirectoryOpen: boolean;
  activeRound: (NameItActiveRound & NameItInternalRound) | null;
  guessCooldownUntil: Record<string, number>;
  lastEvent?: string;
  gameResult?: GameResult & { scores: Record<string, number> };
}

interface NameItInternalRound {
  /** gluta: สายพันธุ์ที่แต่ละคนเป็นเจ้าของ (เริ่มรอบ) */
  glutaOwnerBreeds?: Record<string, NameItBreedId[]>;
}

function emptyBreeds(): Record<NameItBreedId, NameItBreedState> {
  const o = {} as Record<NameItBreedId, NameItBreedState>;
  for (const b of NAME_IT_BREEDS) {
    o[b] = { ownerId: null, dogName: null };
  }
  return o;
}

function shuffleBreeds(rng: () => number): NameItBreedId[] {
  return shuffle([...NAME_IT_BREEDS], rng);
}

function validateDogName(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, ' ');
  if (!t) return null;
  const words = t.split(' ');
  if (words.length > 4) return null;
  const wordRe = /^[\u0E00-\u0E7Fa-zA-Z]+$/;
  if (!words.every((w) => wordRe.test(w))) return null;
  return normalizeToUppercase(t);
}

function looseTextMatch(guess: string, target: string): boolean {
  const g = guess.trim().replace(/\s+/g, ' ').toLowerCase();
  const t = target.trim().replace(/\s+/g, ' ').toLowerCase();
  return g === t;
}

function drawerId(s: NameItState): string {
  return s.playerOrder[s.drawerIndex] ?? s.playerOrder[0];
}

function advanceDrawer(s: NameItState): void {
  const n = s.playerOrder.length;
  if (n === 0) return;
  s.drawerIndex = (s.drawerIndex + 1) % n;
}

function maybeGameOver(s: NameItState): void {
  if (s.deck.length > 0 || s.activeRound) return;
  const ids = [...s.playerOrder];
  let best = -Infinity;
  for (const id of ids) best = Math.max(best, s.scores[id] ?? 0);
  const winners = ids.filter((id) => (s.scores[id] ?? 0) === best);
  const names = s.playerNames;
  const reason =
    winners.length === 1
      ? `${names[winners[0]] ?? winners[0]} ชนะ (${best} คะแนน) — การ์ดหมดแล้ว`
      : `เสมอที่ ${best} คะแนน — การ์ดหมดแล้ว`;
  const scores: Record<string, number> = {};
  for (const id of ids) scores[id] = s.scores[id] ?? 0;
  s.phase = 'game_over';
  s.gameResult = { winners, reason, scores };
  s.lastEvent = 'เกมจบ';
}

function snapshotLastPlay(
  s: NameItState,
  ar: NameItActiveRound & NameItInternalRound,
): NameItLastPlay | null {
  if (ar.gollumReplay) {
    const gr = ar.gollumReplay;
    if (gr.kind === 'race_cat') {
      return { kind: 'race_cat', catPos: { ...gr.catPos } };
    }
    return gr;
  }
  if (ar.card.kind === 'special_cat' && ar.catPos) {
    return { kind: 'race_cat', catPos: { ...ar.catPos } };
  }
  if (ar.card.kind === 'special_gluta') {
    return { kind: 'race_gluta' };
  }
  const breed = ar.answerBreed ?? ar.card.breed;
  if (!breed) return null;
  if (ar.card.kind === 'dog') {
    return { kind: 'guess_dog_name', breed };
  }
  if (ar.card.kind === 'dog_collar') {
    return { kind: 'guess_owner_name', breed };
  }
  return null;
}

function clearRound(s: NameItState, card: NameItCard): void {
  if (s.activeRound) {
    const snap = snapshotLastPlay(s, s.activeRound);
    if (snap) s.lastPlay = snap;
  }
  s.discard.push(card);
  s.activeRound = null;
  advanceDrawer(s);
  maybeGameOver(s);
}

function getOwnerBreedsMap(s: NameItState): Record<string, NameItBreedId[]> {
  const m: Record<string, NameItBreedId[]> = {};
  for (const br of NAME_IT_BREEDS) {
    const o = s.breeds[br]?.ownerId;
    if (o) {
      if (!m[o]) m[o] = [];
      m[o].push(br);
    }
  }
  return m;
}

function initGlutaRound(
  base: NameItActiveRound & NameItInternalRound,
  s: NameItState,
  rng: () => number,
  now: number,
): void {
  const ob = getOwnerBreedsMap(s);
  const breedsWithOwners = NAME_IT_BREEDS.filter((b) => s.breeds[b]?.ownerId);
  base.subPhase = 'race_gluta';
  base.glutaBreeds = shuffle(breedsWithOwners, rng);
  base.deadlineMs = now + SPECIAL_RACE_MS;
  base.glutaCompletedAt = {};
  base.glutaWrongUntil = {};
  base.glutaProgress = {};
  base.glutaOwnerBreeds = { ...ob };
  for (const pid of Object.keys(ob)) {
    if (!base.glutaProgress![pid]) base.glutaProgress![pid] = [];
  }
}

function startRoundFromCard(s: NameItState, card: NameItCard, rng: () => number): void {
  s.guessCooldownUntil = {};
  const now = Date.now();
  const order = shuffleBreeds(rng);
  const base: NameItActiveRound & NameItInternalRound = {
    card,
    subPhase: 'race_breed',
    deadlineMs: now + RACE_MS,
    breedButtonOrder: order,
  };

  if (card.kind === 'special_gollum') {
    if (!s.lastPlay) {
      s.discard.push(card);
      advanceDrawer(s);
      maybeGameOver(s);
      s.lastEvent = 'Gollum ใบแรก — ยังไม่มีรอบก่อนหน้า ข้ามสิทธิ์จั่ว';
      return;
    }
    const lp = s.lastPlay;
    base.gollumReplay = lp;
    base.deadlineMs = now + SPECIAL_RACE_MS;
    base.breedButtonOrder = order;

    if (lp.kind === 'guess_dog_name') {
      base.subPhase = 'race_dog_name';
      base.answerBreed = lp.breed;
    } else if (lp.kind === 'guess_owner_name') {
      base.subPhase = 'race_owner_display_name';
      base.answerBreed = lp.breed;
    } else if (lp.kind === 'race_cat') {
      base.subPhase = 'race_cat';
      base.catPos = { ...lp.catPos };
    } else {
      initGlutaRound(base, s, rng, now);
    }

    s.activeRound = base;
    s.lastEvent = 'Gollum — เล่นซ้ำแบบรอบก่อนหน้า';
    return;
  }

  if (card.kind === 'special_cat') {
    base.subPhase = 'race_cat';
    base.catPos = { x: 0.08 + rng() * 0.84, y: 0.1 + rng() * 0.75 };
    base.deadlineMs = now + SPECIAL_RACE_MS;
    s.activeRound = base;
    return;
  }

  if (card.kind === 'special_gluta') {
    initGlutaRound(base, s, rng, now);
    const breedsWithOwners = NAME_IT_BREEDS.filter((b) => s.breeds[b]?.ownerId);
    s.activeRound = base;
    s.lastEvent =
      breedsWithOwners.length === 0
        ? 'Gluta — ยังไม่มีเจ้าของสุนัข'
        : 'Gluta — กดพันธุ์ของตัวเองให้ครบ';
    return;
  }

  const breed = card.breed!;
  const st = s.breeds[breed];
  const hasOwner = st.ownerId !== null;

  if (card.kind === 'dog') {
    if (!hasOwner) {
      base.subPhase = 'race_breed';
      base.deadlineMs = null;
      s.activeRound = base;
      return;
    }
    base.subPhase = 'race_dog_name';
    s.activeRound = base;
    return;
  }

  if (card.kind === 'dog_collar') {
    if (!hasOwner) {
      base.subPhase = 'race_breed';
      base.deadlineMs = null;
      s.activeRound = base;
      return;
    }
    base.subPhase = 'race_owner_display_name';
    s.activeRound = base;
    return;
  }

  s.activeRound = base;
}

function resolveGlutaEnd(s: NameItState, ar: NameItActiveRound & NameItInternalRound): void {
  const owners = ar.glutaOwnerBreeds ?? {};
  const progress = ar.glutaProgress ?? {};
  const completedAt = ar.glutaCompletedAt ?? {};
  const ownerIds = Object.keys(owners);

  const finished: { id: string; t: number }[] = [];
  for (const pid of ownerIds) {
    const need = new Set(owners[pid] ?? []);
    const got = new Set(progress[pid] ?? []);
    let ok = true;
    for (const b of need) {
      if (!got.has(b)) ok = false;
    }
    if (ok && need.size > 0 && completedAt[pid] != null) {
      finished.push({ id: pid, t: completedAt[pid]! });
    }
  }

  if (finished.length >= 2) {
    finished.sort((a, b) => b.t - a.t);
    const slowest = finished[0].id;
    s.scores[slowest] = (s.scores[slowest] ?? 0) - 1;
    s.lastEvent = `${s.playerNames[slowest] ?? slowest} กดช้าสุด (-1)`;
  }

  for (const pid of ownerIds) {
    const need = new Set(owners[pid] ?? []);
    const got = new Set(progress[pid] ?? []);
    let ok = true;
    for (const b of need) {
      if (!got.has(b)) ok = false;
    }
    if (!ok && need.size > 0) {
      s.scores[pid] = (s.scores[pid] ?? 0) - 1;
    }
  }

  clearRound(s, ar.card);
}

function checkGlutaAllDone(s: NameItState, ar: NameItActiveRound & NameItInternalRound): void {
  const owners = ar.glutaOwnerBreeds ?? {};
  const progress = ar.glutaProgress ?? {};
  const completedAt = ar.glutaCompletedAt ?? {};
  const ownerIds = Object.keys(owners);
  if (ownerIds.length === 0) return;

  let allDone = true;
  for (const pid of ownerIds) {
    const need = new Set(owners[pid] ?? []);
    const got = new Set(progress[pid] ?? []);
    for (const b of need) {
      if (!got.has(b)) allDone = false;
    }
    if (need.size === 0) continue;
    if (!completedAt[pid]) allDone = false;
  }

  if (allDone) {
    resolveGlutaEnd(s, ar);
  }
}

export function applyNameItTimerExpiry(s: NameItState): NameItState {
  if (s.phase !== 'playing' || !s.activeRound) return s;
  const ar = s.activeRound;
  const now = Date.now();

  if (ar.subPhase === 'owner_naming' && ar.nameDeadlineMs != null && now >= ar.nameDeadlineMs) {
    const breed = ar.answerBreed ?? ar.card.breed;
    const ownerId = ar.pendingOwnerId;
    if (breed && ownerId) {
      const defaultName = defaultDogNameFromBreedLabel(NAME_IT_BREED_LABELS[breed]);
      s.breeds[breed] = { ownerId, dogName: defaultName };
      s.lastEvent = `หมดเวลาตั้งชื่อ — ใช้ชื่อสำรอง «${defaultName}» แทน`;
    } else {
      s.lastEvent = 'หมดเวลาตั้งชื่อ — สลับสิทธิ์จั่ว';
    }
    clearRound(s, ar.card);
    return s;
  }

  if (ar.subPhase === 'owner_naming') return s;

  if (ar.deadlineMs == null) return s;

  if (now < ar.deadlineMs) return s;

  if (ar.subPhase === 'race_gluta') {
    resolveGlutaEnd(s, ar);
    return s;
  }

  if (isSpecialCardKind(ar.card)) {
    applySpecialCardTimeoutPenalty(s, ar);
    clearRound(s, ar.card);
    return s;
  }

  s.lastEvent = `หมดเวลา ${RACE_MS / 1000} วินาที — สลับสิทธิ์จั่ว`;
  clearRound(s, ar.card);
  return s;
}

function assertCooldown(s: NameItState, playerId: string): void {
  const until = s.guessCooldownUntil[playerId] ?? 0;
  if (Date.now() < until) throw new GameActionRejectedError('รอ 2 วินาทีหลังพิมพ์ผิด');
}

function setCooldown(s: NameItState, playerId: string): void {
  s.guessCooldownUntil[playerId] = Date.now() + GUESS_COOLDOWN_MS;
}

function viewFor(s: NameItState, playerId: string): NameItPlayerView {
  void playerId;
  const players = s.playerOrder.map((id) => ({
    id,
    name: s.playerNames[id] ?? id,
    score: s.scores[id] ?? 0,
  }));

  const ar = s.activeRound;
  let activeView: NameItActiveRound | null = null;
  if (ar) {
    const { glutaOwnerBreeds, ...pub } = ar as NameItActiveRound & NameItInternalRound;
    void glutaOwnerBreeds;
    activeView = {
      ...pub,
      glutaProgress:
        ar.subPhase === 'race_gluta' && ar.glutaProgress
          ? { ...ar.glutaProgress }
          : ar.glutaProgress,
    };
  }

  const out: NameItPlayerView = {
    phase: s.phase === 'game_over' ? 'game_over' : 'playing',
    imageBase: NAME_IT_IMAGE_BASE,
    playerOrder: [...s.playerOrder],
    drawerId: drawerId(s),
    deckRemaining: s.deck.length,
    breedDirectoryOpen: s.breedDirectoryOpen,
    players,
    breeds: JSON.parse(JSON.stringify(s.breeds)) as Record<NameItBreedId, NameItBreedState>,
    activeRound: activeView,
    lastEvent: s.lastEvent,
  };

  if (s.phase === 'game_over' && s.gameResult) {
    out.result = {
      winners: s.gameResult.winners,
      reason: s.gameResult.reason,
      scores: { ...s.gameResult.scores },
    };
  }

  return out;
}

function setup(players: Player[]): NameItState {
  const rng = Math.random;
  const order = shuffle(
    players.map((p) => p.id),
    rng,
  );
  const playerNames: Record<string, string> = {};
  const scores: Record<string, number> = {};
  for (const p of players) {
    playerNames[p.id] = p.name;
    scores[p.id] = 0;
  }

  const deck = shuffle(buildNameItDeck(), rng);

  return {
    phase: 'playing',
    playerOrder: order,
    playerNames,
    drawerIndex: 0,
    deck,
    discard: [],
    scores,
    breeds: emptyBreeds(),
    activeRound: null,
    guessCooldownUntil: {},
    lastPlay: null,
    breedDirectoryOpen: false,
    lastEvent: 'สุ่มลำดับแล้ว — ผู้มีสิทธิ์จั่วกดจั่วการ์ด',
  };
}

function onAction(s: NameItState, playerId: string, action: NameItAction): NameItState {
  applyNameItTimerExpiry(s);
  if (s.phase === 'game_over') throw new GameActionRejectedError('เกมจบแล้ว');

  if (action.type === 'toggle_breed_directory') {
    if (drawerId(s) !== playerId) throw new GameActionRejectedError('เฉพาะผู้มีสิทธิ์จั่ว');
    s.breedDirectoryOpen = !s.breedDirectoryOpen;
    return s;
  }

  if (action.type === 'draw') {
    if (s.activeRound) throw new GameActionRejectedError('มีรอบค้างอยู่');
    if (s.deck.length === 0) throw new GameActionRejectedError('การ์ดหมด');
    if (drawerId(s) !== playerId) throw new GameActionRejectedError('ยังไม่ถึงสิทธิ์คุณจั่ว');
    const card = s.deck.pop()!;
    startRoundFromCard(s, card, Math.random);
    s.lastEvent = `${s.playerNames[playerId] ?? playerId} จั่วการ์ด`;
    return s;
  }

  const ar = s.activeRound;
  if (!ar) throw new GameActionRejectedError('ไม่มีรอบเล่น');

  if (action.type === 'pick_breed') {
    if (ar.subPhase !== 'race_breed') throw new GameActionRejectedError('ไม่ใช่รอบเลือกสายพันธุ์');
    if (ar.deadlineMs != null && Date.now() > ar.deadlineMs)
      throw new GameActionRejectedError('หมดเวลา');
    const card = ar.card;
    if (card.kind !== 'dog' && card.kind !== 'dog_collar')
      throw new GameActionRejectedError('การ์ดไม่ถูกต้อง');
    if (action.breed !== card.breed) throw new GameActionRejectedError('สายพันธุ์ไม่ตรง');
    ar.pendingOwnerId = playerId;
    ar.subPhase = 'owner_naming';
    ar.nameDeadlineMs = Date.now() + NAME_MS;
    s.lastEvent = `${s.playerNames[playerId]} เลือกสายพันธุ์ถูก — ตั้งชื่อสุนัข`;
    return s;
  }

  if (action.type === 'submit_dog_name') {
    if (ar.subPhase !== 'owner_naming') throw new GameActionRejectedError('ไม่ใช่รอบตั้งชื่อ');
    if (ar.pendingOwnerId !== playerId) throw new GameActionRejectedError('ไม่ใช่เจ้าของรอบนี้');
    const name = validateDogName(action.name);
    if (!name)
      throw new GameActionRejectedError(
        'ชื่อไม่ถูกต้อง (ไม่เกิน 4 คำ ไทย/อังกฤษ ไม่มีเลขหรืออักขระพิเศษ)',
      );
    const breed = ar.answerBreed ?? ar.card.breed!;
    s.breeds[breed] = { ownerId: playerId, dogName: name };
    s.lastEvent = `${s.playerNames[playerId]} ตั้งชื่อ ${name}`;
    clearRound(s, ar.card);
    return s;
  }

  if (action.type === 'guess_text') {
    const text = action.text;
    if (ar.subPhase === 'race_dog_name') {
      if (ar.deadlineMs != null && Date.now() > ar.deadlineMs)
        throw new GameActionRejectedError('หมดเวลา');
      if (ar.firstGuessWinnerId) throw new GameActionRejectedError('มีคนตอบถูกแล้ว');
      assertCooldown(s, playerId);
      const breed = ar.answerBreed ?? ar.card.breed!;
      const dogName = s.breeds[breed]?.dogName;
      if (!dogName) throw new GameActionRejectedError('ไม่มีชื่อสุนัข');
      if (!looseTextMatch(text, dogName)) {
        setCooldown(s, playerId);
        throw new GameActionRejectedError('ชื่อไม่ตรง');
      }
      ar.firstGuessWinnerId = playerId;
      s.scores[playerId] = (s.scores[playerId] ?? 0) + 1;
      s.lastEvent = `${s.playerNames[playerId]} ตอบชื่อสุนัขถูก (+1)`;
      clearRound(s, ar.card);
      return s;
    }
    if (ar.subPhase === 'race_owner_display_name') {
      if (ar.deadlineMs != null && Date.now() > ar.deadlineMs)
        throw new GameActionRejectedError('หมดเวลา');
      if (ar.firstGuessWinnerId) throw new GameActionRejectedError('มีคนตอบถูกแล้ว');
      assertCooldown(s, playerId);
      const breed = ar.answerBreed ?? ar.card.breed!;
      const oid = s.breeds[breed]?.ownerId;
      if (!oid) throw new GameActionRejectedError('ไม่มีเจ้าของ');
      const ownerDisplay = s.playerNames[oid] ?? '';
      if (!looseTextMatch(text, ownerDisplay)) {
        setCooldown(s, playerId);
        throw new GameActionRejectedError('ชื่อเจ้าของไม่ตรง');
      }
      ar.firstGuessWinnerId = playerId;
      s.scores[playerId] = (s.scores[playerId] ?? 0) + 1;
      s.lastEvent = `${s.playerNames[playerId]} ตอบชื่อเจ้าของถูก (+1)`;
      clearRound(s, ar.card);
      return s;
    }
    throw new GameActionRejectedError('ไม่ใช่รอบพิมพ์ตอบ');
  }

  if (action.type === 'tap_cat') {
    if (ar.subPhase !== 'race_cat') throw new GameActionRejectedError('ไม่ใช่การ์ดแมว');
    if (ar.deadlineMs != null && Date.now() > ar.deadlineMs)
      throw new GameActionRejectedError('หมดเวลา');
    if (ar.catWinnerId) throw new GameActionRejectedError('มีคนกดแล้ว');
    ar.catWinnerId = playerId;
    s.scores[playerId] = (s.scores[playerId] ?? 0) + 1;
    s.lastEvent = `${s.playerNames[playerId]} กดแมวก่อน (+1)`;
    clearRound(s, ar.card);
    return s;
  }

  if (action.type === 'gluta_pick') {
    if (ar.subPhase !== 'race_gluta') throw new GameActionRejectedError('ไม่ใช่ Gluta');
    if (ar.deadlineMs != null && Date.now() > ar.deadlineMs)
      throw new GameActionRejectedError('หมดเวลา');
    const until = ar.glutaWrongUntil?.[playerId] ?? 0;
    if (Date.now() < until) throw new GameActionRejectedError('รอหลังกดผิด');

    const ob = ar.glutaOwnerBreeds ?? {};
    const myBreeds = ob[playerId] ?? [];
    const isOwner = myBreeds.length > 0;

    if (!isOwner) {
      s.scores[playerId] = (s.scores[playerId] ?? 0) - 1;
      s.lastEvent = `${s.playerNames[playerId]} ไม่ใช่เจ้าของ (-1)`;
      return s;
    }

    const pick = action.breed;
    if (!myBreeds.includes(pick)) {
      if (!ar.glutaWrongUntil) ar.glutaWrongUntil = {};
      ar.glutaWrongUntil[playerId] = Date.now() + GUESS_COOLDOWN_MS;
      throw new GameActionRejectedError('ไม่ใช่พันธุ์ของคุณ');
    }

    if (!ar.glutaProgress) ar.glutaProgress = {};
    const prog = ar.glutaProgress[playerId] ?? [];
    if (prog.includes(pick)) return s;

    const next = [...prog, pick];
    ar.glutaProgress[playerId] = next;

    const need = new Set(myBreeds);
    const got = new Set(next);
    let all = true;
    for (const b of need) {
      if (!got.has(b)) all = false;
    }
    if (all && need.size > 0) {
      if (!ar.glutaCompletedAt) ar.glutaCompletedAt = {};
      ar.glutaCompletedAt[playerId] = Date.now();
    }

    checkGlutaAllDone(s, ar);
    return s;
  }

  return s;
}

export const nameItGame: GameDefinition<NameItState, NameItAction> = {
  id: 'name-it',
  name: 'Name It',
  description: 'จั่วการ์ดหมา แข่งจำชื่อ ตั้งชื่อ และการ์ดพิเศษ',
  minPlayers: 2,
  maxPlayers: 6,
  thumbnail: NAME_IT_COVER_IMAGE_URL,

  setup: (players) => setup(players),

  onAction: (state, playerId, action) => onAction(state, playerId, action),

  getPlayerView: (state, playerId) => viewFor(state, playerId),

  isGameOver: (state) => {
    if (state.phase !== 'game_over' || !state.gameResult) return null;
    return { winners: state.gameResult.winners, reason: state.gameResult.reason };
  },
};
