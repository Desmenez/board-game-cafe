import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  SurviveTheIslandAbility,
  SurviveTheIslandAction,
  SurviveTheIslandPlacement,
  SurviveTheIslandPlayerView,
  SurviveTheIslandWaterSpace,
} from 'shared';
import {
  SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES,
  SURVIVE_THE_ISLAND_WATER_CELLS,
  surviveTheIslandAdjacentIslandTiles,
  surviveTheIslandAdjacentWaterSpaces,
  surviveTheIslandTileIdForWaterSpace,
  surviveTheIslandWaterCellForSpace,
  surviveTheIslandWaterNeighboursForTile,
  surviveTheIslandWaterSpaceForTile,
} from 'shared';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import { GameHistoryDisclosure } from '../../components/game-shell';
import { PlayerIdentity } from '../../components/player-avatar';
import { PlayerRosterStrip } from '../../components/player-roster';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { imageMap } from '../../imageMap';
import { cn } from '../../utils/cn';
import { fireStiRescueConfetti } from '../../utils/winCelebration';
import { stiAdventurerSrc, stiArt, stiCreatureSrc } from './art';
import {
  DEFAULT_SURVIVE_THE_ISLAND_LAYOUT,
  SURVIVE_THE_ISLAND_CELLS,
  surviveTheIslandCellCenter,
} from './boardLayout';
import './survive-the-island-layout-demo.css';
import { SurviveTheIslandGameOverBody } from './components/SurviveTheIslandGameOverBody';
import { SurviveTheIslandPlacementPopup } from './components/SurviveTheIslandPlacementPopup';
import { SurviveTheIslandRaftBoardingModal } from './components/SurviveTheIslandRaftBoardingModal';
import { SurviveTheIslandRepellentModal } from './components/SurviveTheIslandRepellentModal';
import { SurviveTheIslandStatusPanel } from './components/SurviveTheIslandStatusPanel';
import toast from 'react-hot-toast';
import { SurviveTheIslandAbilityToast } from './components/SurviveTheIslandAbilityToast';
import { SurviveTheIslandCreatureDieToast } from './components/SurviveTheIslandCreatureDieToast';
import { SurviveTheIslandRescueToast } from './components/SurviveTheIslandRescueToast';
import { SurviveTheIslandTileRevealToast } from './components/SurviveTheIslandTileRevealToast';
import { StiPhaseChip } from './components/SurviveTheIslandTokens';
import { buildSurviveTheIslandRosterSeats } from './components/surviveTheIslandRosterSeats';

type Props = {
  gameState: SurviveTheIslandPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

type StiAdventurer = SurviveTheIslandPlayerView['adventurers'][number];
type StiRaft = SurviveTheIslandPlayerView['rafts'][number];
type StiCreature = SurviveTheIslandPlayerView['creatures'][number];

/** Same quick-to-slow face swaps as Marrakech's die, then release the real server roll. */
const CREATURE_DIE_ROLL_TICKS = [0, 70, 70, 80, 90, 100, 120, 145, 175, 210, 250];
const CREATURE_DIE_FACES = ['sea-serpent', 'shark', 'kaiju'] as const;

function randomCreatureDieFace() {
  return CREATURE_DIE_FACES[Math.floor(Math.random() * CREATURE_DIE_FACES.length)]!;
}

/** Matches adventurer `onClick`: only your own pieces select. */
function isOwnAdventurer(adventurer: StiAdventurer, myId: string): boolean {
  return adventurer.playerId === myId;
}

function creatureDieMoveKind(view: SurviveTheIslandPlayerView) {
  if (view.phase === 'creatures') return view.creatureToMove;
  return view.pendingCreatureDie?.kind ?? null;
}

function hasStiDecisionInterrupt(view: SurviveTheIslandPlayerView): boolean {
  return view.pendingRepellent != null || view.pendingRaftBoarding != null;
}

function isSelectingCreatureMove(view: SurviveTheIslandPlayerView): boolean {
  return Boolean(view.canAct && creatureDieMoveKind(view) && !hasStiDecisionInterrupt(view));
}

/** Matches raft `onClick` / `onRaftClick` gate. */
function isActionPhaseAct(view: SurviveTheIslandPlayerView): boolean {
  return (
    view.phase === 'action' &&
    view.canAct &&
    view.pendingCreatureDie == null &&
    !hasStiDecisionInterrupt(view)
  );
}

/**
 * Mirrors engine `playerControlsRaft`: empty water (no adventurers aboard) is
 * free for anyone; otherwise you need at least as many adventurers on that
 * space as every other player (majority or tie). Unplaced rafts are not movable.
 */
function playerControlsRaft(
  raft: StiRaft,
  view: SurviveTheIslandPlayerView,
  myId: string,
): boolean {
  if (raft.waterSpaceId == null) return false;
  const aboard = view.adventurers.filter(
    (adventurer) =>
      !adventurer.eliminated && !adventurer.rescued && adventurer.aboardRaftId === raft.id,
  );
  const own = aboard.filter((adventurer) => adventurer.playerId === myId).length;
  return view.players
    .filter((player) => player.id !== myId)
    .every(
      (opponent) =>
        own >= aboard.filter((adventurer) => adventurer.playerId === opponent.id).length,
    );
}

/** Matches creature `onClick` creatures-phase / pending creature-die branch. */
function isCreatureMoveTarget(
  creature: StiCreature,
  view: SurviveTheIslandPlayerView,
  movableCreatureIds: ReadonlySet<string>,
): boolean {
  return (
    isSelectingCreatureMove(view) &&
    creatureDieMoveKind(view) === creature.kind &&
    movableCreatureIds.has(creature.id)
  );
}

/** Matches creature `onClick` repellent branch. */
function isRepellentCreatureTarget(
  view: SurviveTheIslandPlayerView,
  selectedAbility: SurviveTheIslandAbility | null,
): boolean {
  return isActionPhaseAct(view) && selectedAbility === 'repellent';
}

/** Matches creature `onClick` dive branch. */
function isDiveCreatureTarget(
  view: SurviveTheIslandPlayerView,
  selectedAbility: SurviveTheIslandAbility | null,
): boolean {
  return isActionPhaseAct(view) && selectedAbility === 'dive';
}

function adventurerIsActionable(
  adventurer: StiAdventurer,
  view: SurviveTheIslandPlayerView,
  myId: string,
  selectedAbility: SurviveTheIslandAbility | null,
): boolean {
  if (!isOwnAdventurer(adventurer, myId)) return false;
  if (!isActionPhaseAct(view)) return false;
  if (selectedAbility === 'dolphin')
    return adventurer.waterSpaceId != null && adventurer.aboardRaftId == null;
  if (selectedAbility != null) return false;
  return true;
}

function raftIsActionable(
  raft: StiRaft,
  view: SurviveTheIslandPlayerView,
  myId: string,
  selectedAbility: SurviveTheIslandAbility | null,
): boolean {
  if (!isActionPhaseAct(view)) return false;
  if (raft.waterSpaceId == null) return false;
  if (!playerControlsRaft(raft, view, myId)) return false;
  if (selectedAbility === 'paddle') return true;
  if (selectedAbility != null) return false;
  return true;
}

function creatureIsActionable(
  creature: StiCreature,
  view: SurviveTheIslandPlayerView,
  selectedAbility: SurviveTheIslandAbility | null,
  movableCreatureIds: ReadonlySet<string>,
): boolean {
  return (
    isCreatureMoveTarget(creature, view, movableCreatureIds) ||
    isRepellentCreatureTarget(view, selectedAbility) ||
    isDiveCreatureTarget(view, selectedAbility)
  );
}

function stiBoardTokenClass(selected: boolean, actionable: boolean): string {
  if (selected) return 'drop-shadow-[0_0_10px_white]';
  if (actionable)
    return 'drop-shadow-[0_0_8px_#fde047] [transition:filter_150ms_ease,transform_150ms_ease] hover:drop-shadow-[0_0_18px_#fde047] hover:brightness-125 hover:scale-110 cursor-pointer';
  return '';
}

function stiBoardTokenAriaLabel(base: string, selected: boolean, actionable: boolean): string {
  if (selected) return `${base}, selected`;
  if (actionable) return `${base}, can act`;
  return base;
}

/** Destination hexes are highlighted — clicks on tokens sitting on them should hit the hex below. */
function isPickingStiDestination(
  legalIslandTargetIds: number[],
  legalWaterTargetIds: string[],
): boolean {
  return legalIslandTargetIds.length > 0 || legalWaterTargetIds.length > 0;
}

/**
 * Pass clicks through a token on a highlighted destination so the hex underneath
 * receives the move. Keep the currently selected piece clickable (deselect / toggle).
 */
function stiTokenPassThroughClicks(
  pickingDestination: boolean,
  onLegalDestination: boolean,
  isSelectedPiece: boolean,
): boolean {
  return pickingDestination && onLegalDestination && !isSelectedPiece;
}

function adventurerStackOffset(
  index: number,
  total: number,
): { left: number; top: number; scale: number } {
  const layouts = [
    [{ left: 0, top: 0 }],
    [
      { left: -1.25, top: 0 },
      { left: 1.25, top: 0 },
    ],
    [
      { left: -1.3, top: -1 },
      { left: 1.3, top: -1 },
      { left: 0, top: 1.25 },
    ],
    [
      { left: -1.35, top: -1 },
      { left: 1.35, top: -1 },
      { left: -1.35, top: 1 },
      { left: 1.35, top: 1 },
    ],
  ];
  if (total <= layouts.length) {
    return { ...layouts[total - 1]![index]!, scale: total === 1 ? 1 : total === 2 ? 0.82 : 0.72 };
  }
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const radius = total <= 6 ? 1.65 : 2.2;
  return { left: Math.cos(angle) * radius, top: Math.sin(angle) * radius, scale: 0.65 };
}

/** Passengers aboard the raft — row above the raft. */
function raftPassengerRowOffset(
  index: number,
  total: number,
): { left: number; top: number; scale: number } {
  const spacing = 2.2;
  return {
    left: (index - (total - 1) / 2) * spacing,
    top: -2.8,
    scale: total === 1 ? 0.72 : total === 2 ? 0.66 : 0.6,
  };
}

/** Swimmers sharing a water space with a raft — row below the raft. */
function swimmingBelowRaftOffset(
  index: number,
  total: number,
): { left: number; top: number; scale: number } {
  const spacing = 2.2;
  return {
    left: (index - (total - 1) / 2) * spacing,
    top: 3.0,
    scale: total === 1 ? 0.72 : total === 2 ? 0.66 : 0.6,
  };
}

/** Fan shark / sea serpent (and any other co-located creatures) so both stay visible and clickable. */
function creatureStackOffset(
  index: number,
  total: number,
): { left: number; top: number; scale: number } {
  if (total <= 1) return { left: 0, top: 0, scale: 1 };
  const layouts = [
    [
      { left: -2.15, top: -0.35 },
      { left: 2.15, top: 0.35 },
    ],
    [
      { left: -2.25, top: -0.9 },
      { left: 2.25, top: -0.9 },
      { left: 0, top: 1.15 },
    ],
  ];
  if (total - 2 < layouts.length) {
    return { ...layouts[total - 2]![index]!, scale: total === 2 ? 0.68 : 0.62 };
  }
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const radius = 2.4;
  return { left: Math.cos(angle) * radius, top: Math.sin(angle) * radius, scale: 0.58 };
}

export function SurviveTheIslandGame({
  gameState: view,
  myId,
  sendAction,
  onLeave,
  onRestart,
}: Props) {
  const reduceMotion = useReducedMotion();
  const isMyTurn = view.activePlayerId === myId && view.canAct;
  useYourTurnToast(isMyTurn, view.phase !== 'game_over');
  const [selectedAdventurerId, setSelectedAdventurerId] = useState<string | null>(null);
  const [selectedSetupAdventurerId, setSelectedSetupAdventurerId] = useState<string | null>(null);
  const [selectedRaftId, setSelectedRaftId] = useState<string | null>(null);
  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<SurviveTheIslandAbility | null>(null);
  const [creatureDieRollToken, setCreatureDieRollToken] = useState(0);
  const [rollingCreatureDie, setRollingCreatureDie] = useState(false);
  const [rollingCreatureFace, setRollingCreatureFace] = useState<
    (typeof CREATURE_DIE_FACES)[number] | null
  >(null);
  const [sinkingReveal, setSinkingReveal] =
    useState<SurviveTheIslandPlayerView['lastReveal']>(null);
  const seenRevealId = useRef(view.lastReveal?.id ?? 0);
  const [placementPopup, setPlacementPopup] = useState<SurviveTheIslandPlacement | null>(null);
  const seenPlacementId = useRef(view.lastPlacement?.id ?? 0);
  const prevCreatureDieNoticeSeq = useRef(view.creatureDieNoticeSeq);
  const prevAbilityUseNoticeSeq = useRef(view.abilityUseNoticeSeq);
  const prevRescueNoticeSeq = useRef(view.rescueNoticeSeq);
  const selected = selectedAdventurerId
    ? view.adventurers.find((item) => item.id === selectedAdventurerId)
    : null;
  const activePlayer = view.players.find((player) => player.id === view.activePlayerId);
  const rosterSeats = useMemo(() => buildSurviveTheIslandRosterSeats(view), [view]);
  const myUnplacedAdventurers = useMemo(
    () =>
      view.adventurers.filter(
        (item) =>
          item.playerId === myId &&
          item.tileId == null &&
          item.waterSpaceId == null &&
          !item.eliminated &&
          !item.rescued,
      ),
    [view.adventurers, myId],
  );
  const selectedSetupAdventurer =
    myUnplacedAdventurers.find((item) => item.id === selectedSetupAdventurerId) ?? null;
  const send = (action: SurviveTheIslandAction) => sendAction(action);
  const creatureDieRollSource = useRef<'ability' | 'phase'>('phase');
  const startCreatureDieRoll = () => {
    if (rollingCreatureDie || !view.canAct) return;
    if (view.pendingCreatureDie || hasStiDecisionInterrupt(view)) return;
    if (view.phase === 'action' && selectedAbility === 'creature-die') {
      creatureDieRollSource.current = 'ability';
      setRollingCreatureDie(true);
      setCreatureDieRollToken((token) => token + 1);
      return;
    }
    if (view.phase === 'rising_waters' && view.risingWatersSunk < view.risingWatersTilesToSink)
      return;
    if (
      view.phase !== 'rising_waters' &&
      (view.phase !== 'creatures' || view.creatureToMove != null)
    )
      return;
    creatureDieRollSource.current = 'phase';
    setRollingCreatureDie(true);
    setCreatureDieRollToken((token) => token + 1);
  };
  const finishCreatureDieRoll = () => {
    const source = creatureDieRollSource.current;
    setRollingCreatureDie(false);
    setRollingCreatureFace(null);
    if (source === 'ability') {
      send({ type: 'use-ability', ability: 'creature-die' });
      setSelectedAbility(null);
      return;
    }
    send({ type: 'roll-creature' });
  };
  const canMoveSelected =
    selected?.playerId === myId &&
    view.phase === 'action' &&
    view.canAct &&
    view.pendingCreatureDie == null &&
    !hasStiDecisionInterrupt(view);
  const myUnplacedRaft = view.rafts.find(
    (raft) => raft.playerId === myId && raft.waterSpaceId == null,
  );
  const sinkingTerrain = view.legalSinkTileIds.length
    ? view.tiles.find((tile) => tile.id === view.legalSinkTileIds[0])?.terrain
    : null;
  const availableWaterSpaces = useMemo(
    () => [
      ...SURVIVE_THE_ISLAND_WATER_CELLS.map((cell) => cell.id),
      ...view.tiles
        .filter((tile) => tile.state === 'sunk')
        .map((tile) => surviveTheIslandWaterSpaceForTile(tile.id)),
    ],
    [view.tiles],
  );
  const raftIdByWaterSpace = useMemo(
    () =>
      new Map(
        view.rafts.flatMap((raft) =>
          raft.waterSpaceId == null ? [] : [[raft.waterSpaceId, raft.id] as const],
        ),
      ),
    [view.rafts],
  );
  const adventurerStackById = useMemo(() => {
    const groups = new Map<string, StiAdventurer[]>();
    for (const adventurer of view.adventurers) {
      if (adventurer.eliminated || adventurer.rescued) continue;
      // Aboard raft → "raft:<id>" row above raft.
      // Swimming in same space as a raft → "swim-raft:<waterSpaceId>" row below raft.
      // Otherwise tile or open water → normal stack.
      const location =
        adventurer.aboardRaftId != null
          ? `raft:${adventurer.aboardRaftId}`
          : adventurer.waterSpaceId != null && raftIdByWaterSpace.has(adventurer.waterSpaceId)
            ? `swim-raft:${adventurer.waterSpaceId}`
            : adventurer.tileId != null
              ? `tile:${adventurer.tileId}`
              : adventurer.waterSpaceId
                ? `water:${adventurer.waterSpaceId}`
                : null;
      if (!location) continue;
      const stack = groups.get(location) ?? [];
      stack.push(adventurer);
      groups.set(location, stack);
    }
    const positions = new Map<string, { index: number; total: number; key: string }>();
    for (const [key, stack] of groups.entries()) {
      stack.forEach((adventurer, index) =>
        positions.set(adventurer.id, { index, total: stack.length, key }),
      );
    }
    return positions;
  }, [raftIdByWaterSpace, view.adventurers]);
  const creatureStackById = useMemo(() => {
    const groups = new Map<string, StiCreature[]>();
    for (const creature of view.creatures) {
      const stack = groups.get(creature.waterSpaceId) ?? [];
      stack.push(creature);
      groups.set(creature.waterSpaceId, stack);
    }
    const positions = new Map<string, { index: number; total: number }>();
    for (const stack of groups.values()) {
      stack.forEach((creature, index) =>
        positions.set(creature.id, { index, total: stack.length }),
      );
    }
    return positions;
  }, [view.creatures]);

  useEffect(() => {
    if (!view.lastReveal || view.lastReveal.id <= seenRevealId.current) return;
    seenRevealId.current = view.lastReveal.id;
    setSinkingReveal(view.lastReveal);
  }, [view.lastReveal]);

  useEffect(() => {
    if (!view.lastPlacement || view.lastPlacement.id <= seenPlacementId.current) return;
    seenPlacementId.current = view.lastPlacement.id;
    setPlacementPopup(view.lastPlacement);
  }, [view.lastPlacement]);

  useEffect(() => {
    if (!view.pendingCreatureDie) return;
    const { kind } = view.pendingCreatureDie;
    setSelectedAdventurerId(null);
    setSelectedRaftId(null);
    setSelectedAbility(null);
    const matches = view.creatures.filter((creature) => creature.kind === kind);
    setSelectedCreatureId((current) => {
      if (current && matches.some((creature) => creature.id === current)) return current;
      return matches.length === 1 ? matches[0]!.id : null;
    });
  }, [view.pendingCreatureDie, view.creatures]);

  useEffect(() => {
    if (view.creatureDieNoticeSeq === prevCreatureDieNoticeSeq.current) return;
    prevCreatureDieNoticeSeq.current = view.creatureDieNoticeSeq;
    const notice = view.creatureDieNotice;
    if (!notice) return;
    const roller = view.players.find((p) => p.id === notice.playerId);
    const rollerName = roller?.name ?? notice.playerId;
    const isMe = notice.playerId === myId;
    const displayName = `${rollerName}${isMe ? ' (คุณ)' : ''}`;
    toast.custom(
      (toastState) => (
        <SurviveTheIslandCreatureDieToast
          kind={notice.kind}
          displayName={displayName}
          playerId={notice.playerId}
          playerName={rollerName}
          visible={toastState.visible}
        />
      ),
      {
        id: `sti-creature-die-${view.creatureDieNoticeSeq}`,
        duration: 3500,
        position: 'top-left',
      },
    );
  }, [view.creatureDieNotice, view.creatureDieNoticeSeq, view.players, myId]);

  useEffect(() => {
    if (view.abilityUseNoticeSeq === prevAbilityUseNoticeSeq.current) return;
    prevAbilityUseNoticeSeq.current = view.abilityUseNoticeSeq;
    const notice = view.abilityUseNotice;
    if (!notice) return;
    const user = view.players.find((p) => p.id === notice.playerId);
    const userName = user?.name ?? notice.playerId;
    const displayName = `${userName}${notice.playerId === myId ? ' (คุณ)' : ''}`;
    toast.custom(
      (toastState) => (
        <SurviveTheIslandAbilityToast
          ability={notice.ability}
          displayName={displayName}
          playerId={notice.playerId}
          playerName={userName}
          visible={toastState.visible}
        />
      ),
      {
        id: `sti-ability-use-${view.abilityUseNoticeSeq}`,
        duration: 3500,
        position: 'top-left',
      },
    );
  }, [view.abilityUseNotice, view.abilityUseNoticeSeq, view.players, myId]);

  useEffect(() => {
    if (view.rescueNoticeSeq === prevRescueNoticeSeq.current) return;
    prevRescueNoticeSeq.current = view.rescueNoticeSeq;
    const notice = view.rescueNotice;
    if (!notice) return;
    const rescuer = view.players.find((p) => p.id === notice.playerId);
    const rescuerName = rescuer?.name ?? notice.playerId;
    const displayName = `${rescuerName}${notice.playerId === myId ? ' (คุณ)' : ''}`;
    fireStiRescueConfetti();
    toast.custom(
      (toastState) => (
        <SurviveTheIslandRescueToast
          color={notice.color}
          treasure={notice.treasure}
          displayName={displayName}
          playerId={notice.playerId}
          playerName={rescuerName}
          visible={toastState.visible}
        />
      ),
      {
        id: `sti-rescue-${view.rescueNoticeSeq}`,
        duration: 3500,
        position: 'top-left',
      },
    );
  }, [view.rescueNotice, view.rescueNoticeSeq, view.players, myId]);

  useEffect(() => {
    if (!creatureDieRollToken) return;

    const timers: number[] = [];
    const clearTimers = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.length = 0;
    };
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      clearTimers();
      finishCreatureDieRoll();
    };

    // Do not hold the turn hostage when browser timer throttling makes the roll crawl.
    if (reduceMotion || document.hidden) {
      land();
      return clearTimers;
    }

    setRollingCreatureFace(randomCreatureDieFace());
    let elapsed = 0;
    for (const tick of CREATURE_DIE_ROLL_TICKS) {
      elapsed += tick;
      if (tick > 0)
        timers.push(
          window.setTimeout(() => setRollingCreatureFace(randomCreatureDieFace()), elapsed),
        );
    }
    timers.push(window.setTimeout(land, elapsed + 260));

    const onVisibilityChange = () => {
      if (document.hidden) land();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimers();
    };
  }, [creatureDieRollToken, reduceMotion]);

  const sinkingTile =
    sinkingReveal != null
      ? (view.tiles.find((tile) => tile.id === sinkingReveal.tileId) ?? null)
      : null;
  const deferredRevealWaterSpace = sinkingReveal
    ? surviveTheIslandWaterSpaceForTile(sinkingReveal.tileId)
    : null;

  const waterPoint = (waterSpaceId: SurviveTheIslandWaterSpace) => {
    const waterCell = surviveTheIslandWaterCellForSpace(waterSpaceId);
    if (!waterCell) return null;
    return {
      left:
        DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.gridOrigin.left +
        (waterCell.q2 / 2) * DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.columnPitch,
      top:
        DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.gridOrigin.top +
        (waterCell.row - 3) * DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.rowPitch,
    };
  };

  const placementPoint = (placement: SurviveTheIslandPlacement) => {
    if (placement.tileId != null) {
      return surviveTheIslandCellCenter(
        DEFAULT_SURVIVE_THE_ISLAND_LAYOUT,
        SURVIVE_THE_ISLAND_CELLS[placement.tileId]!,
      );
    }
    if (placement.waterSpaceId != null) return waterPoint(placement.waterSpaceId);
    return null;
  };

  const reachableWaterTargets = (origin: string, range: number): string[] => {
    const distances = new Map<string, number>([[origin, 0]]);
    const queue = [origin];
    while (queue.length) {
      const current = queue.shift()!;
      const distance = distances.get(current)!;
      if (distance >= range) continue;
      for (const neighbour of surviveTheIslandAdjacentWaterSpaces(current, availableWaterSpaces)) {
        if (!distances.has(neighbour)) {
          distances.set(neighbour, distance + 1);
          queue.push(neighbour);
        }
      }
    }
    return [...distances.keys()].filter((waterSpaceId) => waterSpaceId !== origin);
  };

  const isKaijuSpace = (spaceId: string): boolean =>
    view.creatures.some(
      (creature) => creature.kind === 'kaiju' && creature.waterSpaceId === spaceId,
    );

  const availableKaijuSpace = (spaceId: string): boolean => {
    if (availableWaterSpaces.includes(spaceId)) return true;
    const tileId = surviveTheIslandTileIdForWaterSpace(spaceId);
    return tileId != null && view.tiles[tileId]?.state === 'island';
  };

  const adjacentKaijuSpaces = (spaceId: string): string[] => {
    const tileId = surviveTheIslandTileIdForWaterSpace(spaceId);
    if (tileId != null && view.tiles[tileId]?.state === 'island') {
      return [
        ...surviveTheIslandAdjacentIslandTiles(tileId)
          .filter((id) => view.tiles[id]?.state === 'island')
          .map(surviveTheIslandWaterSpaceForTile),
        ...surviveTheIslandWaterNeighboursForTile(tileId, availableWaterSpaces),
      ];
    }
    return [
      ...surviveTheIslandAdjacentWaterSpaces(spaceId, availableWaterSpaces),
      ...view.tiles
        .filter(
          (tile) =>
            tile.state === 'island' &&
            surviveTheIslandWaterNeighboursForTile(tile.id, availableWaterSpaces).includes(spaceId),
        )
        .map((tile) => surviveTheIslandWaterSpaceForTile(tile.id)),
    ];
  };

  const reachableKaijuTargets = (origin: string): string[] => {
    const distances = new Map<string, number>([[origin, 0]]);
    const queue = [origin];
    while (queue.length) {
      const current = queue.shift()!;
      const distance = distances.get(current)!;
      if (distance >= 2) continue;
      for (const neighbour of adjacentKaijuSpaces(current)) {
        if (!distances.has(neighbour) && availableKaijuSpace(neighbour)) {
          distances.set(neighbour, distance + 1);
          queue.push(neighbour);
        }
      }
    }
    return [...distances.keys()].filter((spaceId) => spaceId !== origin);
  };

  /** Same-space board only — swimming into a full-raft hex is allowed. */
  const raftHasBoardingSeat = (waterSpaceId: string): boolean => {
    const raft = view.rafts.find((item) => item.waterSpaceId === waterSpaceId);
    if (!raft) return false;
    return (
      view.adventurers.filter(
        (adventurer) =>
          !adventurer.eliminated && !adventurer.rescued && adventurer.aboardRaftId === raft.id,
      ).length < 3
    );
  };

  const legalWaterTargetIds = useMemo(() => {
    if (selectedAbility === 'dive') {
      if (!selectedCreatureId) return [];
      const creature = view.creatures.find((item) => item.id === selectedCreatureId);
      if (!creature) return [];
      return availableWaterSpaces.filter(
        (id) =>
          !view.creatures.some((other) => other.id !== creature.id && other.waterSpaceId === id),
      );
    }
    if (selectedRaftId) {
      const raft = view.rafts.find((item) => item.id === selectedRaftId);
      return raft?.waterSpaceId
        ? reachableWaterTargets(raft.waterSpaceId, selectedAbility === 'paddle' ? 2 : 1).filter(
            (id) => !isKaijuSpace(id),
          )
        : [];
    }
    if (selected && selected.tileId != null)
      return surviveTheIslandWaterNeighboursForTile(selected.tileId, availableWaterSpaces).filter(
        (id) => !isKaijuSpace(id),
      );
    if (selectedCreatureId && isSelectingCreatureMove(view)) {
      const creature = view.creatures.find((item) => item.id === selectedCreatureId);
      return creature
        ? creature.kind === 'kaiju'
          ? reachableKaijuTargets(creature.waterSpaceId).filter((id) =>
              availableWaterSpaces.includes(id),
            )
          : reachableWaterTargets(
              creature.waterSpaceId,
              creature.kind === 'sea-serpent' ? 1 : 2,
            ).filter((id) => !isKaijuSpace(id))
        : [];
    }
    if (selected?.waterSpaceId && selectedAbility === 'dolphin')
      return reachableWaterTargets(selected.waterSpaceId, 2).filter((id) => !isKaijuSpace(id));
    if (selected?.waterSpaceId && selected.aboardRaftId != null)
      return reachableWaterTargets(selected.waterSpaceId, 1).filter((id) => !isKaijuSpace(id));
    if (selected?.waterSpaceId && selected.aboardRaftId == null) {
      const targets = reachableWaterTargets(selected.waterSpaceId, 1).filter(
        (waterSpaceId) => !isKaijuSpace(waterSpaceId),
      );
      const raftHere = view.rafts.some((raft) => raft.waterSpaceId === selected.waterSpaceId);
      if (
        raftHere &&
        raftHasBoardingSeat(selected.waterSpaceId) &&
        !targets.includes(selected.waterSpaceId)
      ) {
        targets.push(selected.waterSpaceId);
      }
      return targets;
    }
    return [];
  }, [
    availableWaterSpaces,
    selected,
    selectedAbility,
    selectedCreatureId,
    selectedRaftId,
    view.adventurers,
    view.creatures,
    view.pendingCreatureDie,
    view.phase,
    view.rafts,
  ]);

  const legalSetupRaftWaterSpaceIds = useMemo(
    () =>
      availableWaterSpaces.filter(
        (waterSpaceId) =>
          !view.rafts.some((raft) => raft.waterSpaceId === waterSpaceId) &&
          view.tiles.some(
            (tile) =>
              tile.state === 'island' &&
              surviveTheIslandWaterNeighboursForTile(tile.id, availableWaterSpaces).includes(
                waterSpaceId,
              ),
          ),
      ),
    [availableWaterSpaces, view.rafts, view.tiles],
  );

  const legalIslandTargetIds = useMemo(() => {
    if (selectedCreatureId && isSelectingCreatureMove(view)) {
      const creature = view.creatures.find((item) => item.id === selectedCreatureId);
      return creature?.kind === 'kaiju'
        ? reachableKaijuTargets(creature.waterSpaceId)
            .map(surviveTheIslandTileIdForWaterSpace)
            .filter(
              (tileId): tileId is number =>
                tileId != null && view.tiles[tileId]?.state === 'island',
            )
        : [];
    }
    if (!selected) return [];
    if (selected.tileId != null)
      return surviveTheIslandAdjacentIslandTiles(selected.tileId).filter(
        (tileId) =>
          view.tiles[tileId]?.state === 'island' &&
          !isKaijuSpace(surviveTheIslandWaterSpaceForTile(tileId)),
      );
    if (!selected.waterSpaceId) return [];
    const reachable =
      selectedAbility === 'dolphin'
        ? reachableWaterTargets(selected.waterSpaceId, 2)
        : [selected.waterSpaceId];
    return view.tiles.flatMap((tile) =>
      tile.state === 'island' &&
      !isKaijuSpace(surviveTheIslandWaterSpaceForTile(tile.id)) &&
      surviveTheIslandWaterNeighboursForTile(tile.id, availableWaterSpaces).some((waterSpaceId) =>
        reachable.includes(waterSpaceId),
      )
        ? [tile.id]
        : [],
    );
  }, [
    availableWaterSpaces,
    selected,
    selectedAbility,
    selectedCreatureId,
    view.creatures,
    view.pendingCreatureDie,
    view.phase,
    view.tiles,
  ]);

  const creatureHasDestinations = (creature: StiCreature): boolean => {
    if (creature.kind === 'kaiju') return reachableKaijuTargets(creature.waterSpaceId).length > 0;
    return reachableWaterTargets(
      creature.waterSpaceId,
      creature.kind === 'sea-serpent' ? 1 : 2,
    ).some((id) => !isKaijuSpace(id));
  };
  const movableCreatureIds = useMemo(() => {
    const kind = creatureDieMoveKind(view);
    if (!kind || !isSelectingCreatureMove(view)) return new Set<string>();
    return new Set(
      view.creatures
        .filter((creature) => creature.kind === kind && creatureHasDestinations(creature))
        .map((creature) => creature.id),
    );
  }, [
    availableWaterSpaces,
    view.creatures,
    view.creatureToMove,
    view.pendingCreatureDie,
    view.phase,
    view.tiles,
  ]);

  const pickingDestination = isPickingStiDestination(legalIslandTargetIds, legalWaterTargetIds);

  const onTileClick = (tileId: number) => {
    if (!view.canAct) return;
    if (view.phase === 'setup_adventurers' && selectedSetupAdventurer) {
      send({ type: 'place-adventurer', adventurerId: selectedSetupAdventurer.id, tileId });
      return;
    }
    if (view.phase === 'rising_waters' && view.legalSinkTileIds.includes(tileId)) {
      send({ type: 'sink-tile', tileId });
      return;
    }
    if (
      selectedCreatureId &&
      isSelectingCreatureMove(view) &&
      legalIslandTargetIds.includes(tileId)
    ) {
      send({
        type: 'move-creature',
        creatureId: selectedCreatureId,
        waterSpaceId: surviveTheIslandWaterSpaceForTile(tileId),
      });
      setSelectedCreatureId(null);
      return;
    }
    if (canMoveSelected) {
      if (selectedAbility === 'dolphin') {
        send({ type: 'use-ability', ability: 'dolphin', adventurerId: selected.id, tileId });
        setSelectedAbility(null);
        setSelectedAdventurerId(null);
        return;
      }
      send({ type: 'move-adventurer', adventurerId: selected.id, tileId });
      setSelectedAdventurerId(null);
    }
  };

  const onWaterClick = (waterSpaceId: SurviveTheIslandWaterSpace) => {
    if (view.phase === 'setup_rafts' && view.canAct && myUnplacedRaft) {
      if (!legalSetupRaftWaterSpaceIds.includes(waterSpaceId)) return;
      send({ type: 'place-raft', raftId: myUnplacedRaft.id, waterSpaceId });
      return;
    }
    if (selectedRaftId && view.phase === 'action' && view.canAct) {
      if (!legalWaterTargetIds.includes(waterSpaceId)) return;
      if (selectedAbility === 'paddle') {
        send({ type: 'use-ability', ability: 'paddle', raftId: selectedRaftId, waterSpaceId });
        setSelectedAbility(null);
        setSelectedRaftId(null);
        return;
      }
      send({ type: 'move-raft', raftId: selectedRaftId, waterSpaceId });
      setSelectedRaftId(null);
      return;
    }
    if (selectedCreatureId && isSelectingCreatureMove(view)) {
      if (!legalWaterTargetIds.includes(waterSpaceId)) return;
      send({ type: 'move-creature', creatureId: selectedCreatureId, waterSpaceId });
      setSelectedCreatureId(null);
      return;
    }
    if (
      selectedCreatureId &&
      selectedAbility === 'dive' &&
      view.phase === 'action' &&
      view.canAct
    ) {
      if (!legalWaterTargetIds.includes(waterSpaceId)) return;
      send({ type: 'use-ability', ability: 'dive', creatureId: selectedCreatureId, waterSpaceId });
      setSelectedAbility(null);
      setSelectedCreatureId(null);
      return;
    }
    if (canMoveSelected) {
      if (!legalWaterTargetIds.includes(waterSpaceId)) return;
      if (selectedAbility === 'dolphin') {
        send({ type: 'use-ability', ability: 'dolphin', adventurerId: selected.id, waterSpaceId });
        setSelectedAbility(null);
        setSelectedAdventurerId(null);
        return;
      }
      send({ type: 'move-adventurer', adventurerId: selected.id, waterSpaceId });
      setSelectedAdventurerId(null);
    }
  };

  const onRaftClick = (raftId: string) => {
    if (!isActionPhaseAct(view)) return;
    const raft = view.rafts.find((item) => item.id === raftId);
    if (!raft || raft.waterSpaceId == null) return;
    if (
      selected &&
      canMoveSelected &&
      selected.waterSpaceId === raft.waterSpaceId &&
      selected.aboardRaftId == null &&
      selectedAbility == null
    ) {
      if (!raftHasBoardingSeat(raft.waterSpaceId)) return;
      send({ type: 'move-adventurer', adventurerId: selected.id, waterSpaceId: raft.waterSpaceId });
      setSelectedAdventurerId(null);
      return;
    }
    if (selectedRaftId === raftId) {
      setSelectedRaftId(null);
      return;
    }
    if (!playerControlsRaft(raft, view, myId)) return;
    setSelectedAdventurerId(null);
    // Raft destinations are selected by clicking a neighbouring water hex.
    setSelectedRaftId(raftId);
  };

  const rescueSelectedAdventurer = () => {
    if (!selected || !canMoveSelected) return;
    send({ type: 'rescue-adventurer', adventurerId: selected.id });
    setSelectedAdventurerId(null);
  };

  const selectedCanBeRescued = Boolean(
    selected &&
    selected.waterSpaceId &&
    (SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES as readonly string[]).includes(selected.waterSpaceId) &&
    (selected.aboardRaftId == null ||
      view.rafts.some(
        (raft) => raft.id === selected.aboardRaftId && raft.waterSpaceId === selected.waterSpaceId,
      )),
  );

  if (view.phase === 'game_over') {
    return (
      <GameShell className="app-night-page p-4">
        <GameOverModal
          titleId="sti-game-over"
          gameId="survive-the-island"
          onLeave={onLeave}
          onRestart={onRestart}
        >
          <SurviveTheIslandGameOverBody view={view} myId={myId} titleId="sti-game-over" />
        </GameOverModal>
      </GameShell>
    );
  }

  return (
    <GameShell className="app-night-page p-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <GamePlayHeader
          title="Survive the Island"
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-2">
              {activePlayer ? (
                <PlayerIdentity
                  playerId={activePlayer.id}
                  name={activePlayer.name}
                  avatarSize={28}
                  secondary={isMyTurn ? 'ตาของคุณ' : undefined}
                />
              ) : null}
              <StiPhaseChip phase={view.phase} />
            </span>
          }
          trailing={<p className="max-w-xs text-xs opacity-70 line-clamp-2">{view.lastEvent}</p>}
          onLeave={onLeave}
          onRestart={onRestart}
        />
        <GameHistoryDisclosure
          title={`ผู้เล่น · ${view.players.length} คน`}
          defaultOpen
          className="sticky top-4 z-20"
        >
          <PlayerRosterStrip
            layout="grid"
            myId={myId}
            ariaLabel="สถานะผู้เล่น Survive the Island"
            seats={rosterSeats}
          />
        </GameHistoryDisclosure>
        <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="card p-3">
            <div
              className="sti-board-demo"
              style={{ backgroundImage: `url("${imageMap.surviveTheIsland.board}")` }}
            >
              {view.tiles.map((tile) => {
                const cell = SURVIVE_THE_ISLAND_CELLS[tile.id]!;
                const point = surviveTheIslandCellCenter(DEFAULT_SURVIVE_THE_ISLAND_LAYOUT, cell);
                const src = imageMap.surviveTheIsland.terrain[tile.terrain];
                const sunk = tile.state === 'sunk';
                const isActionTarget = legalIslandTargetIds.includes(tile.id);
                const isSinkingTarget = view.legalSinkTileIds.includes(tile.id);
                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={`sti-tile ${isSinkingTarget ? 'sti-tile--sink-target' : ''} ${isActionTarget ? 'sti-tile--action-target' : ''}`}
                    style={{
                      left: `${point.left}%`,
                      top: `${point.top}%`,
                      width: `${DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.tileWidth}%`,
                      height: `${DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.tileHeight}%`,
                    }}
                    disabled={sunk}
                    onClick={() => onTileClick(tile.id)}
                  >
                    {!sunk ? <img className="sti-tile__image" src={src} alt="" /> : null}
                    {tile.state === 'volcano' ? (
                      <img
                        className="sti-marker"
                        style={{ left: '50%', top: '50%', width: '78%', height: '78%' }}
                        src={imageMap.surviveTheIsland.effects.volcano}
                        alt="Volcano"
                      />
                    ) : null}
                  </button>
                );
              })}
              {sinkingReveal && sinkingTile
                ? (() => {
                    const cell = SURVIVE_THE_ISLAND_CELLS[sinkingReveal.tileId]!;
                    const point = surviveTheIslandCellCenter(
                      DEFAULT_SURVIVE_THE_ISLAND_LAYOUT,
                      cell,
                    );
                    return (
                      <motion.div
                        key={sinkingReveal.id}
                        aria-hidden
                        className="sti-tile pointer-events-none z-50"
                        style={{
                          left: `${point.left}%`,
                          top: `${point.top}%`,
                          width: `${DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.tileWidth}%`,
                          height: `${DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.tileHeight}%`,
                        }}
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{ scale: [1, 1.08, 0], opacity: [1, 1, 0] }}
                        transition={{
                          duration: reduceMotion ? 0 : 0.62,
                          times: [0, 0.34, 1],
                          ease: 'easeInOut',
                        }}
                        onAnimationComplete={() => {
                          const reveal = sinkingReveal;
                          setSinkingReveal(null);
                          if (!reveal) return;
                          const terrain =
                            view.tiles.find((t) => t.id === reveal.tileId)?.terrain ?? null;
                          toast.custom(
                            (toastState) => (
                              <SurviveTheIslandTileRevealToast
                                reveal={reveal}
                                players={view.players}
                                terrain={terrain}
                                myId={myId}
                                visible={toastState.visible}
                              />
                            ),
                            {
                              id: `sti-tile-reveal-${reveal.id}`,
                              duration: 4500,
                              position: 'top-left',
                            },
                          );
                        }}
                      >
                        <img
                          className="sti-tile__image"
                          src={imageMap.surviveTheIsland.terrain[sinkingTile.terrain]}
                          alt=""
                        />
                      </motion.div>
                    );
                  })()
                : null}
              {availableWaterSpaces.map((waterSpaceId) => {
                const point = waterPoint(waterSpaceId);
                if (!point) return null;
                const isTarget = legalWaterTargetIds.includes(waterSpaceId);
                const isActionWaterTarget = view.phase === 'action' && isTarget;
                const isSetupRaftTarget =
                  view.phase === 'setup_rafts' &&
                  view.canAct &&
                  legalSetupRaftWaterSpaceIds.includes(waterSpaceId);
                return (
                  <button
                    key={waterSpaceId}
                    type="button"
                    className={cn(
                      'sti-water',
                      isActionWaterTarget && 'sti-water--action-target',
                      isTarget && !isActionWaterTarget && 'sti-water--target',
                      isSetupRaftTarget && 'sti-water--setup',
                    )}
                    style={{
                      left: `${point.left}%`,
                      top: `${point.top}%`,
                      width: `${DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.tileWidth}%`,
                      height: `${DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.tileHeight}%`,
                    }}
                    disabled={view.phase === 'setup_rafts' && view.canAct && !isSetupRaftTarget}
                    onClick={() => onWaterClick(waterSpaceId as SurviveTheIslandWaterSpace)}
                    aria-label="Water space"
                  ></button>
                );
              })}
              {view.rafts.flatMap((raft) => {
                if (raft.waterSpaceId == null) return [];
                const point = waterPoint(raft.waterSpaceId);
                if (!point) return [];
                const hasPassengers = view.adventurers.some(
                  (a) => !a.eliminated && !a.rescued && a.aboardRaftId === raft.id,
                );
                const hasSwimmers = view.adventurers.some(
                  (a) =>
                    !a.eliminated &&
                    !a.rescued &&
                    a.waterSpaceId === raft.waterSpaceId &&
                    a.aboardRaftId == null,
                );
                const raftSelected = view.phase === 'action' && selectedRaftId === raft.id;
                const boardingAdventurer = selectedAdventurerId
                  ? view.adventurers.find((item) => item.id === selectedAdventurerId)
                  : null;
                const canBoardThisRaft = Boolean(
                  boardingAdventurer &&
                  boardingAdventurer.playerId === myId &&
                  isActionPhaseAct(view) &&
                  selectedAbility == null &&
                  boardingAdventurer.waterSpaceId === raft.waterSpaceId &&
                  boardingAdventurer.aboardRaftId == null &&
                  view.movesRemaining > 0 &&
                  raftHasBoardingSeat(raft.waterSpaceId),
                );
                const actionable =
                  raftIsActionable(raft, view, myId, selectedAbility) || canBoardThisRaft;
                const passThrough =
                  view.phase === 'rising_waters' ||
                  stiTokenPassThroughClicks(
                    pickingDestination,
                    legalWaterTargetIds.includes(raft.waterSpaceId),
                    raftSelected,
                  );
                return (
                  <motion.button
                    key={raft.id}
                    type="button"
                    className={cn(
                      'absolute z-20 w-[7.2%] -translate-x-1/2 -translate-y-1/2',
                      !actionable && 'pointer-events-none',
                      passThrough && 'pointer-events-none',
                      stiBoardTokenClass(raftSelected, actionable),
                    )}
                    style={{ aspectRatio: '1.2' }}
                    initial={false}
                    animate={{
                      left: `${point.left}%`,
                      top: `${point.top + (hasPassengers && hasSwimmers ? 0 : hasSwimmers ? -1.0 : hasPassengers ? 1.0 : 0)}%`,
                    }}
                    transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
                    disabled={!actionable}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRaftClick(raft.id);
                    }}
                    aria-label={stiBoardTokenAriaLabel('Raft', raftSelected, actionable)}
                    aria-pressed={raftSelected}
                  >
                    <img
                      className="h-full w-full object-contain"
                      src={stiArt.tokens.raft}
                      alt="Raft"
                    />
                  </motion.button>
                );
              })}
              {view.creatures.flatMap((creature) => {
                if (creature.waterSpaceId === deferredRevealWaterSpace) return [];
                const point = waterPoint(creature.waterSpaceId);
                if (!point) return [];
                const src = stiCreatureSrc(creature.kind);
                const stack = creatureStackById.get(creature.id) ?? { index: 0, total: 1 };
                const offset = creatureStackOffset(stack.index, stack.total);
                const selected =
                  (view.phase === 'action' || view.phase === 'creatures') &&
                  selectedCreatureId === creature.id;
                const actionable = creatureIsActionable(
                  creature,
                  view,
                  selectedAbility,
                  movableCreatureIds,
                );
                const passThrough =
                  view.phase === 'rising_waters' ||
                  stiTokenPassThroughClicks(
                    pickingDestination,
                    legalWaterTargetIds.includes(creature.waterSpaceId),
                    selected,
                  );
                return (
                  <motion.button
                    key={creature.id}
                    type="button"
                    className={cn(
                      'absolute z-25 w-[7.4%] -translate-x-1/2 -translate-y-1/2',
                      selected && 'z-40',
                      !actionable && 'pointer-events-none',
                      passThrough && 'pointer-events-none',
                      stiBoardTokenClass(selected, actionable),
                    )}
                    style={{ scale: offset.scale }}
                    initial={false}
                    animate={{
                      left: `${point.left + offset.left}%`,
                      top: `${point.top + offset.top}%`,
                    }}
                    transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
                    disabled={!actionable}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!actionable) return;
                      if (
                        isCreatureMoveTarget(creature, view, movableCreatureIds) ||
                        isDiveCreatureTarget(view, selectedAbility)
                      ) {
                        setSelectedCreatureId((current) =>
                          current === creature.id ? null : creature.id,
                        );
                      }
                      if (isRepellentCreatureTarget(view, selectedAbility)) {
                        send({
                          type: 'use-ability',
                          ability: 'repellent',
                          creatureId: creature.id,
                        });
                        setSelectedAbility(null);
                      }
                    }}
                    aria-label={stiBoardTokenAriaLabel(creature.kind, selected, actionable)}
                    aria-pressed={selected}
                  >
                    <img className="h-full w-full object-contain" src={src} alt={creature.kind} />
                  </motion.button>
                );
              })}
              {view.adventurers.flatMap((adventurer) => {
                if (adventurer.eliminated || adventurer.rescued) return [];
                const point =
                  adventurer.tileId != null
                    ? surviveTheIslandCellCenter(
                        DEFAULT_SURVIVE_THE_ISLAND_LAYOUT,
                        SURVIVE_THE_ISLAND_CELLS[adventurer.tileId]!,
                      )
                    : adventurer.waterSpaceId
                      ? waterPoint(adventurer.waterSpaceId)
                      : null;
                if (!point) return [];
                const isAboard = adventurer.aboardRaftId != null;
                const isSwimming =
                  adventurer.waterSpaceId != null && adventurer.aboardRaftId == null;
                const stack = adventurerStackById.get(adventurer.id) ?? {
                  index: 0,
                  total: 1,
                  key: '',
                };
                const offset = stack.key.startsWith('raft:')
                  ? raftPassengerRowOffset(stack.index, stack.total)
                  : stack.key.startsWith('swim-raft:')
                    ? swimmingBelowRaftOffset(stack.index, stack.total)
                    : adventurerStackOffset(stack.index, stack.total);
                const selected = view.phase === 'action' && selectedAdventurerId === adventurer.id;
                const actionable = adventurerIsActionable(adventurer, view, myId, selectedAbility);
                const onLegalDestination =
                  (adventurer.tileId != null && legalIslandTargetIds.includes(adventurer.tileId)) ||
                  (adventurer.waterSpaceId != null &&
                    legalWaterTargetIds.includes(adventurer.waterSpaceId));
                const passThrough =
                  view.phase === 'rising_waters' ||
                  stiTokenPassThroughClicks(pickingDestination, onLegalDestination, selected);
                return (
                  <motion.button
                    key={adventurer.id}
                    type="button"
                    className={cn(
                      'absolute z-30 w-[4.8%] -translate-x-1/2 -translate-y-1/2',
                      selected && 'z-40',
                      !actionable && 'pointer-events-none',
                      passThrough && 'pointer-events-none',
                      isSwimming &&
                        !selected &&
                        !actionable &&
                        'drop-shadow-[0_0_6px_#38bdf8] opacity-80',
                      stiBoardTokenClass(selected, actionable),
                    )}
                    style={{ aspectRatio: '0.7' }}
                    initial={false}
                    animate={{
                      left: `${point.left + offset.left}%`,
                      top: `${point.top + offset.top}%`,
                      scale: offset.scale,
                    }}
                    transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
                    disabled={!actionable}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (actionable) {
                        if (selectedAdventurerId === adventurer.id) {
                          setSelectedAdventurerId(null);
                          return;
                        }
                        setSelectedRaftId(null);
                        if (selectedAbility !== 'dolphin' && selectedAbility != null)
                          setSelectedAbility(null);
                        setSelectedAdventurerId(adventurer.id);
                      }
                    }}
                    aria-label={stiBoardTokenAriaLabel('Adventurer', selected, actionable)}
                    aria-pressed={selected}
                  >
                    <img
                      className="h-full w-full object-contain"
                      src={stiAdventurerSrc(adventurer.color)}
                      alt="Adventurer"
                    />
                    {view.myAdventurerTreasures[adventurer.id] != null ? (
                      <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 grid h-[1.05em] min-w-[1.05em] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full px-[0.12em] text-[clamp(7px,0.45vw,10px)] font-black leading-none text-yellow-200 bg-slate-800">
                        {view.myAdventurerTreasures[adventurer.id]}
                      </span>
                    ) : null}
                  </motion.button>
                );
              })}
              {placementPopup
                ? (() => {
                    const point = placementPoint(placementPopup);
                    if (!point) return null;
                    const playerName =
                      view.players.find((player) => player.id === placementPopup.playerId)?.name ??
                      '';
                    return (
                      <SurviveTheIslandPlacementPopup
                        placement={placementPopup}
                        playerName={playerName}
                        point={point}
                        reduceMotion={Boolean(reduceMotion)}
                        onDone={() => setPlacementPopup(null)}
                      />
                    );
                  })()
                : null}
            </div>
          </section>
          <SurviveTheIslandStatusPanel
            view={view}
            myId={myId}
            isMyTurn={isMyTurn}
            selectedAdventurerId={selectedAdventurerId}
            selectedRaftId={selectedRaftId}
            selectedCreatureId={selectedCreatureId}
            selectedAbility={selectedAbility}
            selectedCanBeRescued={selectedCanBeRescued}
            sinkingTerrain={sinkingTerrain ?? null}
            unplacedAdventurers={myUnplacedAdventurers}
            selectedSetupAdventurerId={selectedSetupAdventurer?.id ?? null}
            myUnplacedRaft={myUnplacedRaft}
            showDevTools={import.meta.env.DEV}
            onSelectSetupAdventurer={(adventurerId) => {
              setSelectedSetupAdventurerId((current) =>
                current === adventurerId ? null : adventurerId,
              );
            }}
            onDevAutoPlaceAdventurers={() => send({ type: 'dev-auto-place-adventurers' })}
            onSelectAbility={(ability) => {
              if (rollingCreatureDie) return;
              setSelectedAdventurerId(null);
              setSelectedRaftId(null);
              setSelectedCreatureId(null);
              setSelectedAbility((current) => (current === ability ? null : ability));
            }}
            onFinishAction={() => send({ type: 'finish-action' })}
            onRescue={rescueSelectedAdventurer}
            onRollCreature={startCreatureDieRoll}
            rollingCreatureDie={rollingCreatureDie}
            rollingCreatureFace={rollingCreatureFace}
            movableCreatureCount={movableCreatureIds.size}
            selectedCreatureHasDestinations={
              selectedCreatureId == null || movableCreatureIds.has(selectedCreatureId)
            }
          />
        </div>
        {view.pendingRaftBoarding ? (
          <SurviveTheIslandRaftBoardingModal
            view={view}
            myId={myId}
            onConfirm={(adventurerIds) => send({ type: 'choose-raft-boarding', adventurerIds })}
          />
        ) : null}
        {view.pendingRepellent ? (
          <SurviveTheIslandRepellentModal
            view={view}
            myId={myId}
            onUse={() =>
              send({
                type: 'use-ability',
                ability: 'repellent',
                creatureId: view.pendingRepellent!.creatureId,
              })
            }
            onPass={() => send({ type: 'pass-repellent' })}
          />
        ) : null}
      </div>
    </GameShell>
  );
}
