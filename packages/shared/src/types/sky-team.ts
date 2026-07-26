import type { GameResult } from './game.js';

export const SKY_TEAM_CLOUD_VERSION = 'v1784823300';

export type SkyTeamPhase = 'strategy' | 'dice_roll' | 'dice_placement' | 'end_round' | 'game_over';

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
  | 'ice_brake_copilot_5'
  /** Working Together skill wells (temporary; dice return after swap). */
  | 'skill_wt_pilot'
  | 'skill_wt_copilot';

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
  /**
   * `'intern'` = Intern token · `'ability'` = Synchronisation Traffic die ·
   * `'skill'` = temporary Working Together park.
   * Default / omit = normal player die.
   */
  source?: 'die' | 'intern' | 'ability' | 'skill';
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
  /**
   * Airport / airline scenario id.
   * Modules are derived from the scenario (not picked in lobby).
   * Special abilities are dual-picked when `scenario.specialAbilitySlots > 0`.
   */
  scenarioId: string;
  /** Derived from scenario — kept on lobby options for engine/setup convenience. */
  enabledModules: SkyTeamModuleId[];
  /**
   * Resolved abilities for setup. Empty in lobby; filled at start from agreed dual picks
   * (or from scenario.specialAbilityIds when slots are pre-assigned — currently unused).
   */
  selectedSpecialAbilityIds: SkyTeamSpecialAbilityId[];
  /** Per-player draft picks while waiting (both must match before start). */
  specialAbilityPicksByPlayerId: Record<string, SkyTeamSpecialAbilityId[]>;
  /**
   * Host opened the pre-start Special Ability modal — synced so both players see it.
   * Cleared on scenario change / cancel / successful start.
   */
  abilityPickOpen: boolean;
  /** Who becomes Pilot at game start. */
  pilotMode: 'random' | 'manual';
  /** Required when `pilotMode === 'manual'` — player id of the Pilot. */
  pilotPlayerId?: string;
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
  | 'working-together'
  | 'synchronisation'
  | 'mastery'
  | 'control'
  | 'anticipation'
  | 'adaptation';

export type SkyTeamSpecialAbilityTiming =
  | 'passive'
  | 'on-die-placed'
  | 'after-axis'
  | 'after-engines'
  | 'once-per-round'
  | 'once-per-game'
  | 'before-first-die';

/**
 * Full match scenario: approach track + expansion modules / special abilities.
 * Lobby picks a scenario only — modules are not chosen separately.
 */
export type SkyTeamScenarioTier = 'green' | 'yellow' | 'red';

export interface SkyTeamScenarioDefinition extends ApproachScenario {
  /** IATA / strip code (e.g. YUL). */
  code: string;
  /** Airport name without code, e.g. "Montréal-Trudeau". */
  shortName: string;
  /** Flavor blurb on the scenario card (printed text). */
  blurb: string;
  /** ISO 3166-1 alpha-2 country code (lowercase), e.g. "ca". */
  countryCode: string;
  tier: SkyTeamScenarioTier;
  /** Printed difficulty band, e.g. "Routine Landing". */
  tierLabel: string;
  modules: readonly SkyTeamModuleId[];
  /**
   * Star on the scenario card: how many Special Ability cards players may bring.
   * `specialAbilityIds` is the concrete pick (empty until lobby selection exists).
   */
  specialAbilitySlots: number;
  specialAbilityIds: readonly SkyTeamSpecialAbilityId[];
}

export const MAX_SPECIAL_ABILITIES = 3;

/** Soft supply cap for Mastery / altitude Reroll tokens. */
export const MAX_REROLL_TOKENS = 4;

/** Traffic die faces for Synchronisation (no 1 or 6). */
export const ABILITY_TRAFFIC_DIE_FACES = [2, 3, 3, 4, 4, 5] as const;

/** Map legacy lobby ids → current ability ids. */
export const SKY_TEAM_LEGACY_SPECIAL_ABILITY_IDS: Record<string, SkyTeamSpecialAbilityId> = {
  'engine-synchronisation': 'mastery',
  'landing-gear-flaps-extra-action': 'synchronisation',
};

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
  'working-together',
  'synchronisation',
  'mastery',
  'control',
  'anticipation',
  'adaptation',
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
    description:
      'Fuel loss equals |pilot engine − co-pilot engine| + 1 after both engines are placed.',
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
  'working-together': {
    id: 'working-together',
    name: 'Working Together',
    description:
      'Once per round, at any time, a player may place one of their dice onto this Skill. The other player MUST also place one of their dice on this skill (if they have one available). The players swap the values of the 2 dice, then take them back.',
    timing: 'once-per-round',
  },
  synchronisation: {
    id: 'synchronisation',
    name: 'Synchronisation',
    description:
      'If you have placed at least one die on Landing Gear, and one die on Flaps, immediately roll the Traffic die. Place it on any empty space on the Control Panel regardless of its colour. Apply the effect of the Traffic die as if it were a normal die. It counts as an extra action for this turn.',
    timing: 'once-per-round',
  },
  mastery: {
    id: 'mastery',
    name: 'Mastery',
    description:
      'If you play 2 dice with the same value on the ENGINES, immediately gain a Reroll token (only if a token is available).',
    timing: 'after-engines',
  },
  control: {
    id: 'control',
    name: 'Control',
    description:
      'If you play 2 dice of the same value on the AXIS, immediately gain a Coffee token.',
    timing: 'after-axis',
  },
  anticipation: {
    id: 'anticipation',
    name: 'Anticipation',
    description:
      'Each round, before placing their 1st die, the First Player may choose to reroll one of their dice.',
    timing: 'before-first-die',
  },
  adaptation: {
    id: 'adaptation',
    name: 'Adaptation',
    description:
      'Once per game, each player can turn one of their unplayed dice to its opposite side.',
    timing: 'once-per-game',
  },
};

export interface SkyTeamSpecialAbilityRuntimeState {
  usedThisRound: boolean;
  usedThisGame: boolean;
  usesRemaining?: number;
  /** Adaptation: player ids who already used their once-per-game flip. */
  usedByPlayerIds?: string[];
  /** Synchronisation: Traffic-die value waiting for Co-Pilot to place. */
  pendingValue?: number;
  /** Working Together: waiting for partner die after initiator parked one. */
  workingTogether?: {
    initiatorId: string;
    initiatorDieId: string;
  };
  /** Anticipation: First Player may still reroll before their first place this round. */
  anticipationOpen?: boolean;
}

export interface SkyTeamTrafficDieState {
  /** Airplane tokens left in the Traffic Die supply (starts at 12). */
  remainingAirplaneTokens: number;
  lastRolls: number[];
}

/** Physical Traffic Die airplane-token supply. */
export const SKY_TEAM_TRAFFIC_DIE_AIRPLANE_SUPPLY = 12;

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
  /** Always null — Strategy has no timer (official rules: discuss until both ready). */
  strategyEndsAtMs: number | null;
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
  specialAbilityState: Partial<Record<SkyTeamSpecialAbilityId, SkyTeamSpecialAbilityRuntimeState>>;
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
  /** Difficulty band for the approach track (green / yellow / red). */
  scenarioTier: SkyTeamScenarioTier;
  scenarioTierLabel: string;
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
  /** Always null — Strategy has no timer (discuss until both ready). */
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
  specialAbilityState: Partial<Record<SkyTeamSpecialAbilityId, SkyTeamSpecialAbilityRuntimeState>>;
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
  | {
      /** Place Synchronisation Traffic die (Co-Pilot; coffee allowed; ignore colour). */
      type: 'place-ability-die';
      slotId: SkyTeamSlotId;
      coffeeMods?: Array<1 | -1>;
    }
  | {
      /** Anticipation: First Player rerolls one of their dice before first place. */
      type: 'anticipation-reroll';
      dieId: string;
    }
  | {
      /** Adaptation: flip one unplayed die to its opposite face (once per game per player). */
      type: 'adaptation-flip';
      dieId: string;
    }
  | { type: 'use-reroll' }
  | { type: 'confirm-reroll'; dieIds: string[] }
  | { type: 'cancel-reroll' };

/** Axis spin threshold — reaching this magnitude loses. */
export const AXIS_SPIN_THRESHOLD = 3;

export const MAX_COFFEE_TOKENS = 3;

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
 * YUL Montréal-Trudeau — Green / Routine Landing.
 * Approach traffic from the printed strip (start at bottom → airport at top).
 * No expansion modules or special abilities.
 */
export const YUL_SCENARIO: SkyTeamScenarioDefinition = {
  id: 'yul',
  code: 'YUL',
  name: 'YUL Montréal-Trudeau',
  shortName: 'Montréal-Trudeau',
  blurb:
    'เที่ยวบินแรกของคุณเป็นไปอย่างราบรื่น ดวงอาทิตย์กำลังค่อยๆ โผล่พ้นขอบฟ้า เผยให้เห็นทิวทัศน์อันงดงามของผืนแผ่นดินที่ปกคลุมด้วยหิมะในขณะที่คุณกำลังร่อนผ่านแม่น้ำเซนต์ลอว์เรนซ์ ทุกอย่างลงตัวอย่างยิ่งสำหรับการแตะพื้นอย่างนุ่มนวล',
  countryCode: 'ca',
  tier: 'green',
  tierLabel: 'Routine Landing',
  modules: [],
  specialAbilitySlots: 0,
  specialAbilityIds: [],
  spaces: [
    { index: 0, base: 'cloud', traffic: 0 },
    {
      index: 1,
      base: 'sky',
      traffic: 0,
    },
    {
      index: 2,
      base: 'sky',
      traffic: 1,
    },
    {
      index: 3,
      base: 'sky',
      traffic: 2,
    },
    {
      index: 4,
      base: 'sky',
      traffic: 1,
    },
    {
      index: 5,
      base: 'sky',
      traffic: 3,
    },
    { index: 6, base: 'airport', traffic: 2 },
  ],
};

/**
 * LHR Heathrow — Green / Routine Landing.
 * Shorter strip (6 spaces). Traffic denser near the airport; Traffic Die icons
 * printed for when that module is enabled on a harder variant.
 */
export const LHR_SCENARIO: SkyTeamScenarioDefinition = {
  id: 'lhr',
  code: 'LHR',
  name: 'LHR Heathrow',
  shortName: 'Heathrow',
  blurb:
    'คุณมองเห็นแม่น้ำเทมส์ทอดตัวเป็นลำน้ำสีเข้ม ตัดผ่านแสงไฟอันระยิบระยับของลอนดอน ในขณะที่เข้าใกล้สนามบิน บรรยากาศน่านฟ้าปลายทางเริ่มมีความหนาแน่น... ตั้งสติให้มั่น แล้วพาเครื่องลงจอดอย่างปลอดภัย',
  countryCode: 'gb',
  tier: 'green',
  tierLabel: 'Routine Landing',
  modules: ['traffic-die'],
  specialAbilitySlots: 0,
  specialAbilityIds: [],
  spaces: [
    // Start (bottom of strip) → airport (top)
    { index: 0, base: 'cloud', traffic: 0, trafficDieRolls: 1 },
    { index: 1, base: 'sky', traffic: 1 },
    { index: 2, base: 'sky', traffic: 1, trafficDieRolls: 1 },
    { index: 3, base: 'sky', traffic: 2 },
    { index: 4, base: 'sky', traffic: 2, trafficDieRolls: 1 },
    { index: 5, base: 'airport', traffic: 2 },
  ],
};

/**
 * HND Haneda — Green / Routine Landing.
 * Longer strip (8 spaces). Wide left turn over Tokyo Bay (Turns) + Traffic Die
 * on the start cloud (2 dice).
 */
export const HND_SCENARIO: SkyTeamScenarioDefinition = {
  id: 'hnd',
  code: 'HND',
  name: 'HND Haneda',
  shortName: 'Haneda',
  blurb:
    'เคียงคู่ด้วยฉากหลังอันตระการตาของภูเขาไฟฟูจิ คุณต้องบังคับเครื่องให้เลี้ยวซ้ายเป็นวงกว้าง เพื่อนำเครื่องเข้าสู่เขตน่านฟ้าเหนืออ่าวโตเกียว และตั้งลำให้ตรงกับรันเวย์ที่ยื่นออกไปในผืนน้ำ',
  countryCode: 'jp',
  tier: 'green',
  tierLabel: 'Routine Landing',
  modules: ['traffic-die', 'turns'],
  specialAbilitySlots: 0,
  specialAbilityIds: [],
  spaces: [
    // Start (bottom of strip) → airport (top)
    { index: 0, base: 'cloud', traffic: 0, trafficDieRolls: 2 },
    { index: 1, base: 'sky', traffic: 1 },
    { index: 2, base: 'sky', traffic: 1, allowedAxisPositions: [-1, 0] },
    { index: 3, base: 'sky', traffic: 2 },
    { index: 4, base: 'sky', traffic: 1, allowedAxisPositions: [-2, -1] },
    { index: 5, base: 'sky', traffic: 0, allowedAxisPositions: [-2, -1, 0] },
    { index: 6, base: 'sky', traffic: 2 },
    { index: 7, base: 'airport', traffic: 1 },
  ],
};

/**
 * OSL Gardermoen — Green / Routine Landing.
 * 8 spaces; Traffic Die on start (2) + mid strip (1); Kerosene special module.
 */
export const OSL_SCENARIO: SkyTeamScenarioDefinition = {
  id: 'osl',
  code: 'OSL',
  name: 'OSL Gardermoen',
  shortName: 'Gardermoen',
  blurb:
    'คุณเริ่มลดระดับลงสู่กรุงออสโล โดยมีตัวเมืองตระหง่านอยู่ทางซ้ายมือ และแสงอาทิตย์สะท้อนทอประกายบนผิวน้ำ ของทะเลสาบเออเยเรินอันเรียวยาวทางขวามือ... คอยเฝ้ามองระดับน้ำมันเชื้อเพลิงไว้ให้ดี ขอให้ลงจอดได้อย่างปลอดภัยและมีความสุข!',
  countryCode: 'no',
  tier: 'green',
  tierLabel: 'Routine Landing',
  modules: ['traffic-die', 'kerosene'],
  specialAbilitySlots: 0,
  specialAbilityIds: [],
  spaces: [
    // Start (bottom of strip) → airport (top)
    { index: 0, base: 'cloud', traffic: 0, trafficDieRolls: 2 },
    { index: 1, base: 'sky', traffic: 0 },
    { index: 2, base: 'sky', traffic: 1 },
    { index: 3, base: 'sky', traffic: 0, trafficDieRolls: 1 },
    { index: 4, base: 'sky', traffic: 1 },
    { index: 5, base: 'sky', traffic: 1 },
    { index: 6, base: 'sky', traffic: 1 },
    { index: 7, base: 'airport', traffic: 0 },
  ],
};

/**
 * ATL Hartsfield-Jackson — Green / Routine Landing.
 * 8 spaces; heavy Traffic Die on start (4) + mid strip; Intern special module.
 */
export const ATL_SCENARIO: SkyTeamScenarioDefinition = {
  id: 'atl',
  code: 'ATL',
  name: 'ATL Hartsfield-Jackson',
  shortName: 'Hartsfield-Jackson',
  blurb:
    'เมื่อฝ่าทะลุกลุ่มเมฆออกมา คุณจะร่อนผ่านทิวเขาแอพพาลาเชียนและได้ยลโฉมเมืองแอตแลนตา... พร้อมกับน่านฟ้าที่แน่นขนัดไปด้วยการจราจร ยิ่งไปกว่านั้น คุณยังมีเด็กฝึกงานผู้แสนตื่นเต้นที่ต้องดูแลและฝึกฝนอยู่อีกด้วย',
  countryCode: 'us',
  tier: 'green',
  tierLabel: 'Routine Landing',
  modules: ['traffic-die', 'intern'],
  specialAbilitySlots: 0,
  specialAbilityIds: [],
  spaces: [
    // Start (bottom of strip) → airport (top)
    { index: 0, base: 'cloud', traffic: 0, trafficDieRolls: 4 },
    { index: 1, base: 'sky', traffic: 0 },
    { index: 2, base: 'sky', traffic: 0, trafficDieRolls: 1 },
    { index: 3, base: 'sky', traffic: 0 },
    { index: 4, base: 'sky', traffic: 1, trafficDieRolls: 1 },
    { index: 5, base: 'sky', traffic: 2, trafficDieRolls: 1 },
    { index: 6, base: 'sky', traffic: 1 },
    { index: 7, base: 'airport', traffic: 2 },
  ],
};

/**
 * PRG Václav Havel — Green / Routine Landing.
 * 8 spaces; Traffic Die + Turns on strip; Kerosene; 2 Special Ability slots.
 */
export const PRG_SCENARIO: SkyTeamScenarioDefinition = {
  id: 'prg',
  code: 'PRG',
  name: 'PRG Václav Havel',
  shortName: 'Václav Havel',
  blurb:
    'ฝีมือการบินของคุณพัฒนาขึ้นอย่างเห็นได้ชัด! จงใช้ความเชี่ยวชาญนี้พาเครื่องลงจอดอย่างปลอดภัย ณ กรุงปราก ศูนย์กลางทางวัฒนธรรมแห่งยุโรป... หัวใจแห่งโบฮีเมียโบราณ',
  countryCode: 'cz',
  tier: 'green',
  tierLabel: 'Routine Landing',
  modules: ['traffic-die', 'turns', 'kerosene'],
  specialAbilitySlots: 2,
  specialAbilityIds: [],
  spaces: [
    // Start (bottom of strip) → airport (top)
    { index: 0, base: 'cloud', traffic: 0, trafficDieRolls: 1 },
    { index: 1, base: 'sky', traffic: 0, allowedAxisPositions: [0, 1, 2] },
    { index: 2, base: 'sky', traffic: 1, trafficDieRolls: 1 },
    { index: 3, base: 'sky', traffic: 1, allowedAxisPositions: [1, 2] },
    { index: 4, base: 'sky', traffic: 0 },
    { index: 5, base: 'sky', traffic: 1, trafficDieRolls: 1 },
    { index: 6, base: 'sky', traffic: 1 },
    { index: 7, base: 'airport', traffic: 1 },
  ],
};

/** @deprecated Use YUL_SCENARIO */
export const YUL_APPROACH_SCENARIO = YUL_SCENARIO;

export const SKY_TEAM_SCENARIOS: Record<string, SkyTeamScenarioDefinition> = {
  yul: YUL_SCENARIO,
  lhr: LHR_SCENARIO,
  hnd: HND_SCENARIO,
  osl: OSL_SCENARIO,
  atl: ATL_SCENARIO,
  prg: PRG_SCENARIO,
};

/** @deprecated Use SKY_TEAM_SCENARIOS */
export const APPROACH_SCENARIOS = SKY_TEAM_SCENARIOS;

export const SKY_TEAM_SCENARIO_IDS = Object.keys(SKY_TEAM_SCENARIOS) as readonly string[];

export const SKY_TEAM_SCENARIOS_BY_TIER: Record<
  SkyTeamScenarioTier,
  readonly SkyTeamScenarioDefinition[]
> = {
  green: Object.values(SKY_TEAM_SCENARIOS).filter((s) => s.tier === 'green'),
  yellow: Object.values(SKY_TEAM_SCENARIOS).filter((s) => s.tier === 'yellow'),
  red: Object.values(SKY_TEAM_SCENARIOS).filter((s) => s.tier === 'red'),
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
      | 'ice-brakes'
      | 'skill';
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
  // Flaps printed values: 1/2, 2/3, 4/5, 5/6 (official Sky Team — not 3/4).
  flaps_12: { section: 'flaps', roles: ['copilot'], allowedValues: [1, 2] },
  flaps_23: { section: 'flaps', roles: ['copilot'], allowedValues: [2, 3] },
  flaps_34: { section: 'flaps', roles: ['copilot'], allowedValues: [4, 5] },
  flaps_45: { section: 'flaps', roles: ['copilot'], allowedValues: [5, 6] },
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
  skill_wt_pilot: { section: 'skill', roles: ['pilot'], allowedValues: 'any' },
  skill_wt_copilot: { section: 'skill', roles: ['copilot'], allowedValues: 'any' },
};

/** Gear / flaps / brake slot → persistent switch that stays ON across rounds. */
export const SKY_TEAM_SLOT_SWITCH: Partial<Record<SkyTeamSlotId, keyof SkyTeamSwitchState>> = {
  gear_12: 'gear12',
  gear_34: 'gear34',
  gear_56: 'gear56',
  flaps_12: 'flaps12',
  flaps_23: 'flaps23',
  flaps_34: 'flaps34',
  flaps_45: 'flaps45',
  brake_2: 'brake2',
  brake_4: 'brake4',
  brake_6: 'brake6',
};

/** True when this slot's switch is already green (placing again has no effect). */
export function skyTeamSwitchAlreadyOn(
  switches: SkyTeamSwitchState,
  slotId: SkyTeamSlotId,
): boolean {
  const key = SKY_TEAM_SLOT_SWITCH[slotId];
  return key != null && switches[key];
}

export function defaultSkyTeamLobbyOptions(): SkyTeamLobbyOptions {
  return lobbyOptionsFromScenario('yul', { pilotMode: 'random' });
}

/** Stable order for ability ids (canonical catalog order). */
export function sortSkyTeamAbilityIds(
  ids: readonly SkyTeamSpecialAbilityId[],
): SkyTeamSpecialAbilityId[] {
  const rank = new Map(SKY_TEAM_SPECIAL_ABILITY_IDS.map((id, i) => [id, i]));
  return [...ids].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
}

export function skyTeamAbilityPickKey(ids: readonly SkyTeamSpecialAbilityId[]): string {
  return sortSkyTeamAbilityIds(ids).join('|');
}

export function sanitizeSkyTeamAbilityIds(
  raw: unknown,
  maxSlots: number,
): SkyTeamSpecialAbilityId[] {
  if (!Array.isArray(raw) || maxSlots <= 0) return [];
  const seen = new Set<SkyTeamSpecialAbilityId>();
  const out: SkyTeamSpecialAbilityId[] = [];
  for (const id of raw) {
    if (typeof id !== 'string') continue;
    if (!(SKY_TEAM_SPECIAL_ABILITY_IDS as readonly string[]).includes(id)) continue;
    const aid = id as SkyTeamSpecialAbilityId;
    if (seen.has(aid)) continue;
    seen.add(aid);
    out.push(aid);
    if (out.length >= maxSlots) break;
  }
  return sortSkyTeamAbilityIds(out);
}

function sanitizeAbilityPicksByPlayer(
  raw: unknown,
  slots: number,
): Record<string, SkyTeamSpecialAbilityId[]> {
  if (slots <= 0 || !raw || typeof raw !== 'object') return {};
  const out: Record<string, SkyTeamSpecialAbilityId[]> = {};
  for (const [playerId, ids] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof playerId !== 'string' || playerId.trim() === '') continue;
    out[playerId] = sanitizeSkyTeamAbilityIds(ids, slots);
  }
  return out;
}

function lobbyOptionsFromScenario(
  scenarioId: string,
  pilot: Pick<SkyTeamLobbyOptions, 'pilotMode' | 'pilotPlayerId'>,
  picksByPlayerId: Record<string, SkyTeamSpecialAbilityId[]> = {},
  abilityPickOpen = false,
): SkyTeamLobbyOptions {
  const scenario = getSkyTeamScenario(scenarioId);
  const slots = scenario.specialAbilitySlots;
  return {
    scenarioId: scenario.id,
    enabledModules: [...scenario.modules],
    selectedSpecialAbilityIds: [],
    specialAbilityPicksByPlayerId:
      slots > 0 ? sanitizeAbilityPicksByPlayer(picksByPlayerId, slots) : {},
    abilityPickOpen: slots > 0 && abilityPickOpen,
    pilotMode: pilot.pilotMode,
    ...(pilot.pilotMode === 'manual' && pilot.pilotPlayerId
      ? { pilotPlayerId: pilot.pilotPlayerId }
      : {}),
  };
}

export function parseSkyTeamLobbyOptions(raw: unknown): SkyTeamLobbyOptions {
  const defaults = defaultSkyTeamLobbyOptions();
  if (!raw || typeof raw !== 'object') return defaults;
  const o = raw as Record<string, unknown>;
  const scenarioId =
    typeof o.scenarioId === 'string' && SKY_TEAM_SCENARIOS[o.scenarioId]
      ? o.scenarioId
      : defaults.scenarioId;

  const pilotMode = o.pilotMode === 'manual' ? 'manual' : 'random';
  const pilotPlayerId =
    pilotMode === 'manual' && typeof o.pilotPlayerId === 'string' && o.pilotPlayerId.trim() !== ''
      ? o.pilotPlayerId.trim()
      : undefined;

  // Modules always from scenario; dual ability drafts preserved (sanitized to slots).
  return lobbyOptionsFromScenario(
    scenarioId,
    { pilotMode, pilotPlayerId },
    (o.specialAbilityPicksByPlayerId as Record<string, SkyTeamSpecialAbilityId[]>) ?? {},
    o.abilityPickOpen === true,
  );
}

/**
 * Agreed ability set for the seated players, or [] if not ready.
 * Order is stable catalog order.
 */
export function resolveSkyTeamAgreedAbilityIds(
  opts: SkyTeamLobbyOptions,
  playerIds: readonly string[],
): SkyTeamSpecialAbilityId[] {
  const slots = getSkyTeamScenario(opts.scenarioId).specialAbilitySlots;
  if (slots <= 0) return [];
  if (playerIds.length < 2) return [];
  const [a, b] = playerIds;
  if (!a || !b) return [];
  const pickA = opts.specialAbilityPicksByPlayerId[a] ?? [];
  const pickB = opts.specialAbilityPicksByPlayerId[b] ?? [];
  if (pickA.length !== slots || pickB.length !== slots) return [];
  if (skyTeamAbilityPickKey(pickA) !== skyTeamAbilityPickKey(pickB)) return [];
  return sortSkyTeamAbilityIds(pickA);
}

/** True when lobby is blocked only by Special Ability agreement (or nothing). */
export function skyTeamLobbyBlocksOnlyOnAbilities(
  opts: SkyTeamLobbyOptions,
  playerIds: readonly string[] = [],
): boolean {
  const errors = getSkyTeamLobbyValidationErrors(opts, playerIds);
  return errors.length > 0 && errors.every((e) => /Special Ability/.test(e));
}

/** Human-readable blockers for lobby start / setup. Empty = valid. */
export function getSkyTeamLobbyValidationErrors(
  opts: SkyTeamLobbyOptions,
  playerIds: readonly string[] = [],
): string[] {
  const errors: string[] = [];
  if (!SKY_TEAM_SCENARIOS[opts.scenarioId]) {
    errors.push('ต้องเลือกสายการบิน / สนามบิน');
  }
  if (opts.pilotMode === 'manual' && !opts.pilotPlayerId) {
    errors.push('ต้องเลือกผู้เล่นที่เป็น Pilot');
  }
  if (opts.enabledModules.includes('kerosene') && opts.enabledModules.includes('kerosene-leak')) {
    errors.push('Kerosene และ Kerosene Leak เปิดพร้อมกันไม่ได้');
  }

  const slots = getSkyTeamScenario(opts.scenarioId).specialAbilitySlots;
  if (slots > 0) {
    if (playerIds.length < 2) {
      errors.push(`ต้องมีผู้เล่น 2 คนเพื่อเลือก Special Ability (${slots} ใบ)`);
    } else {
      const agreed = resolveSkyTeamAgreedAbilityIds(opts, playerIds);
      if (agreed.length === 0) {
        errors.push(`ทั้งสองคนต้องเลือก Special Ability ให้ตรงกัน (${slots} ใบ)`);
      }
    }
  }

  if (opts.selectedSpecialAbilityIds.length > MAX_SPECIAL_ABILITIES) {
    errors.push(`Special Ability เกิน ${MAX_SPECIAL_ABILITIES} ใบ`);
  }
  return errors;
}

export function isSkyTeamLobbyOptionsValid(
  opts: SkyTeamLobbyOptions,
  playerIds: readonly string[] = [],
): boolean {
  return getSkyTeamLobbyValidationErrors(opts, playerIds).length === 0;
}

export function skyTeamHasModule(
  enabledModules: readonly SkyTeamModuleId[],
  id: SkyTeamModuleId,
): boolean {
  return enabledModules.includes(id);
}

export function getSkyTeamScenario(scenarioId: string): SkyTeamScenarioDefinition {
  return SKY_TEAM_SCENARIOS[scenarioId] ?? YUL_SCENARIO;
}

export function getApproachScenario(scenarioId: string): ApproachScenario {
  return getSkyTeamScenario(scenarioId);
}

export function getAltitudeStep(index: number): AltitudeStepDef {
  const clamped = Math.min(Math.max(0, index), ALTITUDE_TRACK.length - 1);
  return ALTITUDE_TRACK[clamped]!;
}
