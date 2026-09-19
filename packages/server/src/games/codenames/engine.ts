import type {
  CodenamesAction,
  CodenamesBoardVariant,
  CodenamesCardRole,
  CodenamesPlayerView,
  CodenamesRole,
  CodenamesTeam,
  GameDefinition,
  GameResult,
  Player,
} from 'shared';
import {
  CODENAMES_PICTURE_CARD_PUBLIC_IDS,
  GAME_THUMBNAIL_BY_ID,
  codenamesPictureCardUrl,
  parseCodenamesLobbyOptions,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';
import { CODENAMES_TH_WORDS } from './th-words.js';

type CodenamesCardState = {
  word: string;
  imageKey?: string;
  role: CodenamesCardRole;
  revealed: boolean;
  revealedByTeam: CodenamesTeam | null;
};

type CodenamesClueState = {
  team: CodenamesTeam;
  byPlayerId: string;
  clueWord: string;
  clueCount: number;
} | null;

type CodenamesState = {
  phase: 'role_reveal' | 'playing' | 'game_over';
  players: Array<{ id: string; name: string }>;
  teamByPlayer: Record<string, CodenamesTeam>;
  roleByPlayer: Record<string, CodenamesRole>;
  boardVariant: CodenamesBoardVariant;
  cards: CodenamesCardState[];
  startingTeam: CodenamesTeam;
  turnTeam: CodenamesTeam;
  turnStage: 'clue' | 'guess';
  redRemaining: number;
  blueRemaining: number;
  currentClue: CodenamesClueState;
  guessLimitThisTurn: number;
  guessesUsedThisTurn: number;
  pendingGuessByPlayer: Record<string, number | undefined>;
  acknowledgedRoleByPlayer: Record<string, boolean>;
  lastEvent: string;
  result: GameResult | null;
};

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function otherTeam(team: CodenamesTeam): CodenamesTeam {
  return team === 'red' ? 'blue' : 'red';
}

function boardCounts(variant: CodenamesBoardVariant): {
  start: number;
  other: number;
  neutral: number;
  assassin: number;
  total: number;
} {
  if (variant === 'pictures') {
    return { start: 8, other: 7, neutral: 4, assassin: 1, total: 20 };
  }
  return { start: 9, other: 8, neutral: 7, assassin: 1, total: 25 };
}

function remainingFor(
  variant: CodenamesBoardVariant,
  startingTeam: CodenamesTeam,
): { red: number; blue: number } {
  const { start, other } = boardCounts(variant);
  return {
    red: startingTeam === 'red' ? start : other,
    blue: startingTeam === 'blue' ? start : other,
  };
}

function buildRoleDeck(
  startingTeam: CodenamesTeam,
  variant: CodenamesBoardVariant,
): CodenamesCardRole[] {
  const counts = boardCounts(variant);
  const other = otherTeam(startingTeam);
  const roles: CodenamesCardRole[] = [];
  for (let i = 0; i < counts.start; i += 1) roles.push(startingTeam);
  for (let i = 0; i < counts.other; i += 1) roles.push(other);
  for (let i = 0; i < counts.neutral; i += 1) roles.push('neutral');
  for (let i = 0; i < counts.assassin; i += 1) roles.push('assassin');
  return shuffle(roles);
}

function buildCards(
  startingTeam: CodenamesTeam,
  variant: CodenamesBoardVariant,
): CodenamesCardState[] {
  const roleDeck = buildRoleDeck(startingTeam, variant);
  if (variant === 'pictures') {
    const keys = shuffle(CODENAMES_PICTURE_CARD_PUBLIC_IDS).slice(0, roleDeck.length);
    return keys.map((imageKey, i) => ({
      word: '',
      imageKey,
      role: roleDeck[i]!,
      revealed: false,
      revealedByTeam: null,
    }));
  }
  const words = shuffle(CODENAMES_TH_WORDS).slice(0, roleDeck.length);
  return words.map((word, i) => ({
    word,
    role: roleDeck[i]!,
    revealed: false,
    revealedByTeam: null,
  }));
}

function normalizeClueToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function clueMatchesBoardWord(clueWord: string, cards: CodenamesCardState[]): boolean {
  const needle = normalizeClueToken(clueWord);
  if (!needle) return false;
  return cards.some((card) => card.word && normalizeClueToken(card.word) === needle);
}

function cardCaption(card: CodenamesCardState, index: number): string {
  if (card.word) return `"${card.word}"`;
  return `รูปที่ ${index + 1}`;
}

function teamNoun(variant: CodenamesBoardVariant): string {
  return variant === 'pictures' ? 'รูป' : 'คำ';
}

function assignTeamsAndRoles(players: Array<{ id: string; name: string }>): {
  teamByPlayer: Record<string, CodenamesTeam>;
  roleByPlayer: Record<string, CodenamesRole>;
} {
  const shuffled = shuffle(players.map((p) => p.id));
  const red: string[] = [];
  const blue: string[] = [];
  for (const pid of shuffled) {
    if (red.length <= blue.length) red.push(pid);
    else blue.push(pid);
  }
  const teamByPlayer: Record<string, CodenamesTeam> = {};
  const roleByPlayer: Record<string, CodenamesRole> = {};
  for (const pid of red) teamByPlayer[pid] = 'red';
  for (const pid of blue) teamByPlayer[pid] = 'blue';
  if (red.length > 0) roleByPlayer[red[0]!] = 'spymaster';
  if (blue.length > 0) roleByPlayer[blue[0]!] = 'spymaster';
  for (const p of players) {
    if (!roleByPlayer[p.id]) roleByPlayer[p.id] = 'operative';
  }
  return { teamByPlayer, roleByPlayer };
}

function canPlayerAct(s: CodenamesState, playerId: string): boolean {
  if (s.phase === 'role_reveal') return !s.acknowledgedRoleByPlayer[playerId];
  if (s.phase !== 'playing') return false;
  const team = s.teamByPlayer[playerId];
  const role = s.roleByPlayer[playerId];
  if (!team || !role || team !== s.turnTeam) return false;
  if (s.turnStage === 'clue') return role === 'spymaster';
  return role === 'operative';
}

function roleAcknowledgeProgress(s: CodenamesState): { current: number; total: number } {
  let current = 0;
  for (const p of s.players) if (s.acknowledgedRoleByPlayer[p.id]) current += 1;
  return { current, total: s.players.length };
}

function endTurn(s: CodenamesState): void {
  s.turnTeam = otherTeam(s.turnTeam);
  s.turnStage = 'clue';
  s.currentClue = null;
  s.guessLimitThisTurn = 0;
  s.guessesUsedThisTurn = 0;
  s.pendingGuessByPlayer = {};
}

function getTurnOperatives(s: CodenamesState): string[] {
  return s.players
    .filter((p) => s.teamByPlayer[p.id] === s.turnTeam && s.roleByPlayer[p.id] === 'operative')
    .map((p) => p.id);
}

function getConsensusGuessCardIndex(s: CodenamesState): number | undefined {
  if (s.turnStage !== 'guess') return undefined;
  const operativeIds = getTurnOperatives(s);
  if (operativeIds.length === 0) return undefined;
  let selected: number | undefined;
  for (const pid of operativeIds) {
    const pick = s.pendingGuessByPlayer[pid];
    if (pick === undefined) return undefined;
    if (selected === undefined) selected = pick;
    else if (selected !== pick) return undefined;
  }
  return selected;
}

function resolveGuess(s: CodenamesState, cardIndex: number): void {
  if (cardIndex < 0 || cardIndex >= s.cards.length) {
    throw new GameActionRejectedError('การ์ดไม่ถูกต้อง');
  }

  const card = s.cards[cardIndex]!;
  if (card.revealed) throw new GameActionRejectedError('การ์ดนี้ถูกเปิดแล้ว');
  card.revealed = true;
  card.revealedByTeam = s.turnTeam;
  s.guessesUsedThisTurn += 1;
  s.pendingGuessByPlayer = {};

  if (card.role === 'assassin') {
    const loserTeam = s.turnTeam;
    const winnerTeam = otherTeam(loserTeam);
    s.phase = 'game_over';
    s.result = {
      winners: s.players.filter((p) => s.teamByPlayer[p.id] === winnerTeam).map((p) => p.id),
      reason: `ทีม${loserTeam === 'red' ? 'แดง' : 'ฟ้า'}เปิดการ์ดมือสังหาร`,
    };
    s.lastEvent = `ทีม${loserTeam === 'red' ? 'แดง' : 'ฟ้า'}เปิดมือสังหาร — แพ้ทันที`;
    return;
  }

  if (card.role === 'red') s.redRemaining -= 1;
  if (card.role === 'blue') s.blueRemaining -= 1;
  if (maybeWinByRemaining(s)) return;

  if (card.role !== s.turnTeam) {
    s.lastEvent =
      card.role === 'neutral'
        ? `เปิดผู้บริสุทธิ์ — จบเทิร์น`
        : `เปิด${teamNoun(s.boardVariant)}ของทีม${card.role === 'red' ? 'แดง' : 'ฟ้า'} — จบเทิร์น`;
    endTurn(s);
    return;
  }

  s.lastEvent = `เปิดถูกทีม${s.turnTeam === 'red' ? 'แดง' : 'ฟ้า'} (${s.guessesUsedThisTurn}/${s.guessLimitThisTurn})`;
  if (s.guessesUsedThisTurn >= s.guessLimitThisTurn) {
    endTurn(s);
    s.lastEvent = 'เดาครบจำนวนที่อนุญาตแล้ว — จบเทิร์น';
  }
}

function maybeWinByRemaining(s: CodenamesState): boolean {
  if (s.redRemaining <= 0) {
    s.phase = 'game_over';
    s.result = {
      winners: s.players.filter((p) => s.teamByPlayer[p.id] === 'red').map((p) => p.id),
      reason: `ทีมแดงเปิด${teamNoun(s.boardVariant)}ครบทั้งหมด`,
    };
    s.lastEvent = 'ทีมแดงชนะเกม';
    return true;
  }
  if (s.blueRemaining <= 0) {
    s.phase = 'game_over';
    s.result = {
      winners: s.players.filter((p) => s.teamByPlayer[p.id] === 'blue').map((p) => p.id),
      reason: `ทีมฟ้าเปิด${teamNoun(s.boardVariant)}ครบทั้งหมด`,
    };
    s.lastEvent = 'ทีมฟ้าชนะเกม';
    return true;
  }
  return false;
}

function toView(s: CodenamesState, viewerId: string): CodenamesPlayerView {
  const isSpymaster = s.roleByPlayer[viewerId] === 'spymaster';
  return {
    phase: s.phase,
    myId: viewerId,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      team: s.teamByPlayer[p.id]!,
      role: s.roleByPlayer[p.id]!,
    })),
    cards: s.cards.map((c, i) => ({
      index: i,
      word: c.word,
      imageKey: c.imageKey,
      imageUrl: c.imageKey ? codenamesPictureCardUrl(c.imageKey) : undefined,
      revealed: c.revealed,
      revealedRole: c.revealed ? c.role : undefined,
      roleHint: !c.revealed && isSpymaster ? c.role : undefined,
      revealedByTeam: c.revealedByTeam ?? undefined,
    })),
    boardVariant: s.boardVariant,
    startingTeam: s.startingTeam,
    turnTeam: s.turnTeam,
    turnStage: s.turnStage,
    redRemaining: s.redRemaining,
    blueRemaining: s.blueRemaining,
    currentClue: s.currentClue ?? undefined,
    guessesUsedThisTurn: s.guessesUsedThisTurn,
    guessesRemainingThisTurn:
      s.turnStage === 'guess' ? Math.max(0, s.guessLimitThisTurn - s.guessesUsedThisTurn) : 0,
    canAct: canPlayerAct(s, viewerId),
    myTeam: s.teamByPlayer[viewerId]!,
    myRole: s.roleByPlayer[viewerId]!,
    pendingGuessByPlayer: { ...s.pendingGuessByPlayer },
    consensusGuessCardIndex: getConsensusGuessCardIndex(s),
    hasAcknowledgedRole:
      s.phase === 'role_reveal' ? !!s.acknowledgedRoleByPlayer[viewerId] : undefined,
    roleAcknowledgeProgress: s.phase === 'role_reveal' ? roleAcknowledgeProgress(s) : undefined,
    lastEvent: s.lastEvent,
    gameResult: s.result ?? undefined,
  };
}

export const codenamesGame: GameDefinition<CodenamesState, CodenamesAction> = {
  id: 'codenames',
  name: 'Codenames',
  description:
    'เกมใบ้ 2 ทีม — คำไทย 5×5 หรือรูปภาพ 5×4; Spy ให้คำใบ้ 1 คำ + ตัวเลข แล้ว Operative เปิดให้ครบทีม',
  minPlayers: 4,
  maxPlayers: 12,
  thumbnail:
    GAME_THUMBNAIL_BY_ID.codenames ??
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1777557982/cover_v1euj7.jpg',

  setup(players: Player[], options?: unknown): CodenamesState {
    const seated = players.map((p) => ({ id: p.id, name: p.name }));
    const { teamByPlayer, roleByPlayer } = assignTeamsAndRoles(seated);
    const startingTeam: CodenamesTeam = Math.random() < 0.5 ? 'red' : 'blue';
    const boardVariant = parseCodenamesLobbyOptions(options).boardVariant;
    const remaining = remainingFor(boardVariant, startingTeam);
    return {
      phase: 'role_reveal',
      players: seated,
      teamByPlayer,
      roleByPlayer,
      boardVariant,
      cards: buildCards(startingTeam, boardVariant),
      startingTeam,
      turnTeam: startingTeam,
      turnStage: 'clue',
      redRemaining: remaining.red,
      blueRemaining: remaining.blue,
      currentClue: null,
      guessLimitThisTurn: 0,
      guessesUsedThisTurn: 0,
      pendingGuessByPlayer: {},
      acknowledgedRoleByPlayer: Object.fromEntries(seated.map((p) => [p.id, false])),
      lastEvent: 'เปิดเผยบทบาท: กดยืนยันเมื่ออ่านบทบาทของตัวเองแล้ว',
      result: null,
    };
  },

  onAction(state: CodenamesState, playerId: string, action: CodenamesAction): CodenamesState {
    const s: CodenamesState = {
      ...state,
      players: state.players.map((p) => ({ ...p })),
      teamByPlayer: { ...state.teamByPlayer },
      roleByPlayer: { ...state.roleByPlayer },
      cards: state.cards.map((c) => ({ ...c })),
      currentClue: state.currentClue ? { ...state.currentClue } : null,
      pendingGuessByPlayer: { ...state.pendingGuessByPlayer },
      acknowledgedRoleByPlayer: { ...state.acknowledgedRoleByPlayer },
      result: state.result ? { ...state.result } : null,
    };
    if (s.phase === 'game_over') throw new GameActionRejectedError('เกมจบแล้ว');
    if (!canPlayerAct(s, playerId)) throw new GameActionRejectedError('ยังไม่ถึงหน้าที่ของคุณ');

    if (action.type === 'acknowledge_role') {
      if (s.phase !== 'role_reveal') throw new GameActionRejectedError('ตอนนี้ไม่ใช่ช่วงเปิดบทบาท');
      s.acknowledgedRoleByPlayer[playerId] = true;
      const p = roleAcknowledgeProgress(s);
      if (p.current >= p.total) {
        s.phase = 'playing';
        s.lastEvent = `เริ่มเกม Codenames — ทีม${s.startingTeam === 'red' ? 'แดง' : 'ฟ้า'}เริ่มก่อน`;
      } else {
        s.lastEvent = `ยืนยันบทบาทแล้ว ${p.current}/${p.total} คน`;
      }
      return s;
    }

    if (s.phase !== 'playing') throw new GameActionRejectedError('กำลังรอผู้เล่นยืนยันบทบาท');

    if (action.type === 'give_clue') {
      if (s.turnStage !== 'clue') throw new GameActionRejectedError('ตอนนี้ไม่ใช่ช่วงให้คำใบ้');
      const clueWord = action.clueWord.trim();
      if (!clueWord) throw new GameActionRejectedError('คำใบ้ต้องไม่ว่าง');
      if (!Number.isInteger(action.clueCount) || action.clueCount < 1 || action.clueCount > 9) {
        throw new GameActionRejectedError('จำนวนคำใบ้ต้องเป็น 1-9');
      }
      if (s.boardVariant === 'words' && clueMatchesBoardWord(clueWord, s.cards)) {
        throw new GameActionRejectedError('ห้ามใช้คำที่อยู่บนกระดานเป็นคำใบ้');
      }
      s.currentClue = {
        team: s.turnTeam,
        byPlayerId: playerId,
        clueWord,
        clueCount: action.clueCount,
      };
      s.turnStage = 'guess';
      s.guessesUsedThisTurn = 0;
      s.guessLimitThisTurn = action.clueCount + 1;
      s.pendingGuessByPlayer = {};
      s.lastEvent = `ทีม${s.turnTeam === 'red' ? 'แดง' : 'ฟ้า'} ได้คำใบ้ "${clueWord}" : ${action.clueCount}`;
      return s;
    }

    if (action.type === 'end_guesses') {
      if (s.turnStage !== 'guess') throw new GameActionRejectedError('ยังไม่มีช่วงเดาคำ');
      endTurn(s);
      s.lastEvent = `ทีม${otherTeam(s.turnTeam) === 'red' ? 'ฟ้า' : 'แดง'}จบการเดา ส่งเทิร์น`;
      return s;
    }

    if (action.type === 'select_guess') {
      if (s.turnStage !== 'guess') throw new GameActionRejectedError('ยังไม่มีช่วงเดาคำ');
      if (action.cardIndex < 0 || action.cardIndex >= s.cards.length) {
        throw new GameActionRejectedError('การ์ดไม่ถูกต้อง');
      }
      const card = s.cards[action.cardIndex]!;
      if (card.revealed) throw new GameActionRejectedError('การ์ดนี้ถูกเปิดแล้ว');
      s.pendingGuessByPlayer[playerId] = action.cardIndex;
      const picked = cardCaption(card, action.cardIndex);
      const consensusCardIndex = getConsensusGuessCardIndex(s);
      if (consensusCardIndex !== undefined) {
        s.lastEvent = `ทีม${s.turnTeam === 'red' ? 'แดง' : 'ฟ้า'} เห็นตรงกันที่ ${picked} — กดปุ่มยืนยันได้`;
      } else {
        s.lastEvent = `${s.players.find((p) => p.id === playerId)?.name ?? 'ผู้เล่น'} เลือก ${picked}`;
      }
      return s;
    }

    if (action.type !== 'confirm_guess') throw new GameActionRejectedError('ไม่รองรับคำสั่งนี้');
    if (s.turnStage !== 'guess') throw new GameActionRejectedError('ยังไม่มีช่วงเดาคำ');
    const consensusCardIndex = getConsensusGuessCardIndex(s);
    if (consensusCardIndex === undefined) {
      throw new GameActionRejectedError('ต้องให้ลูกทีมทุกคนเลือกคำเดียวกันก่อนยืนยัน');
    }
    resolveGuess(s, consensusCardIndex);
    return s;
  },

  getPlayerView(state: CodenamesState, playerId: string): CodenamesPlayerView {
    return toView(state, playerId);
  },

  isGameOver(state: CodenamesState): GameResult | null {
    return state.result;
  },
};
