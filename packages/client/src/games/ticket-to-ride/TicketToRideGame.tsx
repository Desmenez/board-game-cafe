import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay, type DragEndEvent } from '@dnd-kit/core';
import toast from 'react-hot-toast';
import type { TtrAction, TtrClaimOption, TtrPlayerView } from 'shared';
import { TTR_TRAIN_COLORS, getTtrMap } from 'shared';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import { imageMap } from '../../imageMap';
import {
  fireTtrDestinationCompletedConfetti,
  startWinCelebrationLoop,
} from '../../utils/winCelebration';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { TtrBoardStage } from './components/TtrBoardStage';
import { TtrClaimRoutePanel } from './components/TtrClaimRoutePanel';
import { TtrDrawZone } from './components/TtrDrawZone';
import {
  TTR_DROP_TRAIN_HAND,
  TTR_DROP_TRAIN_HAND_QUICK,
  TTR_TRAIN_HAND_DROP_IDS,
  parseTtrDrawDragId,
  type TtrDrawPick,
} from './ttrDrawDrag';
import { TtrGameOverBody } from './components/TtrGameOverBody';
import { TtrNoticeModals } from './components/TtrNoticeModals';
import { TtrPlayerBar } from './components/TtrPlayerBar';
import { TtrTicketChoiceDock } from './components/TtrTicketChoiceDock';
import { TtrTicketHand } from './components/TtrTicketHand';
import { TtrTrainHand } from './components/TtrTrainHand';
import { TtrTrainDrawToast } from './components/TtrTrainDrawToast';
import { ttrMapPresentation } from './maps';
import './ticket-to-ride.css';

type Props = {
  gameState: TtrPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

const GAME_OVER_TITLE_ID = 'ttr-game-over-title';

export function TicketToRideGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [keepTicketIds, setKeepTicketIds] = useState<string[]>([]);
  const [hoverTicketId, setHoverTicketId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showFaceUpResetNotice, setShowFaceUpResetNotice] = useState(false);
  const [showDestinationCompletedNotice, setShowDestinationCompletedNotice] = useState(false);
  const prevTrainDrawNoticeSeq = useRef(gameState.trainDrawNoticeSeq);
  const prevFaceUpResetSeq = useRef(gameState.faceUpResetNoticeSeq);
  const prevDestinationCompleteSeq = useRef(gameState.destinationCompleteNoticeSeq);

  const map = useMemo(() => getTtrMap(gameState.mapId), [gameState.mapId]);
  const presentation = useMemo(() => ttrMapPresentation(gameState.mapId), [gameState.mapId]);

  const canAct = gameState.phase === 'playing' && gameState.canAct && gameState.myId === myId;
  useYourTurnToast(canAct, gameState.phase === 'playing');

  const mustDrawSecondTrainCard = gameState.mustDrawSecondTrainCard;
  const pendingChoice = gameState.pendingTicketChoice;
  const pendingChoiceSig = pendingChoice?.map((t) => t.id).join('|') ?? '';
  const isInitialChoice = gameState.phase === 'initial_tickets' && pendingChoice != null;
  const minKeepCount = isInitialChoice ? map.setup.minInitialKeep : map.setup.minTicketKeep;
  const isWaitingInitialTicketConfirm =
    gameState.phase === 'initial_tickets' && pendingChoice == null;

  const myTrainCardTotal = useMemo(
    () => TTR_TRAIN_COLORS.reduce((sum, c) => sum + gameState.myHand[c], 0),
    [gameState.myHand],
  );
  const myTrainsLeft = gameState.players.find((p) => p.id === myId)?.trainsLeft ?? 0;

  const seatByPlayerId = useMemo(
    () => Object.fromEntries(gameState.players.map((p, i) => [p.id, i])) as Record<string, number>,
    [gameState.players],
  );
  const playerNameById = useMemo(
    () =>
      Object.fromEntries(gameState.players.map((p) => [p.id, p.name])) as Record<string, string>,
    [gameState.players],
  );
  const claimableRouteIds = useMemo(
    () => new Set(Object.keys(gameState.claimOptions)),
    [gameState.claimOptions],
  );
  const completedTicketIdSet = useMemo(
    () => new Set(gameState.myCompletedTicketIds),
    [gameState.myCompletedTicketIds],
  );
  const highlightedCityIds = useMemo(() => {
    const source = hoverTicketId
      ? (pendingChoice?.find((t) => t.id === hoverTicketId) ??
        gameState.myTickets.find((t) => t.id === hoverTicketId))
      : gameState.myTickets.find((t) => t.id === selectedTicketId);
    return source ? new Set([source.a, source.b]) : new Set<string>();
  }, [gameState.myTickets, hoverTicketId, pendingChoice, selectedTicketId]);

  const selectedRoute = selectedRouteId
    ? (gameState.routes.find((r) => r.id === selectedRouteId) ?? null)
    : null;

  useEffect(() => {
    setKeepTicketIds([]);
    setHoverTicketId(null);
  }, [pendingChoiceSig]);

  useEffect(() => {
    if (gameState.trainDrawNoticeSeq === prevTrainDrawNoticeSeq.current) return;
    prevTrainDrawNoticeSeq.current = gameState.trainDrawNoticeSeq;
    if (gameState.trainDrawNotice) {
      const notice = gameState.trainDrawNotice;
      toast.custom(
        (toastState) => <TtrTrainDrawToast notice={notice} visible={toastState.visible} />,
        {
          id: `ttr-train-draw-${gameState.trainDrawNoticeSeq}`,
          duration: 2600,
          position: 'top-left',
        },
      );
    }
  }, [gameState.trainDrawNotice, gameState.trainDrawNoticeSeq]);

  useEffect(() => {
    if (gameState.faceUpResetNoticeSeq === prevFaceUpResetSeq.current) return;
    prevFaceUpResetSeq.current = gameState.faceUpResetNoticeSeq;
    setShowFaceUpResetNotice(true);
    const timer = setTimeout(() => setShowFaceUpResetNotice(false), 1800);
    return () => clearTimeout(timer);
  }, [gameState.faceUpResetNoticeSeq]);

  useEffect(() => {
    if (gameState.destinationCompleteNoticeSeq === prevDestinationCompleteSeq.current) return;
    prevDestinationCompleteSeq.current = gameState.destinationCompleteNoticeSeq;
    if (!gameState.destinationCompleteNotice) return;
    setShowDestinationCompletedNotice(true);
    fireTtrDestinationCompletedConfetti();
    const timer = setTimeout(() => setShowDestinationCompletedNotice(false), 2200);
    return () => clearTimeout(timer);
  }, [gameState.destinationCompleteNotice, gameState.destinationCompleteNoticeSeq]);

  useEffect(() => {
    if (gameState.phase !== 'game_over') return;
    return startWinCelebrationLoop();
  }, [gameState.phase]);

  useEffect(() => {
    if (selectedTicketId && completedTicketIdSet.has(selectedTicketId)) setSelectedTicketId(null);
  }, [completedTicketIdSet, selectedTicketId]);

  const draw = useCallback(
    (pick: TtrDrawPick) => {
      if (!canAct) return;
      sendAction({ type: 'draw_train_cards', first: pick } satisfies TtrAction);
    },
    [canAct, sendAction],
  );

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    if (!event.over || !TTR_TRAIN_HAND_DROP_IDS.has(String(event.over.id))) return;
    const pick = parseTtrDrawDragId(String(event.active.id));
    if (pick) draw(pick);
  };

  const claimRoute = (option: TtrClaimOption) => {
    if (!canAct || !selectedRouteId) return;
    sendAction({
      type: 'claim_route',
      routeId: selectedRouteId,
      color: option.color,
      locomotivesUsed: option.locomotives,
    } satisfies TtrAction);
    setSelectedRouteId(null);
  };

  const submitKeepTickets = () => {
    if (!pendingChoice || keepTicketIds.length < minKeepCount) return;
    sendAction({
      type: isInitialChoice ? 'keep_initial_tickets' : 'keep_drawn_tickets',
      keepIds: keepTicketIds,
    } satisfies TtrAction);
  };

  const iWon = gameState.gameResult?.winners.includes(myId) ?? false;

  return (
    <GameShell className={`ttr-page${pendingChoice ? ' ttr-page--ticket-dock-open' : ''}`}>
      <GamePlayHeader
        title="Ticket to Ride"
        subtitle={map.name}
        onLeave={onLeave}
        onRestart={onRestart}
        leaveLabel="full"
      />
      <div className="ttr-body">
        <div className="ttr-main-column">
          <TtrPlayerBar
            players={gameState.players}
            currentPlayerId={gameState.currentPlayerId}
            myId={myId}
            seatByPlayerId={seatByPlayerId}
            isFinalRound={gameState.phase === 'playing' && gameState.finalTurnsRemaining === 1}
            lastEvent={gameState.lastEvent}
          />

          <DndContext
            onDragStart={(e) => setActiveDragId(String(e.active.id))}
            onDragCancel={() => setActiveDragId(null)}
            onDragEnd={onDragEnd}
          >
            <TtrBoardStage
              hint="คลิกเส้นทางบนแผนที่เพื่อดูวิธีจ่ายการ์ด · เส้นที่ลงได้ตอนนี้จะเรืองสีทอง · Ctrl + ล้อเมาส์เพื่อซูม"
              map={map}
              image={presentation.image}
              layout={presentation.layout}
              routes={gameState.routes}
              seatByPlayerId={seatByPlayerId}
              playerNameById={playerNameById}
              claimableRouteIds={claimableRouteIds}
              selectedRouteId={selectedRouteId}
              onRouteSelect={(routeId) =>
                setSelectedRouteId((prev) => (prev === routeId ? null : routeId))
              }
              highlightedCityIds={highlightedCityIds}
            />

            {selectedRoute ? (
              <TtrClaimRoutePanel
                map={map}
                route={selectedRoute}
                options={gameState.claimOptions[selectedRoute.id] ?? []}
                myHand={gameState.myHand}
                ownerName={
                  selectedRoute.ownerId ? playerNameById[selectedRoute.ownerId] : undefined
                }
                canAct={canAct && !mustDrawSecondTrainCard}
                onClaim={claimRoute}
                onClose={() => setSelectedRouteId(null)}
              />
            ) : null}

            <div className="ttr-sections">
              <section className="card ttr-panel">
                <div className="ttr-quick-hand-under-map__split">
                  <div className="ttr-quick-hand-under-map__pane">
                    <p className="ttr-quick-hand-under-map__title">การ์ดโบกี้บนมือ</p>
                    <TtrTrainHand
                      dropId={TTR_DROP_TRAIN_HAND_QUICK}
                      hand={gameState.myHand}
                      canDrop={canAct}
                      compact
                      cardsClassName="ttr-quick-hand-under-map__row"
                    />
                  </div>
                  <div className="ttr-quick-hand-under-map__pane ttr-quick-hand-under-map__pane--right">
                    <p className="ttr-quick-hand-under-map__title">การ์ดเส้นทางบนมือ</p>
                    <TtrTicketHand
                      map={map}
                      layout={presentation.layout}
                      tickets={gameState.myTickets}
                      completedIds={completedTicketIdSet}
                      selectedTicketId={selectedTicketId}
                      onSelect={(id) => setSelectedTicketId((prev) => (prev === id ? null : id))}
                      variant="quick"
                    />
                  </div>
                </div>
              </section>

              <TtrDrawZone
                faceUpTrainCards={gameState.faceUpTrainCards}
                canAct={canAct}
                mustDrawSecondTrainCard={mustDrawSecondTrainCard}
                deckTicketsRemaining={gameState.deckTicketsRemaining}
                onDraw={draw}
                onDrawTickets={() => {
                  if (!canAct || mustDrawSecondTrainCard) return;
                  sendAction({ type: 'draw_destination_tickets' } satisfies TtrAction);
                }}
              />

              <section className="card ttr-panel ttr-hand-row">
                <div className="flex w-full items-center justify-between">
                  <h3>การ์ดบนมือคุณ</h3>
                  <p className="ttr-hand-summary">
                    รถไฟคงเหลือ {myTrainsLeft} ขบวน · การ์ดรถไฟรวม {myTrainCardTotal} ใบ ·
                    locomotive {gameState.myHand.locomotive} ใบ
                  </p>
                </div>
                <div className="ttr-hand-grid">
                  <div className="ttr-hand-block">
                    <h4>การ์ดรถไฟบนมือ</h4>
                    <TtrTrainHand
                      dropId={TTR_DROP_TRAIN_HAND}
                      hand={gameState.myHand}
                      canDrop={canAct}
                    />
                  </div>
                  <div className="ttr-hand-block">
                    <h4>การ์ดเส้นทางบนมือ</h4>
                    <TtrTicketHand
                      map={map}
                      layout={presentation.layout}
                      tickets={gameState.myTickets}
                      completedIds={completedTicketIdSet}
                      selectedTicketId={selectedTicketId}
                      onSelect={(id) => setSelectedTicketId((prev) => (prev === id ? null : id))}
                    />
                  </div>
                </div>
              </section>
            </div>

            <DragOverlay>
              {activeDragId ? (
                <div className="ttr-drag-overlay">
                  {activeDragId === 'draw:deck' ? (
                    <img src={imageMap.ticketToRide.trainCardBack} alt="" />
                  ) : activeDragId.startsWith('draw:faceup:') ? (
                    <img
                      src={
                        imageMap.ticketToRide.trainCards[
                          gameState.faceUpTrainCards[
                            Number(activeDragId.replace('draw:faceup:', ''))
                          ] ?? 'locomotive'
                        ]
                      }
                      alt=""
                    />
                  ) : null}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {pendingChoice ? (
            <TtrTicketChoiceDock
              map={map}
              layout={presentation.layout}
              tickets={pendingChoice}
              minKeep={minKeepCount}
              isInitialChoice={isInitialChoice}
              keepIds={keepTicketIds}
              onToggleKeep={(id) =>
                setKeepTicketIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                )
              }
              onHoverTicket={setHoverTicketId}
              onConfirm={submitKeepTickets}
            />
          ) : null}

          <TtrNoticeModals
            map={map}
            layout={presentation.layout}
            waitingInitialTickets={
              isWaitingInitialTicketConfirm ? gameState.initialTicketConfirmProgress : null
            }
            faceUpReset={showFaceUpResetNotice ? map.rules.faceUpLocomotiveReset : null}
            destinationComplete={
              showDestinationCompletedNotice ? gameState.destinationCompleteNotice : null
            }
          />
        </div>
      </div>

      {gameState.phase === 'game_over' && gameState.gameResult ? (
        <GameOverModal
          titleId={GAME_OVER_TITLE_ID}
          onLeave={onLeave}
          onRestart={onRestart}
          tone={iWon ? 'win' : 'default'}
          panelClassName="ttr-game-over-modal"
        >
          <TtrGameOverBody
            titleId={GAME_OVER_TITLE_ID}
            iWon={iWon}
            reason={gameState.gameResult.reason}
            rows={gameState.finalScoreSummary ?? []}
            winners={new Set(gameState.gameResult.winners)}
            myId={myId}
          />
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
