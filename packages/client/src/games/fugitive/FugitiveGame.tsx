import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  FugitiveAction,
  FugitiveDrawPile,
  FugitiveHideoutView,
  FugitivePlayerView,
} from 'shared';
import { sprintValue } from 'shared';
import { Check, Footprints } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  GameHistoryDisclosure,
  GameOverModal,
  GamePlayHeader,
  GameShell,
} from '../../components/game-shell';
import {
  PlayerHand,
  PLAYER_HAND_DOCK_PEEK_RESERVE_PX,
  useLockBodyScroll,
  useNewlyDrawnCardIds,
  usePlayDragSensors,
} from '../../components/player-hand';
import { PlayerRosterStrip } from '../../components/player-roster';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { FugitiveCardFace } from './components/FugitiveCardFace';
import { FugitiveGuessToast } from './components/FugitiveGuessToast';
import { FugitiveDeckPiles } from './components/FugitiveDeckPiles';
import { FugitiveGameOverReveal } from './components/FugitiveGameOverReveal';
import { FugitiveHandDropZone } from './components/FugitiveHandDropZone';
import { FugitiveMarshalNotepad } from './components/FugitiveMarshalNotepad';
import { FugitivePlayActions, FugitivePlayHeader } from './components/FugitivePlayFooter';
import { FugitiveStagingColumn } from './components/FugitiveStagingColumn';
import { buildFugitiveRosterSeats } from './components/fugitiveRosterSeats';
import { fugitiveCardImageUrl } from './lib/cardMeta';
import { FUGITIVE_DROP_HAND, parsePileDragId } from './lib/fugitiveDraw';
import {
  applyStageHideout,
  applyStageSprint,
  emptyStaging,
  filterHandForDisplay,
  FUGITIVE_DROP_HIDEOUT,
  FUGITIVE_DROP_SPRINT,
  handCardId,
  isCardAvailableFromHand,
  parseHandDragCardId,
  removeFromStaging,
  tryStageHideout,
  type StagingState,
} from './lib/fugitivePlacement';
import './fugitive.css';

type Props = {
  gameState: FugitivePlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

function firstTurnPlacementHint(hideoutsRequiredThisStep: number): string {
  if (hideoutsRequiredThisStep >= 2) return 'วางได้ 1 หรือ 2 ใบ';
  if (hideoutsRequiredThisStep === 1) return 'วางได้อีก 1 ใบ หรือข้ามจบเทิร์น';
  return '';
}

function MarshalSprintStack({ count, instanceId }: { count: number; instanceId: string }) {
  return (
    <div
      className="fugitive-sprint-stack--hidden-wrap"
      aria-label={`Sprint ${count} ใบ (ยังไม่เปิด)`}
    >
      <div
        className="fugitive-hideout-slot__sprint-stack fugitive-sprint-stack--cards fugitive-sprint-stack--hidden"
        aria-hidden
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={`${instanceId}-sprint-hidden-${i}`}
            className="fugitive-sprint-stack__hidden-card"
          >
            <FugitiveCardFace faceDown className="fugitive-card--sprint-hidden" />
          </div>
        ))}
      </div>
      <span className="fugitive-sprint-stack__marshal-badge" aria-hidden>
        <Footprints size={11} aria-hidden />
        <span>{count}</span>
      </span>
    </div>
  );
}

function HideoutSlot({ slot, isFugitive }: { slot: FugitiveHideoutView; isFugitive: boolean }) {
  const fugitiveSeesOwn = isFugitive && slot.value !== undefined;
  const showFaceUp = slot.revealed || fugitiveSeesOwn;
  const sprintCards =
    (isFugitive || slot.revealed) && slot.sprintValues && slot.sprintValues.length > 0
      ? slot.sprintValues
      : null;
  const showCaughtBadge = slot.revealed && slot.value !== undefined;
  const isEscapeReveal = showCaughtBadge && slot.value === 42;

  return (
    <div
      className={[
        'fugitive-hideout-slot',
        showCaughtBadge && !isEscapeReveal ? 'fugitive-hideout-slot--caught' : '',
        isEscapeReveal ? 'fugitive-hideout-slot--escaped' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {sprintCards ? (
        <div className="fugitive-hideout-slot__sprint-stack fugitive-sprint-stack--cards">
          {sprintCards.map((v, i) => (
            <FugitiveCardFace
              key={`${slot.instanceId}-s-${i}`}
              value={v}
              className="fugitive-card--staging"
            />
          ))}
        </div>
      ) : slot.sprintCount > 0 && !slot.revealed ? (
        <MarshalSprintStack count={slot.sprintCount} instanceId={slot.instanceId} />
      ) : null}
      <div className="fugitive-hideout-slot__card-wrap">
        {showCaughtBadge ? (
          <span
            className={[
              'fugitive-hideout-slot__status-badge',
              isEscapeReveal ? 'fugitive-hideout-slot__status-badge--escape' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {isEscapeReveal ? null : <Check size={11} strokeWidth={3} aria-hidden />}
            <span>{isEscapeReveal ? 'หนี!' : 'ทายถูก'}</span>
          </span>
        ) : null}
        <div className="fugitive-hideout-slot__card-btn">
          <FugitiveCardFace
            value={showFaceUp ? slot.value : undefined}
            faceDown={!showFaceUp}
            escape={slot.value === 42 && (slot.revealed || fugitiveSeesOwn)}
          />
        </div>
      </div>
    </div>
  );
}

export function FugitiveGame({ gameState: gs, myId, sendAction, onLeave, onRestart }: Props) {
  const send = (action: FugitiveAction) => sendAction(action);

  const isFugitive = gs.myRole === 'fugitive';
  const isMarshal = gs.myRole === 'marshal';
  const isMyTurn = gs.activePlayerId === myId;

  const [staging, setStaging] = useState<StagingState>(emptyStaging);
  const [pendingCard, setPendingCard] = useState<number | null>(null);
  const [dragCard, setDragCard] = useState<number | null>(null);
  const [dragPile, setDragPile] = useState<FugitiveDrawPile | null>(null);
  const [guessPicks, setGuessPicks] = useState<number[]>([]);
  const [noteTarget, setNoteTarget] = useState<number | null>(null);
  const [settledGuessSeq, setSettledGuessSeq] = useState(0);
  const noted = useMemo(() => new Set(gs.notedNumbers ?? []), [gs.notedNumbers]);

  const hand = useMemo(() => gs.myHand ?? [], [gs.myHand]);
  const handVisible = useMemo(() => filterHandForDisplay(hand, staging), [hand, staging]);
  const handVisibleIds = useMemo(() => handVisible.map((c) => handCardId(c)), [handVisible]);
  const newlyDrawn = useNewlyDrawnCardIds(handVisibleIds);

  const playSensors = usePlayDragSensors();
  const isDragging = dragCard !== null || dragPile !== null;
  useLockBodyScroll(isDragging);

  useYourTurnToast(gs.canAct && gs.phase !== 'game_over', gs.phase !== 'game_over');

  useEffect(() => {
    if (!gs.lastGuess || gs.lastGuessSeq <= settledGuessSeq) return;
    const timer = window.setTimeout(() => setSettledGuessSeq(gs.lastGuessSeq), 3500);
    return () => window.clearTimeout(timer);
  }, [gs.lastGuess, gs.lastGuessSeq, settledGuessSeq]);

  useEffect(() => {
    setStaging(emptyStaging());
    setPendingCard(null);
    setDragCard(null);
    setDragPile(null);
    setGuessPicks([]);
    setNoteTarget(null);
  }, [gs.phase, gs.subphase, gs.activePlayerId, gs.lastEvent]);

  const revealedNumbers = useMemo(() => {
    const s = new Set<number>();
    for (const h of gs.hideouts) {
      if (h.revealed && h.value !== undefined) s.add(h.value);
    }
    return s;
  }, [gs.hideouts]);

  const attemptHideout = useCallback(
    (card: number) => {
      if (!isCardAvailableFromHand(card, hand, staging)) return;
      const result = tryStageHideout(gs.lastHideoutValue, card, staging.sprints);
      if (!result.ok) {
        toast.error(result.error ?? 'วาง hideout ไม่ได้');
        return;
      }
      setStaging((prev) => applyStageHideout(prev, card));
      setPendingCard(null);
    },
    [gs.lastHideoutValue, hand, staging],
  );

  const attemptSprint = useCallback(
    (card: number) => {
      if (!isCardAvailableFromHand(card, hand, staging)) {
        toast.error('ไม่มีการ์ดนี้ในมือ');
        return;
      }
      const next = applyStageSprint(staging, card);
      if (!next) return;
      setStaging(next);
      setPendingCard(null);
    },
    [hand, staging],
  );

  const onDraw = useCallback(
    (pile: FugitiveDrawPile) => {
      sendAction({ type: 'draw', pile });
    },
    [sendAction],
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    const activeId = String(event.active.id);
    const card = parseHandDragCardId(activeId);
    if (card !== null) {
      setDragCard(card);
      return;
    }
    const pile = parsePileDragId(activeId);
    if (pile !== null) setDragPile(pile);
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : '';
      setDragCard(null);
      setDragPile(null);

      const pile = parsePileDragId(activeId);
      if (pile !== null) {
        if (gs.canDraw && overId === FUGITIVE_DROP_HAND) onDraw(pile);
        return;
      }

      if (!gs.canPlaceHideout) return;
      const card = parseHandDragCardId(activeId);
      if (card === null) return;
      if (overId === FUGITIVE_DROP_HIDEOUT) {
        attemptHideout(card);
      } else if (overId === FUGITIVE_DROP_SPRINT) {
        attemptSprint(card);
      }
    },
    [gs.canDraw, gs.canPlaceHideout, onDraw, attemptHideout, attemptSprint],
  );

  const onZoneClick = useCallback(
    (zone: 'hideout' | 'sprint') => {
      if (pendingCard === null) return;
      if (zone === 'hideout') attemptHideout(pendingCard);
      else attemptSprint(pendingCard);
    },
    [pendingCard, attemptHideout, attemptSprint],
  );

  const onHandSelect = useCallback(
    (id: string) => {
      if (!gs.canPlaceHideout) return;
      const card = Number(id.replace('card-', ''));
      if (Number.isNaN(card)) return;
      setPendingCard((prev) => (prev === card ? null : card));
    },
    [gs.canPlaceHideout],
  );

  const onUnstageCard = useCallback((card: number) => {
    setStaging((prev) => removeFromStaging(prev, card));
    setPendingCard(null);
  }, []);

  const confirmPlace = () => {
    if (staging.hideout === null) return;
    const preview = tryStageHideout(gs.lastHideoutValue, staging.hideout, staging.sprints);
    if (!preview.ok) return;
    send({
      type: 'place_hideout',
      hideoutCard: staging.hideout,
      sprintCards: staging.sprints.length > 0 ? staging.sprints : undefined,
    });
  };

  const toggleNote = (numbers: number[], remove: boolean) => {
    if (numbers.length === 0) return;
    send({ type: 'note', numbers, remove: remove || undefined });
  };

  const submitGuess = () => {
    if (gs.phase === 'manhunt' || guessPicks.length === 0) return;
    send({ type: 'guess', numbers: guessPicks });
    setGuessPicks([]);
    setNoteTarget(null);
  };

  const submitNote = () => {
    const targets = (guessPicks.length > 0 ? guessPicks : noteTarget !== null ? [noteTarget] : [])
      .filter((n) => !revealedNumbers.has(n));
    if (targets.length === 0) return;
    const allNoted = targets.every((n) => noted.has(n));
    toggleNote(targets, allNoted);
  };

  const onNotepadSelect = useCallback(
    (n: number) => {
      if (revealedNumbers.has(n)) return;
      setNoteTarget(n);

      if (gs.canManhuntGuess) {
        setGuessPicks((prev) => (prev.includes(n) ? [] : [n]));
        return;
      }

      if (gs.canGuess && n > 41) return;
      setGuessPicks((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
    },
    [gs.canGuess, gs.canManhuntGuess, revealedNumbers],
  );

  const manhuntUnrevealedCount = useMemo(
    () => gs.hideouts.filter((h) => !h.revealed).length,
    [gs.hideouts],
  );

  const marshalNotepadHint = useMemo(() => {
    if (gs.canManhuntGuess) {
      return `เลือกเลขแล้วกดทาย — ทายถูกต่อเนื่องจนกว่าจะผิดหรือเปิดครบทุก hideout (เหลือ ${manhuntUnrevealedCount} กอง)`;
    }
    if (gs.canGuess) {
      return 'เลือกได้หลายเลข — ต้องถูกทุกเลขจึงจะเปิด hideout · จด/ทาย/ข้ามด้วยปุ่มด้านล่าง';
    }
    return 'เลือกได้หลายเลขแล้วจดพร้อมกัน — ทายและข้ามเมื่อถึงเทิร์น Marshal';
  }, [gs.canGuess, gs.canManhuntGuess, manhuntUnrevealedCount]);

  const marshalNotepadTitle = gs.canManhuntGuess ? 'Manhunt — ทายทีละเลข' : 'สมุดจด Hideout';

  const submitManhunt = (n: number) => {
    send({ type: 'manhunt_guess', number: n });
  };

  const phaseLabel = useMemo(() => {
    if (gs.phase === 'game_over') return 'จบเกม';
    if (gs.phase === 'manhunt') return 'Manhunt';
    if (gs.phase === 'fugitive_first') return 'เทิร์นแรก Fugitive';
    if (gs.phase === 'marshal_first') return 'เทิร์นแรก Marshal';
    if (gs.phase === 'fugitive_turn') return 'เทิร์น Fugitive';
    return 'เทิร์น Marshal';
  }, [gs.phase]);

  const rosterSeats = useMemo(() => buildFugitiveRosterSeats(gs), [gs]);

  const activeName =
    gs.activePlayerId === gs.fugitiveId
      ? gs.players.find((p) => p.id === gs.fugitiveId)?.name
      : gs.players.find((p) => p.id === gs.marshalId)?.name;

  const isFirstTurn = gs.phase === 'fugitive_first';
  const firstTurnHint = isFirstTurn ? firstTurnPlacementHint(gs.hideoutsRequiredThisStep) : '';
  const showStatusBar =
    (isFugitive && (firstTurnHint !== '' || gs.hideoutsRequiredThisStep > 0)) ||
    (gs.drawsRequired > 0 && isMyTurn);

  const iWon = gs.phase === 'game_over' && gs.gameResult?.winners.some((id) => id === myId);

  const shellPaddingBottom =
    gs.canPlaceHideout || gs.canDraw
      ? `calc(clamp(108px, 10.5vw, 162px) * 832 / 594 + ${PLAYER_HAND_DOCK_PEEK_RESERVE_PX}px + env(safe-area-inset-bottom, 0px))`
      : handVisible.length > 0
        ? 'calc(clamp(108px, 10.5vw, 162px) * 832 / 594 + 96px + env(safe-area-inset-bottom, 0px))'
        : 'calc(1rem + env(safe-area-inset-bottom, 0px))';

  const pendingSelectedIds = pendingCard !== null ? [handCardId(pendingCard)] : [];

  return (
    <GameShell
      className={[
        'fugitive-page',
        isDragging ? 'fugitive-page--dragging' : '',
        dragPile !== null ? 'fugitive-page--dragging-deck' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ paddingBottom: shellPaddingBottom }}
    >
      <GamePlayHeader
        title="Fugitive"
        subtitle={phaseLabel}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      {gs.lastGuess && gs.lastGuessSeq > settledGuessSeq
        ? createPortal(
            <div key={gs.lastGuessSeq} className="fugitive-guess-toast-layer">
              <FugitiveGuessToast
                notice={gs.lastGuess}
                playerName={gs.players.find((p) => p.id === gs.lastGuess?.by)?.name ?? 'Marshal'}
                myId={myId}
                visible
              />
            </div>,
            document.body,
          )
        : null}

      <GameHistoryDisclosure
        title="ผู้เล่น · 2 คน"
        defaultOpen
        className="fugitive-roster sticky top-4 z-20 mb-4"
        meta={
          gs.phase === 'game_over'
            ? 'จบเกม'
            : isMyTurn
              ? 'เทิร์นคุณ'
              : `เทิร์น ${activeName ?? 'คู่ต่อสู้'}`
        }
      >
        <PlayerRosterStrip
          myId={myId}
          ariaLabel="บทบาทผู้เล่น Fugitive"
          seats={rosterSeats}
        />
      </GameHistoryDisclosure>

      {showStatusBar ? (
        <div className="fugitive-status-bar">
          {isFugitive && firstTurnHint ? (
            <span>{firstTurnHint}</span>
          ) : isFugitive && gs.hideoutsRequiredThisStep > 0 ? (
            <span>
              ต้องวาง hideout อีก <strong>{gs.hideoutsRequiredThisStep}</strong> ใบ
            </span>
          ) : null}
          {gs.drawsRequired > 0 && isMyTurn && (
            <span>
              จั่วอีก <strong>{gs.drawsRequired}</strong> ใบ
            </span>
          )}
        </div>
      ) : null}

      {gs.phase === 'manhunt' && (
        <div className="fugitive-manhunt-banner" role="status">
          <strong>Manhunt!</strong>
          {isMarshal ? (
            <>
              <p>
                ทายทีละเลข ทายถูกต่อเนื่องจนกว่าจะผิดหรือเปิดครบทุก hideout
              </p>
              <p className="fugitive-manhunt-banner__meta">
                เหลือ hideout คว่ำ <strong>{manhuntUnrevealedCount}</strong> กอง
              </p>
            </>
          ) : (
            <p>รอ Marshal ทาย · ถ้าทายผิดคุณหนีสำเร็จ</p>
          )}
        </div>
      )}

      <DndContext
        sensors={playSensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <section className="card fugitive-track-wrap" aria-label="เส้นทาง hideout">
          {isFugitive && gs.canPlaceHideout && (
            <FugitivePlayHeader
              lastHideoutValue={gs.lastHideoutValue}
              staging={staging}
              hideoutsRequiredThisStep={gs.hideoutsRequiredThisStep}
              isFirstTurn={isFirstTurn}
            />
          )}

          <div className="fugitive-track-scroll">
            <div className="fugitive-track">
              {gs.hideouts.map((slot) => (
                <HideoutSlot key={slot.instanceId} slot={slot} isFugitive={isFugitive} />
              ))}

              {isFugitive && gs.canPlaceHideout && (
                <FugitiveStagingColumn
                  lastHideoutValue={gs.lastHideoutValue}
                  staging={staging}
                  isDragging={isDragging}
                  dragCard={dragCard}
                  onZoneClick={onZoneClick}
                  onUnstageCard={onUnstageCard}
                />
              )}
            </div>
          </div>

          {isFugitive && gs.canPlaceHideout && (
            <FugitivePlayActions
              lastHideoutValue={gs.lastHideoutValue}
              staging={staging}
              canPass={gs.canPass}
              passLabel={isFirstTurn ? 'จบเทิร์น' : 'ข้าม'}
              onConfirm={confirmPlace}
              onPass={() => send({ type: 'pass' })}
            />
          )}
        </section>

        {gs.phase !== 'manhunt' && gs.phase !== 'game_over' && (
          <FugitiveDeckPiles
            counts={gs.deckCounts}
            canDraw={gs.canDraw}
            drawsRequired={gs.drawsRequired}
            onDraw={onDraw}
          />
        )}

        <FugitiveHandDropZone active={gs.canDraw}>
          {handVisible.length > 0 && gs.phase !== 'game_over' && (
            <PlayerHand
              cards={handVisible}
              getCardId={(c) => handCardId(c)}
              dragMode={gs.canPlaceHideout ? 'play' : 'none'}
              dockPeek
              renderCard={({ card }) => (
                <FugitiveCardFace
                  value={card}
                  className={[
                    'fugitive-card--hand',
                    pendingCard === card ? 'fugitive-card--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              )}
              selectedIds={pendingSelectedIds}
              onSelectToggle={gs.canPlaceHideout ? onHandSelect : undefined}
              disabledCardIds={gs.canPlaceHideout ? [] : handVisibleIds}
              getPreview={(c) => ({
                src: fugitiveCardImageUrl(c),
                alt: `การ์ด ${c}`,
                caption: `Sprint +${sprintValue(c)}`,
              })}
              drawAnimation={{ newlyDrawnIds: newlyDrawn }}
              aria-label="มือของคุณ"
            />
          )}
        </FugitiveHandDropZone>

        <DragOverlay dropAnimation={null}>
          {dragCard !== null ? (
            <FugitiveCardFace value={dragCard} className="fugitive-card--drag-overlay" />
          ) : dragPile !== null ? (
            <FugitiveCardFace
              faceDown
              className="fugitive-card--drag-overlay fugitive-card--deck-drag"
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {isMarshal && gs.phase !== 'game_over' && (
        <section className="card fugitive-panel fugitive-panel--notepad">
          <h2 className="fugitive-panel__title">{marshalNotepadTitle}</h2>
          <p className="fugitive-panel__hint">{marshalNotepadHint}</p>
          <FugitiveMarshalNotepad
            noted={noted}
            revealedNumbers={revealedNumbers}
            guessPicks={guessPicks}
            noteTarget={noteTarget}
            multiSelect={!gs.canManhuntGuess}
            onSelectNumber={onNotepadSelect}
            onGuess={() => {
              if (gs.canManhuntGuess) {
                if (guessPicks.length === 0) return;
                submitManhunt(guessPicks[0]);
                setGuessPicks([]);
                setNoteTarget(null);
                return;
              }
              submitGuess();
            }}
            onNote={submitNote}
            onSkip={() => {
              send({ type: 'guess', numbers: [] });
              setGuessPicks([]);
              setNoteTarget(null);
            }}
            canGuessAction={gs.canGuess || gs.canManhuntGuess}
            canNoteAction={!gs.canManhuntGuess}
            showNoteAction={!gs.canManhuntGuess}
            canSkipAction={gs.canGuess}
            showSkipAction={!gs.canManhuntGuess}
          />
        </section>
      )}

      {gs.eventLog.length > 0 && (
        <ul className="fugitive-event-log" aria-label="บันทึกเกม">
          {[...gs.eventLog]
            .reverse()
            .slice(0, 8)
            .map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
        </ul>
      )}

      {gs.phase === 'game_over' && gs.gameResult && (
        <GameOverModal
          onLeave={onLeave}
          onRestart={onRestart}
          titleId="fugitive-game-over-title"
          panelClassName="fugitive-game-over-modal"
        >
          <div className="fugitive-game-over-hero">
            <h2 id="fugitive-game-over-title">{iWon ? 'คุณชนะ!' : 'เกมจบ'}</h2>
            <p className="fugitive-game-over-reason">{gs.gameResult.reason}</p>
          </div>
          <FugitiveGameOverReveal hideouts={gs.hideouts} />
        </GameOverModal>
      )}
    </GameShell>
  );
}
