import type { SkyTeamState, SkyTeamTrafficDieState } from 'shared';
import { appendLog, rollDie, scenarioFromState } from '../helpers.js';
import type { SkyTeamModuleDefinition } from './types.js';

/** Airplane tokens available for Traffic Die placements. */
export const TRAFFIC_DIE_AIRPLANE_SUPPLY = 12;

function placeFromTrafficRoll(state: SkyTeamState, td: SkyTeamTrafficDieState, roll: number): void {
  appendLog(state, `Traffic Die rolled ${roll}`);

  if (td.remainingAirplaneTokens <= 0) {
    appendLog(state, 'No airplane token remained in supply');
    return;
  }

  const lastIndex = state.approach.length - 1;
  let targetIndex = state.approachPosition + (roll - 1);
  if (targetIndex > lastIndex) targetIndex = lastIndex;

  const space = state.approach[targetIndex];
  if (!space) return;

  space.planes += 1;
  td.remainingAirplaneTokens -= 1;

  const ahead = targetIndex - state.approachPosition;
  if (ahead === 0) {
    appendLog(state, 'An airplane appeared on the current approach space');
  } else if (targetIndex === lastIndex && state.approachPosition + (roll - 1) > lastIndex) {
    appendLog(state, 'An airplane appeared at the airport (roll beyond the track)');
  } else {
    appendLog(state, `An airplane appeared ${ahead} space${ahead === 1 ? '' : 's'} ahead`);
  }
}

/** Roll Traffic Die for the space the plane is currently stopped on. */
export function runTrafficDieRoundStart(state: SkyTeamState): void {
  const td = state.moduleState.trafficDie;
  if (!td) return;

  const scenario = scenarioFromState(state);
  const spaceDef = scenario.spaces.find((s) => s.index === state.approachPosition);
  const rolls = spaceDef?.trafficDieRolls ?? 0;
  if (rolls <= 0) {
    td.lastRolls = [];
    return;
  }

  td.lastRolls = [];
  for (let i = 0; i < rolls; i++) {
    const roll = rollDie();
    td.lastRolls.push(roll);
    placeFromTrafficRoll(state, td, roll);
  }
}

export const trafficDieModule: SkyTeamModuleDefinition<SkyTeamTrafficDieState> = {
  id: 'traffic-die',
  setup: () => ({
    remainingAirplaneTokens: TRAFFIC_DIE_AIRPLANE_SUPPLY,
    lastRolls: [],
  }),
  onRoundStart: (state) => {
    runTrafficDieRoundStart(state);
    return state;
  },
};
