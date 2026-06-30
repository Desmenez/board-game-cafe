import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SushiGoAction, SushiGoCard, SushiGoPlayerView } from 'shared';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import { PlayerHand, PLAYER_HAND_DOCK_RESERVE_PX } from '../../components/player-hand';
import { Button } from '../../components/ui';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import { SushiGoBoard } from './SushiGoBoard';
import { SushiGoCardFace } from './SushiGoCardFace';
import { SushiGoPlayedArea } from './SushiGoPlayedArea';
import { SushiGoPlayerStrip } from './SushiGoPlayerStrip';
import { SushiGoRoundSummaryModal } from './SushiGoRoundSummaryModal';
import { sushiGoCardImage, sushiGoCardLabelTh } from './cardMeta';
import './sushi-go.css';

type Props = {
  gameState: SushiGoPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

export function SushiGoGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const deckRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shuffleTick, setShuffleTick] = useState(0);
  const prevRoundRef = useRef(gameState.roundNo);

  const isGameOver = gameState.phase === 'game_over';
  const isRoundEnd = gameState.phase === 'round_end';
  const canPick = gameState.canPick;
  const pickLimit = gameState.chopsticksPickCount;

  useEffect(() => {
    if (gameState.roundNo !== prevRoundRef.current) {
      prevRoundRef.current = gameState.roundNo;
      setShuffleTick((t) => t + 1);
    }
  }, [gameState.roundNo]);

  useEffect(() => {
    if (isGameOver) startWinCelebrationLoop();
  }, [isGameOver]);

  useEffect(() => {
    setSelectedIds([]);
  }, [gameState.pickNo, gameState.roundNo, gameState.hasPicked]);

  const send = useCallback((a: SushiGoAction) => sendAction(a), [sendAction]);

  const toggleSelect = useCallback(
    (id: string) => {
      if (!canPick) return;
      setSelectedIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= pickLimit) return prev;
        return [...prev, id];
      });
    },
    [canPick, pickLimit],
  );

  const confirmPick = useCallback(() => {
    if (!canPick || selectedIds.length === 0) return;
    if (selectedIds.length !== 1 && selectedIds.length !== pickLimit) return;
    send({ type: 'pick_cards', cardIds: selectedIds });
    setSelectedIds([]);
  }, [canPick, selectedIds, pickLimit, send]);

  const passLabel = gameState.passDirection === 'left' ? 'ซ้าย' : 'ขวา';
  const subtitle = `รอบ ${gameState.roundNo}/${gameState.totalRounds} · เทิร์น ${gameState.pickNo}/${gameState.picksPerRound} · ส่ง${passLabel}`;

  const playerNames = useMemo(
    () => Object.fromEntries(gameState.players.map((p) => [p.id, p.name])),
    [gameState.players],
  );

  const rankings = useMemo(() => {
    return [...gameState.players]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        score: p.score,
        isMe: p.id === myId,
        isWinner: gameState.gameResult?.winners.includes(p.id) ?? false,
      }));
  }, [gameState.players, gameState.gameResult, myId]);

  return (
    <GameShell
      className="sg-page"
      style={{
        paddingBottom:
          gameState.myHand.length > 0 && canPick ? PLAYER_HAND_DOCK_RESERVE_PX : undefined,
      }}
    >
      <GamePlayHeader
        title="Sushi Go!"
        subtitle={subtitle}
        onLeave={onLeave}
        onRestart={onRestart}
        trailing={
          <span className="sg-header-event" title={gameState.lastEvent}>
            {gameState.lastEvent}
          </span>
        }
      />

      <main className="sg-main">
        <SushiGoPlayerStrip players={gameState.players} myId={myId} />

        <SushiGoBoard
          ref={deckRef}
          drawPileCount={gameState.drawPileCount}
          discardPileCount={gameState.discardPileCount}
          passDirection={gameState.passDirection}
          shuffleTick={shuffleTick}
        />

        <SushiGoPlayedArea played={gameState.myPlayed} title="การ์ดที่เก็บ (คุณ)" />

        {gameState.lastRevealedPicks.length > 0 ? (
          <div className="sg-panel">
            <h2>เปิดการ์ดล่าสุด</h2>
            <div className="sg-reveal-row">
              {gameState.lastRevealedPicks.map((pick) => (
                <div key={pick.playerId} className="sg-reveal-player">
                  <strong>{pick.playerName}</strong>
                  <div className="sg-reveal-cards">
                    {pick.cards.map((c) => (
                      <SushiGoCardFace key={c.id} card={c} size="tiny" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {canPick ? (
          <div className="sg-panel">
            <h2>เลือกการ์ด</h2>
            <p className="sg-stat-line">
              เลือกแล้ว {gameState.pickProgress.done}/{gameState.pickProgress.total} คน
              {gameState.canUseChopsticks ? ' · ใช้ Chopsticks ได้ (เลือก 2 ใบ)' : ''}
              {gameState.mustPairNigiriWithWasabi ? ' · Nigiri จะคู่ Wasabi อัตโนมัติ' : ''}
            </p>
            <div className="sg-pick-bar">
              <Button
                type="button"
                variant="primary"
                disabled={selectedIds.length === 0 || selectedIds.length > pickLimit}
                onClick={confirmPick}
              >
                {gameState.canUseChopsticks && selectedIds.length === 2
                  ? 'Sushi Go!'
                  : 'เลือกการ์ด'}
              </Button>
              {selectedIds.length > 0 ? (
                <span className="sg-stat-line">
                  เลือก {selectedIds.length}/{pickLimit} ใบ
                </span>
              ) : null}
            </div>
          </div>
        ) : gameState.hasPicked && gameState.phase === 'picking' ? (
          <div className="sg-panel">
            <p>คุณเลือกแล้ว — รอผู้เล่นอื่น…</p>
          </div>
        ) : null}
      </main>

      {canPick && gameState.myHand.length > 0 ? (
        <PlayerHand
          cards={gameState.myHand}
          getCardId={(c: SushiGoCard) => c.id}
          dragMode="none"
          selectedIds={selectedIds}
          onSelectToggle={toggleSelect}
          renderCard={({ card }) => (
            <SushiGoCardFace card={card} size="hand" selected={selectedIds.includes(card.id)} />
          )}
          getPreview={(card) => ({
            src: sushiGoCardImage(card.kind),
            alt: sushiGoCardLabelTh(card.kind),
            caption: sushiGoCardLabelTh(card.kind),
          })}
        />
      ) : null}

      {isRoundEnd && gameState.lastRoundSummary ? (
        <SushiGoRoundSummaryModal
          summary={gameState.lastRoundSummary}
          playerNames={playerNames}
          isFinalRound={gameState.roundNo >= gameState.totalRounds}
          onContinue={() => send({ type: 'ack_round_summary' })}
        />
      ) : null}

      {isGameOver && gameState.gameResult ? (
        <GameOverModal titleId="sg-game-over-title" onLeave={onLeave} onRestart={onRestart}>
          <h2 id="sg-game-over-title">Sushi Go! — จบเกม</h2>
          <p>{gameState.gameResult.reason}</p>
          {gameState.puddingSummary ? (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Pudding</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                {Object.entries(gameState.puddingSummary.puddingCounts).map(([pid, count]) => (
                  <li key={pid}>
                    {playerNames[pid] ?? pid}: {count} ใบ
                    {gameState.puddingSummary!.points[pid]
                      ? ` (${gameState.puddingSummary!.points[pid]! > 0 ? '+' : ''}${gameState.puddingSummary!.points[pid]})`
                      : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {rankings.map((r) => (
              <li key={r.name} style={{ marginBottom: '0.35rem' }}>
                #{r.rank} {r.name} — {r.score} คะแนน{r.isWinner ? ' (ชนะ)' : ''}
              </li>
            ))}
          </ol>
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
