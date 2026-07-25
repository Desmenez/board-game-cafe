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
  | 'concentration_3'
  /** Kerosene module action space (any role, values 1–6). */
  | 'kerosene'
  /** Intern module training spaces (role-colored). */
  | 'intern_pilot'
  | 'intern_copilot'
  /** Ice Brakes module (replaces normal brakes). */
  | 'ice_brake_pilot_2'
  | 'ice_brake_pilot_3'
  | 'ice_brake_pilot_4'
  | 'ice_brake_pilot_5'
  | 'ice_brake_copilot_2'
  | 'ice_brake_copilot_3'
  | 'ice_brake_copilot_4'
  | 'ice_brake_copilot_5';

export type SkyTeamLoseReason =
  | 'axis_spin'
  | 'collision'
  | 'overshoot'
  | 'missing_mandatory'
  | 'crash_before_airport'
  | 'brake_fail'
  | 'incomplete_landing'
  | 'kerosene_empty'
  | 'turn_constraint'
  | 'intern_untrained'
  | 'ice_brakes_incomplete';

export type SkyTeamWinReason = 'landed';

export interface ApproachSpaceDef {
  /** Stable index in scenario track (0 = start). */
  index: number;
  base: ApproachBase;
  /** Printed airplane traffic icons on this space at setup. */
  traffic: number;
  /**
   * Traffic Die module: how many times to roll when stopping on this space.
   * Undefined / 0 = no Traffic Die rolls.
   */
  trafficDieRolls?: number;
  /**
   * Turns module: axis positions allowed when advancing through/onto this space.
   * Axis uses the same signed scale as `axisPosition` (e.g. -2..2).
   */
  allowedAxisPositions?: number[];
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
  /** `'intern'` = placed Intern token (extra placement, no coffee). */
  source?: 'die' | 'intern';
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
  /** Approach track data id (V1: always yul — not a scenario picker product). */
  scenarioId: string;
  /** Expansion modules enabled for this match. */
  enabledModules: SkyTeamModuleId[];
  /** Shared special abilities (0–MAX_SPECIAL_ABILITIES). */
  selectedSpecialAbilityIds: SkyTeamSpecialAbilityId[];
}

export interface SkyTeamPlayerSeat {
  id: string;
  name: string;
  role: SkyTeamRole;
}

export interface SkyTeamApproachSpaceState {
  index: number;
  base: ApproachBase;
  /** Current airplane tokens on this space (can change via Radio / Traffic Die). */
  planes: number;
  /**
   * Printed setup icons on the approach card (fixed for the match).
   * From scenario `traffic` — never changes when tokens are added/removed.
   */
  printedPlanes: number;
  /** From scenario — used when Traffic Die module is enabled. */
  trafficDieRolls?: number;
  /** From scenario — used when Turns module is enabled. */
  allowedAxisPositions?: number[];
}

export interface SkyTeamRerollPending {
  initiatedBy: string;
  /** Die ids each player selected to reroll; null until confirmed. */
  pilotDieIds: string[] | null;
  copilotDieIds: string[] | null;
}

/* ------------------------------------------------------------------ */
/* Expansion modules + special abilities (Milestone 1+)               */
/* ------------------------------------------------------------------ */

export type SkyTeamModuleId =
  | 'traffic-die'
  | 'turns'
  | 'kerosene'
  | 'intern'
  | 'wind'
  | 'real-time'
  | 'kerosene-leak'
  | 'ice-brakes';

export type SkyTeamSpecialAbilityId =
  | 'engine-synchronisation'
  | 'landing-gear-flaps-extra-action';

export type SkyTeamSpecialAbilityTiming =
  | 'passive'
  | 'on-die-placed'
  | 'after-axis'
  | 'after-engines'
  | 'once-per-round'
  | 'once-per-game';

export const MAX_SPECIAL_ABILITIES = 3;

export const SKY_TEAM_MODULE_IDS: readonly SkyTeamModuleId[] = [
  'traffic-die',
  'turns',
  'kerosene',
  'intern',
  'wind',
  'real-time',
  'kerosene-leak',
  'ice-brakes',
] as const;

export const SKY_TEAM_SPECIAL_ABILITY_IDS: readonly SkyTeamSpecialAbilityId[] = [
  'engine-synchronisation',
  'landing-gear-flaps-extra-action',
] as const;

export interface SkyTeamModuleMeta {
  id: SkyTeamModuleId;
  name: string;
  description: string;
}

export const SKY_TEAM_MODULE_META: Record<SkyTeamModuleId, SkyTeamModuleMeta> = {
  'traffic-die': {
    id: 'traffic-die',
    name: 'Traffic Die',
    description: 'Roll traffic dice at the start of rounds when stopped on a traffic icon.',
  },
  turns: {
    id: 'turns',
    name: 'Turns',
    description: 'Approach spaces may require specific axis positions while advancing.',
  },
  kerosene: {
    id: 'kerosene',
    name: 'Kerosene',
    description: 'Manage fuel by spending a die — or lose 6 fuel if unused at end of round.',
  },
  intern: {
    id: 'intern',
    name: 'Intern',
    description: 'Train interns for extra placements. Leftover tokens lose the game.',
  },
  wind: {
    id: 'wind',
    name: 'Wind',
    description: 'Axis tilt shifts the wind ring, modifying engine totals.',
  },
  'real-time': {
    id: 'real-time',
    name: 'Real-Time',
    description: '60-second placement timer after dice are rolled each round.',
  },
  'kerosene-leak': {
    id: 'kerosene-leak',
    name: 'Kerosene Leak',
    description: 'Fuel loss equals |pilot engine − co-pilot engine| + 1 after both engines are placed.',
  },
  'ice-brakes': {
    id: 'ice-brakes',
    name: 'Ice Brakes',
    description: 'Replace standard brakes with paired ice-brake levels (pilot + co-pilot).',
  },
};

export interface SkyTeamSpecialAbilityDefinition {
  id: SkyTeamSpecialAbilityId;
  name: string;
  description: string;
  timing: SkyTeamSpecialAbilityTiming;
}

export const SKY_TEAM_SPECIAL_ABILITY_DEFS: Record<
  SkyTeamSpecialAbilityId,
  SkyTeamSpecialAbilityDefinition
> = {
  'engine-synchronisation': {
    id: 'engine-synchronisation',
    name: 'Engine Synchronisation',
    description: 'When both engine dice match, gain one Reroll token (if any remain in supply).',
    timing: 'after-engines',
  },
  'landing-gear-flaps-extra-action': {
    id: 'landing-gear-flaps-extra-action',
    // TODO: rename when official ability title/asset is confirmed
    name: 'Landing Gear + Flaps Extra Action',
    description:
      'Once per round, after placing on Landing Gear and Flaps, roll a Traffic Die for an extra unrestricted-color action.',
    timing: 'once-per-round',
  },
};

export interface SkyTeamSpecialAbilityRuntimeState {
  usedThisRound: boolean;
  usedThisGame: boolean;
  usesRemaining?: number;
}

export interface SkyTeamTrafficDieState {
  remainingAirplaneTokens: number;
  lastRolls: number[];
}

export interface SkyTeamTurnsState {
  enabled: true;
}

export interface SkyTeamKeroseneState {
  remaining: number;
  diePlacedThisRound: boolean;
}

export interface SkyTeamInternToken {
  id: string;
  value: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface SkyTeamInternState {
  /**
   * Fixed Intern board wells left → right (length 6).
   * `null` = empty well after a token was taken.
   */
  wells: Array<SkyTeamInternToken | null>;
  pendingToken?: {
    ownerId: string;
    tokenId: string;
    value: 1 | 2 | 3 | 4 | 5 | 6;
  };
}

export interface SkyTeamWindState {
  /** Steps clockwise from setup `0` (wraps on the 20-space ring). */
  position: number;
  /** Printed wind speed the nose currently points at. */
  modifier: number;
}

/**
 * Printed Wind ring, clockwise from setup `0` back to itself (20 spaces).
 * 0, +1, +2, +2, +3, +3, +3, +2, +2, +1, 0, −1, −2, −2, −3, −3, −3, −2, −2, −1
 */
export const WIND_RING_VALUES = [
  0, 1, 2, 2, 3, 3, 3, 2, 2, 1, 0, -1, -2, -2, -3, -3, -3, -2, -2, -1,
] as const;

export const WIND_RING_SIZE = WIND_RING_VALUES.length; // 20
export const WIND_MIN_POSITION = 0;
export const WIND_MAX_POSITION = WIND_RING_SIZE - 1; // 19

/** Normalize any step count onto the ring (0 … 19). */
export function skyTeamWindWrapPosition(position: number): number {
  return ((position % WIND_RING_SIZE) + WIND_RING_SIZE) % WIND_RING_SIZE;
}

export function skyTeamWindModifier(position: number): number {
  return WIND_RING_VALUES[skyTeamWindWrapPosition(position)]!;
}

export interface SkyTeamRealtimeState {
  deadlineAt: number | null;
  durationSeconds: number;
}

export interface SkyTeamKeroseneLeakState {
  remaining: number;
  /** True after leak spend for the current round. */
  spentThisRound?: boolean;
}

export interface SkyTeamIceBrakesState {
  /**
   * Marker steps past the start.
   * 0 = left of 2, 1 = past 2, 2 = past 3, 3 = past 4, 4 = past 5 (fully deployed).
   */
  markerPosition: number;
}

/** Ice Brakes levels in order (must complete left → right). */
export const ICE_BRAKE_LEVELS = [2, 3, 4, 5] as const;
export type IceBrakeLevel = (typeof ICE_BRAKE_LEVELS)[number];

export const ICE_BRAKE_MARKER_MAX = ICE_BRAKE_LEVELS.length; // 4 = past 5

/** Brake strength for landing / final-round checks after Ice Brakes advances. */
export function iceBrakesBrakeLevel(markerPosition: number): number {
  if (markerPosition <= 0) return 0;
  if (markerPosition >= ICE_BRAKE_MARKER_MAX) return 5; // past printed 5
  return ICE_BRAKE_LEVELS[markerPosition - 1]!;
}

export function iceBrakePilotSlot(level: IceBrakeLevel): SkyTeamSlotId {
  return `ice_brake_pilot_${level}` as SkyTeamSlotId;
}

export function iceBrakeCopilotSlot(level: IceBrakeLevel): SkyTeamSlotId {
  return `ice_brake_copilot_${level}` as SkyTeamSlotId;
}

export function parseIceBrakeSlot(
  slotId: SkyTeamSlotId,
): { role: SkyTeamRole; level: IceBrakeLevel } | null {
  const m = /^ice_brake_(pilot|copilot)_([2345])$/.exec(slotId);
  if (!m) return null;
  return {
    role: m[1] as SkyTeamRole,
    level: Number(m[2]) as IceBrakeLevel,
  };
}

export interface SkyTeamModuleState {
  trafficDie?: SkyTeamTrafficDieState;
  turns?: SkyTeamTurnsState;
  kerosene?: SkyTeamKeroseneState;
  intern?: SkyTeamInternState;
  wind?: SkyTeamWindState;
  realtime?: SkyTeamRealtimeState;
  keroseneLeak?: SkyTeamKeroseneLeakState;
  iceBrakes?: SkyTeamIceBrakesState;
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
  /** Modules enabled for this match (from lobby). */
  enabledModules: SkyTeamModuleId[];
  selectedSpecialAbilityIds: SkyTeamSpecialAbilityId[];
  /** Only keys for enabled modules are present. */
  moduleState: SkyTeamModuleState;
  /** Runtime flags for selected special abilities. */
  specialAbilityState: Partial<
    Record<SkyTeamSpecialAbilityId, SkyTeamSpecialAbilityRuntimeState>
  >;
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
  enabledModules: SkyTeamModuleId[];
  selectedSpecialAbilityIds: SkyTeamSpecialAbilityId[];
  /** Public module state for enabled modules only. */
  moduleState: SkyTeamModuleState;
  specialAbilityState: Partial<
    Record<SkyTeamSpecialAbilityId, SkyTeamSpecialAbilityRuntimeState>
  >;
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
  | {
      /** Place a pending Intern token on a main-board slot (no coffee). */
      type: 'place-intern-token';
      slotId: SkyTeamSlotId;
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
    {
      index: 1,
      base: 'cloud',
      traffic: 1,
      trafficDieRolls: 1,
      allowedAxisPositions: [-1, 0, 1],
    },
    {
      index: 2,
      base: 'cloud',
      traffic: 2,
      trafficDieRolls: 2,
      allowedAxisPositions: [-2, -1, 0, 1, 2],
    },
    {
      index: 3,
      base: 'cloud',
      traffic: 1,
      trafficDieRolls: 1,
      allowedAxisPositions: [0],
    },
    {
      index: 4,
      base: 'cloud',
      traffic: 1,
      trafficDieRolls: 1,
      allowedAxisPositions: [-1, 0, 1],
    },
    {
      index: 5,
      base: 'cloud',
      traffic: 2,
      trafficDieRolls: 1,
      allowedAxisPositions: [-2, -1, 0, 1, 2],
    },
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
      | 'concentration'
      | 'kerosene'
      | 'intern'
      | 'ice-brakes';
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
  kerosene: { section: 'kerosene', roles: 'any', allowedValues: 'any' },
  intern_pilot: { section: 'intern', roles: ['pilot'], allowedValues: 'any' },
  intern_copilot: { section: 'intern', roles: ['copilot'], allowedValues: 'any' },
  ice_brake_pilot_2: { section: 'ice-brakes', roles: ['pilot'], allowedValues: [2] },
  ice_brake_pilot_3: { section: 'ice-brakes', roles: ['pilot'], allowedValues: [3] },
  ice_brake_pilot_4: { section: 'ice-brakes', roles: ['pilot'], allowedValues: [4] },
  ice_brake_pilot_5: { section: 'ice-brakes', roles: ['pilot'], allowedValues: [5] },
  ice_brake_copilot_2: { section: 'ice-brakes', roles: ['copilot'], allowedValues: [2] },
  ice_brake_copilot_3: { section: 'ice-brakes', roles: ['copilot'], allowedValues: [3] },
  ice_brake_copilot_4: { section: 'ice-brakes', roles: ['copilot'], allowedValues: [4] },
  ice_brake_copilot_5: { section: 'ice-brakes', roles: ['copilot'], allowedValues: [5] },
};

export function defaultSkyTeamLobbyOptions(): SkyTeamLobbyOptions {
  return {
    strategySeconds: DEFAULT_STRATEGY_SECONDS,
    scenarioId: 'yul',
    enabledModules: [],
    selectedSpecialAbilityIds: [],
  };
}

function isSkyTeamModuleId(v: unknown): v is SkyTeamModuleId {
  return typeof v === 'string' && (SKY_TEAM_MODULE_IDS as readonly string[]).includes(v);
}

function isSkyTeamSpecialAbilityId(v: unknown): v is SkyTeamSpecialAbilityId {
  return (
    typeof v === 'string' && (SKY_TEAM_SPECIAL_ABILITY_IDS as readonly string[]).includes(v)
  );
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

  const enabledModules: SkyTeamModuleId[] = [];
  if (Array.isArray(o.enabledModules)) {
    for (const id of o.enabledModules) {
      if (isSkyTeamModuleId(id) && !enabledModules.includes(id)) enabledModules.push(id);
    }
  }

  const selectedSpecialAbilityIds: SkyTeamSpecialAbilityId[] = [];
  if (Array.isArray(o.selectedSpecialAbilityIds)) {
    for (const id of o.selectedSpecialAbilityIds) {
      if (isSkyTeamSpecialAbilityId(id) && !selectedSpecialAbilityIds.includes(id)) {
        selectedSpecialAbilityIds.push(id);
      }
    }
  }

  return { strategySeconds, scenarioId, enabledModules, selectedSpecialAbilityIds };
}

/** Human-readable blockers for lobby start / setup. Empty = valid. */
export function getSkyTeamLobbyValidationErrors(opts: SkyTeamLobbyOptions): string[] {
  const errors: string[] = [];
  if (opts.selectedSpecialAbilityIds.length > MAX_SPECIAL_ABILITIES) {
    errors.push(`เลือก Special Ability ได้สูงสุด ${MAX_SPECIAL_ABILITIES} ใบ`);
  }
  if (
    opts.enabledModules.includes('kerosene') &&
    opts.enabledModules.includes('kerosene-leak')
  ) {
    errors.push('Kerosene และ Kerosene Leak เปิดพร้อมกันไม่ได้');
  }
  return errors;
}

export function isSkyTeamLobbyOptionsValid(opts: SkyTeamLobbyOptions): boolean {
  return getSkyTeamLobbyValidationErrors(opts).length === 0;
}

export function skyTeamHasModule(
  enabledModules: readonly SkyTeamModuleId[],
  id: SkyTeamModuleId,
): boolean {
  return enabledModules.includes(id);
}

export function getApproachScenario(scenarioId: string): ApproachScenario {
  return APPROACH_SCENARIOS[scenarioId] ?? YUL_APPROACH_SCENARIO;
}

export function getAltitudeStep(index: number): AltitudeStepDef {
  const clamped = Math.min(Math.max(0, index), ALTITUDE_TRACK.length - 1);
  return ALTITUDE_TRACK[clamped]!;
}
