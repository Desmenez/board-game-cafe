import { csFilesGame, applyCsFilesTimerExpiry } from './engine.js';
import { registerGame } from '../registry.js';

registerGame(csFilesGame);

export { csFilesGame, applyCsFilesTimerExpiry };
