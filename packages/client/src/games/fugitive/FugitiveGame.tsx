import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  FugitiveAction,
  FugitiveDrawPile,
  FugitiveHideoutView,
  FugitivePlayerView,
} from 'shared';
import { sprintValue } from 'shared';
import { Footprints, Shield, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import {
  PlayerHand,
  PLAYER_HAND_DOCK_PEEK_RESERVE_PX,
  useLockBodyScroll,
  useNewlyDrawnCardIds,
  usePlayDragSensors,
} from '../../components/player-hand';
import { Button } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { FUGITIVE_CARD_BACK, fugitiveCardImageUrl } from './cardMeta';
import { FugitiveCardFace } from './FugitiveCardFace';
import { FugitivePlayActions, FugitivePlayHeader } from './FugitivePlayFooter';
import { FugitiveStagingColumn } from './FugitiveStagingColumn';
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
} from './fugitivePlacement';
import './fugitive.css';

type Props = {
  gameState: FugitivePlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

function notesStorageKey(gs: FugitivePlayerView): string {
  return `fugitive-notes-${gs.fugitiveId}-${gs.marshalId}`;
}

function loadNotedNumbers(gs: FugitivePlayerView): Set<number> {
  try {
    const raw = localStorage.getItem(notesStorageKey(gs));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((n): n is number => typeof n === 'number'));
  } catch {
    return new Set();
  }
}

function saveNotedNumbers(gs: FugitivePlayerView, noted: Set<number>): void {
  localStorage.setItem(notesStorageKey(gs), JSON.stringify([...noted].sort((a, b) => a - b)));
}

function HideoutSlot({
  slot,
  isFugitive,
}: {
  slot: FugitiveHideoutView;
  isFugitive: boolean;
}) {
  const fugitiveSeesOwn = isFugitive && slot.value !== undefined;
  const showFaceUp = slot.revealed || fugitiveSeesOwn;
  const sprintCards =
    (isFugitive || slot.revealed) && slot.sprintValues && slot.sprintValues.length > 0
      ? slot.sprintValues
      : null;

  return (
    <div className="fugitive-hideout-slot">
      {sprintCards ? (
        <div className="fugitive-hideout-slot__sprint-stack fugitive-sprint-stack--cards">
          {sprintCards.map((v, i) => (
            <FugitiveCardFace key={`${slot.instanceId}-s-${i}`} value={v} className="fugitive-card--staging" />
          ))}
        </div>
      ) : slot.sprintCount > 0 && !slot.revealed ? (
        <div className="fugitive-hideout-slot__sprint-stack" aria-hidden>
          {Array.from({ length: slot.sprintCount }, (_, i) => (
            <span key={i} className="fugitive-hideout-slot__sprint-pip" />
          ))}
        </div>
      ) : null}
      <div className="fugitive-hideout-slot__card-btn">
        <FugitiveCardFace
          value={showFaceUp ? slot.value : undefined}
          faceDown={!showFaceUp}
          escape={slot.value === 42 && (slot.revealed || fugitiveSeesOwn)}
        />
      </div>
    </div>
  );
}

function DeckPiles({
  counts,
  canDraw,
  onDraw,
}: {
  counts: FugitivePlayerView['deckCounts'];
  canDraw: boolean;
  onDraw: (pile: FugitiveDrawPile) => void;
}) {
  const piles: { id: FugitiveDrawPile; label: string; count: number }[] = [
    { id: 'pile1', label: '4 – 14', count: counts.pile1 },
    { id: 'pile2', label: '15 – 28', count: counts.pile2 },
    { id: 'pile3', label: '29 – 41', count: counts.pile3 },
  ];
  return (
    <div className="fugitive-decks" aria-label="กองจั่วการ์ด">
      {piles.map((p) => (
        <div key={p.id} className="fugitive-deck">
          <button
            type="button"
            className="fugitive-deck__pile"
            disabled={!canDraw || p.count === 0}
            onClick={() => onDraw(p.id)}
            aria-label={`จั่วจากกอง ${p.label} (${p.count} ใบ)`}
          >
            {p.count > 0 ? (
              <img src={FUGITIVE_CARD_BACK} alt="" className="fugitive-deck__back" aria-hidden />
            ) : null}
            <span className="fugitive-deck__count">{p.count}</span>
          </button>
          <span className="fugitive-deck__label">{p.label}</span>
        </div>
      ))}
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
  const [guessPicks, setGuessPicks] = useState<number[]>([]);
  const [multiGuess, setMultiGuess] = useState(false);
  const [noted, setNoted] = useState<Set<number>>(() => loadNotedNumbers(gs));

  const hand = useMemo(() => gs.myHand ?? [], [gs.myHand]);
  const handVisible = useMemo(() => filterHandForDisplay(hand, staging), [hand, staging]);
  const handVisibleIds = useMemo(() => handVisible.map((c) => handCardId(c)), [handVisible]);
  const newlyDrawn = useNewlyDrawnCardIds(handVisibleIds);

  const playSensors = usePlayDragSensors();
  const isDragging = dragCard !== null;
  useLockBodyScroll(isDragging);

  useYourTurnToast(gs.canAct && gs.phase !== 'game_over', gs.phase !== 'game_over');

  useEffect(() => {
    setStaging(emptyStaging());
    setPendingCard(null);
    setDragCard(null);
    setGuessPicks([]);
  }, [gs.phase, gs.subphase, gs.activePlayerId, gs.lastEvent]);

  useEffect(() => {
    if (isMarshal) setNoted(loadNotedNumbers(gs));
  }, [gs.fugitiveId, gs.marshalId, isMarshal, gs]);

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

  const onDragStart = useCallback((event: DragStartEvent) => {
    const card = parseHandDragCardId(String(event.active.id));
    if (card !== null) setDragCard(card);
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragCard(null);
      if (!gs.canPlaceHideout) return;
      const card = parseHandDragCardId(String(event.active.id));
      if (card === null) return;
      const overId = event.over ? String(event.over.id) : '';
      if (overId === FUGITIVE_DROP_HIDEOUT) {
        attemptHideout(card);
      } else if (overId === FUGITIVE_DROP_SPRINT) {
        attemptSprint(card);
      }
    },
    [gs.canPlaceHideout, attemptHideout, attemptSprint],
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

  const toggleNote = (n: number) => {
    setNoted((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      saveNotedNumbers(gs, next);
      return next;
    });
  };

  const submitGuess = () => {
    if (gs.phase === 'manhunt') return;
    send({ type: 'guess', numbers: multiGuess ? guessPicks : guessPicks.slice(0, 1) });
  };

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

  const roleBadge = (
    <span
      className={[
        'fugitive-role-badge',
        isFugitive ? 'fugitive-role-badge--fugitive' : 'fugitive-role-badge--marshal',
      ].join(' ')}
    >
      {isFugitive ? (
        <>
          <UserRound size={14} aria-hidden /> Fugitive
        </>
      ) : (
        <>
          <Shield size={14} aria-hidden /> Marshal
        </>
      )}
    </span>
  );

  const activeName =
    gs.activePlayerId === gs.fugitiveId
      ? gs.players.find((p) => p.id === gs.fugitiveId)?.name
      : gs.players.find((p) => p.id === gs.marshalId)?.name;

  const iWon =
    gs.phase === 'game_over' &&
    gs.gameResult?.winners.some((id) => id === myId);

  const shellPaddingBottom = gs.canPlaceHideout
    ? `calc(clamp(108px, 10.5vw, 162px) * 832 / 594 + ${PLAYER_HAND_DOCK_PEEK_RESERVE_PX}px + env(safe-area-inset-bottom, 0px))`
    : handVisible.length > 0
      ? 'calc(clamp(108px, 10.5vw, 162px) * 832 / 594 + 96px + env(safe-area-inset-bottom, 0px))'
      : 'calc(1rem + env(safe-area-inset-bottom, 0px))';

  const pendingSelectedIds = pendingCard !== null ? [handCardId(pendingCard)] : [];

  return (
    <GameShell
      className={['fugitive-page', isDragging ? 'fugitive-page--dragging' : ''].filter(Boolean).join(' ')}
      style={{ paddingBottom: shellPaddingBottom }}
    >
      <GamePlayHeader
        title="Fugitive"
        subtitle={phaseLabel}
        onLeave={onLeave}
        onRestart={onRestart}
        trailing={
          <div className="fugitive-header-trail">
            {roleBadge}
            <span>
              {isMyTurn ? 'เทิร์นคุณ' : `เทิร์น ${activeName ?? 'คู่ต่อสู้'}`}
            </span>
          </div>
        }
      />

      <div className="fugitive-status-bar">
        <span>
          คู่ต่อสู้: <strong>{gs.opponentName}</strong> · มือ {gs.opponentHandCount} ใบ
        </span>
        {isFugitive && gs.hideoutsRequiredThisStep > 0 && (
          <span>
            ต้องวาง hideout อีก <strong>{gs.hideoutsRequiredThisStep}</strong> ใบ
          </span>
        )}
        {gs.drawsRequired > 0 && isMyTurn && (
          <span>
            จั่วอีก <strong>{gs.drawsRequired}</strong> ใบ
          </span>
        )}
      </div>

      {gs.phase === 'manhunt' && (
        <div className="fugitive-manhunt-banner" role="status">
          Manhunt! Fugitive เล่น 42 แล้ว — Marshal ทายทีละเลข ถ้าผิด Fugitive หนีสำเร็จ
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
            />
          )}

          <div className="fugitive-track-scroll">
            <div className="fugitive-track">
              {gs.hideouts.map((slot) => (
              <HideoutSlot
                key={slot.instanceId}
                slot={slot}
                isFugitive={isFugitive}
              />
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
              onConfirm={confirmPlace}
              onPass={() => send({ type: 'pass' })}
            />
          )}
        </section>

        {gs.phase !== 'manhunt' && gs.phase !== 'game_over' && (
          <DeckPiles
            counts={gs.deckCounts}
            canDraw={gs.canDraw}
            onDraw={(pile) => send({ type: 'draw', pile })}
          />
        )}

        {handVisible.length > 0 && gs.phase !== 'game_over' && (
          <PlayerHand
            cards={handVisible}
            getCardId={(c) => handCardId(c)}
            dragMode={gs.canPlaceHideout ? 'play' : 'none'}
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

        <DragOverlay dropAnimation={null}>
          {dragCard !== null ? (
            <FugitiveCardFace value={dragCard} className="fugitive-card--drag-overlay" />
          ) : null}
        </DragOverlay>
      </DndContext>

      {isMarshal && gs.canGuess && (
        <section className="card fugitive-panel">
          <h2 className="fugitive-panel__title">ทาย Hideout</h2>
          <p className="fugitive-panel__hint">
            คลิกเลขเพื่อทาย · คลิกขวาเพื่อจด (สีเหลือง) ·{' '}
            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={multiGuess}
                onChange={(e) => {
                  setMultiGuess(e.target.checked);
                  setGuessPicks([]);
                }}
              />{' '}
              ทายหลายเลขพร้อมกัน (ต้องถูกทุกเลข)
            </label>
          </p>
          <div className="fugitive-guess-grid">
            {Array.from({ length: 41 }, (_, i) => i + 1).map((n) => {
              const revealed = revealedNumbers.has(n);
              const picked = guessPicks.includes(n);
              const isNoted = noted.has(n);
              return (
                <button
                  key={n}
                  type="button"
                  className={[
                    'fugitive-guess-btn',
                    revealed ? 'fugitive-guess-btn--revealed' : '',
                    picked ? 'fugitive-guess-btn--picked' : '',
                    isNoted && !revealed ? 'fugitive-guess-btn--noted' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={revealed}
                  onClick={() => {
                    if (revealed) return;
                    if (multiGuess) {
                      setGuessPicks((prev) =>
                        prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
                      );
                    } else {
                      setGuessPicks([n]);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!revealed) toggleNote(n);
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div className="fugitive-actions">
            <Button
              type="button"
              disabled={guessPicks.length === 0}
              onClick={submitGuess}
            >
              ทาย {guessPicks.length > 0 ? guessPicks.join(', ') : ''}
            </Button>
            <Button type="button" variant="secondary" onClick={() => send({ type: 'guess', numbers: [] })}>
              ข้าม
            </Button>
          </div>
          <p className="fugitive-notes">
            <Footprints size={14} aria-hidden /> คลิกขวาเลขเพื่อจด/ลบจด (เก็บในเครื่อง)
          </p>
        </section>
      )}

      {isMarshal && gs.canManhuntGuess && (
        <section className="card fugitive-panel">
          <h2 className="fugitive-panel__title">Manhunt — ทายทีละเลข</h2>
          <div className="fugitive-guess-grid">
            {Array.from({ length: 41 }, (_, i) => i + 1).map((n) => {
              const revealed = revealedNumbers.has(n);
              return (
                <button
                  key={n}
                  type="button"
                  className={[
                    'fugitive-guess-btn',
                    revealed ? 'fugitive-guess-btn--revealed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={revealed}
                  onClick={() => submitManhunt(n)}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {gs.eventLog.length > 0 && (
        <ul className="fugitive-event-log" aria-label="บันทึกเกม">
          {[...gs.eventLog].reverse().slice(0, 8).map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ul>
      )}

      {gs.phase === 'game_over' && gs.gameResult && (
        <GameOverModal onLeave={onLeave} onRestart={onRestart} titleId="fugitive-game-over-title">
          <div className="fugitive-game-over-hero">
            <h2 id="fugitive-game-over-title">{iWon ? 'คุณชนะ!' : 'เกมจบ'}</h2>
            <p className="fugitive-game-over-reason">{gs.gameResult.reason}</p>
          </div>
        </GameOverModal>
      )}
    </GameShell>
  );
}
