import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type {
  SplendorAction,
  SplendorCardView,
  SplendorGem,
  SplendorGems,
  SplendorPlayerView,
} from 'shared';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import { useLockBodyScroll, usePlayDragSensors } from '../../components/player-hand';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { SplendorBoard } from './SplendorBoard';
import { SplendorCardModal } from './SplendorCardModal';
import { SplendorChip } from './SplendorChip';
import { SplendorNoblePick } from './SplendorNoblePick';
import { SplendorPlayDock } from './SplendorPlayDock';
import { SplendorPlayerPanel } from './SplendorPlayerPanel';
import { SplendorPlayerStrip } from './SplendorPlayerStrip';
import {
  SPLENDOR_BANK_DROP_ID,
  SPLENDOR_BANK_DRAG_PREFIX,
  SPLENDOR_PLAYER_DROP_ID,
  SPLENDOR_PLAYER_DRAG_PREFIX,
  applyBankGemToTakeDraft,
  applyPlayerTokenReturn,
  parseBankDragId,
  parsePlayerDragId,
  validateTakeGemsConfirm,
} from './splendorDragUtils';
import { emptyGems, reservedCount, sumGems, totalHeld } from './splendorUtils';
import './splendor.css';

type Props = {
  gameState: SplendorPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

type TablePick = { level: 1 | 2 | 3; slot: number; card: SplendorCardView };

type DragKind = { source: 'bank' | 'player'; gem: SplendorGem | 'gold' } | null;

export function SplendorGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const [takeDraft, setTakeDraft] = useState<SplendorGem[]>([]);
  const [tablePick, setTablePick] = useState<TablePick | null>(null);
  const [selectedReservedId, setSelectedReservedId] = useState<string | null>(null);
  const [returnDraft, setReturnDraft] = useState<SplendorGems & { gold: number }>({
    ...emptyGems(),
    gold: 0,
  });
  const [dragMessage, setDragMessage] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragKind>(null);

  const playSensors = usePlayDragSensors();
  const isDragging = activeDrag !== null;
  useLockBodyScroll(isDragging);

  const me = useMemo(() => gameState.players.find((p) => p.id === myId), [gameState.players, myId]);

  const isMyTurn =
    gameState.currentPlayerId === myId &&
    (gameState.phase === 'playing' || gameState.phase === 'return_tokens');

  const canActPlaying = gameState.phase === 'playing' && isMyTurn;
  const canActReturn = gameState.phase === 'return_tokens' && gameState.currentPlayerId === myId;

  const canPickNoble =
    gameState.phase === 'noble_pick' &&
    Boolean(gameState.noblePickOptions?.length) &&
    gameState.currentPlayerId === myId;

  const send = useCallback((a: SplendorAction) => sendAction(a), [sendAction]);

  const reservedFilled = me ? reservedCount(me.reservedSlots) : 0;
  const canReserve = canActPlaying && reservedFilled < 3;

  const excess = me ? Math.max(0, totalHeld(me.gems, me.gold) - 10) : 0;

  useEffect(() => {
    if (!isMyTurn) {
      setSelectedReservedId(null);
      setTakeDraft([]);
    }
  }, [isMyTurn]);

  useEffect(() => {
    if (gameState.phase !== 'return_tokens') {
      setReturnDraft({ ...emptyGems(), gold: 0 });
    }
  }, [gameState.phase]);

  useEffect(() => {
    if (!dragMessage) return;
    const t = setTimeout(() => setDragMessage(null), 3500);
    return () => clearTimeout(t);
  }, [dragMessage]);

  const handleBankGem = useCallback(
    (gem: SplendorGem) => {
      if (!canActPlaying) return;
      const result = applyBankGemToTakeDraft(takeDraft, gem, gameState.bankGems);
      if (!result.ok) {
        setDragMessage(result.message);
        return;
      }
      if (result.action === 'take_two') {
        send({ type: 'take_two', color: result.gem });
        setTakeDraft([]);
        setDragMessage(null);
        return;
      }
      setTakeDraft(result.draft);
      setDragMessage(null);
    },
    [canActPlaying, gameState.bankGems, send, takeDraft],
  );

  const confirmTakeGems = useCallback(() => {
    const err = validateTakeGemsConfirm(takeDraft);
    if (err) {
      setDragMessage(err);
      return;
    }
    for (const g of takeDraft) {
      if (gameState.bankGems[g] < 1) {
        setDragMessage('ธนาคารไม่มีอัญมณีเพียงพอ');
        return;
      }
    }
    send({ type: 'take_gems', colors: [...takeDraft] });
    setTakeDraft([]);
    setDragMessage(null);
  }, [gameState.bankGems, send, takeDraft]);

  const confirmReturn = useCallback(() => {
    const returnSum = sumGems(returnDraft) + returnDraft.gold;
    if (excess <= 0 || returnSum !== excess) return;
    send({
      type: 'return_tokens',
      gems: {
        white: returnDraft.white,
        blue: returnDraft.blue,
        green: returnDraft.green,
        red: returnDraft.red,
        black: returnDraft.black,
      },
      gold: returnDraft.gold,
    });
    setReturnDraft({ ...emptyGems(), gold: 0 });
    setDragMessage(null);
  }, [excess, returnDraft, send]);

  const buySelectedReserved = () => {
    if (!selectedReservedId || !canActPlaying || !me) return;
    const slot = me.reservedSlots.findIndex(
      (s) => s !== null && !('hidden' in s) && s.id === selectedReservedId,
    );
    if (slot < 0) return;
    send({ type: 'buy_reserved', slot });
    setSelectedReservedId(null);
  };

  const toggleReservedSelect = (cardId: string) => {
    if (!canActPlaying) return;
    setSelectedReservedId((prev) => (prev === cardId ? null : cardId));
  };

  const onDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith(`${SPLENDOR_BANK_DRAG_PREFIX}-`)) {
      const gem = parseBankDragId(id);
      if (gem) setActiveDrag({ source: 'bank', gem });
      return;
    }
    if (id.startsWith(`${SPLENDOR_PLAYER_DRAG_PREFIX}-`)) {
      const kind = parsePlayerDragId(id);
      if (kind) setActiveDrag({ source: 'player', gem: kind });
    }
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null);
      const activeId = String(event.active.id);
      const overId = event.over?.id ? String(event.over.id) : null;

      if (
        activeId.startsWith(`${SPLENDOR_BANK_DRAG_PREFIX}-`) &&
        overId === SPLENDOR_PLAYER_DROP_ID
      ) {
        const gem = parseBankDragId(activeId);
        if (gem) handleBankGem(gem);
        return;
      }

      if (
        activeId.startsWith(`${SPLENDOR_PLAYER_DRAG_PREFIX}-`) &&
        overId === SPLENDOR_BANK_DROP_ID &&
        canActReturn &&
        me
      ) {
        const kind = parsePlayerDragId(activeId);
        if (!kind) return;
        const result = applyPlayerTokenReturn(returnDraft, kind, me.gems, me.gold, excess);
        if (!result.ok) {
          setDragMessage(result.message);
          return;
        }
        setReturnDraft(result.draft);
        setDragMessage(null);
      }
    },
    [canActReturn, excess, handleBankGem, me, returnDraft],
  );

  useYourTurnToast(
    Boolean(canActPlaying || canActReturn || canPickNoble),
    gameState.phase !== 'game_over',
  );

  if (gameState.phase === 'game_over' && gameState.result) {
    const { winners, reason, scores } = gameState.result;
    return (
      <GameShell className="splendor-page">
        <GamePlayHeader
          title="Splendor"
          onLeave={onLeave}
          onRestart={onRestart}
          leaveLabel="full"
        />
        <GameOverModal
          onLeave={onLeave}
          onRestart={onRestart}
          titleId="splendor-game-over-title"
          panelClassName="splendor-game-over-modal"
        >
          <h2 id="splendor-game-over-title">จบเกม</h2>
          <p className="splendor-game-over-reason">{reason}</p>
          <div className="splendor-game-over__scores">
            {gameState.players.map((p) => (
              <div
                key={p.id}
                className={[
                  'splendor-game-over-row',
                  winners.includes(p.id) ? 'splendor-game-over-row--winner' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span>{p.name}</span>
                <span>
                  {scores[p.id] ?? 0} แต้ม
                  {winners.includes(p.id) ? ' — ชนะ' : ''}
                </span>
              </div>
            ))}
          </div>
        </GameOverModal>
      </GameShell>
    );
  }

  return (
    <GameShell
      className={['splendor-page', isDragging ? 'splendor-page--dragging' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <GamePlayHeader
        title="Splendor"
        subtitle={
          gameState.lastEvent ? (
            <p className="splendor-game__event">{gameState.lastEvent}</p>
          ) : undefined
        }
        onLeave={onLeave}
        onRestart={onRestart}
        leaveLabel="short"
      />

      <SplendorPlayerStrip
        players={gameState.players}
        myId={myId}
        currentPlayerId={gameState.currentPlayerId}
      />

      {gameState.finalRoundNotice && (
        <p className="splendor-game__notice" role="status">
          รอบสุดท้าย: มีผู้เล่นถึง 15 แต้มแล้ว — เล่นจบรอบนี้
        </p>
      )}

      <DndContext
        sensors={playSensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <section className="card splendor-board-wrap" aria-label="กระดาน">
          <SplendorBoard
            nobles={gameState.nobles}
            visible={gameState.visible}
            deckSizes={gameState.deckSizes}
            bankGems={gameState.bankGems}
            bankGold={gameState.bankGold}
            canActPlaying={canActPlaying}
            canActReturn={canActReturn}
            canReserve={canReserve}
            onCardClick={setTablePick}
            onReserveDeck={(level) => send({ type: 'reserve_deck', level })}
            onBankGemClick={handleBankGem}
          />
        </section>

        {me && (
          <SplendorPlayDock
            reservedSlots={me.reservedSlots}
            gems={me.gems}
            gold={me.gold}
            bonuses={me.bonuses}
            canActPlaying={canActPlaying}
            selectedReservedId={selectedReservedId}
            onSelectReserved={toggleReservedSelect}
            onBuyReserved={buySelectedReserved}
          />
        )}

        {canPickNoble && gameState.noblePickOptions && (
          <SplendorNoblePick
            nobles={gameState.nobles}
            optionIds={gameState.noblePickOptions}
            onChoose={(nobleId) => send({ type: 'choose_noble', nobleId })}
          />
        )}

        {me && (
          <SplendorPlayerPanel
            me={me}
            canActPlaying={canActPlaying}
            canActReturn={canActReturn}
            takeDraft={takeDraft}
            returnDraft={returnDraft}
            excess={excess}
            dragMessage={dragMessage}
            onConfirmTakeGems={confirmTakeGems}
            onConfirmReturn={confirmReturn}
            onClearTakeDraft={() => setTakeDraft([])}
          />
        )}

        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <SplendorChip kind={activeDrag.gem} size="lg" className="splendor-drag-overlay" />
          ) : null}
        </DragOverlay>
      </DndContext>

      {tablePick && (
        <SplendorCardModal
          level={tablePick.level}
          slot={tablePick.slot}
          card={tablePick.card}
          canReserve={canReserve}
          onBuy={() => {
            send({
              type: 'buy_table',
              level: tablePick.level,
              slot: tablePick.slot,
            });
            setTablePick(null);
          }}
          onReserve={() => {
            send({
              type: 'reserve_table',
              level: tablePick.level,
              slot: tablePick.slot,
            });
            setTablePick(null);
          }}
          onClose={() => setTablePick(null)}
        />
      )}
    </GameShell>
  );
}
