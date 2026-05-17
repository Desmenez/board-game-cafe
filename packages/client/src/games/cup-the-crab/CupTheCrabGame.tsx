import { useMemo, useState } from 'react';
import type { CupTheCrabAction, CupTheCrabCard, CupTheCrabPlayerView } from 'shared';
import { GameOverActions, GamePlayHeader, GameShell } from '../../components/game-shell';
import { Button } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { cupTheCrabCardImage } from './cardMeta';
import './cup-the-crab.css';

type Props = {
  gameState: CupTheCrabPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

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

export function CupTheCrabGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [playCardId, setPlayCardId] = useState<string | null>(null);

  const send = (action: CupTheCrabAction) => sendAction(action);

  const selectableHand =
    gameState.phase === 'card_selection'
      ? gameState.reserve
      : gameState.phase === 'play'
        ? (gameState.roundHand ?? [])
        : [];

  const cupScore = useMemo(
    () =>
      gameState.myScorePile
        .filter((c) => c.kind === 'cup')
        .reduce((sum, c) => sum + (c.value ?? 0), 0),
    [gameState.myScorePile],
  );

  useYourTurnToast(gameState.canAct, gameState.phase !== 'game_over');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const confirmSelection = () => {
    if (selectedIds.length !== 3) return;
    send({
      type: 'confirm_selection',
      cardIds: [selectedIds[0]!, selectedIds[1]!, selectedIds[2]!],
    });
    setSelectedIds([]);
  };

  const playOnNewStack = () => {
    if (!playCardId) return;
    send({ type: 'play_card', cardId: playCardId, target: { kind: 'new_stack' } });
    setPlayCardId(null);
  };

  const playOnStack = (stackId: string) => {
    if (!playCardId) return;
    send({ type: 'play_card', cardId: playCardId, target: { kind: 'stack', stackId } });
    setPlayCardId(null);
  };

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

  if (gameState.phase === 'game_over') {
    const piles = gameState.allScorePiles ?? { [myId]: gameState.myScorePile };
    return (
      <GameShell className="ctc-page">
        <GamePlayHeader title="Cup the Crab!" onLeave={onLeave} onRestart={onRestart} leaveLabel="full" />
        <p className="ctc-event">{gameState.result?.reason ?? 'จบเกม'}</p>
        <section className="card">
          {gameState.players.map((p) => {
            const pile = piles[p.id] ?? [];
            const score = pile
              .filter((c) => c.kind === 'cup')
              .reduce((s, c) => s + (c.value ?? 0), 0);
            return (
              <div key={p.id} className="ctc-score-row">
                <strong>
                  {p.name}
                  {p.id === myId ? ' (คุณ)' : ''}: {score} แต้ม
                </strong>
                <div className="ctc-score-pile">
                  {pile.map((c) => (
                    <CardFace key={c.id} card={c} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
        <GameOverActions onRestart={onRestart} onLeave={onLeave} />
      </GameShell>
    );
  }

  return (
    <GameShell className="ctc-page">
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

      <div className="ctc-board">
        <section className="card">
          <h2>
            กองบนโต๊ะ ({gameState.stacks.length}/{gameState.maxStacks})
          </h2>
          <div className="ctc-stacks">
            {gameState.stacks.length === 0 ? (
              <p>ยังไม่มีกอง</p>
            ) : (
              gameState.stacks.map((stack) => (
                <div
                  key={stack.id}
                  className={`ctc-stack${stack.hasBottle ? ' ctc-stack--bottle' : ''}`}
                >
                  <div className="ctc-stack-cards">
                    {stack.cards.map((c) => (
                      <CardFace key={c.id} card={c} />
                    ))}
                  </div>
                  {gameState.canAct && playCardId && (
                    <Button type="button" size="sm" onClick={() => playOnStack(stack.id)}>
                      เล่นที่นี่
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <h2>{gameState.phase === 'card_selection' ? 'เลือกการ์ด 3 ใบ (ลับ)' : 'มือรอบนี้'}</h2>
          <div className="ctc-hand">
            {selectableHand.map((card) => (
              <button
                key={card.id}
                type="button"
                className={[
                  'ctc-hand-btn',
                  selectedIds.includes(card.id) || playCardId === card.id
                    ? 'ctc-hand-btn--selected'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!gameState.canAct && gameState.phase === 'card_selection'}
                onClick={() => {
                  if (gameState.phase === 'card_selection') {
                    toggleSelect(card.id);
                  } else if (gameState.canAct) {
                    setPlayCardId((id) => (id === card.id ? null : card.id));
                  }
                }}
              >
                <CardFace card={card} />
              </button>
            ))}
          </div>

          {gameState.phase === 'card_selection' && gameState.canAct && (
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

          {gameState.phase === 'play' && gameState.canAct && playCardId && (
            <div className="ctc-actions">
              <Button type="button" onClick={playOnNewStack}>
                เปิดกองใหม่
              </Button>
            </div>
          )}
        </section>
      </div>

      {gameState.myScorePile.length > 0 && (
        <section className="card">
          <h2>กองคะแนนของคุณ ({cupScore} แต้มจากถ้วย)</h2>
          <div className="ctc-score-pile">
            {gameState.myScorePile.map((c) => (
              <CardFace key={c.id} card={c} />
            ))}
          </div>
        </section>
      )}
    </GameShell>
  );
}
