import {
  GAME_THUMBNAIL_BY_ID,
  SPICY_MAX_PLAYERS,
  SPICY_MIN_PLAYERS,
  type GameDefinition,
  type Player,
  type SpicyAction,
  type SpicyPlayerView,
  type SpicyState,
} from 'shared';
import { applyAction, createInitialState } from './rules.js';
import { toPlayerView } from './view.js';

export const spicyGame: GameDefinition<SpicyState, SpicyAction> = {
  id: 'spicy',
  name: 'Spicy',
  description:
    'เกมบลัฟวางการ์ดเครื่องเทศ — ประกาศเลข/รส ท้าทาย เก็บกอง ชิงถ้วยรางวัล',
  minPlayers: SPICY_MIN_PLAYERS,
  maxPlayers: SPICY_MAX_PLAYERS,
  thumbnail: GAME_THUMBNAIL_BY_ID.spicy ?? '',

  setup(players: Player[], options?: unknown): SpicyState {
    return createInitialState(players, options);
  },

  onAction(state: SpicyState, playerId: string, action: SpicyAction): SpicyState {
    return applyAction(state, playerId, action);
  },

  getPlayerView(state: SpicyState, playerId: string): SpicyPlayerView {
    return toPlayerView(state, playerId);
  },

  isGameOver(state: SpicyState) {
    return state.phase === 'game_over' ? state.result : null;
  },
};
