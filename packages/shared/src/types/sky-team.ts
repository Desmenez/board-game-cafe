import type { GameResult } from './game.js';

export const SKY_TEAM_CLOUD_VERSION = 'v1784823300';

export type SkyTeamPhase =
  | 'strategy'
  | 'dice_roll'
  | 'dice_placement'
  | 'end_round'
  | 'game_over';

export type SkyTeamRole = 'pilot' | 'copilot';

export type ApproachBase = 'sky' | 'cloud' | 'airport';

export type SkyTeamDieColor = 'blue' | 'orange';

export type SkyTeamSlotId =
  | 'axis_pilot'
  | 'axis_copilot'
  | 'engine_pilot'
  | 'engine_copilot'
  | 'radio_pilot'
  | 'radio_copilot_1'
  | 'radio_copilot_2'
  | 'gear_12'
  | 'gear_34'
  | 'gear_56'
  | 'flaps_12'
  | 'flaps_23'
  | 'flaps_34'
  | 'flaps_45'
  | 'brake_2'
  | 'brake_4'
  | 'brake_6'
  | 'concentration_1'
  | 'concentration_2'
  | 'concentration_3';

export type SkyTeamLoseReason =
  | 'axis_spin'
  | 'collision'
  | 'overshoot'
  | 'missing_mandatory'
  | 'crash_before_airport'
  | 'brake_fail'
  | 'incomplete_landing';

export type SkyTeamWinReason = 'landed';

export interface ApproachSpaceDef {
  /** Stable index in scenario track (0 = start). */
  index: number;
  base: ApproachBase;
  /** Printed traffic icons on this space at setup. */
  traffic: number;
}

export interface ApproachScenario {
  id: string;
  name: string;
  spaces: ApproachSpaceDef[];
}

export interface AltitudeStepDef {
  feet: number;
  /** Who places the first die this round. */
  firstPlayer: SkyTeamRole;
  /** Whether this altitude grants a reroll token when the round starts. */
  grantsReroll: boolean;
  /** True for the airplane / touchdown step. */
  isAirplane: boolean;
}

export interface SkyTeamDie {
  id: string;
  color: SkyTeamDieColor;
  value: number;
  /** Still behind the player's screen (not yet placed). */
  inHand: boolean;
}

export interface SkyTeamPlacedDie {
  dieId: string;
  slotId: SkyTeamSlotId;
  color: SkyTeamDieColor;
  /** Final value after coffee mods. */
  value: number;
  ownerId: string;
}

export interface SkyTeamSwitchState {
  gear12: boolean;
  gear34: boolean;
  gear56: boolean;
  flaps12: boolean;
  flaps23: boolean;
  flaps34: boolean;
  flaps45: boolean;
  brake2: boolean;
  brake4: boolean;
  brake6: boolean;
}

export interface SkyTeamLobbyOptions {
  /** Strategy discussion duration in seconds (30–180). */
  strategySeconds: number;
  scenarioId: string;
}

export interface SkyTeamPlayerSeat {
  id: string;
  name: string;
  role: SkyTeamRole;
}

export interface SkyTeamApproachSpaceState {
  index: number;
  base: ApproachBase;
  planes: number;
}

export interface SkyTeamRerollPending {
  initiatedBy: string;
  /** Die ids each player selected to reroll; null until confirmed. */
  pilotDieIds: string[] | null;
  copilotDieIds: string[] | null;
}

export interface SkyTeamState {
  phase: SkyTeamPhase;
  round: number;
  players: SkyTeamPlayerSeat[];
  pilotId: string;
  copilotId: string;
  scenarioId: string;
  approach: SkyTeamApproachSpaceState[];
  /** Index into approach — current position. */
  approachPosition: number;
  /** Index into ALTITUDE_TRACK. */
  altitudeIndex: number;
  /** Axis tilt: negative = copilot side, positive = pilot side. Lose at |axis| >= AXIS_SPIN_THRESHOLD. */
  axisPosition: number;
  /** Highest speed that still stops (advance 0). Starts at 4. */
  blueAerodynamic: number;
  /** Highest speed that still advances 1. Starts at 8. */
  orangeAerodynamic: number;
  /** Brake strength for final comparison. 0 = left of 2. */
  brakeLevel: number;
  switches: SkyTeamSwitchState;
  coffeeTokens: number;
  rerollTokens: number;
  dice: SkyTeamDie[];
  placedDice: SkyTeamPlacedDie[];
  currentPlayerId: string | null;
  strategyReady: Record<string, boolean>;
  strategyEndsAtMs: number | null;
  strategyDurationMs: number;
  rerollPending: SkyTeamRerollPending | null;
  /** Last engine speed computed this round (null if engines incomplete). */
  lastSpeed: number | null;
  loseReason: SkyTeamLoseReason | null;
  winReason: SkyTeamWinReason | null;
  result: GameResult | null;
  eventLog: string[];
}

export interface SkyTeamSlotView {
  id: SkyTeamSlotId;
  occupied: SkyTeamPlacedDie | null;
  /** Whether the viewing player may place here right now. */
  canPlace: boolean;
}

export interface SkyTeamPlayerView {
  phase: SkyTeamPhase;
  round: number;
  myId: string;
  myRole: SkyTeamRole;
  pilotId: string;
  copilotId: string;
  players: SkyTeamPlayerSeat[];
  scenarioId: string;
  scenarioName: string;
  approach: SkyTeamApproachSpaceState[];
  approachPosition: number;
  altitudeFeet: number;
  altitudeIndex: number;
  isAirplaneAltitude: boolean;
  firstPlayerRole: SkyTeamRole;
  axisPosition: number;
  blueAerodynamic: number;
  orangeAerodynamic: number;
  brakeLevel: number;
  switches: SkyTeamSwitchState;
  coffeeTokens: number;
  rerollTokens: number;
  /** Only the viewer's unplaced dice. */
  myDice: SkyTeamDie[];
  placedDice: SkyTeamPlacedDie[];
  currentPlayerId: string | null;
  isMyTurn: boolean;
  strategyReady: Record<string, boolean>;
  strategyEndsAtMs: number | null;
  rerollPending: SkyTeamRerollPending | null;
  lastSpeed: number | null;
  isFinalRound: boolean;
  atAirport: boolean;
  slots: SkyTeamSlotView[];
  loseReason: SkyTeamLoseReason | null;
  winReason: SkyTeamWinReason | null;
  gameResult?: GameResult;
  eventLog: string[];
  silentPhase: boolean;
}

export type SkyTeamAction =
  | { type: 'finish-strategy' }
  | {
      type: 'place-die';
      dieId: string;
      slotId: SkyTeamSlotId;
      /** Each entry spends one coffee: +1 or -1. Final value must stay in 1–6. */
      coffeeMods?: Array<1 | -1>;
    }
  | { type: 'use-reroll' }
  | { type: 'confirm-reroll'; dieIds: string[] };

/** Axis spin threshold — reaching this magnitude loses. */
export const AXIS_SPIN_THRESHOLD = 3;

export const MAX_COFFEE_TOKENS = 3;

export const DEFAULT_STRATEGY_SECONDS = 90;

export const ALTITUDE_TRACK: readonly AltitudeStepDef[] = [
  { feet: 6000, firstPlayer: 'pilot', grantsReroll: true, isAirplane: false },
  { feet: 5000, firstPlayer: 'copilot', grantsReroll: false, isAirplane: false },
  { feet: 4000, firstPlayer: 'pilot', grantsReroll: false, isAirplane: false },
  { feet: 3000, firstPlayer: 'copilot', grantsReroll: true, isAirplane: false },
  { feet: 2000, firstPlayer: 'pilot', grantsReroll: false, isAirplane: false },
  { feet: 1000, firstPlayer: 'copilot', grantsReroll: false, isAirplane: false },
  { feet: 0, firstPlayer: 'pilot', grantsReroll: false, isAirplane: true },
] as const;

/**
 * YUL Montréal-Trudeau (basic / routine).
 * Traffic counts follow the printed approach strip; tweak if needed.
 */
export const YUL_APPROACH_SCENARIO: ApproachScenario = {
  id: 'yul',
  name: 'YUL Montréal-Trudeau',
  spaces: [
    { index: 0, base: 'cloud', traffic: 0 },
    { index: 1, base: 'cloud', traffic: 1 },
    { index: 2, base: 'cloud', traffic: 2 },
    { index: 3, base: 'cloud', traffic: 1 },
    { index: 4, base: 'cloud', traffic: 1 },
    { index: 5, base: 'cloud', traffic: 2 },
    { index: 6, base: 'airport', traffic: 0 },
  ],
};

export const APPROACH_SCENARIOS: Record<string, ApproachScenario> = {
  yul: YUL_APPROACH_SCENARIO,
};

export const SKY_TEAM_SLOT_DEFS: Record<
  SkyTeamSlotId,
  {
    section:
      | 'axis'
      | 'engine'
      | 'radio'
      | 'gear'
      | 'flaps'
      | 'brake'
      | 'concentration';
    roles: SkyTeamRole[] | 'any';
    allowedValues: number[] | 'any';
    mandatory?: boolean;
  }
> = {
  axis_pilot: { section: 'axis', roles: ['pilot'], allowedValues: 'any', mandatory: true },
  axis_copilot: { section: 'axis', roles: ['copilot'], allowedValues: 'any', mandatory: true },
  engine_pilot: { section: 'engine', roles: ['pilot'], allowedValues: 'any', mandatory: true },
  engine_copilot: { section: 'engine', roles: ['copilot'], allowedValues: 'any', mandatory: true },
  radio_pilot: { section: 'radio', roles: ['pilot'], allowedValues: 'any' },
  radio_copilot_1: { section: 'radio', roles: ['copilot'], allowedValues: 'any' },
  radio_copilot_2: { section: 'radio', roles: ['copilot'], allowedValues: 'any' },
  gear_12: { section: 'gear', roles: ['pilot'], allowedValues: [1, 2] },
  gear_34: { section: 'gear', roles: ['pilot'], allowedValues: [3, 4] },
  gear_56: { section: 'gear', roles: ['pilot'], allowedValues: [5, 6] },
  flaps_12: { section: 'flaps', roles: ['copilot'], allowedValues: [1, 2] },
  flaps_23: { section: 'flaps', roles: ['copilot'], allowedValues: [2, 3] },
  flaps_34: { section: 'flaps', roles: ['copilot'], allowedValues: [3, 4] },
  flaps_45: { section: 'flaps', roles: ['copilot'], allowedValues: [4, 5] },
  brake_2: { section: 'brake', roles: ['pilot'], allowedValues: [2] },
  brake_4: { section: 'brake', roles: ['pilot'], allowedValues: [4] },
  brake_6: { section: 'brake', roles: ['pilot'], allowedValues: [6] },
  concentration_1: { section: 'concentration', roles: 'any', allowedValues: 'any' },
  concentration_2: { section: 'concentration', roles: 'any', allowedValues: 'any' },
  concentration_3: { section: 'concentration', roles: 'any', allowedValues: 'any' },
};

export function defaultSkyTeamLobbyOptions(): SkyTeamLobbyOptions {
  return { strategySeconds: DEFAULT_STRATEGY_SECONDS, scenarioId: 'yul' };
}

export function parseSkyTeamLobbyOptions(raw: unknown): SkyTeamLobbyOptions {
  const defaults = defaultSkyTeamLobbyOptions();
  if (!raw || typeof raw !== 'object') return defaults;
  const o = raw as Record<string, unknown>;
  let strategySeconds = defaults.strategySeconds;
  if (typeof o.strategySeconds === 'number' && Number.isFinite(o.strategySeconds)) {
    strategySeconds = Math.min(180, Math.max(30, Math.round(o.strategySeconds)));
  }
  const scenarioId =
    typeof o.scenarioId === 'string' && APPROACH_SCENARIOS[o.scenarioId]
      ? o.scenarioId
      : defaults.scenarioId;
  return { strategySeconds, scenarioId };
}

export function getApproachScenario(scenarioId: string): ApproachScenario {
  return APPROACH_SCENARIOS[scenarioId] ?? YUL_APPROACH_SCENARIO;
}

export function getAltitudeStep(index: number): AltitudeStepDef {
  const clamped = Math.min(Math.max(0, index), ALTITUDE_TRACK.length - 1);
  return ALTITUDE_TRACK[clamped]!;
}
