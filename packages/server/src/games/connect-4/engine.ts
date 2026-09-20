import {
  CONNECT_4_COLS,
  CONNECT_4_ID,
  GAME_THUMBNAIL_BY_ID,
  connect4IsBoardFull,
  connect4LegalColumns,
  connect4LowestEmptyRow,
  connect4WinningLine,
  createConnect4Board,
  type Connect4Action,
  type Connect4Color,
  type Connect4Player,
  type Connect4PlayerView,
  type Connect4State,
  type GameDefinition,
  type GameResult,
  type Player,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

const reject = (message: string): never => {
  throw new GameActionRejectedError(message);
};

const COLOR_TH: Record<Connect4Color, string> = {
  red: 'แดง',
  yellow: 'เหลือง',
};

function cloneState(state: Connect4State): Connect4State {
  return structuredClone(state);
}

function opponentId(state: Connect4State, playerId: string): string {
  const other = state.players.find((player) => player.id !== playerId);
  if (!other) return playerId;
  return other.id;
}

function setup(players: Player[]): Connect4State {
  if (players.length !== 2) throw new Error('Connect 4 ต้องมีผู้เล่น 2 คน');
  const [a, b] = players as [Player, Player];
  const redFirst = Math.random() < 0.5;
  const red = redFirst ? a : b;
  const yellow = redFirst ? b : a;
  const seats: Connect4Player[] = [
    { id: red.id, name: red.name, color: 'red' },
    { id: yellow.id, name: yellow.name, color: 'yellow' },
  ];
  const playerColors: Record<string, Connect4Color> = {
    [red.id]: 'red',
    [yellow.id]: 'yellow',
  };

  return {
    phase: 'playing',
    board: createConnect4Board(),
    currentPlayerId: red.id,
    players: seats,
    playerColors,
    lastMove: null,
    winningLine: null,
    result: null,
  };
}

function handleDrop(state: Connect4State, playerId: string, col: number): Connect4State {
  if (!Number.isInteger(col) || col < 0 || col >= CONNECT_4_COLS) {
    return reject('คอลัมน์ไม่ถูกต้อง');
  }

  const row = connect4LowestEmptyRow(state.board, col);
  if (row == null) return reject('คอลัมน์นี้เต็มแล้ว');

  const color = state.playerColors[playerId];
  if (!color) return reject('ไม่พบสีของคุณ');

  const next = cloneState(state);
  next.board[row]![col] = color;
  next.lastMove = { col, row, playerId };

  const line = connect4WinningLine(next.board, row, col);
  if (line) {
    next.phase = 'game_over';
    next.winningLine = line;
    next.currentPlayerId = playerId;
    next.result = {
      winners: [playerId],
      reason: `${COLOR_TH[color]} เรียง 4`,
    };
    return next;
  }

  if (connect4IsBoardFull(next.board)) {
    next.phase = 'game_over';
    next.winningLine = null;
    next.result = {
      winners: [],
      reason: 'กระดานเต็ม — เสมอ',
    };
    return next;
  }

  next.currentPlayerId = opponentId(next, playerId);
  return next;
}

function onAction(state: Connect4State, playerId: string, action: Connect4Action): Connect4State {
  if (state.phase === 'game_over') return reject('เกมจบแล้ว');
  if (state.currentPlayerId !== playerId) return reject('ยังไม่ถึงตาคุณ');
  return handleDrop(state, playerId, action.col);
}

function getPlayerView(state: Connect4State, playerId: string): Connect4PlayerView {
  const myColor = state.playerColors[playerId] ?? 'red';
  const canAct = state.phase === 'playing' && state.currentPlayerId === playerId;
  return {
    phase: state.phase,
    board: state.board,
    currentPlayerId: state.currentPlayerId,
    canAct,
    players: state.players,
    playerColors: state.playerColors,
    myColor,
    lastMove: state.lastMove,
    winningLine: state.winningLine,
    legalColumns: canAct ? connect4LegalColumns(state.board) : [],
    result: state.result,
  };
}

export const connect4: GameDefinition<Connect4State, Connect4Action> = {
  id: CONNECT_4_ID,
  name: 'Connect 4',
  description: 'หยอดตัวหมากลงคอลัมน์ ให้ได้ 4 ตัวติดกันในแนวตรง',
  minPlayers: 2,
  maxPlayers: 2,
  thumbnail: GAME_THUMBNAIL_BY_ID[CONNECT_4_ID] ?? '',
  setup,
  onAction,
  getPlayerView,
  isGameOver: (state): GameResult | null => state.result,
};
