import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Salem1692Action, Salem1692PlayerView } from 'shared';
import { GamePlayHeader, GameShell } from '../../components/game-shell';
import { PlayerHand, PLAYER_HAND_DOCK_PEEK_RESERVE_PX } from '../../components/player-hand';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { Salem1692AccusationRevealModal } from './components/Salem1692AccusationRevealModal';
import {
  SALEM_DISCARD_DROP_ID,
  SALEM_DRAW_DRAG_ID,
  SALEM_HAND_DROP_ID,
  Salem1692Board,
  Salem1692HandDockDropzone,
} from './components/Salem1692Board';
import { Salem1692CompositionStage } from './components/Salem1692CompositionStage';
import { Salem1692ConspiracyModal } from './components/Salem1692ConspiracyModal';
import { Salem1692DawnModal } from './components/Salem1692DawnModal';
import { Salem1692FrontCardsPanel } from './components/Salem1692FrontCardsPanel';
import { Salem1692GameOverModal } from './components/Salem1692GameOverModal';
import { Salem1692NightModal } from './components/Salem1692NightModal';
import { Salem1692PlayTargetModal } from './components/Salem1692PlayTargetModal';
import { Salem1692PlayerStatusPanel } from './components/Salem1692PlayerStatusPanel';
import { Salem1692RoleReveal } from './components/Salem1692RoleReveal';
import { Salem1692StocksSkipModal } from './components/Salem1692StocksSkipModal';
import { Salem1692TryalRow } from './components/Salem1692TryalRow';
import { CARD_BACK_URL, salem1692CardLabelTh, salem1692PlayingCardImage } from './lib/cardMeta';
import './salem-1692.css';

type Salem1692PlayingCardKind = Salem1692PlayerView['you']['hand'][number]['kind'];

type Props = {
  gameState: Salem1692PlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

function needsTarget(kind: Salem1692PlayingCardKind): boolean {
  return kind !== 'conspiracy' && kind !== 'night';
}

function isRevealIntroPhase(phase: Salem1692PlayerView['phase']) {
  return phase === 'composition' || phase === 'role_reveal';
}

export function Salem1692Game({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const deckRef = useRef<HTMLDivElement>(null);
  const [shuffleTick, setShuffleTick] = useState(0);
  const [handDragCardId, setHandDragCardId] = useState<string | null>(null);
  const [drawDragging, setDrawDragging] = useState(false);

  const isMyTurn = gameState.currentPlayerId === myId;
  const isGameOver = gameState.phase === 'game_over';
  const isIntro = isRevealIntroPhase(gameState.phase);
  const playerCount = gameState.players.length;
  const pendingPlay = gameState.pendingPlay;
  const midDraw = gameState.drawsLeftThisAction != null;

  const canDraw =
    isMyTurn &&
    gameState.phase === 'playing' &&
    gameState.cardsPlayedThisTurn === 0 &&
    !gameState.you.hasDrawnThisTurn &&
    !pendingPlay &&
    !gameState.pendingAccusation &&
    !gameState.pendingStocksSkip &&
    gameState.you.alive;

  const canPlayFromHand =
    isMyTurn &&
    gameState.phase === 'playing' &&
    !midDraw &&
    !gameState.you.hasDrawnThisTurn &&
    !pendingPlay &&
    !gameState.pendingAccusation &&
    !gameState.pendingStocksSkip &&
    gameState.you.alive;

  const canEndTurn =
    isMyTurn &&
    gameState.phase === 'playing' &&
    gameState.cardsPlayedThisTurn >= 1 &&
    !midDraw &&
    !pendingPlay &&
    !gameState.pendingAccusation &&
    !gameState.pendingStocksSkip &&
    gameState.you.alive;

  useYourTurnToast(
    isMyTurn && gameState.phase === 'playing' && !gameState.pendingStocksSkip && !isGameOver,
  );

  useEffect(() => {
    setHandDragCardId(null);
    setDrawDragging(false);
  }, [gameState.currentPlayerId, gameState.phase]);

  const send = useCallback((a: Salem1692Action) => sendAction(a), [sendAction]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const drawOne = useCallback(() => {
    if (!canDraw) return;
    send({ type: 'draw_card' });
    setShuffleTick((t) => t + 1);
  }, [canDraw, send]);

  const onDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id === SALEM_DRAW_DRAG_ID) {
      setDrawDragging(true);
      return;
    }
    if (id.startsWith('hand-')) setHandDragCardId(id.slice('hand-'.length));
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : '';
      setHandDragCardId(null);
      setDrawDragging(false);

      if (activeId === SALEM_DRAW_DRAG_ID && overId === SALEM_HAND_DROP_ID) {
        drawOne();
        return;
      }

      if (activeId.startsWith('hand-') && overId === SALEM_DISCARD_DROP_ID) {
        if (!canPlayFromHand) return;
        const cardId = activeId.slice('hand-'.length);
        const card = gameState.you.hand.find((c) => c.id === cardId);
        if (!card) return;
        if (needsTarget(card.kind)) {
          send({ type: 'begin_play', cardId });
        } else {
          send({ type: 'play_card', cardId });
        }
      }
    },
    [canPlayFromHand, drawOne, gameState.you.hand, send],
  );

  const handDragCard = useMemo(() => {
    if (!handDragCardId) return null;
    return gameState.you.hand.find((c) => c.id === handDragCardId) ?? null;
  }, [handDragCardId, gameState.you.hand]);

  const currentName =
    gameState.players.find((p) => p.id === gameState.currentPlayerId)?.name ?? '—';
  const subtitle = isIntro
    ? gameState.phase === 'composition'
      ? 'ดู Tryal ในสำรับ'
      : 'รับบทของตัวเอง'
    : `เทิร์น: ${currentName} · กองเหลือ ${gameState.drawPileCount} · Witch ${gameState.revealedWitchTryalCount}/${gameState.totalWitchTryalCount}`;

  const sectionDesc = canEndTurn
    ? `เล่นไปแล้ว ${gameState.cardsPlayedThisTurn} ใบ — เล่นต่อได้ หรือกดจบตา`
    : canPlayFromHand && canDraw
      ? 'เลือกอย่างใดอย่างหนึ่ง: เล่นการ์ดจากมือ (เล่นต่อได้) หรือจั่ว 2 ใบแล้วจบเทิร์น'
      : canPlayFromHand
        ? 'ลากการ์ดจากมือไปกองทิ้งเพื่อเล่น — กดจบตาเมื่อเล่นครบแล้ว'
        : canDraw && midDraw
          ? `จั่วต่ออีก ${gameState.drawsLeftThisAction} ใบ แล้วจบเทิร์น`
          : canDraw
            ? 'ลากกองจั่วลงมือหรือกดจั่ว — จั่ว 2 ใบจบเทิร์น'
            : isMyTurn
              ? 'รอเลือกเป้าหมายหรือจบแอ็กชัน'
              : 'ดูสถานะกองจั่ว / กองทิ้ง — รอเทิร์นของคุณ';

  const onAccusationAck = useCallback(() => {
    send({ type: 'ack_accusation_reveal' });
  }, [send]);

  const showHandDock = !isIntro && gameState.you.hand.length > 0;
  const handDragMode = canPlayFromHand ? ('play' as const) : ('none' as const);

  return (
    <GameShell
      className="s1692-shell"
      style={{
        paddingBottom: showHandDock ? PLAYER_HAND_DOCK_PEEK_RESERVE_PX : undefined,
      }}
    >
      <GamePlayHeader
        title="Salem 1692"
        subtitle={subtitle}
        onLeave={onLeave}
        onRestart={onRestart}
        trailing={
          !isIntro ? (
            <span className="s1692-event" title={gameState.lastEvent}>
              {gameState.lastEvent}
            </span>
          ) : undefined
        }
      />

      {gameState.phase === 'composition' && gameState.tryalComposition && (
        <Salem1692CompositionStage
          composition={gameState.tryalComposition}
          hasAcknowledged={gameState.hasAcknowledgedComposition}
          progress={gameState.compositionAcknowledgeProgress ?? { current: 0, total: playerCount }}
          onAcknowledge={() => send({ type: 'acknowledge_composition' })}
        />
      )}

      {gameState.phase === 'role_reveal' && (
        <Salem1692RoleReveal
          secretRole={gameState.you.secretRole}
          tryals={gameState.you.tryals}
          witchAllies={gameState.roleRevealWitchAllies}
          hasAcknowledged={gameState.hasAcknowledgedRole}
          progress={gameState.roleAcknowledgeProgress ?? { current: 0, total: playerCount }}
          onAcknowledge={() => send({ type: 'acknowledge_role' })}
        />
      )}

      {!isIntro && (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={onDragStart}
          onDragCancel={() => {
            setHandDragCardId(null);
            setDrawDragging(false);
          }}
          onDragEnd={onDragEnd}
        >
          <main className="flex flex-col gap-4">
            <Salem1692PlayerStatusPanel
              players={gameState.players}
              myId={myId}
              currentPlayerId={gameState.currentPlayerId}
              myTryals={gameState.you.tryals}
              witchTeamIds={gameState.witchTeamIds}
            />

            <Salem1692FrontCardsPanel
              frontCards={gameState.you.frontCards}
              hasBlackCat={gameState.you.hasBlackCat}
              matchmakerPartnerName={gameState.you.matchmakerPartnerName}
              accusationPoints={gameState.you.accusationPoints}
            />

            <Salem1692TryalRow tryals={gameState.you.tryals} title="Tryal ของคุณ" ownerView />

            <Salem1692Board
              ref={deckRef}
              drawPileCount={gameState.drawPileCount}
              discardPileCount={gameState.discardPileCount}
              discardTop={gameState.discardTop}
              shuffleTick={shuffleTick}
              canDraw={canDraw}
              canDropPlay={canPlayFromHand}
              drawsLeftThisAction={gameState.drawsLeftThisAction}
              pendingPlay={pendingPlay}
              revealedWitchTryalCount={gameState.revealedWitchTryalCount}
              totalWitchTryalCount={gameState.totalWitchTryalCount}
              cardsPlayedThisTurn={
                isMyTurn && gameState.phase === 'playing' && !gameState.pendingStocksSkip
                  ? gameState.cardsPlayedThisTurn
                  : 0
              }
              canEndTurn={canEndTurn}
              onDraw={drawOne}
              onEndTurn={() => send({ type: 'end_turn' })}
              sectionDesc={sectionDesc}
            />

            {showHandDock ? (
              <>
                {canDraw ? <Salem1692HandDockDropzone disabled={!canDraw} /> : null}
                <PlayerHand
                  cards={gameState.you.hand}
                  getCardId={(c) => c.id}
                  dragMode={handDragMode}
                  dockPeek
                  getPreview={(card) => ({
                    src: salem1692PlayingCardImage(card.kind),
                    alt: salem1692CardLabelTh(card.kind),
                    caption: salem1692CardLabelTh(card.kind),
                  })}
                  renderCard={({ card }) => (
                    <img
                      src={salem1692PlayingCardImage(card.kind)}
                      alt=""
                      className="s1692-player-hand-card-img"
                      loading="lazy"
                    />
                  )}
                  aria-label={`มือของคุณ (${gameState.you.hand.length} ใบ)`}
                  className="s1692-player-hand-dock"
                />
              </>
            ) : null}
          </main>

          <DragOverlay dropAnimation={null}>
            {handDragCard ? (
              <img
                src={salem1692PlayingCardImage(handDragCard.kind)}
                alt=""
                className="player-hand-drag-overlay"
              />
            ) : drawDragging ? (
              <img src={CARD_BACK_URL} alt="" className="player-hand-drag-overlay" />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {pendingPlay ? (
        <Salem1692PlayTargetModal
          pendingPlay={pendingPlay}
          players={gameState.players}
          myId={myId}
          isActor={pendingPlay.actorId === myId}
          witchTeamIds={gameState.witchTeamIds}
          onConfirm={({ targetId, secondTargetId, selectedCardIds }) =>
            send({ type: 'confirm_play', targetId, secondTargetId, selectedCardIds })
          }
          onCancel={() => send({ type: 'cancel_play' })}
        />
      ) : null}

      {gameState.phase === 'dawn' && (
        <Salem1692DawnModal
          players={gameState.players}
          myId={myId}
          canChoose={gameState.canDawnBlackCat}
          witchTeamIds={gameState.witchTeamIds}
          dawnBlackCatVotes={gameState.dawnBlackCatVotes}
          dawnBlackCatConsensusTargetId={gameState.dawnBlackCatConsensusTargetId}
          onSelect={(targetId) => send({ type: 'dawn_select_black_cat', targetId })}
          onConfirm={() => send({ type: 'dawn_confirm_black_cat' })}
        />
      )}

      {(gameState.phase === 'night_witch' ||
        gameState.phase === 'night_constable' ||
        gameState.phase === 'night_confess' ||
        gameState.phase === 'night_result') && (
        <Salem1692NightModal
          phase={gameState.phase}
          players={gameState.players}
          myId={myId}
          myTryals={gameState.you.tryals}
          canNightWitchKill={gameState.canNightWitchKill}
          canNightConstableSave={gameState.canNightConstableSave}
          canNightConfess={gameState.canNightConfess}
          hasConfessed={gameState.hasConfessed}
          witchTeamIds={gameState.witchTeamIds}
          nightWitchKillVotes={gameState.nightWitchKillVotes}
          nightWitchKillConsensusTargetId={gameState.nightWitchKillConsensusTargetId}
          gavelHolderId={gameState.gavelHolderId}
          gavelHolderName={gameState.gavelHolderName}
          pendingNightResult={gameState.pendingNightResult}
          onWitchSelect={(targetId) => send({ type: 'night_witch_select', targetId })}
          onWitchConfirm={() => send({ type: 'night_witch_confirm' })}
          onConstableSave={(id) => send({ type: 'night_constable_save', targetId: id })}
          onConfess={(tryalId) => send({ type: 'night_confess', tryalId })}
          onSkipConfess={() => send({ type: 'night_skip_confess' })}
          onResultAck={() => send({ type: 'night_result_ack' })}
        />
      )}

      {gameState.phase === 'conspiracy' && gameState.pendingConspiracy && (
        <Salem1692ConspiracyModal
          pending={gameState.pendingConspiracy}
          myId={myId}
          myName={gameState.you.name}
          myTryals={gameState.you.tryals}
          isWitchTeam={gameState.you.isWitchTeam}
          isConstable={gameState.you.isConstable}
          witchTeamIds={gameState.witchTeamIds}
          onSelectTryal={(tryalId) => send({ type: 'conspiracy_select_tryal', tryalId })}
          onRevealTryal={(tryalId) => send({ type: 'conspiracy_reveal_tryal', tryalId })}
          onAckReveal={() => send({ type: 'conspiracy_ack_view' })}
          onPassSelect={(tryalId) => send({ type: 'conspiracy_pass_select', tryalId })}
          onPeekAck={() => send({ type: 'conspiracy_peek_ack' })}
        />
      )}

      {gameState.pendingStocksSkip ? (
        <Salem1692StocksSkipModal
          pending={gameState.pendingStocksSkip}
          myId={myId}
          onAck={() => send({ type: 'stocks_ack_skip' })}
        />
      ) : null}

      {gameState.pendingAccusation ? (
        <Salem1692AccusationRevealModal
          pending={gameState.pendingAccusation}
          myId={myId}
          myTryals={gameState.you.tryals}
          isActor={gameState.pendingAccusation.actorId === myId}
          witchTeamIds={gameState.witchTeamIds}
          onSelect={(tryalId) => send({ type: 'select_tryal_on_accusation', tryalId })}
          onReveal={(tryalId) =>
            send({
              type: 'reveal_tryal_on_accusation',
              targetId: gameState.pendingAccusation!.targetId,
              tryalId,
            })
          }
          onAck={onAccusationAck}
        />
      ) : null}

      {isGameOver && gameState.gameResult ? (
        <Salem1692GameOverModal
          gameState={gameState}
          myId={myId}
          onLeave={onLeave}
          onRestart={onRestart}
        />
      ) : null}
    </GameShell>
  );
}
