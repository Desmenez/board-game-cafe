import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { CamelUpColor, CamelUpDesertEffect, CamelUpPlayerView } from 'shared';
import { GamePlayHeader, GameShell } from '../../components/game-shell';
import { PLAYER_HAND_DOCK_RESERVE_PX, usePlayDragSensors } from '../../components/player-hand';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { CamelUpBettingArea } from './components/CamelUpBettingArea';
import { CamelUpDesertHandDock } from './components/CamelUpDesertHandDock';
import { CamelUpGameOverModal } from './components/CamelUpGameOverModal';
import { CamelUpLegEndModal } from './components/CamelUpLegEndModal';
import { CamelUpLegBetHandDock } from './components/CamelUpLegBetHandDock';
import { CamelUpPlayerBar } from './components/CamelUpPlayerBar';
import { CamelUpTrack } from './components/CamelUpTrack';
import { camelUpDesertTileUrl, camelUpLegBetTileUrl } from './lib/assetMeta';
import { parseDesertDragId, parseDesertDropZoneId } from './lib/camelUpDesertDnd';
import { parseLegBetDragId } from './lib/camelUpLegBetDnd';
import { CAMEL_UP_LEG_HAND_DROP_ID } from './lib/camelUpLegBetDnd';
import { spacesForDesert } from './lib/camelUpLegalActions';
import { useCamelTrackAnimation } from './lib/useCamelTrackAnimation';
import './camel-up.css';

type Props = {
  gameState: CamelUpPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

function legBetColorsFromActions(gameState: CamelUpPlayerView): CamelUpColor[] {
  return gameState.legalActions.filter((a) => a.type === 'take-leg-bet-tile').map((a) => a.color);
}

const camelUpCollisionDetection: CollisionDetection = (args) => {
  const desertDrop = rectIntersection({
    ...args,
    droppableContainers: args.droppableContainers.filter((container) =>
      String(container.id).startsWith('camel-up-desert-drop-'),
    ),
  });
  if (desertDrop.length > 0) return desertDrop;
  return pointerWithin(args);
};

export function CamelUpGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const isMyTurn = gameState.activePlayerId === myId && gameState.canAct;
  useYourTurnToast(isMyTurn);

  const playSensors = usePlayDragSensors();
  const [draggingLegColor, setDraggingLegColor] = useState<CamelUpColor | null>(null);
  const [draggingDesertEffect, setDraggingDesertEffect] = useState<CamelUpDesertEffect | null>(
    null,
  );
  const [desertMode, setDesertMode] = useState(false);

  useEffect(() => {
    if (!gameState.canAct) setDesertMode(false);
  }, [gameState.canAct]);

  const myPlayer = useMemo(
    () => gameState.players.find((p) => p.id === myId),
    [gameState.players, myId],
  );
  const myLegBet = myPlayer?.legBet ?? null;
  const draggableLegColors = useMemo(
    () => (gameState.canAct ? legBetColorsFromActions(gameState) : []),
    [gameState.canAct, gameState.legalActions],
  );
  const desertDropSpaces = useMemo(
    () => (gameState.canAct ? spacesForDesert(gameState.legalActions) : []),
    [gameState.canAct, gameState.legalActions],
  );

  const canDropLegBet =
    gameState.phase === 'leg_play' &&
    gameState.canAct &&
    !myLegBet &&
    draggableLegColors.length > 0;
  const showLegHandDock = canDropLegBet;
  const showDesertHandDock =
    gameState.phase === 'leg_play' && desertMode && desertDropSpaces.length > 0;
  const showHandDock = showLegHandDock || showDesertHandDock;

  const activeName = useMemo(() => {
    if (!gameState.activePlayerId) return null;
    return gameState.players.find((p) => p.id === gameState.activePlayerId)?.name ?? null;
  }, [gameState.activePlayerId, gameState.players]);

  const subtitle = useMemo(() => {
    if (gameState.phase === 'leg_scoring' && gameState.legScoringSummary) {
      return `สรุป Leg ${gameState.legScoringSummary.endedLeg}`;
    }
    const parts = [`Leg ${gameState.leg}`];
    if (activeName) parts.push(`ตา: ${activeName}`);
    return parts.join(' · ');
  }, [activeName, gameState.leg, gameState.legScoringSummary, gameState.phase]);

  const isGameOver = gameState.phase === 'game_over';
  const isLegScoring = gameState.phase === 'leg_scoring';
  const { displayTrack, movingStack, isAnimating } = useCamelTrackAnimation(
    gameState.track,
    gameState.lastRoll,
    gameState.desertTiles,
  );
  const showLegEndModal = isLegScoring && Boolean(gameState.legScoringSummary) && !isAnimating;
  const showGameOverModal = isGameOver && !isAnimating;
  const isDragging = draggingLegColor !== null || draggingDesertEffect !== null;

  const onDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    const legColor = parseLegBetDragId(id);
    if (legColor) {
      setDraggingLegColor(legColor);
      return;
    }
    const desertEffect = parseDesertDragId(id);
    if (desertEffect) setDraggingDesertEffect(desertEffect);
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;

      const desertEffect = parseDesertDragId(activeId);
      if (desertEffect) {
        setDraggingDesertEffect(null);
        const space = overId ? parseDesertDropZoneId(overId) : null;
        if (space !== null && desertDropSpaces.includes(space)) {
          sendAction({ type: 'place-desert-tile', space, effect: desertEffect });
          setDesertMode(false);
        }
        return;
      }

      setDraggingLegColor(null);
      const color = parseLegBetDragId(activeId);
      if (!color || overId !== CAMEL_UP_LEG_HAND_DROP_ID) return;
      if (!draggableLegColors.includes(color)) return;
      sendAction({ type: 'take-leg-bet-tile', color });
    },
    [desertDropSpaces, draggableLegColors, sendAction],
  );

  const onDragCancel = useCallback(() => {
    setDraggingLegColor(null);
    setDraggingDesertEffect(null);
  }, []);

  const draggingTile =
    draggingLegColor !== null
      ? gameState.legBetStacks.find((s) => s.color === draggingLegColor)?.values[0]
      : undefined;

  const shell = (
    <GameShell
      className={['camel-up-page', isDragging ? 'camel-up-page--dragging' : '']
        .filter(Boolean)
        .join(' ')}
      style={showHandDock ? { paddingBottom: PLAYER_HAND_DOCK_RESERVE_PX } : undefined}
    >
      <GamePlayHeader
        title="Camel Up"
        subtitle={subtitle}
        leaveLabel={isGameOver ? 'full' : 'short'}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      {gameState.lastEvent ? (
        <p className="camel-up-event" role="status">
          {gameState.lastEvent}
        </p>
      ) : null}

      <div className="camel-up-layout__bottom">
        <CamelUpPlayerBar
          players={gameState.players}
          myId={myId}
          activePlayerId={gameState.activePlayerId}
        />
      </div>

      <div className="camel-up-layout">
        <div className="camel-up-layout__main">
          <CamelUpTrack
            displayTrack={displayTrack}
            movingStack={movingStack}
            desertTiles={gameState.desertTiles}
            players={gameState.players}
            lastRoll={gameState.lastRoll}
            leg={gameState.leg}
            phase={gameState.phase}
            rolledDice={gameState.rolledDice}
            canAct={gameState.canAct}
            legalActions={gameState.legalActions}
            sendAction={sendAction}
            desertMode={desertMode}
            onDesertModeChange={setDesertMode}
            draggingDesertEffect={draggingDesertEffect}
            desertDropSpaces={desertDropSpaces}
            myId={myId}
          />
          <CamelUpBettingArea
            legBetStacks={gameState.legBetStacks}
            draggableLegColors={draggableLegColors}
            overallWinnerPiles={gameState.overallWinnerPiles}
            overallLoserPiles={gameState.overallLoserPiles}
            myOverallBets={gameState.myOverallBets ?? []}
            overallWinnerPlacements={gameState.overallWinnerPlacements ?? []}
            overallLoserPlacements={gameState.overallLoserPlacements ?? []}
            overallWinnerFaceDownCount={gameState.overallWinnerFaceDownCount ?? 0}
            overallLoserFaceDownCount={gameState.overallLoserFaceDownCount ?? 0}
            players={gameState.players}
            revealed={Boolean(gameState.overallBetsRevealed)}
            canAct={gameState.canAct}
            legalActions={gameState.legalActions}
            raceCardsWinnerInHand={gameState.raceCardsWinnerInHand}
            raceCardsLoserInHand={gameState.raceCardsLoserInHand}
            sendAction={sendAction}
          />
        </div>
      </div>

      {showLegHandDock ? (
        <CamelUpLegBetHandDock canDrop={canDropLegBet} isDragging={draggingLegColor !== null} />
      ) : null}

      {showDesertHandDock ? (
        <CamelUpDesertHandDock isDragging={draggingDesertEffect !== null} />
      ) : null}

      {showLegEndModal && gameState.legScoringSummary ? (
        <CamelUpLegEndModal
          summary={gameState.legScoringSummary}
          players={gameState.players}
          myId={myId}
          onContinue={() => sendAction({ type: 'continue-after-leg' })}
        />
      ) : null}

      {showGameOverModal ? (
        <CamelUpGameOverModal
          gameState={gameState}
          myId={myId}
          onLeave={onLeave}
          onRestart={onRestart}
        />
      ) : null}
    </GameShell>
  );

  if (isGameOver || isLegScoring) return shell;

  return (
    <DndContext
      sensors={playSensors}
      collisionDetection={camelUpCollisionDetection}
      autoScroll={{ threshold: { x: 0.12, y: 0.18 } }}
      onDragStart={onDragStart}
      onDragCancel={onDragCancel}
      onDragEnd={onDragEnd}
    >
      {shell}
      <DragOverlay dropAnimation={null}>
        {draggingLegColor && draggingTile !== undefined ? (
          <img
            src={camelUpLegBetTileUrl(draggingLegColor, draggingTile)}
            alt=""
            className="player-hand-drag-overlay camel-up-leg-drag-overlay"
          />
        ) : null}
        {draggingDesertEffect ? (
          <img
            src={camelUpDesertTileUrl(draggingDesertEffect)}
            alt=""
            className="player-hand-drag-overlay camel-up-desert-drag-overlay"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
