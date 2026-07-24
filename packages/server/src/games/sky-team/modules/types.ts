import type {
  SkyTeamAction,
  SkyTeamLobbyOptions,
  SkyTeamModuleId,
  SkyTeamModuleState,
  SkyTeamPlacedDie,
  SkyTeamState,
} from 'shared';

export type ModuleSetupContext = {
  state: SkyTeamState;
  lobby: SkyTeamLobbyOptions;
};

export type ModuleContext = {
  state: SkyTeamState;
};

/**
 * Hook interface for expansion modules.
 * Milestone 1 wires `setup` only; later milestones call the rest from the engine.
 */
export interface SkyTeamModuleDefinition<TState> {
  id: SkyTeamModuleId;

  setup?: (context: ModuleSetupContext) => TState;

  onRoundStart?: (state: SkyTeamState, context: ModuleContext) => SkyTeamState;

  validateAction?: (
    state: SkyTeamState,
    action: SkyTeamAction,
    context: ModuleContext,
  ) => void;

  onDiePlaced?: (
    state: SkyTeamState,
    placement: SkyTeamPlacedDie,
    context: ModuleContext,
  ) => SkyTeamState;

  afterAxisResolved?: (state: SkyTeamState, context: ModuleContext) => SkyTeamState;

  modifyEngineTotal?: (
    state: SkyTeamState,
    engineTotal: number,
    context: ModuleContext,
  ) => number;

  afterApproachAdvance?: (
    state: SkyTeamState,
    traversedPositions: number[],
    context: ModuleContext,
  ) => SkyTeamState;

  onEndRound?: (state: SkyTeamState, context: ModuleContext) => SkyTeamState;

  validateFinalLanding?: (state: SkyTeamState, context: ModuleContext) => string | null;
}

export type AnySkyTeamModuleDefinition = SkyTeamModuleDefinition<
  NonNullable<SkyTeamModuleState[keyof SkyTeamModuleState]>
>;
