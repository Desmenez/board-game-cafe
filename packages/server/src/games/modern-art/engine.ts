import {
  GAME_THUMBNAIL_BY_ID,
  MODERN_ART_MAX_PLAYERS,
  MODERN_ART_MIN_PLAYERS,
  type GameDefinition,
  type ModernArtAction,
  type ModernArtCard,
  type ModernArtPlayerView,
  type ModernArtState,
  type Player,
} from 'shared';
import { applyAction, createInitialState } from './rules.js';
import { toPlayerView } from './view.js';

function deckFromOptions(options: unknown): ModernArtCard[] | undefined {
  if (!options || typeof options !== 'object') return undefined;
  if (!('deck' in options)) return undefined;
  const deck = (options as { deck?: unknown }).deck;
  if (!Array.isArray(deck)) return undefined;
  return deck as ModernArtCard[];
}

export const modernArtGame: GameDefinition<ModernArtState, ModernArtAction> = {
  id: 'modern-art',
  name: 'Modern Art',
  description:
    'ประมูลภาพ 4 รอบ — ขายสะสมมูลค่าศิลปิน ผู้เล่น 3–5 คน',
  minPlayers: MODERN_ART_MIN_PLAYERS,
  maxPlayers: MODERN_ART_MAX_PLAYERS,
  thumbnail: GAME_THUMBNAIL_BY_ID['modern-art'] ?? '',

  setup(players: Player[], options?: unknown): ModernArtState {
    return createInitialState(players, { deck: deckFromOptions(options) });
  },

  onAction(state: ModernArtState, playerId: string, action: ModernArtAction): ModernArtState {
    return applyAction(state, playerId, action);
  },

  getPlayerView(state: ModernArtState, playerId: string): ModernArtPlayerView {
    return toPlayerView(state, playerId);
  },

  isGameOver(state: ModernArtState) {
    return state.phase === 'game_over' ? state.result : null;
  },
};
