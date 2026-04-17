import type { GameDefinition, GameResult, Player } from 'shared';
import type {
  WttdAction,
  WttdDungeonCombatAnimKind,
  WttdDungeonEquipFlags,
  WttdEquipmentId,
  WttdHeroClass,
  WttdHeroPickMode,
  WttdMonsterPower,
  WttdPlayerView,
  WttdSetupOptions,
} from 'shared';
import {
  GAME_THUMBNAIL_BY_ID,
  WTTD_ALL_MONSTER_POWERS,
  WTTD_DUNGEON_LOSSES_TO_ELIMINATE,
  WTTD_EQUIPMENT_BY_CLASS,
  WTTD_HERO_PICK_MODES,
  WTTD_IDLE_TABLE_HERO_HP,
  wttdCanWeaknessPassMonster,
  wttdExplorerBaseHp,
  wttdExplorerMaxHpFromEquipment,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';
import { buildMonsterDeck } from './deck.js';
import {
  assignHeroesRandomUnique,
  assignHeroesUniqueNormal,
  randomHeroClass,
} from './hero-pick.js';

const TROPHIES_TO_WIN = 2;

function shufflePlayerOrder(players: Player[]): string[] {
  const ids = players.map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids;
}

function nextSeatInOrder(order: string[], id: string): string {
  const i = order.indexOf(id);
  if (i < 0) return order[0]!;
  return order[(i + 1) % order.length]!;
}

function nextActivePlayer(order: string[], inAuction: string[], afterId: string): string {
  let cur = nextSeatInOrder(order, afterId);
  let guard = 0;
  while (!inAuction.includes(cur) && guard < order.length + 2) {
    cur = nextSeatInOrder(order, cur);
    guard += 1;
  }
  return cur;
}

function parseSetupOptions(options?: unknown): { mode: WttdHeroPickMode; hostId: string } {
  let mode: WttdHeroPickMode = 'normal';
  let hostId = '';
  if (options && typeof options === 'object') {
    const o = options as Record<string, unknown>;
    const m = o.heroPickMode;
    if (typeof m === 'string' && (WTTD_HERO_PICK_MODES as readonly string[]).includes(m)) {
      mode = m as WttdHeroPickMode;
    }
    if (typeof o.hostId === 'string') hostId = o.hostId;
  }
  return { mode, hostId };
}

/** อุปกรณ์ระหว่างประมูล — แยกตามผู้เล่น (ทิ้งมอน = ตัดจากชุดของผู้จั่ว) */
function freshPlayerEquipment(s: {
  players: { id: string }[];
  playerHero: Record<string, WttdHeroClass>;
}): Record<string, WttdEquipmentId[]> {
  const out: Record<string, WttdEquipmentId[]> = {};
  for (const p of s.players) {
    const c = s.playerHero[p.id] ?? 'warrior';
    out[p.id] = initialEquipment(c);
  }
  return out;
}

function copyPlayerEquipment(
  pe: Record<string, WttdEquipmentId[]>,
): Record<string, WttdEquipmentId[]> {
  return Object.fromEntries(Object.entries(pe).map(([k, v]) => [k, [...v]]));
}

export interface WttdState {
  phase: 'hero_pick' | 'role_reveal' | 'bidding' | 'dungeon' | 'game_over';
  hostId: string;
  heroPickMode: WttdHeroPickMode;
  playerOrder: string[];
  players: { id: string; name: string; trophies: number; dungeonLosses: number }[];
  playerHero: Record<string, WttdHeroClass>;
  preferences: Record<string, WttdHeroClass | null>;
  ready: Record<string, boolean>;
  /** same_host — ฮีโร่ที่หัวห้องเลือกก่อนกดพร้อม */
  hostTableHero: WttdHeroClass | null;
  roleRevealAck: Record<string, boolean>;
  monsterDeck: WttdMonsterPower[];
  monstersRemovedFromGame: WttdMonsterPower[];
  dungeonStack: WttdMonsterPower[];
  /** ระหว่างประมูล — อุปกรณ์ของแต่ละคน (คนละคลาสได้) */
  playerEquipment: Record<string, WttdEquipmentId[]>;
  /** ระหว่างดันเจี้ยน — สถานะฮีโร่ของผู้เข้า */
  hero: { hp: number; hpMax: number; equipment: WttdEquipmentId[] };
  biddingInAuction: string[];
  currentTurnPlayerId: string;
  pendingDraw: { playerId: string; power: WttdMonsterPower } | null;
  explorerId: string | null;
  dungeonResolveIndex: number;
  currentRevealedCard: WttdMonsterPower | null;
  outcome: GameResult | null;
  lastEvent: string;
  /** ประมูล: ผู้เข้าเลือกพลังมอนเป้าหมายวอร์ปัล — ใช้ระหว่างดันเจี้ยนด้วย */
  vorpalPrecogPower: WttdMonsterPower | null;
  /** ดันเจี้ยน: ลำดับพลังมอนที่จบการ์ดแล้ว (สำหรับเอกภพ) */
  powersResolvedThisRun: WttdMonsterPower[];
  awaitingHealingPotion: boolean;
  /** หลังใช้สัญญาปีศาจกับมอน 7 — เปิดใบถัดไปกำจัดทันที */
  demonicPactBanishNext: boolean;
  dungeonEquipFlags: WttdDungeonEquipFlags;
  /** ซิงค์แอนิเมชันต่อสู้ให้ผู้ชม */
  dungeonCombatAnimSeq: number;
  dungeonCombatAnimKind: WttdDungeonCombatAnimKind;
  dungeonCombatPlayedEquipmentId: WttdEquipmentId | null;
  dungeonCombatMonsterPower: WttdMonsterPower | null;
}

function defaultDungeonEquipFlags(): WttdDungeonEquipFlags {
  return {
    vorpalBladeUsed: false,
    healingPotionUsed: false,
    vorpalAxeUsed: false,
    demonicPactUsed: false,
    polymorphUsed: false,
  };
}

function emptyDungeonRunMeta(): Pick<
  WttdState,
  | 'vorpalPrecogPower'
  | 'powersResolvedThisRun'
  | 'awaitingHealingPotion'
  | 'demonicPactBanishNext'
  | 'dungeonEquipFlags'
  | 'dungeonCombatAnimSeq'
  | 'dungeonCombatAnimKind'
  | 'dungeonCombatPlayedEquipmentId'
  | 'dungeonCombatMonsterPower'
> {
  return {
    vorpalPrecogPower: null,
    powersResolvedThisRun: [],
    awaitingHealingPotion: false,
    demonicPactBanishNext: false,
    dungeonEquipFlags: defaultDungeonEquipFlags(),
    dungeonCombatAnimSeq: 0,
    dungeonCombatAnimKind: 'none',
    dungeonCombatPlayedEquipmentId: null,
    dungeonCombatMonsterPower: null,
  };
}

function bumpDungeonCombatAnim(
  s: WttdState,
  kind: WttdDungeonCombatAnimKind,
  playedEq: WttdEquipmentId | null,
  monsterPower: WttdMonsterPower | null,
): void {
  if (kind === 'none') return;
  s.dungeonCombatAnimSeq += 1;
  s.dungeonCombatAnimKind = kind;
  s.dungeonCombatPlayedEquipmentId = playedEq;
  s.dungeonCombatMonsterPower = monsterPower;
}

function hasVorpalBladeEquipment(eq: readonly WttdEquipmentId[]): boolean {
  return eq.includes('warrior_vorpal_sword') || eq.includes('rogue_vorpal_dagger');
}

function removeFirstEq(list: WttdEquipmentId[], id: WttdEquipmentId): void {
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
}

function hasHealingPotionEquipment(eq: readonly WttdEquipmentId[]): boolean {
  return eq.includes('barbarian_healing_potion') || eq.includes('rogue_healing_potion');
}

function vorpalBladeEquipmentId(eq: readonly WttdEquipmentId[]): WttdEquipmentId | null {
  if (eq.includes('warrior_vorpal_sword')) return 'warrior_vorpal_sword';
  if (eq.includes('rogue_vorpal_dagger')) return 'rogue_vorpal_dagger';
  return null;
}

function initialEquipment(heroClass: WttdHeroClass): WttdEquipmentId[] {
  return [...WTTD_EQUIPMENT_BY_CLASS[heroClass]];
}

function emptyPickState(playerIds: string[]): {
  preferences: Record<string, WttdHeroClass | null>;
  ready: Record<string, boolean>;
} {
  const preferences: Record<string, WttdHeroClass | null> = {};
  const ready: Record<string, boolean> = {};
  for (const id of playerIds) {
    preferences[id] = null;
    ready[id] = false;
  }
  return { preferences, ready };
}

function finishRoleRevealAndStartBidding(s: WttdState, event: string): WttdState {
  const pe = freshPlayerEquipment(s);
  const base: WttdState = {
    ...s,
    phase: 'bidding',
    roleRevealAck: {},
    preferences: {},
    ready: {},
    hostTableHero: null,
    playerEquipment: pe,
    monsterDeck: buildMonsterDeck(),
    dungeonStack: [],
    monstersRemovedFromGame: [],
    biddingInAuction: s.players.map((p) => p.id),
    currentTurnPlayerId: s.playerOrder[0]!,
    pendingDraw: null,
    explorerId: null,
    dungeonResolveIndex: 0,
    currentRevealedCard: null,
    hero: {
      hp: WTTD_IDLE_TABLE_HERO_HP,
      hpMax: WTTD_IDLE_TABLE_HERO_HP,
      equipment: [],
    },
    lastEvent: event,
    ...emptyDungeonRunMeta(),
  };
  return base;
}

function startBiddingRound(state: WttdState, firstPlayerId: string, event: string): WttdState {
  return {
    ...state,
    phase: 'bidding',
    playerEquipment: freshPlayerEquipment(state),
    monsterDeck: buildMonsterDeck(),
    dungeonStack: [],
    monstersRemovedFromGame: [],
    biddingInAuction: state.players.map((p) => p.id),
    currentTurnPlayerId: firstPlayerId,
    pendingDraw: null,
    explorerId: null,
    dungeonResolveIndex: 0,
    currentRevealedCard: null,
    hero: {
      ...state.hero,
      hp: WTTD_IDLE_TABLE_HERO_HP,
      hpMax: WTTD_IDLE_TABLE_HERO_HP,
      equipment: [],
    },
    lastEvent: event,
    ...emptyDungeonRunMeta(),
  };
}

function eliminatePlayerAfterFailedDungeon(
  state: WttdState,
  playersBeforeRemoval: WttdState['players'],
  eliminatedId: string,
): WttdState {
  const eliminatedName = playersBeforeRemoval.find((p) => p.id === eliminatedId)?.name ?? '';
  const remainingPlayers = playersBeforeRemoval.filter((p) => p.id !== eliminatedId);
  const playerHero = { ...state.playerHero };
  delete playerHero[eliminatedId];
  const playerOrder = state.playerOrder.filter((id) => id !== eliminatedId);

  if (remainingPlayers.length === 1) {
    const w = remainingPlayers[0]!;
    return {
      ...state,
      phase: 'game_over',
      players: remainingPlayers,
      playerHero,
      playerOrder: [w.id],
      explorerId: null,
      currentRevealedCard: null,
      pendingDraw: null,
      outcome: {
        winners: [w.id],
        reason: `${w.name} เป็นผู้เล่นคนสุดท้าย`,
      },
      lastEvent: `${eliminatedName} แพ้ในดันเจี้ยนครบ ${WTTD_DUNGEON_LOSSES_TO_ELIMINATE} ครั้ง — ออกจากเกม — ${w.name} ชนะ`,
    };
  }

  const first = playerOrder[0] ?? remainingPlayers[0]!.id;
  return startBiddingRound(
    {
      ...state,
      players: remainingPlayers,
      playerHero,
      playerOrder,
    },
    first,
    `${eliminatedName} แพ้ในดันเจี้ยนครบ ${WTTD_DUNGEON_LOSSES_TO_ELIMINATE} ครั้ง — ออกจากเกม`,
  );
}

function advanceAfterDungeon(state: WttdState, survived: boolean, explorerId: string): WttdState {
  if (survived) {
    const stack = state.dungeonStack;
    const pr = state.powersResolvedThisRun;
    if (
      state.hero.equipment.includes('mage_omnipotence') &&
      stack.length > 0 &&
      pr.length === stack.length &&
      new Set(pr).size === pr.length
    ) {
      const exName = state.players.find((p) => p.id === explorerId)?.name ?? '';
      const players = state.players.map((p) => ({ ...p }));
      return {
        ...state,
        phase: 'game_over',
        players,
        outcome: {
          winners: [explorerId],
          reason: `${exName} — เอกภพ (มอนที่เจอในดันเจี้ยนไม่ซ้ำกัน)`,
        },
        explorerId: null,
        currentRevealedCard: null,
        pendingDraw: null,
        lastEvent: `${exName} ชนะเกมจากเอกภพ`,
      };
    }
  }

  let players = state.players.map((p) => ({ ...p }));
  if (survived) {
    players = players.map((p) => (p.id === explorerId ? { ...p, trophies: p.trophies + 1 } : p));
  } else {
    players = players.map((p) =>
      p.id === explorerId ? { ...p, dungeonLosses: p.dungeonLosses + 1 } : p,
    );
    const ex = players.find((p) => p.id === explorerId);
    if (ex && ex.dungeonLosses >= WTTD_DUNGEON_LOSSES_TO_ELIMINATE) {
      return eliminatePlayerAfterFailedDungeon(state, players, explorerId);
    }
  }
  const winner = players.find((p) => p.trophies >= TROPHIES_TO_WIN);
  if (winner) {
    return {
      ...state,
      phase: 'game_over',
      players,
      outcome: {
        winners: [winner.id],
        reason: `${winner.name} เก็บชัยชนะครบ ${TROPHIES_TO_WIN} ชิ้น`,
      },
      explorerId: null,
      currentRevealedCard: null,
      pendingDraw: null,
      lastEvent: `เกมจบ — ${winner.name} ชนะ`,
    };
  }

  const first = nextSeatInOrder(state.playerOrder, state.currentTurnPlayerId);
  const exName = players.find((p) => p.id === explorerId)?.name ?? '';
  return startBiddingRound(
    {
      ...state,
      players,
    },
    first,
    survived
      ? `${exName} รอดดันเจี้ยน — เริ่มประมูลรอบใหม่`
      : `${exName} ล้มเหลว — เริ่มประมูลรอบใหม่`,
  );
}

/** จบการ์ดมอนปัจจุบัน (นับพลังเข้าเอกภพ / ขั้นถัดไป) */
function advanceMonsterSlot(
  s: WttdState,
  explorerId: string,
  resolvedPower: WttdMonsterPower,
  lastEvent: string,
): WttdState {
  s.powersResolvedThisRun.push(resolvedPower);
  s.currentRevealedCard = null;
  s.dungeonResolveIndex += 1;
  s.lastEvent = lastEvent;
  if (s.dungeonResolveIndex >= s.dungeonStack.length) {
    return advanceAfterDungeon(s, true, explorerId);
  }
  return s;
}

function allPlayersReady(s: WttdState): boolean {
  return s.players.every((p) => s.ready[p.id] === true);
}

function allHavePreference(s: WttdState): boolean {
  return s.players.every((p) => s.preferences[p.id] != null);
}

function transitionToRoleReveal(
  s: WttdState,
  playerHero: Record<string, WttdHeroClass>,
  event: string,
): WttdState {
  const ack: Record<string, boolean> = {};
  for (const p of s.players) ack[p.id] = false;
  return {
    ...s,
    phase: 'role_reveal',
    playerHero,
    preferences: {},
    ready: {},
    hostTableHero: null,
    roleRevealAck: ack,
    lastEvent: event,
  };
}

function resolveNormalOrFree(s: WttdState, freeDuplicate: boolean): WttdState {
  if (!allHavePreference(s) || !allPlayersReady(s)) {
    throw new GameActionRejectedError('ยังไม่ครบการเลือกหรือพร้อม');
  }
  const prefs: Record<string, WttdHeroClass> = {};
  for (const p of s.players) {
    const v = s.preferences[p.id];
    if (v == null) throw new GameActionRejectedError('ข้อมูลการเลือกไม่ครบ');
    prefs[p.id] = v;
  }
  const playerHero = freeDuplicate
    ? { ...prefs }
    : assignHeroesUniqueNormal(
        s.players.map((p) => p.id),
        prefs,
      );
  return transitionToRoleReveal(
    s,
    playerHero,
    freeDuplicate ? 'มอบฮีโร่ตามที่เลือก' : 'สุ่มแก้ชน — ฮีโร่ไม่ซ้ำกัน',
  );
}

function toPlayerView(state: WttdState, viewerId: string): WttdPlayerView {
  const myHero = state.playerHero[viewerId] ?? 'warrior';
  const acked = state.roleRevealAck[viewerId] === true;
  const ackTotal = state.players.length;
  const ackCurrent = state.players.filter((p) => state.roleRevealAck[p.id] === true).length;

  const heroPick: WttdPlayerView['heroPick'] =
    state.phase === 'hero_pick'
      ? {
          mode: state.heroPickMode,
          hostId: state.hostId,
          hostTableHero: state.hostTableHero,
          preferences: { ...state.preferences },
          ready: { ...state.ready },
          readyCount: state.players.filter((p) => state.ready[p.id] === true).length,
          totalPlayers: state.players.length,
        }
      : null;

  const roleReveal: WttdPlayerView['roleReveal'] =
    state.phase === 'role_reveal'
      ? {
          myHero,
          hasAcknowledged: acked,
          acknowledgeProgress: { current: ackCurrent, total: ackTotal },
        }
      : null;

  const explorerId = state.explorerId;
  const explorerEquip =
    explorerId != null
      ? [
          ...(state.playerEquipment[explorerId] ??
            initialEquipment(state.playerHero[explorerId] ?? 'warrior')),
        ]
      : [];
  const needsVorpalPrecogBeforeDungeonEntry =
    state.phase === 'bidding' &&
    explorerId != null &&
    viewerId === explorerId &&
    hasVorpalBladeEquipment(explorerEquip) &&
    state.vorpalPrecogPower == null;

  const myEquip =
    state.phase === 'bidding'
      ? [...(state.playerEquipment[viewerId] ?? initialEquipment(myHero))]
      : [...state.hero.equipment];

  const biddingEquipmentLeft: Record<string, number> | null =
    state.phase === 'bidding'
      ? Object.fromEntries(
          state.players.map((p) => {
            const eq = state.playerEquipment[p.id] ?? [];
            return [p.id, eq.length] as const;
          }),
        )
      : null;

  const base: WttdPlayerView = {
    phase: state.phase === 'game_over' ? 'game_over' : state.phase,
    hostId: state.hostId,
    heroPickMode: state.heroPickMode,
    myHero,
    playerHero: { ...state.playerHero },
    players: state.players.map((p) => ({ ...p })),
    tableOrder: [...state.playerOrder],
    explorerId: state.explorerId,
    awaitingDungeonEntry: state.phase === 'bidding' && state.explorerId != null,
    needsVorpalPrecogBeforeDungeonEntry,
    vorpalPrecogMonsterPower: state.vorpalPrecogPower,
    biddingEquipmentLeft,
    hero: { ...state.hero, equipment: myEquip },
    dungeonFaceDownCount: state.dungeonStack.length,
    dungeonStackPreview: state.phase === 'bidding' ? null : [...state.dungeonStack],
    monsterDeckRemaining: state.monsterDeck.length,
    bidding:
      state.phase === 'bidding'
        ? {
            inAuction: [...state.biddingInAuction],
            currentTurnPlayerId: state.currentTurnPlayerId,
            pendingDraw: state.pendingDraw ? { ...state.pendingDraw } : null,
          }
        : null,
    dungeonRun:
      state.phase === 'dungeon' && state.explorerId
        ? {
            explorerId: state.explorerId,
            currentCard: state.currentRevealedCard,
            resolvedCount: state.dungeonResolveIndex,
            totalCards: state.dungeonStack.length,
            vorpalPrecogMonsterPower: state.vorpalPrecogPower,
            equipFlags: { ...state.dungeonEquipFlags },
            awaitingHealingPotionRevival: state.awaitingHealingPotion,
            demonicPactBanishNextReveal: state.demonicPactBanishNext,
            combatAnimSeq: state.dungeonCombatAnimSeq,
            combatAnimKind: state.dungeonCombatAnimKind,
            combatPlayedEquipmentId: state.dungeonCombatPlayedEquipmentId,
            combatMonsterPower: state.dungeonCombatMonsterPower,
          }
        : null,
    trophiesToWin: TROPHIES_TO_WIN,
    lastEvent: state.lastEvent,
    heroPick,
    roleReveal,
  };

  if (state.outcome) {
    base.gameResult = {
      winners: state.outcome.winners,
      reason: state.outcome.reason,
    };
  }
  return base;
}

export const welcomeToTheDungeonGame: GameDefinition<WttdState, WttdAction> = {
  id: 'welcome-to-the-dungeon',
  name: 'Welcome to the Dungeon',
  description:
    'ประมูลใครเข้าดันเจี้ยน — จั่วมอนใส่กองหรือทิ้งแล้วเสียอุปกรณ์ — รอดให้ครบเพื่อเก็บชัยชนะ',
  minPlayers: 2,
  maxPlayers: 4,
  thumbnail: GAME_THUMBNAIL_BY_ID['welcome-to-the-dungeon'] ?? '',

  setup(players: Player[], options?: unknown): WttdState {
    const { mode, hostId: parsedHost } = parseSetupOptions(options);
    const opt = options as WttdSetupOptions | undefined;
    const hostId = parsedHost || opt?.hostId || players[0]?.id || '';

    const playerOrder = shufflePlayerOrder(players);
    const ps = players.map((p) => ({ id: p.id, name: p.name, trophies: 0, dungeonLosses: 0 }));
    const ids = ps.map((p) => p.id);

    const base: WttdState = {
      phase: 'hero_pick',
      hostId,
      heroPickMode: mode,
      playerOrder,
      players: ps,
      playerHero: {},
      ...emptyPickState(ids),
      hostTableHero: null,
      roleRevealAck: {},
      monsterDeck: [],
      monstersRemovedFromGame: [],
      dungeonStack: [],
      playerEquipment: {},
      hero: {
        hp: WTTD_IDLE_TABLE_HERO_HP,
        hpMax: WTTD_IDLE_TABLE_HERO_HP,
        equipment: [],
      },
      biddingInAuction: [],
      currentTurnPlayerId: playerOrder[0]!,
      pendingDraw: null,
      explorerId: null,
      dungeonResolveIndex: 0,
      currentRevealedCard: null,
      outcome: null,
      lastEvent: 'เลือกฮีโร่หรือรอเปิดเผย',
      ...emptyDungeonRunMeta(),
    };

    if (mode === 'random_unique') {
      const ph = assignHeroesRandomUnique(ids);
      return transitionToRoleReveal(
        { ...base, playerHero: ph },
        ph,
        'สุ่มฮีโร่ไม่ซ้ำ — เปิดเผยบทบาท',
      );
    }

    if (mode === 'same_host') {
      return {
        ...base,
        lastEvent: 'หัวห้องเลือกฮีโร่ให้ทุกคน หรือกดสุ่ม',
      };
    }

    return {
      ...base,
      lastEvent: 'เลือกฮีโร่ของคุณ แล้วกดพร้อมเมื่อเลือกแล้ว',
    };
  },

  onAction(state: WttdState, playerId: string, action: WttdAction): WttdState {
    if (state.phase === 'game_over') {
      throw new GameActionRejectedError('เกมจบแล้ว');
    }

    const s: WttdState = {
      ...state,
      players: state.players.map((p) => ({ ...p })),
      monsterDeck: [...state.monsterDeck],
      monstersRemovedFromGame: [...state.monstersRemovedFromGame],
      dungeonStack: [...state.dungeonStack],
      playerEquipment: copyPlayerEquipment(state.playerEquipment ?? {}),
      hero: { ...state.hero, equipment: [...state.hero.equipment] },
      biddingInAuction: [...state.biddingInAuction],
      preferences: { ...state.preferences },
      ready: { ...state.ready },
      playerHero: { ...state.playerHero },
      roleRevealAck: { ...state.roleRevealAck },
      vorpalPrecogPower: state.vorpalPrecogPower,
      powersResolvedThisRun: [...state.powersResolvedThisRun],
      awaitingHealingPotion: state.awaitingHealingPotion,
      demonicPactBanishNext: state.demonicPactBanishNext,
      dungeonEquipFlags: { ...state.dungeonEquipFlags },
      dungeonCombatAnimSeq: state.dungeonCombatAnimSeq,
      dungeonCombatAnimKind: state.dungeonCombatAnimKind,
      dungeonCombatPlayedEquipmentId: state.dungeonCombatPlayedEquipmentId,
      dungeonCombatMonsterPower: state.dungeonCombatMonsterPower,
    };

    if (s.phase === 'hero_pick') {
      if (action.type === 'wttd_select_hero') {
        if (s.heroPickMode === 'same_host' && playerId !== s.hostId) {
          throw new GameActionRejectedError('เฉพาะหัวห้องเลือกฮีโร่');
        }
        if (s.heroPickMode === 'random_unique') {
          throw new GameActionRejectedError('โหมดนี้ไม่มีหน้าเลือก');
        }
        s.preferences[playerId] = action.heroClass;
        s.lastEvent = `${s.players.find((p) => p.id === playerId)?.name ?? ''} เลือกฮีโร่`;
        return s;
      }

      if (action.type === 'wttd_set_ready') {
        if (s.heroPickMode === 'same_host') {
          throw new GameActionRejectedError('ใช้ปุ่มของหัวห้องในโหมดนี้');
        }
        if (s.heroPickMode === 'random_unique') {
          throw new GameActionRejectedError('โหมดนี้ไม่มีหน้าเลือก');
        }
        if (!action.ready) {
          s.ready[playerId] = false;
          return s;
        }
        if (s.preferences[playerId] == null) {
          throw new GameActionRejectedError('เลือกฮีโร่ก่อน');
        }
        s.ready[playerId] = true;
        s.lastEvent = `${s.players.find((p) => p.id === playerId)?.name ?? ''} พร้อมแล้ว`;
        if (allPlayersReady(s) && (s.heroPickMode === 'normal' || s.heroPickMode === 'free')) {
          return resolveNormalOrFree(s, s.heroPickMode === 'free');
        }
        return s;
      }

      if (action.type === 'wttd_host_same_set') {
        if (s.heroPickMode !== 'same_host' || playerId !== s.hostId) {
          throw new GameActionRejectedError('เฉพาะหัวห้อง');
        }
        s.hostTableHero = action.heroClass;
        s.lastEvent = 'หัวห้องเลือกฮีโร่กลางโต๊ะ';
        return s;
      }

      if (action.type === 'wttd_host_same_random') {
        if (s.heroPickMode !== 'same_host' || playerId !== s.hostId) {
          throw new GameActionRejectedError('เฉพาะหัวห้อง');
        }
        const h = randomHeroClass();
        const ph: Record<string, WttdHeroClass> = {};
        for (const p of s.players) ph[p.id] = h;
        return transitionToRoleReveal(s, ph, 'สุ่มฮีโร่เดียวกันทั้งโต๊ะ');
      }

      if (action.type === 'wttd_host_same_go') {
        if (s.heroPickMode !== 'same_host' || playerId !== s.hostId) {
          throw new GameActionRejectedError('เฉพาะหัวห้อง');
        }
        if (s.hostTableHero == null) {
          throw new GameActionRejectedError('เลือกฮีโร่ก่อน');
        }
        const ph: Record<string, WttdHeroClass> = {};
        for (const p of s.players) ph[p.id] = s.hostTableHero;
        return transitionToRoleReveal(s, ph, 'ทุกคนได้ฮีโร่เดียวกัน');
      }

      throw new GameActionRejectedError('การกระทำนี้ใช้ไม่ได้ตอนเลือกฮีโร่');
    }

    if (s.phase === 'role_reveal') {
      if (action.type !== 'wttd_role_ack') {
        throw new GameActionRejectedError('รับทราบบทบาทก่อน');
      }
      if (s.roleRevealAck[playerId]) {
        return s;
      }
      s.roleRevealAck[playerId] = true;
      s.lastEvent = 'ผู้เล่นรับทราบฮีโร่แล้ว';
      const done = s.players.every((p) => s.roleRevealAck[p.id] === true);
      if (done) {
        return finishRoleRevealAndStartBidding(s, 'เริ่มประมูล — ผ่านหรือจั่วมอน');
      }
      return s;
    }

    if (s.phase === 'bidding') {
      if (action.type === 'bidding_set_vorpal_precog') {
        const exId = s.explorerId;
        if (!exId || playerId !== exId) {
          throw new GameActionRejectedError('เฉพาะผู้ชนะประมูลเลือกเป้าวอร์ปัล');
        }
        if (s.biddingInAuction.length !== 1 || s.biddingInAuction[0] !== exId) {
          throw new GameActionRejectedError('สถานะไม่พร้อมเลือกเป้าวอร์ปัล');
        }
        if (s.pendingDraw) throw new GameActionRejectedError('ต้องจัดการมอนที่จั่วก่อน');
        const exClass = s.playerHero[exId] ?? 'warrior';
        const mine = s.playerEquipment[exId] ?? initialEquipment(exClass);
        if (!hasVorpalBladeEquipment(mine)) {
          throw new GameActionRejectedError('ไม่มีดาบหรือมีดวอร์ปัล');
        }
        if (!WTTD_ALL_MONSTER_POWERS.includes(action.power)) {
          throw new GameActionRejectedError('พลังมอนไม่ถูกต้อง');
        }
        s.vorpalPrecogPower = action.power;
        s.lastEvent = `เลือกเป้าวอร์ปัล — พลัง ${action.power}`;
        return s;
      }

      if (action.type === 'dungeon_enter') {
        if (!s.explorerId) throw new GameActionRejectedError('ยังไม่มีผู้เข้าดันเจี้ยน');
        if (playerId !== s.explorerId) throw new GameActionRejectedError('เฉพาะผู้ชนะประมูล');
        if (s.biddingInAuction.length !== 1 || s.biddingInAuction[0] !== s.explorerId) {
          throw new GameActionRejectedError('สถานะไม่พร้อมเข้าดันเจี้ยน');
        }
        if (s.pendingDraw) throw new GameActionRejectedError('ต้องจัดการมอนที่จั่วก่อน');
        const explorerId = s.explorerId;
        const exClass = s.playerHero[explorerId] ?? 'warrior';
        const fromAuction = s.playerEquipment[explorerId] ?? initialEquipment(exClass);
        const hasVorpal = hasVorpalBladeEquipment(fromAuction);
        const incomingPrecog = action.vorpalPrecogPower;
        if (incomingPrecog !== undefined) {
          if (!hasVorpal) {
            throw new GameActionRejectedError('ไม่มีดาบหรือมีดวอร์ปัล');
          }
          if (!WTTD_ALL_MONSTER_POWERS.includes(incomingPrecog)) {
            throw new GameActionRejectedError('พลังมอนไม่ถูกต้อง');
          }
          s.vorpalPrecogPower = incomingPrecog;
        }
        if (hasVorpal && s.vorpalPrecogPower == null) {
          throw new GameActionRejectedError('เลือกพลังมอนเป้าหมายวอร์ปัลก่อนเข้าดันเจี้ยน');
        }
        const hpMax = wttdExplorerMaxHpFromEquipment(exClass, fromAuction);
        s.phase = 'dungeon';
        s.hero.equipment = [...fromAuction];
        s.hero.hpMax = hpMax;
        s.hero.hp = hpMax;
        s.dungeonResolveIndex = 0;
        s.currentRevealedCard = null;
        s.pendingDraw = null;
        s.currentTurnPlayerId = explorerId;
        s.powersResolvedThisRun = [];
        s.awaitingHealingPotion = false;
        s.demonicPactBanishNext = false;
        s.dungeonEquipFlags = defaultDungeonEquipFlags();
        s.dungeonCombatAnimSeq = 0;
        s.dungeonCombatAnimKind = 'none';
        s.dungeonCombatPlayedEquipmentId = null;
        s.dungeonCombatMonsterPower = null;
        const exName = s.players.find((p) => p.id === explorerId)?.name ?? '';
        s.lastEvent = `${exName} เข้าสู่ดันเจี้ยน`;
        if (s.dungeonStack.length === 0) {
          return advanceAfterDungeon(s, true, explorerId);
        }
        return s;
      }

      if (action.type === 'bidding_pass') {
        if (s.pendingDraw) throw new GameActionRejectedError('ต้องจัดการมอนที่จั่วก่อน');
        if (playerId !== s.currentTurnPlayerId)
          throw new GameActionRejectedError('ยังไม่ถึงคิวคุณ');
        if (!s.biddingInAuction.includes(playerId))
          throw new GameActionRejectedError('คุณสละสิทธิ์ไปแล้ว');
        if (s.biddingInAuction.length === 1) {
          throw new GameActionRejectedError('เหลือคุณคนเดียว — กดเข้าสู่ดันเจี้ยน');
        }

        s.biddingInAuction = s.biddingInAuction.filter((id) => id !== playerId);
        s.lastEvent = `${s.players.find((p) => p.id === playerId)?.name ?? ''} ผ่าน`;

        if (s.biddingInAuction.length === 1) {
          const explorerId = s.biddingInAuction[0]!;
          s.explorerId = explorerId;
          s.currentTurnPlayerId = explorerId;
          s.pendingDraw = null;
          s.lastEvent = `${s.players.find((p) => p.id === explorerId)?.name ?? ''} ชนะประมูล — กดเข้าสู่ดันเจี้ยน`;
          return s;
        }

        s.currentTurnPlayerId = nextActivePlayer(s.playerOrder, s.biddingInAuction, playerId);
        return s;
      }

      if (action.type === 'bidding_draw') {
        if (s.biddingInAuction.length === 1) {
          throw new GameActionRejectedError('ประมูลจบแล้ว — กดเข้าสู่ดันเจี้ยน');
        }
        if (s.pendingDraw) throw new GameActionRejectedError('มีมอนค้างรอการตัดสิน');
        if (playerId !== s.currentTurnPlayerId)
          throw new GameActionRejectedError('ยังไม่ถึงคิวคุณ');
        if (!s.biddingInAuction.includes(playerId))
          throw new GameActionRejectedError('คุณไม่ได้อยู่ในประมูล');
        if (s.monsterDeck.length === 0) throw new GameActionRejectedError('สำรับมอนหมด — ต้องผ่าน');

        const power = s.monsterDeck.pop()!;
        s.pendingDraw = { playerId, power };
        s.lastEvent = `${s.players.find((p) => p.id === playerId)?.name ?? ''} จั่วมอนพลัง ${power}`;
        return s;
      }

      if (action.type === 'bidding_add_to_dungeon') {
        const pd = s.pendingDraw;
        if (!pd || pd.playerId !== playerId) throw new GameActionRejectedError('ไม่มีมอนให้ใส่กอง');
        s.dungeonStack.push(pd.power);
        s.pendingDraw = null;
        s.currentTurnPlayerId = nextActivePlayer(s.playerOrder, s.biddingInAuction, playerId);
        s.lastEvent = 'ใส่มอนในดันเจี้ยน (คว่ำ)';
        return s;
      }

      if (action.type === 'bidding_discard_monster') {
        const pd = s.pendingDraw;
        if (!pd || pd.playerId !== playerId) throw new GameActionRejectedError('ไม่มีมอนให้ทิ้ง');
        const eq = action.equipmentId;
        const mine = s.playerEquipment[playerId];
        if (!mine?.includes(eq)) throw new GameActionRejectedError('ไม่มีอุปกรณ์นี้ในชุดของคุณ');
        s.monstersRemovedFromGame.push(pd.power);
        s.playerEquipment[playerId] = mine.filter((e) => e !== eq);
        s.pendingDraw = null;
        s.currentTurnPlayerId = nextActivePlayer(s.playerOrder, s.biddingInAuction, playerId);
        s.lastEvent = 'ทิ้งมอนและเอาอุปกรณ์ออกจากเกม';
        return s;
      }

      throw new GameActionRejectedError('การกระทำนี้ใช้ไม่ได้ในประมูล');
    }

    if (s.phase === 'dungeon') {
      const ex = s.explorerId;
      if (!ex) throw new GameActionRejectedError('ไม่มีนักผจญภัย');
      const exClass = s.playerHero[ex] ?? 'warrior';

      if (action.type === 'dungeon_healing_potion_revive') {
        if (playerId !== ex) throw new GameActionRejectedError('เฉพาะผู้เข้าดันเจี้ยน');
        if (!s.awaitingHealingPotion) throw new GameActionRejectedError('ไม่ได้รอคืนชีพ');
        const base = wttdExplorerBaseHp(exClass);
        const card = s.currentRevealedCard;
        const isLastMonsterInStack =
          card != null &&
          s.dungeonStack.length > 0 &&
          s.dungeonResolveIndex === s.dungeonStack.length - 1;
        s.hero.hp = base;
        s.awaitingHealingPotion = false;
        s.dungeonEquipFlags = { ...s.dungeonEquipFlags, healingPotionUsed: true };
        if (s.hero.equipment.includes('barbarian_healing_potion')) {
          removeFirstEq(s.hero.equipment, 'barbarian_healing_potion');
        } else {
          removeFirstEq(s.hero.equipment, 'rogue_healing_potion');
        }
        const exName = s.players.find((p) => p.id === ex)?.name ?? '';
        if (isLastMonsterInStack) {
          bumpDungeonCombatAnim(s, 'special_monster', null, card);
          return advanceMonsterSlot(
            s,
            ex,
            card,
            `${exName} ดื่มโพชันหลังมอนสุดท้าย — คืนชีพ HP ${base} — รอดดันเจี้ยน`,
          );
        }
        s.lastEvent = `${exName} ดื่มโพชัน — คืนชีพ HP ${base} (ฐานคลาส)`;
        return s;
      }

      if (action.type === 'dungeon_accept_death') {
        if (playerId !== ex) throw new GameActionRejectedError('เฉพาะผู้เข้าดันเจี้ยน');
        if (!s.awaitingHealingPotion) throw new GameActionRejectedError('ไม่ได้รอตัดสินโพชัน');
        const card = s.currentRevealedCard;
        s.awaitingHealingPotion = false;
        s.dungeonEquipFlags = { ...s.dungeonEquipFlags, healingPotionUsed: true };
        if (card != null) {
          s.powersResolvedThisRun.push(card);
          s.currentRevealedCard = null;
          s.dungeonResolveIndex += 1;
        }
        s.lastEvent = 'ยอมรับความพ่ายแพ้';
        return advanceAfterDungeon(s, false, ex);
      }

      if (s.awaitingHealingPotion) {
        throw new GameActionRejectedError('ตัดสินโพชันคืนชีพหรือยอมแพ้ก่อน');
      }

      if (action.type === 'dungeon_reveal') {
        if (playerId !== ex) throw new GameActionRejectedError('เฉพาะผู้เข้าดันเจี้ยนเปิดการ์ด');
        if (s.currentRevealedCard != null)
          throw new GameActionRejectedError('ยังต้องแก้การ์ดปัจจุบัน');
        if (s.dungeonResolveIndex >= s.dungeonStack.length) {
          throw new GameActionRejectedError('ไม่มีการ์ดเหลือ');
        }
        const revealed = s.dungeonStack[s.dungeonResolveIndex]!;
        s.currentRevealedCard = revealed;
        s.lastEvent = `เปิดมอนพลัง ${revealed}`;
        if (s.demonicPactBanishNext) {
          s.demonicPactBanishNext = false;
          bumpDungeonCombatAnim(s, 'special_monster', null, revealed);
          return advanceMonsterSlot(s, ex, revealed, `สัญญาปีศาจ — กำจัดทันทีพลัง ${revealed}`);
        }
        return s;
      }

      if (action.type === 'dungeon_take_damage') {
        if (playerId !== ex) throw new GameActionRejectedError('เฉพาะผู้เข้าดันเจี้ยน');
        const card = s.currentRevealedCard;
        if (card == null) throw new GameActionRejectedError('ยังไม่เปิดการ์ด');
        s.hero.hp -= card;

        if (s.hero.hp <= 0) {
          const canPotion =
            hasHealingPotionEquipment(s.hero.equipment) && !s.dungeonEquipFlags.healingPotionUsed;
          if (canPotion) {
            s.hero.hp = 0;
            s.awaitingHealingPotion = true;
            s.lastEvent = `รับดาเมจ ${card} — หมดสติ (มีโพชัน)`;
            return s;
          }
          s.currentRevealedCard = null;
          s.powersResolvedThisRun.push(card);
          s.dungeonResolveIndex += 1;
          s.lastEvent = `รับดาเมจ ${card} — ล้มเหลว`;
          bumpDungeonCombatAnim(s, 'take_damage', null, card);
          return advanceAfterDungeon(s, false, ex);
        }

        bumpDungeonCombatAnim(s, 'take_damage', null, card);
        return advanceMonsterSlot(s, ex, card, `รับดาเมจ ${card} — เหลือ HP ${s.hero.hp}`);
      }

      if (action.type === 'dungeon_weakness_pass') {
        if (playerId !== ex) throw new GameActionRejectedError('เฉพาะผู้เข้าดันเจี้ยน');
        if (s.currentRevealedCard == null) throw new GameActionRejectedError('ยังไม่เปิดการ์ด');
        const eq = action.equipmentId;
        if (!s.hero.equipment.includes(eq)) throw new GameActionRejectedError('ไม่มีอุปกรณ์นี้');
        if (!wttdCanWeaknessPassMonster(s.currentRevealedCard, eq)) {
          throw new GameActionRejectedError('อุปกรณ์นี้ไม่ตรงสัญลักษณ์แพ้ทางของมอน');
        }
        const pow = s.currentRevealedCard;
        bumpDungeonCombatAnim(s, 'weakness', eq, pow);
        return advanceMonsterSlot(
          s,
          ex,
          pow,
          'ใช้แพ้ทาง — ผ่านมอนโดยไม่เสีย HP (การ์ดยังอยู่ในชุด)',
        );
      }

      if (action.type === 'dungeon_use_vorpal_blade') {
        if (playerId !== ex) throw new GameActionRejectedError('เฉพาะผู้เข้าดันเจี้ยน');
        if (s.dungeonEquipFlags.vorpalBladeUsed) {
          throw new GameActionRejectedError('ใช้ดาบวอร์ปัลในรอบนี้แล้ว');
        }
        const card = s.currentRevealedCard;
        if (card == null) throw new GameActionRejectedError('ยังไม่เปิดการ์ด');
        if (s.vorpalPrecogPower == null || card !== s.vorpalPrecogPower) {
          throw new GameActionRejectedError('มอนตัวนี้ไม่ตรงเป้าวอร์ปัล');
        }
        const blade = vorpalBladeEquipmentId(s.hero.equipment);
        if (!blade) throw new GameActionRejectedError('ไม่มีดาบหรือมีดวอร์ปัล');
        s.dungeonEquipFlags = { ...s.dungeonEquipFlags, vorpalBladeUsed: true };
        bumpDungeonCombatAnim(s, 'special_monster', blade, card);
        removeFirstEq(s.hero.equipment, blade);
        return advanceMonsterSlot(s, ex, card, `วอร์ปัล — กำจัดพลัง ${card}`);
      }

      if (action.type === 'dungeon_use_vorpal_axe') {
        if (playerId !== ex) throw new GameActionRejectedError('เฉพาะผู้เข้าดันเจี้ยน');
        if (s.dungeonEquipFlags.vorpalAxeUsed)
          throw new GameActionRejectedError('ใช้ขวานวอร์ปัลในรอบนี้แล้ว');
        const card = s.currentRevealedCard;
        if (card == null) throw new GameActionRejectedError('ยังไม่เปิดการ์ด');
        if (!s.hero.equipment.includes('barbarian_vorpal_axe')) {
          throw new GameActionRejectedError('ไม่มีขวานวอร์ปัล');
        }
        s.dungeonEquipFlags = { ...s.dungeonEquipFlags, vorpalAxeUsed: true };
        bumpDungeonCombatAnim(s, 'special_monster', 'barbarian_vorpal_axe', card);
        removeFirstEq(s.hero.equipment, 'barbarian_vorpal_axe');
        return advanceMonsterSlot(s, ex, card, `ขวานวอร์ปัล — กำจัดพลัง ${card}`);
      }

      if (action.type === 'dungeon_use_demonic_pact') {
        if (playerId !== ex) throw new GameActionRejectedError('เฉพาะผู้เข้าดันเจี้ยน');
        if (s.dungeonEquipFlags.demonicPactUsed) {
          throw new GameActionRejectedError('ใช้สัญญาปีศาจในรอบนี้แล้ว');
        }
        const card = s.currentRevealedCard;
        if (card == null) throw new GameActionRejectedError('ยังไม่เปิดการ์ด');
        if (card !== 7) throw new GameActionRejectedError('สัญญาปีศาจใช้กับมอนพลัง 7 เท่านั้น');
        if (!s.hero.equipment.includes('mage_demonic_pact')) {
          throw new GameActionRejectedError('ไม่มีสัญญาปีศาจ');
        }
        s.dungeonEquipFlags = { ...s.dungeonEquipFlags, demonicPactUsed: true };
        s.demonicPactBanishNext = true;
        bumpDungeonCombatAnim(s, 'special_monster', 'mage_demonic_pact', card);
        removeFirstEq(s.hero.equipment, 'mage_demonic_pact');
        return advanceMonsterSlot(s, ex, card, 'สัญญาปีศาจ — ชนะมอนพลัง 7 ใบถัดไปจะถูกกำจัดทันที');
      }

      if (action.type === 'dungeon_use_polymorph') {
        if (playerId !== ex) throw new GameActionRejectedError('เฉพาะผู้เข้าดันเจี้ยน');
        if (s.dungeonEquipFlags.polymorphUsed)
          throw new GameActionRejectedError('ใช้พอลิมอร์ฟในรอบนี้แล้ว');
        const card = s.currentRevealedCard;
        if (card == null) throw new GameActionRejectedError('ยังไม่เปิดการ์ด');
        if (!s.hero.equipment.includes('mage_polymorph')) {
          throw new GameActionRejectedError('ไม่มีพอลิมอร์ฟ');
        }
        s.dungeonEquipFlags = { ...s.dungeonEquipFlags, polymorphUsed: true };
        bumpDungeonCombatAnim(s, 'special_monster', 'mage_polymorph', card);
        removeFirstEq(s.hero.equipment, 'mage_polymorph');
        return advanceMonsterSlot(s, ex, card, 'พอลิมอร์ฟ — ข้ามมอนและเปิดใบถัดไป');
      }

      if (action.type === 'dungeon_use_ring_of_power') {
        if (playerId !== ex) throw new GameActionRejectedError('เฉพาะผู้เข้าดันเจี้ยน');
        const card = s.currentRevealedCard;
        if (card == null) throw new GameActionRejectedError('ยังไม่เปิดการ์ด');
        if (card > 2) throw new GameActionRejectedError('แหวนใช้กับมอนพลังไม่เกิน 2');
        if (!s.hero.equipment.includes('rogue_ring_of_power')) {
          throw new GameActionRejectedError('ไม่มีแหวนแห่งพลัง');
        }
        const nextHp = Math.min(s.hero.hpMax, s.hero.hp + card);
        s.hero.hp = nextHp;
        bumpDungeonCombatAnim(s, 'special_monster', 'rogue_ring_of_power', card);
        return advanceMonsterSlot(s, ex, card, `แหวนแห่งพลัง — ดูดพลัง ${card} เหลือ HP ${nextHp}`);
      }

      throw new GameActionRejectedError('การกระทำนี้ใช้ไม่ได้ในเฟสดันเจี้ยน');
    }

    return state;
  },

  getPlayerView(state: WttdState, viewerId: string): WttdPlayerView {
    return toPlayerView(state, viewerId);
  },

  isGameOver(state: WttdState): GameResult | null {
    return state.outcome;
  },
};
