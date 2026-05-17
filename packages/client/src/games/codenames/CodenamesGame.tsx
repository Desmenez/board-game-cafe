import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import type { CodenamesAction, CodenamesPlayerView } from 'shared';
import { GameOverActions, GamePlayHeader, GameShell } from '../../components/game-shell';
import { Button } from '../../components/ui';
import { imageMap } from '../../imageMap';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { startCodenamesWinCelebrationLoop } from '../../utils/winCelebration';
import './codenames.css';

type Props = {
  gameState: CodenamesPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

export function CodenamesGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const [clueWord, setClueWord] = useState('');
  const [clueCountInput, setClueCountInput] = useState('2');
  const me = gameState.players.find((p) => p.id === myId);

  const parsedClueCount = useMemo(() => {
    const n = Number.parseInt(clueCountInput, 10);
    if (!Number.isFinite(n) || n < 1 || n > 9) return null;
    return n;
  }, [clueCountInput]);

  const send = (action: CodenamesAction) => sendAction(action);

  const teamLabel = (t: 'red' | 'blue') => (t === 'red' ? 'แดง' : 'ฟ้า');
  const canGiveClue = gameState.canAct && gameState.turnStage === 'clue';
  const canGuess = gameState.canAct && gameState.turnStage === 'guess';

  useYourTurnToast(gameState.canAct, gameState.phase === 'playing');
  const roleCardSrc =
    gameState.myTeam === 'red'
      ? imageMap.codenames.roleCards.redTeam
      : imageMap.codenames.roleCards.blueTeam;
  const roleTitle =
    gameState.myRole === 'spymaster' ? 'หัวหน้าทีม (Spymaster)' : 'ลูกทีม (Operative)';

  const clueGiverName = useMemo(() => {
    const id = gameState.currentClue?.byPlayerId;
    if (!id) return '';
    return gameState.players.find((p) => p.id === id)?.name ?? id;
  }, [gameState.currentClue, gameState.players]);

  const guessCapThisTurn = useMemo(() => {
    if (gameState.turnStage !== 'guess' || !gameState.currentClue) return 0;
    return gameState.guessesUsedThisTurn + gameState.guessesRemainingThisTurn;
  }, [
    gameState.turnStage,
    gameState.currentClue,
    gameState.guessesUsedThisTurn,
    gameState.guessesRemainingThisTurn,
  ]);

  const redThumb = imageMap.codenames.roleCards.redTeam;
  const blueThumb = imageMap.codenames.roleCards.blueTeam;
  const pendingGuessNamesByCard = useMemo(() => {
    const map = new Map<number, Array<{ id: string; name: string }>>();
    for (const [pid, cardIndex] of Object.entries(gameState.pendingGuessByPlayer)) {
      if (cardIndex === undefined) continue;
      const name = gameState.players.find((p) => p.id === pid)?.name ?? 'ผู้เล่น';
      const prev = map.get(cardIndex) ?? [];
      prev.push({ id: pid, name });
      map.set(cardIndex, prev);
    }
    return map;
  }, [gameState.pendingGuessByPlayer, gameState.players]);
  const myPendingGuessCardIndex = gameState.pendingGuessByPlayer[myId];
  const canConfirmConsensusGuess =
    canGuess &&
    gameState.consensusGuessCardIndex !== undefined &&
    myPendingGuessCardIndex !== undefined;

  const gameOverResult = gameState.phase === 'game_over' ? gameState.gameResult : undefined;

  const winnerTeam = useMemo((): 'red' | 'blue' | null => {
    if (!gameOverResult?.winners.length) return null;
    const pid = gameOverResult.winners[0];
    return gameState.players.find((p) => p.id === pid)?.team ?? null;
  }, [gameOverResult, gameState.players]);

  const winnerPlayersOrdered = useMemo(() => {
    if (!gameOverResult?.winners.length) return [];
    const ids = new Set(gameOverResult.winners);
    return gameState.players.filter((p) => ids.has(p.id));
  }, [gameOverResult, gameState.players]);

  useEffect(() => {
    if (gameState.phase !== 'game_over' || winnerTeam == null) return;
    return startCodenamesWinCelebrationLoop(winnerTeam);
  }, [gameState.phase, winnerTeam]);

  const turnPill = (
    <div className={`cn-turn-pill cn-turn-pill--${gameState.turnTeam}`}>
      <img
        src={gameState.turnTeam === 'red' ? redThumb : blueThumb}
        alt=""
        className="cn-turn-pill__ico"
      />
      <span>
        เทิร์นทีม<strong>{teamLabel(gameState.turnTeam)}</strong>
      </span>
      <span className="cn-turn-pill__sep">·</span>
      <span>{gameState.turnStage === 'clue' ? 'Spymaster ให้คำใบ้' : 'ลูกทีมเดาคำบนกระดาน'}</span>
    </div>
  );

  return (
    <GameShell className="cn-page">
      {gameState.phase === 'role_reveal' ? (
        <div className="modal-overlay" role="dialog" aria-modal>
          <div
            className={`modal cn-role-modal cn-role-modal--${gameState.myTeam}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>บทบาทของคุณ</h2>
            <p className="cn-role-modal__team-line">
              คุณอยู่ทีม{teamLabel(gameState.myTeam)} · หน้าที่: {roleTitle}
            </p>
            <div className="cn-role-modal__card-wrap">
              <img
                src={roleCardSrc}
                alt={`ทีม${teamLabel(gameState.myTeam)}`}
                className="cn-role-modal__card"
              />
            </div>
            <p className="cn-role-modal__lead">
              {gameState.myRole === 'spymaster'
                ? 'คุณเป็นหัวหน้าทีม: ให้คำใบ้ 1 คำ + จำนวน'
                : 'คุณเป็นลูกทีม: ฟังคำใบ้แล้วเลือกคำบนกระดาน'}
            </p>
            <p className="cn-hint">
              ผู้เล่นยืนยันบทบาทแล้ว {gameState.roleAcknowledgeProgress?.current ?? 0}/
              {gameState.roleAcknowledgeProgress?.total ?? gameState.players.length}
            </p>
            {gameState.hasAcknowledgedRole ? (
              <Button type="button" variant="secondary" block disabled>
                คุณยืนยันแล้ว — รอผู้เล่นคนอื่น
              </Button>
            ) : (
              <Button type="button" block onClick={() => send({ type: 'acknowledge_role' })}>
                รับทราบ พร้อมเริ่มเกม
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <div className={`cn-header card cn-header--turn-${gameState.turnTeam}`}>
        <GamePlayHeader
          title="Codenames"
          trailing={turnPill}
          onLeave={onLeave}
          onRestart={onRestart}
        />

        {gameState.turnStage === 'guess' && gameState.currentClue ? (
          <div className={`cn-clue-banner cn-clue-banner--${gameState.currentClue.team}`}>
            <div className="cn-clue-banner__meta">
              <span className="cn-clue-banner__label">คำใบ้รอบนี้</span>
              {clueGiverName ? (
                <span className="cn-clue-banner__by">จาก {clueGiverName}</span>
              ) : null}
            </div>
            <div className="cn-clue-banner__word-row">
              <span className="cn-clue-banner__word" lang="th">
                {gameState.currentClue.clueWord}
              </span>
              <span className="cn-clue-banner__colon">:</span>
              <span
                className="cn-clue-banner__num"
                aria-label={`เกี่ยวข้อง ${gameState.currentClue.clueCount} คำ`}
              >
                {gameState.currentClue.clueCount}
              </span>
            </div>
            <div className="cn-clue-banner__hint-row">
              <span className="cn-clue-banner__hint-label">เกี่ยวข้อง</span>
              <strong>{gameState.currentClue.clueCount}</strong>
              <span>คำที่ตั้งใจใบ้</span>
              <span className="cn-clue-banner__dot">·</span>
              <span className="cn-clue-banner__hint-label">เดาได้อีก</span>
              <strong className="cn-clue-banner__remain">
                {gameState.guessesRemainingThisTurn}
              </strong>
              <span>/ {guessCapThisTurn} ครั้งสูงสุดในเทิร์นนี้</span>
            </div>
          </div>
        ) : (
          <p className="cn-header__phase-hint">
            {gameState.turnStage === 'clue'
              ? `รอ Spymaster ทีม${teamLabel(gameState.turnTeam)} ส่งคำใบ้ (1 คำ + ตัวเลข)`
              : 'กำลังเตรียมคำใบ้…'}
          </p>
        )}

        <p className="cn-event">{gameState.lastEvent}</p>

        <div className="cn-remaining">
          <span className="cn-score cn-score--red">
            <img src={redThumb} alt="" className="cn-score__thumb" />
            <span className="cn-score__label">ทีมแดง</span>
            <strong className="cn-score__num">{gameState.redRemaining}</strong>
            <span className="cn-score__suffix">คำเหลือ</span>
          </span>
          <span className="cn-score cn-score--blue">
            <img src={blueThumb} alt="" className="cn-score__thumb" />
            <span className="cn-score__label">ทีมฟ้า</span>
            <strong className="cn-score__num">{gameState.blueRemaining}</strong>
            <span className="cn-score__suffix">คำเหลือ</span>
          </span>
          {me ? (
            <span className={`cn-me-chip cn-me-chip--${me.team}`}>
              <img
                src={me.team === 'red' ? redThumb : blueThumb}
                alt=""
                className="cn-me-chip__thumb"
              />
              <span>
                คุณ · ทีม{teamLabel(me.team)} · {me.role === 'spymaster' ? 'หัวหน้าทีม' : 'ลูกทีม'}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      {canGiveClue ? (
        <section className="card cn-clue-box">
          <h3>ให้คำใบ้</h3>
          <div className="cn-clue-box__row">
            <input
              className="input"
              value={clueWord}
              onChange={(e) => setClueWord(e.target.value)}
              placeholder="คำใบ้ 1 คำ"
            />
            <input
              className="input cn-clue-box__count"
              type="number"
              min={1}
              max={9}
              inputMode="numeric"
              aria-label="จำนวนคำที่เกี่ยวข้อง"
              value={clueCountInput}
              onChange={(e) => setClueCountInput(e.target.value)}
            />
            <Button
              type="button"
              onClick={() => {
                if (parsedClueCount === null) return;
                send({ type: 'give_clue', clueWord, clueCount: parsedClueCount });
                setClueWord('');
              }}
              disabled={!clueWord.trim() || parsedClueCount === null}
            >
              ส่งคำใบ้
            </Button>
          </div>
        </section>
      ) : null}

      {canGuess ? (
        <section className="card cn-clue-box flex flex-col gap-1">
          <h3>ลูกทีม Operative</h3>
          <div className="cn-clue-box__row">
            <Button
              type="button"
              onClick={() => send({ type: 'confirm_guess' })}
              disabled={!canConfirmConsensusGuess}
            >
              ยืนยันคำที่เลือกตรงกัน
            </Button>
            <Button type="button" variant="secondary" onClick={() => send({ type: 'end_guesses' })}>
              จบการเดา
            </Button>
          </div>
          <p className="cn-vote-help">
            แตะคำเพื่อโหวตก่อนเปิดจริง ผู้เล่นทุกคนในทีมต้องเลือกคำเดียวกัน แล้วใครก็ได้กดปุ่มยืนยัน
          </p>
          {gameState.consensusGuessCardIndex !== undefined ? (
            <p className="cn-vote-status cn-vote-status--ready">
              พร้อมยืนยัน: ทุกคนเลือกตรงกันแล้ว
            </p>
          ) : (
            <p className="cn-vote-status">รอให้ลูกทีมในเทิร์นนี้เลือกคำเดียวกันก่อน</p>
          )}
        </section>
      ) : null}

      <section className="cn-board">
        {gameState.cards.map((card) => {
          const role = card.revealedRole ?? card.roleHint;
          const cls = card.revealed
            ? role === 'red'
              ? 'is-red'
              : role === 'blue'
                ? 'is-blue'
                : role === 'assassin'
                  ? 'is-assassin'
                  : 'is-neutral'
            : role
              ? `hint-${role}`
              : '';
          return (
            <button
              key={card.index}
              type="button"
              className={`cn-card ${cls} ${
                gameState.consensusGuessCardIndex === card.index ? 'is-consensus' : ''
              } ${myPendingGuessCardIndex === card.index ? 'is-my-pick' : ''}`}
              disabled={!canGuess || card.revealed}
              onClick={() => send({ type: 'select_guess', cardIndex: card.index })}
            >
              <span className="cn-card__word">{card.word}</span>
              {pendingGuessNamesByCard.get(card.index)?.length ? (
                <span className="cn-card__votes">
                  {pendingGuessNamesByCard.get(card.index)!.map((vote) => (
                    <span key={vote.id} className="cn-card__vote-name">
                      {vote.name}
                    </span>
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </section>

      {gameOverResult && winnerTeam ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal
          aria-labelledby="cn-game-over-title"
        >
          <div
            className={`modal cn-game-over-modal cn-game-over-modal--${winnerTeam}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cn-game-over-modal__hero">
              <img
                src={winnerTeam === 'red' ? redThumb : blueThumb}
                alt=""
                className="cn-game-over-modal__card-art"
              />
              <div className="cn-game-over-modal__headlines">
                <p className="cn-game-over-modal__eyebrow">ผู้ชนะ</p>
                <h2 id="cn-game-over-title" className="cn-game-over-modal__title">
                  ทีม{teamLabel(winnerTeam)} ชนะ
                </h2>
              </div>
            </div>
            <p className="cn-game-over-modal__reason">{gameOverResult.reason}</p>

            <div className="cn-game-over-modal__roster-panel">
              <div className="cn-game-over-modal__roster-head">
                <Users className="cn-game-over-modal__roster-icon" size={18} aria-hidden />
                <div>
                  <p className="cn-game-over-modal__roster-kicker">ทีมผู้ชนะ</p>
                  <p className="cn-game-over-modal__roster-title">สมาชิกในทีม</p>
                </div>
              </div>
              <ul className="cn-game-over-modal__members">
                {winnerPlayersOrdered.map((p, idx) => (
                  <li key={p.id} className="cn-game-over-modal__member">
                    <span className="cn-game-over-modal__member-rank" aria-hidden>
                      {idx + 1}
                    </span>
                    <div className="cn-game-over-modal__member-body">
                      <span className="cn-game-over-modal__member-name">{p.name}</span>
                      <span
                        className={`cn-game-over-modal__member-badge cn-game-over-modal__member-badge--${p.role}`}
                      >
                        {p.role === 'spymaster' ? 'หัวหน้าทีม' : 'ลูกทีม'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <GameOverActions
              onRestart={onRestart}
              onLeave={onLeave}
              leaveVariant="secondary"
              leaveClassName={`cn-game-over-modal__leave cn-game-over-modal__leave--${winnerTeam}`}
              className="cn-game-over-modal__actions"
            />
          </div>
        </div>
      ) : gameOverResult ? (
        <div className="modal-overlay" role="dialog" aria-modal>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>จบเกม</h2>
            <p>{gameOverResult.reason}</p>
            <GameOverActions
              onRestart={onRestart}
              onLeave={onLeave}
              className="cn-game-over-modal__actions"
            />
          </div>
        </div>
      ) : null}
    </GameShell>
  );
}
