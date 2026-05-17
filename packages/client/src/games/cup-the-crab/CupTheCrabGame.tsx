import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CupTheCrabAction, CupTheCrabCard, CupTheCrabPlayerView } from 'shared';
import { GamePlayHeader, GameShell } from '../../components/game-shell';
import { PlayerHand, PLAYER_HAND_DOCK_RESERVE_PX } from '../../components/player-hand';
import { Button } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { CtcGameOverModal } from './CtcGameOverModal';
import { CtcPlayColumns } from './CtcPlayColumns';
import { cupTheCrabCardImage } from './cardMeta';
import { hasLegalPlay, legalPlayDropIds } from './playTargets';
import './cup-the-crab.css';

type Props = {
  gameState: CupTheCrabPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

function cupTheCrabCardLabel(card: CupTheCrabCard): string {
  switch (card.kind) {
    case 'cup':
      return `ถ้วย ${card.value ?? ''}`.trim();
    case 'crab':
      return 'ปู';
    case 'bottle':
      return 'ขวด';
    case 'octopus':
      return 'หมึก';
  }
}

function CardFace({ card }: { card: CupTheCrabCard }) {
  return (
    <img
      src={cupTheCrabCardImage(card)}
      alt=""
      className="ctc-card-img"
      loading="lazy"
      aria-hidden
    />
  );
}

function cupScoreTier(points: number): 'zero' | 'low' | 'mid' | 'high' {
  if (points <= 0) return 'zero';
  if (points <= 5) return 'low';
  if (points <= 10) return 'mid';
  return 'high';
}

function MyScorePileSection({
  scorePile,
  cupScore,
}: {
  scorePile: CupTheCrabCard[];
  cupScore: number;
}) {
  const cupCount = scorePile.filter((c) => c.kind === 'cup').length;
  const actionCount = scorePile.length - cupCount;
  const tier = cupScoreTier(cupScore);

  return (
    <section className="card ctc-my-score" aria-labelledby="ctc-my-score-title">
      <div className="ctc-my-score__header">
        <div>
          <h2 id="ctc-my-score-title" className="ctc-my-score__title">
            กองคะแนนของคุณ
          </h2>
          <p className="ctc-my-score__meta">
            {cupCount > 0 ? `${cupCount} ถ้วย` : 'ยังไม่มีถ้วย'}
            {actionCount > 0 ? ` · ${actionCount} การ์ดพิเศษ` : ''}
            {' · '}
            {scorePile.length} ใบในกอง
          </p>
        </div>
        <div
          className={['ctc-my-score__hero', `ctc-stack-score--${tier}`].join(' ')}
          aria-label={`คะแนนถ้วย ${cupScore} แต้ม`}
        >
          <span className="ctc-my-score__hero-label">คะแนนถ้วย</span>
          <span className="ctc-my-score__hero-row">
            <span className="ctc-my-score__hero-value">{cupScore}</span>
            <span className="ctc-my-score__hero-unit">แต้ม</span>
          </span>
        </div>
      </div>
      <div className="ctc-my-score__cards" role="list" aria-label="การ์ดในกองคะแนน">
        {scorePile.map((card) => (
          <div
            key={card.id}
            role="listitem"
            className="ctc-my-score__card"
            data-kind={card.kind}
            title={cupTheCrabCardLabel(card)}
          >
            <CardFace card={card} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function CupTheCrabGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [playDragCardId, setPlayDragCardId] = useState<string | null>(null);

  const send = (action: CupTheCrabAction) => sendAction(action);

  const selectedReserveCards = useMemo(() => {
    if (gameState.phase !== 'card_selection') return [];
    const byId = new Map(gameState.reserve.map((c) => [c.id, c]));
    return selectedIds.map((id) => byId.get(id)).filter((c): c is CupTheCrabCard => c != null);
  }, [gameState.phase, gameState.reserve, selectedIds]);

  const reservePoolCards = useMemo(() => {
    if (gameState.phase !== 'card_selection') return [];
    const picked = new Set(selectedIds);
    return gameState.reserve.filter((c) => !picked.has(c.id));
  }, [gameState.phase, gameState.reserve, selectedIds]);

  const handCards = useMemo(() => {
    if (gameState.phase === 'card_selection') return selectedReserveCards;
    if (gameState.phase === 'play') return gameState.roundHand ?? [];
    return [];
  }, [gameState.phase, gameState.roundHand, selectedReserveCards]);

  const handCardIds = useMemo(() => handCards.map((c) => c.id), [handCards]);

  const disabledCardIds = useMemo(
    () => (gameState.canAct ? [] : handCardIds),
    [gameState.canAct, handCardIds],
  );

  const cupScore = useMemo(
    () =>
      gameState.myScorePile
        .filter((c) => c.kind === 'cup')
        .reduce((sum, c) => sum + (c.value ?? 0), 0),
    [gameState.myScorePile],
  );

  useYourTurnToast(gameState.canAct, gameState.phase !== 'game_over');

  useEffect(() => {
    setSelectedIds([]);
    setPlayDragCardId(null);
  }, [gameState.phase, gameState.round]);

  const playSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const draggingPlayCard = useMemo(() => {
    if (!playDragCardId || gameState.phase !== 'play') return null;
    return (gameState.roundHand ?? []).find((c) => c.id === playDragCardId) ?? null;
  }, [playDragCardId, gameState.phase, gameState.roundHand]);

  const legalDropIds = useMemo(() => {
    if (!draggingPlayCard) return new Set<string>();
    return legalPlayDropIds(gameState, draggingPlayCard);
  }, [draggingPlayCard, gameState]);

  const hasAnyLegalPlay = useMemo(() => {
    if (gameState.phase !== 'play') return false;
    return hasLegalPlay(gameState, gameState.roundHand ?? []);
  }, [gameState]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  const onHandSelectToggle = useCallback(
    (id: string) => {
      if (!gameState.canAct || gameState.phase !== 'card_selection') return;
      toggleSelect(id);
    },
    [gameState.canAct, gameState.phase, toggleSelect],
  );

  const confirmSelection = () => {
    if (selectedIds.length !== 3) return;
    send({
      type: 'confirm_selection',
      cardIds: [selectedIds[0]!, selectedIds[1]!, selectedIds[2]!],
    });
    setSelectedIds([]);
  };

  const onPlayDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id.toString();
    if (id.startsWith('hand-')) setPlayDragCardId(id.replace(/^hand-/, ''));
  }, []);

  const onPlayDragEnd = useCallback(
    (event: DragEndEvent) => {
      setPlayDragCardId(null);
      if (!gameState.canAct || gameState.phase !== 'play') return;

      const activeId = event.active.id.toString();
      if (!activeId.startsWith('hand-')) return;
      const cardId = activeId.replace(/^hand-/, '');
      const overId = event.over?.id?.toString();
      if (!overId) return;

      if (overId.startsWith('ctc-empty-')) {
        send({ type: 'play_card', cardId, target: { kind: 'new_stack' } });
        return;
      }
      if (overId.startsWith('ctc-stack-')) {
        const stackId = overId.replace(/^ctc-stack-/, '');
        send({ type: 'play_card', cardId, target: { kind: 'stack', stackId } });
      }
    },
    [gameState.canAct, gameState.phase, send],
  );

  const headerSubtitle =
    gameState.phase === 'game_over' ? null : (
      <>
        <span>
          รอบ {gameState.round}/{gameState.maxRounds}
        </span>
        <span aria-hidden>·</span>
        <span>คะแนนถ้วย: {cupScore}</span>
      </>
    );

  const handAriaLabel = gameState.phase === 'card_selection' ? 'การ์ดที่เลือกแล้ว' : 'มือรอบนี้';

  const pickFromReserve = useCallback(
    (id: string) => {
      if (!gameState.canAct || gameState.phase !== 'card_selection') return;
      toggleSelect(id);
    },
    [gameState.canAct, gameState.phase, toggleSelect],
  );

  if (gameState.phase === 'game_over') {
    return (
      <GameShell className="ctc-page">
        <GamePlayHeader
          title="Cup the Crab!"
          onLeave={onLeave}
          onRestart={onRestart}
          leaveLabel="full"
        />
        <CtcGameOverModal
          gameState={gameState}
          myId={myId}
          onLeave={onLeave}
          onRestart={onRestart}
        />
      </GameShell>
    );
  }

  return (
    <GameShell className="ctc-page" style={{ paddingBottom: PLAYER_HAND_DOCK_RESERVE_PX }}>
      <GamePlayHeader
        title="Cup the Crab!"
        subtitle={headerSubtitle}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      <p className="ctc-event">{gameState.lastEvent}</p>

      <div className="ctc-players">
        {gameState.players.map((p) => (
          <span
            key={p.id}
            className={[
              'ctc-player-chip',
              p.id === gameState.activePlayerId ? 'ctc-player-chip--active' : '',
              p.isStartPlayer ? 'ctc-player-chip--start' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {p.name}
            {p.hasConfirmedSelection ? ' ✓' : ''} ({p.cardsPlayedThisRound}/3)
          </span>
        ))}
      </div>

      <DndContext sensors={playSensors} onDragStart={onPlayDragStart} onDragEnd={onPlayDragEnd}>
        <CtcPlayColumns
          gameState={gameState}
          legalDropIds={gameState.phase === 'play' ? legalDropIds : new Set()}
          isDragging={playDragCardId !== null}
        />

        {gameState.phase === 'card_selection' && (
          <section className="ctc-selection card" aria-live="polite">
            <h2 className="ctc-selection__title">
              เลือกการ์ด 3 ใบจาก {gameState.reserve.length} ใบ (ลับ)
            </h2>
            <p className="ctc-selection__hint">
              คลิกการ์ดด้านล่างเพื่อเลือก — การ์ดที่เลือกจะไปมือด้านล่าง · คลิกบนมือเพื่อคืน
            </p>
            <div className="ctc-reserve-grid" role="list" aria-label="การ์ดสำรอง">
              {reservePoolCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  role="listitem"
                  className="ctc-reserve-grid__card-btn"
                  disabled={!gameState.canAct || selectedIds.length >= 3}
                  onClick={() => pickFromReserve(card.id)}
                  aria-label={`เลือก ${cupTheCrabCardLabel(card)}`}
                >
                  <CardFace card={card} />
                </button>
              ))}
            </div>
            {gameState.canAct && (
              <div className="ctc-actions">
                <Button
                  type="button"
                  disabled={selectedIds.length !== 3}
                  onClick={confirmSelection}
                >
                  ยืนยันการเลือก ({selectedIds.length}/3)
                </Button>
              </div>
            )}
          </section>
        )}

        {gameState.phase === 'card_selection' && (
          <section className="ctc-hand-hint card" aria-live="polite">
            <h2 className="ctc-hand-hint__title">มือที่เลือก ({selectedIds.length}/3)</h2>
            <p className="ctc-hand-hint__text">
              {selectedIds.length === 0
                ? 'ยังไม่ได้เลือก — เลือกจากกริดด้านบน'
                : 'คลิกการ์ดบนมือเพื่อคืนกลับกริด'}
            </p>
          </section>
        )}

        {gameState.phase === 'play' && handCards.length > 0 && (
          <section className="ctc-hand-hint card" aria-live="polite">
            <h2 className="ctc-hand-hint__title">มือรอบนี้</h2>
            <p className="ctc-hand-hint__text">
              {gameState.canAct
                ? hasAnyLegalPlay
                  ? 'ลากการ์ดไปวางบนคอลัมน์ที่ไฮไลต์'
                  : 'ไม่มีทางเล่น — กดไม่ลงการ์ดเพื่อข้ามครั้งนี้'
                : 'รอตาคุณเพื่อเล่นการ์ด'}
            </p>
            {gameState.canAct && (
              <div className="ctc-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={hasAnyLegalPlay}
                  onClick={() => send({ type: 'skip_play' })}
                >
                  ไม่ลงการ์ด
                </Button>
              </div>
            )}
          </section>
        )}

        {gameState.myScorePile.length > 0 && (
          <MyScorePileSection scorePile={gameState.myScorePile} cupScore={cupScore} />
        )}

        {handCards.length > 0 && (
          <PlayerHand
            cards={handCards}
            getCardId={(c) => c.id}
            dragMode={gameState.phase === 'play' ? 'play' : 'none'}
            onSelectToggle={gameState.phase === 'card_selection' ? onHandSelectToggle : undefined}
            disabledCardIds={disabledCardIds}
            getPreview={(c) => ({
              src: cupTheCrabCardImage(c),
              alt: cupTheCrabCardLabel(c),
              caption: cupTheCrabCardLabel(c),
            })}
            renderCard={({ card }) => <CardFace card={card} />}
            aria-label={handAriaLabel}
          />
        )}
        <DragOverlay dropAnimation={null}>
          {draggingPlayCard && gameState.phase === 'play' ? (
            <img
              src={cupTheCrabCardImage(draggingPlayCard)}
              alt=""
              className="ctc-card-img ctc-card-img--drag"
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </GameShell>
  );
}
