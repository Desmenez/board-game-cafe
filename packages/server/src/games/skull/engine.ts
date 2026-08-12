import {
  GAME_THUMBNAIL_BY_ID,
  type GameDefinition,
  type Player,
  type SkullAction,
  type SkullPlayerView,
  type SkullState,
} from 'shared';
import { applyAction, createInitialState } from './rules.js';
import { toPlayerView } from './view.js';

export const skullGame: GameDefinition<SkullState, SkullAction> = {
  id: 'skull',
  name: 'Skull',
  description:
    'เกมบลัฟวางดิสก์ดอกไม้/กะโหลก บิดแล้วท้าทาย — ชนะ 2 รอบ หรือเป็นคนสุดท้ายที่เหลือ',
  minPlayers: 3,
  maxPlayers: 6,
  thumbnail: GAME_THUMBNAIL_BY_ID.skull ?? '',

  setup(players: Player[]): SkullState {
    return createInitialState(players);
  },

  onAction(state: SkullState, playerId: string, action: SkullAction): SkullState {
    return applyAction(state, playerId, action);
  },

  getPlayerView(state: SkullState, playerId: string): SkullPlayerView {
    return toPlayerView(state, playerId);
  },

  isGameOver(state: SkullState) {
    return state.phase === 'game_over' ? state.result : null;
  },
};
