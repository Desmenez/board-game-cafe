import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LogOut, RotateCcw } from 'lucide-react';
import type { AbracaAction, AbracaPlayerView, AbracaSpellReveal } from 'shared';
import { ABRACA_SPELLBOOK } from 'shared';
import { Button, Dice } from '../../components/ui';
import { imageMap } from '../../imageMap';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import '../flip7/flip7.css';
import './abracawhat.css';

type Props = {
  gameState: AbracaPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

type SpellRow = (typeof ABRACA_SPELLBOOK)[number];

function SpellRevealModalContent({
  reveal,
  casterName,
  spellByRank,
  onDismiss,
}: {
  reveal: AbracaSpellReveal;
  casterName: string;
  spellByRank: Record<number, SpellRow | undefined>;
  onDismiss: () => void;
}) {
  const sp = spellByRank[reveal.spellRank];
  const rank = reveal.spellRank;
  const img = imageMap.abracawhat.spell[rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8];

  let title: string;
  let detail: ReactNode = null;

  switch (reveal.outcome) {
    case 'success':
      title = 'ทายถูก — ร่ายสำเร็จ';
      break;
    case 'fail_no_stone':
      title = 'ทายผิด — ไม่มีหินนี้ในมือ';
      break;
    case 'fail_dragon':
      title = 'ทายผิด — มังกรล้มเหลว';
      detail = (
        <p className="aw-spell-reveal-detail">
          ทอยได้ {reveal.dragonDamage} · เสียเลือด {reveal.dragonDamage}
        </p>
      );
      break;
    case 'fail_chain':
      title = 'ทายผิด — เลขต่ำกว่าลำดับ';
      detail = <p className="aw-spell-reveal-detail">ต้องร่ายเลข ≥ {reveal.chainRequiredRank}</p>;
      break;
  }

  return (
    <>
      <p id="aw-spell-reveal-title" className="aw-spell-reveal-kicker">
        {reveal.outcome === 'success' ? '✓' : '✗'}{' '}
        <span className="aw-spell-reveal-kicker-text">{title}</span>
      </p>
      <p className="aw-spell-reveal-who">
        <strong>{casterName}</strong>
        <span className="muted"> · เวทเลข {rank}</span>
      </p>
      <div className="aw-spell-reveal-card">
        <img src={img} alt="" />
        <div>
          <p className="aw-spell-reveal-name">
            {rank}. {sp?.nameTh ?? `หิน ${rank}`}
          </p>
        </div>
      </div>
      {detail}
      <Button type="button" block variant="primary" onClick={onDismiss}>
        ตกลง
      </Button>
    </>
  );
}

export function AbracawhatGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const [diceRolling, setDiceRolling] = useState(false);
  const [dismissedRevealSeq, setDismissedRevealSeq] = useState(0);

  useEffect(() => {
    if (gameState.phase !== 'game_over') return;
    return startWinCelebrationLoop();
  }, [gameState.phase]);

  const spellByRank = useMemo(() => Object.fromEntries(ABRACA_SPELLBOOK.map((s) => [s.id, s])), []);

  const gameOverBoard = useMemo(() => {
    if (gameState.phase !== 'game_over' || !gameState.gameResult) return [];
    const winners = new Set(gameState.gameResult.winners);
    return [...gameState.players]
      .map((p) => ({
        id: p.id,
        name: p.name,
        towerFloor: p.towerFloor,
        isWinner: winners.has(p.id),
      }))
      .sort((a, b) => {
        if (b.towerFloor !== a.towerFloor) return b.towerFloor - a.towerFloor;
        return a.name.localeCompare(b.name, 'th');
      })
      .map((row, i) => ({ ...row, place: i + 1 }));
  }, [gameState.phase, gameState.players, gameState.gameResult]);

  const gameOverWinnerLine = useMemo(() => {
    if (gameState.phase !== 'game_over' || !gameState.gameResult?.winners.length) return '—';
    return gameState.gameResult.winners
      .map((id) => gameState.players.find((p) => p.id === id)?.name ?? id)
      .join(' · ');
  }, [gameState.phase, gameState.gameResult, gameState.players]);

  const isMyTurn = gameState.phase === 'playing' && gameState.currentPlayerId === myId;
  const canEndTurn =
    isMyTurn && gameState.subPhase === 'normal' && gameState.successfulCastsThisTurn >= 1;

  const send = (action: AbracaAction) => sendAction(action);

  const castSpell = (n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) => {
    send({ type: 'cast_spell', spellRank: n });
  };

  const chainBlocked = (n: number) =>
    gameState.lastCastRankThisTurn != null && n < gameState.lastCastRankThisTurn;

  useEffect(() => {
    if (!gameState.lastDieRoll) return;
    setDiceRolling(true);
    const t = window.setTimeout(() => setDiceRolling(false), 560);
    return () => clearTimeout(t);
  }, [gameState.lastDieRoll]);

  useEffect(() => {
    setDismissedRevealSeq(0);
  }, [gameState.roundNo]);

  const lastReveal = gameState.lastSpellReveal;
  const showSpellRevealModal = lastReveal != null && lastReveal.seq > dismissedRevealSeq;

  const dismissSpellReveal = () => {
    if (lastReveal) setDismissedRevealSeq(lastReveal.seq);
  };

  const revealCasterName = useMemo(() => {
    if (!lastReveal) return '';
    return gameState.players.find((p) => p.id === lastReveal.playerId)?.name ?? lastReveal.playerId;
  }, [lastReveal, gameState.players]);

  return (
    <>
      {showSpellRevealModal && lastReveal ? (
        <div
          className="modal-overlay aw-spell-reveal-overlay"
          role="presentation"
          onClick={dismissSpellReveal}
        >
          <div
            className={`modal aw-spell-reveal-modal${lastReveal.outcome === 'success' ? ' aw-spell-reveal-modal--ok' : ' aw-spell-reveal-modal--fail'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="aw-spell-reveal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <SpellRevealModalContent
              reveal={lastReveal}
              casterName={revealCasterName}
              spellByRank={spellByRank}
              onDismiss={dismissSpellReveal}
            />
          </div>
        </div>
      ) : null}

      {gameState.phase === 'playing' ? (
        <div className="page container aw-page">
          <header className="aw-head">
            <div className="aw-head-top">
              <div className="aw-head-titles">
                <h1 id="aw-page-title">Abracada…What?</h1>
                <p className="aw-sub">
                  รอบที่ {gameState.roundNo} · เป้าหมายขึ้นหอชั้นที่ {gameState.targetTowerFloor}
                </p>
              </div>
              <div className="aw-head-actions" aria-label="เมนูห้อง">
                {onRestart ? (
                  <Button type="button" variant="secondary" size="sm" onClick={onRestart}>
                    <RotateCcw size={14} aria-hidden />
                    เล่นใหม่
                  </Button>
                ) : null}
                <Button type="button" variant="danger" size="sm" onClick={onLeave}>
                  <LogOut size={14} aria-hidden />
                  ออก
                </Button>
              </div>
            </div>
            <p className="aw-event" role="status">
              {gameState.lastEvent}
            </p>
            {gameState.lastDieRoll ? (
              <div
                className="aw-event"
                style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
              >
                <Dice
                  value={gameState.lastDieRoll.value}
                  rolling={diceRolling}
                  size="md"
                  aria-label={`ลูกเต๋า ${gameState.lastDieRoll.value}`}
                />
                <span>
                  {gameState.lastDieRoll.context === 'dragon_success'
                    ? 'มังกรโบราณ'
                    : gameState.lastDieRoll.context === 'dragon_fail'
                      ? 'อัญเชิญมังกรล้มเหลว'
                      : gameState.lastDieRoll.context === 'sweet_dream'
                        ? 'ความฝันหวาน'
                        : 'ลูกเต๋า'}
                </span>
              </div>
            ) : null}
          </header>

          <section className="aw-players" aria-labelledby="aw-players-heading">
            <h2 id="aw-players-heading" className="aw-section-title">
              ผู้เล่น
            </h2>
            <ul className="aw-player-list">
              {gameState.players.map((p) => {
                const mine = p.id === myId;
                const current = p.id === gameState.currentPlayerId;
                const othersHand = gameState.othersHands[p.id];
                return (
                  <li key={p.id} className={`aw-card${current ? ' aw-card--current' : ''}`}>
                    <div className="aw-card-head">
                      <h3 className="aw-card-name">
                        {p.name}
                        {mine ? <span className="aw-pill aw-pill--you">คุณ</span> : null}
                      </h3>
                      {current ? <span className="aw-pill aw-pill--turn">ถึงตา</span> : null}
                    </div>

                    <div className="flex items-center gap-4">
                      {mine && p.handSize > 0 ? (
                        <div className="aw-hand-block aw-hand-block--mine">
                          <p className="aw-hand-label">มือของคุณ (มองไม่เห็นหน้า)</p>
                          <div className="aw-hand" aria-label={`มือของคุณ ${p.handSize} ใบ คว่ำหน้า`}>
                            {Array.from({ length: p.handSize }, (_, i) => (
                              <div
                                key={`mine-${i}`}
                                className="aw-hand-card aw-hand-card--face-down"
                              />
                            ))}
                          </div>
                          <p className="aw-hand-mine-hint">ดูมือคนอื่นเพื่อไต่สวน</p>
                        </div>
                      ) : !mine && othersHand && othersHand.length > 0 ? (
                        <div className="aw-hand-block">
                          <p className="aw-hand-label">การ์ดที่เห็น</p>
                          <div className="aw-hand" aria-label={`มือของ ${p.name}`}>
                            {othersHand.map((rank, i) => (
                              <div key={`${p.id}-${i}-${rank}`} className="aw-hand-card">
                                <img
                                  src={
                                    imageMap.abracawhat.spell[rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8]
                                  }
                                  alt=""
                                />
                                <span className="aw-hand-rank">{rank}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <dl className="aw-stat-grid">
                        <div className="aw-stat-cell">
                          <dt>เลือด</dt>
                          <dd className='text-danger'>{p.life}</dd>
                        </div>
                        <div className="aw-stat-cell">
                          <dt>ชั้นหอ</dt>
                          <dd>{p.towerFloor}</dd>
                        </div>
                        <div className="aw-stat-cell">
                          <dt>มือ</dt>
                          <dd>{p.handSize}</dd>
                        </div>
                      </dl>
                    </div>

                    {mine && gameState.mySecretRanks.length > 0 ? (
                      <p className="aw-secret-line">
                        <strong>หินลับ</strong> · {gameState.mySecretRanks.join(', ')}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="aw-board-panel card" aria-labelledby="aw-board-heading">
            <h2 id="aw-board-heading" className="aw-board-panel__title">
              โต๊ะกลางรอบนี้
            </h2>
            <div className="aw-board-panel__meta">
              <div className="aw-meta-chip">
                <span className="aw-meta-chip__label">กองจั่ว</span>
                <span className="aw-meta-chip__value">{gameState.drawPileCount}</span>
                <span className="aw-meta-chip__hint">การ์ดที่เหลือ</span>
              </div>
              <div className="aw-meta-chip">
                <span className="aw-meta-chip__label">กองหินลับ</span>
                <span className="aw-meta-chip__value">{gameState.secretPileCount}</span>
                <span className="aw-meta-chip__hint">คว่ำหน้า</span>
              </div>
            </div>
            <div className="aw-cast-section">
              <p className="aw-cast-label">หินที่วางแล้ว (รอบนี้)</p>
              <div className="aw-cast-chips">
                {ABRACA_SPELLBOOK.map((s) => {
                  const c = gameState.stonesOnBoardThisRound[s.id] ?? 0;
                  if (c <= 0) return null;
                  return (
                    <div key={s.id} className="aw-cast-chip">
                      <img
                        src={imageMap.abracawhat.spell[s.id as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8]}
                        alt=""
                      />
                      <span className="aw-cast-chip__count">×{c}</span>
                    </div>
                  );
                })}
                {!ABRACA_SPELLBOOK.some(
                  (s) => (gameState.stonesOnBoardThisRound[s.id] ?? 0) > 0,
                ) ? (
                  <span className="aw-cast-empty muted">ยังไม่มี</span>
                ) : null}
              </div>
            </div>
          </section>

          {isMyTurn && gameState.subPhase === 'pick_secret' ? (
            <div className="modal-overlay aw-dice-overlay" role="dialog" aria-modal>
              <div className="modal aw-dice-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-center">เลือกหินลับ</h2>
                <p className="text-center muted" style={{ marginBottom: 12 }}>
                  ชั้นกอง 0 … {gameState.pickSecretCount - 1}
                </p>
                <div className="aw-secret-grid">
                  {Array.from({ length: gameState.pickSecretCount }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      className="aw-secret-btn"
                      onClick={() => send({ type: 'pick_secret', index: i })}
                    >
                      กอง {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="aw-actions">
            {isMyTurn && gameState.subPhase === 'normal' ? (
              <>
                <p className="aw-stat" style={{ marginBottom: 8 }}>
                  {gameState.lastCastRankThisTurn != null
                    ? `ร่ายต่อ: ต้องเป็นเลข ≥ ${gameState.lastCastRankThisTurn}`
                    : 'ร่ายเวทเลข 1–8 ใดก็ได้'}
                </p>
                <div className="aw-spell-grid">
                  {([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n) => {
                    const sp = spellByRank[n];
                    const blocked = chainBlocked(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        className="aw-spell-btn"
                        disabled={blocked}
                        onClick={() => castSpell(n)}
                      >
                        <img src={imageMap.abracawhat.spell[n]} alt="" />
                        <span>
                          {n}. {sp?.nameTh}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  block
                  variant="secondary"
                  disabled={!canEndTurn}
                  onClick={() => send({ type: 'end_turn' })}
                >
                  จบเทิร์น
                </Button>
              </>
            ) : null}

            {!isMyTurn ? (
              <p className="aw-wait-msg">
                รอ{' '}
                <strong>
                  {gameState.players.find((p) => p.id === gameState.currentPlayerId)?.name}
                </strong>{' '}
                เล่น
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {gameState.phase === 'game_over' && gameState.gameResult ? (
        <div
          className="modal-overlay f7-game-over-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="aw-game-over-title"
        >
          <div className="modal f7-game-over-modal" onClick={(e) => e.stopPropagation()}>
            <div className="f7-game-over-toolbar">
              <p className="f7-game-over-kicker" id="aw-game-over-title">
                🏆 เกมจบแล้ว
              </p>
            </div>

            <div className="f7-game-over-hero" aria-live="polite">
              <p className="f7-game-over-hero-label">ผู้ชนะ</p>
              <p className="f7-game-over-hero-names">{gameOverWinnerLine}</p>
              <p className="f7-game-over-hero-reason">{gameState.gameResult.reason}</p>
            </div>

            {gameOverBoard.length > 0 ? (
              <>
                <h3 className="f7-game-over-score-heading">
                  ชั้นหอ (คะแนน){' '}
                  <span className="f7-game-over-score-sub">
                    (เป้าหมาย {gameState.targetTowerFloor} · เรียงจากมากไปน้อย)
                  </span>
                </h3>
                <div className="f7-game-over-table-wrap">
                  <table className="f7-game-over-table">
                    <thead>
                      <tr>
                        <th scope="col">อันดับ</th>
                        <th scope="col">ผู้เล่น</th>
                        <th scope="col">ชั้น</th>
                        <th scope="col" className="f7-game-over-table__th-narrow">
                          สถานะ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameOverBoard.map((row) => (
                        <tr
                          key={row.id}
                          className={row.isWinner ? 'f7-game-over-table__row--winner' : undefined}
                        >
                          <td className="f7-game-over-table__place">{row.place}</td>
                          <td className="f7-game-over-table__name">
                            {row.name}
                            {row.id === myId ? ' (คุณ)' : ''}
                          </td>
                          <td className="f7-game-over-table__score">{row.towerFloor}</td>
                          <td className="f7-game-over-table__badge-cell">
                            {row.isWinner ? (
                              <span className="f7-game-over-winner-badge">ชนะ</span>
                            ) : (
                              <span className="f7-game-over-table__dash">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            <div className="f7-game-over-toolbar-actions">
              {onRestart ? (
                <Button type="button" variant="secondary" size="md" onClick={onRestart}>
                  <RotateCcw size={16} aria-hidden />
                  เล่นใหม่
                </Button>
              ) : (
                <span className="f7-game-over-wait-host f7-game-over-wait-host--toolbar">
                  รอหัวห้องกด «เล่นใหม่»
                </span>
              )}
              <Button type="button" variant="danger" size="md" onClick={onLeave}>
                <LogOut size={16} aria-hidden />
                ออกจากห้อง
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
