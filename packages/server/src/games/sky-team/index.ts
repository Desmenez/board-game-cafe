import { registerGame } from '../registry.js';
import { applySkyTeamTimerExpiry, skyTeamGame } from './engine.js';

registerGame(skyTeamGame);

export { skyTeamGame, applySkyTeamTimerExpiry };
