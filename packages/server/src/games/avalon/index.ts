import { avalonGame, advanceQuestRevealStep } from './engine.js';
import { registerGame } from '../registry.js';

registerGame(avalonGame);

export { avalonGame, advanceQuestRevealStep };
