import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay, type DragEndEvent } from '@dnd-kit/core';
import { Landmark } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TtrAction, TtrClaimOption, TtrPlayerView } from 'shared';
import { TTR_TRAIN_COLORS, getTtrMap } from 'shared';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import { Button } from '../../components/ui';
import { imageMap } from '../../imageMap';
import {
  fireTtrDestinationCompletedConfetti,
  startWinCelebrationLoop,
} from '../../utils/winCelebration';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { TtrBoardStage } from './components/TtrBoardStage';
import { TtrBuildStationPanel } from './components/TtrBuildStationPanel';
import { TtrDrawZone } from './components/TtrDrawZone';
import { TTR_TRAIN_HAND_DROP_IDS, parseTtrDrawDragId, type TtrDrawPick } from './ttrDrawDrag';
import { TtrGameOverBody } from './components/TtrGameOverBody';
import { TtrHandDock } from './components/TtrHandDock';
import { TtrNoticeModals } from './components/TtrNoticeModals';
import { TtrPlayerBar } from './components/TtrPlayerBar';
import { TtrTicketChoiceDock } from './components/TtrTicketChoiceDock';
import { TtrTrainDrawToast } from './components/TtrTrainDrawToast';
import { TtrTunnelModal } from './components/TtrTunnelModal';
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
  const [stationMode, setStationMode] = useState(false);
  const [stationCityId, setStationCityId] = useState<string | null>(null);
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
  /** A revealed tunnel must be resolved before any other action is legal. */
  const canPlayAction = canAct && gameState.pendingTunnel == null;

  const mustDrawSecondTrainCard = gameState.mustDrawSecondTrainCard;
  const pendingChoice = gameState.pendingTicketChoice;
  const pendingChoiceSig = pendingChoice?.map((t) => t.id).join('|') ?? '';
  const isInitialChoice = gameState.phase === 'initial_tickets' && pendingChoice != null;
  const mandatoryTicketIds = gameState.mandatoryTicketIds;
  const mandatoryIdSet = useMemo(() => new Set(mandatoryTicketIds), [mandatoryTicketIds]);
  const mandatorySig = mandatoryTicketIds.join('|');
  const minKeep = isInitialChoice ? map.setup.minInitialKeep : map.setup.minTicketKeep;
  const keepCount = keepTicketIds.length;
  const keptAllMandatory = mandatoryTicketIds.every((id) => keepTicketIds.includes(id));
  const canConfirmKeep = keepCount >= minKeep && keptAllMandatory;
  const isWaitingInitialTicketConfirm =
    gameState.phase === 'initial_tickets' && pendingChoice == null;
  const pendingTunnel = gameState.pendingTunnel;

  const myTrainCardTotal = useMemo(
    () => TTR_TRAIN_COLORS.reduce((sum, c) => sum + gameState.myHand[c], 0),
    [gameState.myHand],
  );
  const me = gameState.players.find((p) => p.id === myId);
  const myTrainsLeft = me?.trainsLeft ?? 0;
  const myStationsLeft = me?.stationsLeft ?? 0;
  const stationsSupported = map.stationsPerPlayer > 0;

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
  const stationEligibleCityIds = useMemo(
    () => new Set(Object.keys(gameState.stationOptions)),
    [gameState.stationOptions],
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
    setKeepTicketIds(mandatorySig.length > 0 ? mandatorySig.split('|') : []);
    setHoverTicketId(null);
  }, [pendingChoiceSig, mandatorySig]);

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

  const canBuildStation =
    stationsSupported &&
    canPlayAction &&
    !mustDrawSecondTrainCard &&
    pendingChoice == null &&
    myStationsLeft > 0 &&
    stationEligibleCityIds.size > 0;

  useEffect(() => {
    if (canBuildStation) return;
    setStationMode(false);
    setStationCityId(null);
  }, [canBuildStation]);

  useEffect(() => {
    if (!stationCityId) return;
    if (!stationEligibleCityIds.has(stationCityId)) setStationCityId(null);
  }, [stationCityId, stationEligibleCityIds]);

  const draw = useCallback(
    (pick: TtrDrawPick) => {
      if (!canPlayAction) return;
      sendAction({ type: 'draw_train_cards', first: pick } satisfies TtrAction);
    },
    [canPlayAction, sendAction],
  );

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    if (!event.over || !TTR_TRAIN_HAND_DROP_IDS.has(String(event.over.id))) return;
    const pick = parseTtrDrawDragId(String(event.active.id));
    if (pick) draw(pick);
  };

  const claimRoute = (option: TtrClaimOption) => {
    if (!canPlayAction || !selectedRouteId) return;
    sendAction({
      type: 'claim_route',
      routeId: selectedRouteId,
      color: option.color,
      locomotivesUsed: option.locomotives,
    } satisfies TtrAction);
    setSelectedRouteId(null);
  };

  const buildStation = (option: TtrClaimOption) => {
    if (!canPlayAction || !stationCityId) return;
    sendAction({
      type: 'build_station',
      cityId: stationCityId,
      color: option.color,
      locomotivesUsed: option.locomotives,
    } satisfies TtrAction);
    setStationCityId(null);
    setStationMode(false);
  };

  const resolveTunnel = (option: TtrClaimOption | null) => {
    if (!canAct || !pendingTunnel) return;
    const action: TtrAction = option
      ? {
          type: 'resolve_tunnel_claim',
          accept: true,
          color: option.color,
          locomotivesUsed: option.locomotives,
        }
      : { type: 'resolve_tunnel_claim', accept: true };
    sendAction(action);
  };

  const refuseTunnel = () => {
    if (!canAct || !pendingTunnel) return;
    sendAction({ type: 'resolve_tunnel_claim', accept: false } satisfies TtrAction);
  };

  const submitKeepTickets = () => {
    if (!pendingChoice || !canConfirmKeep) return;
    sendAction({
      type: isInitialChoice ? 'keep_initial_tickets' : 'keep_drawn_tickets',
      keepIds: keepTicketIds,
    } satisfies TtrAction);
  };

  const iWon = gameState.gameResult?.winners.includes(myId) ?? false;
  const showHandDock = pendingChoice == null;

  return (
    <GameShell
      className={`ttr-page${pendingChoice ? ' ttr-page--ticket-dock-open' : ''}${showHandDock ? ' ttr-page--hand-dock' : ''}`}
    >
      <GamePlayHeader
        title="Ticket to Ride"
        subtitle={map.name}
        onLeave={onLeave}
        onRestart={onRestart}
        leaveLabel="full"
      />
      <div className="ttr-body pb-40">
        <div className="ttr-main-column">
          <TtrPlayerBar
            players={gameState.players}
            currentPlayerId={gameState.currentPlayerId}
            myId={myId}
            seatByPlayerId={seatByPlayerId}
            isFinalRound={gameState.phase === 'playing' && gameState.finalTurnsRemaining === 1}
            lastEvent={gameState.lastEvent}
            showStations={map.stationsPerPlayer > 0}
          />

          <DndContext
            onDragStart={(e) => setActiveDragId(String(e.active.id))}
            onDragCancel={() => setActiveDragId(null)}
            onDragEnd={onDragEnd}
          >
            <TtrBoardStage
              hint={
                stationMode
                  ? 'โหมดสร้างสถานี: คลิกเมืองที่เรืองแสงเพื่อเลือกวิธีจ่ายการ์ด · Ctrl + ล้อเมาส์เพื่อซูม'
                  : 'ลากการ์ดรถไฟมาวางที่มือด้านล่าง · คลิกเส้นทางแล้วเลือกการ์ดจากมือเพื่อลง · Ctrl + ล้อเมาส์เพื่อซูม'
              }
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
              stationsByCity={gameState.stationsByCity}
              stationEligibleCityIds={stationEligibleCityIds}
              stationMode={stationMode}
              selectedStationCityId={stationCityId}
              onStationCitySelect={(cityId) =>
                setStationCityId((prev) => (prev === cityId ? null : cityId))
              }
            />

            {stationsSupported ? (
              <div className="ttr-station-bar">
                <Button
                  type="button"
                  size="sm"
                  variant={stationMode ? 'secondary' : 'primary'}
                  disabled={!canBuildStation}
                  onClick={() => {
                    setStationMode((prev) => !prev);
                    setStationCityId(null);
                    setSelectedRouteId(null);
                  }}
                >
                  <Landmark size={14} aria-hidden />
                  {stationMode ? 'ยกเลิกโหมดสร้างสถานี' : 'สร้างสถานี'}
                </Button>
                <span className="ttr-station-bar__meta">
                  สถานีคงเหลือ {myStationsLeft}/{map.stationsPerPlayer} หลัง
                  {canBuildStation ? '' : ' · ตอนนี้ยังสร้างไม่ได้'}
                </span>
              </div>
            ) : null}

            {stationMode && stationCityId ? (
              <TtrBuildStationPanel
                map={map}
                cityId={stationCityId}
                options={gameState.stationOptions[stationCityId] ?? []}
                stationsLeft={myStationsLeft}
                canAct={canBuildStation}
                onBuild={buildStation}
                onClose={() => setStationCityId(null)}
              />
            ) : null}

            <div className="ttr-sections">
              <TtrDrawZone
                faceUpTrainCards={gameState.faceUpTrainCards}
                canAct={canPlayAction && !stationMode}
                mustDrawSecondTrainCard={mustDrawSecondTrainCard}
                deckRegularTicketsRemaining={gameState.deckRegularTicketsRemaining}
                onDrawTickets={() => {
                  if (!canPlayAction || stationMode || mustDrawSecondTrainCard) return;
                  sendAction({ type: 'draw_destination_tickets' } satisfies TtrAction);
                }}
              />
            </div>

            {showHandDock ? (
              <TtrHandDock
                map={map}
                hand={gameState.myHand}
                tickets={gameState.myTickets}
                completedIds={completedTicketIdSet}
                selectedTicketId={selectedTicketId}
                onSelectTicket={(id) => setSelectedTicketId((prev) => (prev === id ? null : id))}
                canDrop={canPlayAction}
                myTrainsLeft={myTrainsLeft}
                myTrainCardTotal={myTrainCardTotal}
                selectedRoute={selectedRoute}
                claimOptions={selectedRoute ? (gameState.claimOptions[selectedRoute.id] ?? []) : []}
                canClaim={canPlayAction && !mustDrawSecondTrainCard && !stationMode}
                ownerName={
                  selectedRoute?.ownerId ? playerNameById[selectedRoute.ownerId] : undefined
                }
                onClaim={claimRoute}
                onCancelClaim={() => setSelectedRouteId(null)}
              />
            ) : null}

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
              tickets={pendingChoice}
              minKeep={minKeep}
              keepCount={keepCount}
              isInitialChoice={isInitialChoice}
              longTicketsMandatory={map.setup.longTicketsMandatory}
              keepIds={keepTicketIds}
              lockedIds={mandatoryTicketIds}
              canConfirm={canConfirmKeep}
              onToggleKeep={(id) => {
                if (mandatoryIdSet.has(id)) return;
                setKeepTicketIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                );
              }}
              onHoverTicket={setHoverTicketId}
              onConfirm={submitKeepTickets}
            />
          ) : null}

          {pendingTunnel ? (
            <TtrTunnelModal
              map={map}
              tunnel={pendingTunnel}
              onAccept={resolveTunnel}
              onRefuse={refuseTunnel}
            />
          ) : null}

          <TtrNoticeModals
            map={map}
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
            map={map}
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
