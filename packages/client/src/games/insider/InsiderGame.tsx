import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import type { InsiderAction, InsiderMasterAnswer, InsiderPlayerView, InsiderRole } from 'shared';
import { Button } from '../../components/ui';
import { imageMap } from '../../imageMap';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import { Home, LogOut, RotateCcw } from 'lucide-react';
import './insider.css';

const ANSWER_LABEL: Record<InsiderMasterAnswer, string> = {
  yes: 'ใช่',
  no: 'ไม่ใช่',
  dont_know: 'ไม่รู้',
  correct: 'ถูกต้อง (คำตรง)',
};

const ROLE_TH: Record<InsiderPlayerView['you']['yourRole'], string> = {
  master: 'Master (มาสเตอร์)',
  insider: 'Insider (จอมบงการ)',
  common: 'Commons (คนทั่วไป)',
};

const ROLE_REVEAL_FLIP_STAGGER_SEC = 0.28;
const ROLE_REVEAL_FLIP_DURATION_SEC = 0.95;
const ROLE_REVEAL_DWELL_AFTER_LAST_MS = 1400;

/** การ์ดแนะนำ — แค่ว่ามีบทอะไรในเกม ไม่เผยว่าใครได้บทไหน */
const ROLE_REVEAL_INTRO_ORDER = [
  'master',
  'insider',
  'common',
] as const satisfies readonly InsiderRole[];

function insiderRoleCardUrl(role: InsiderRole): string {
  const m = imageMap.insider;
  if (role === 'master') return m.master;
  if (role === 'insider') return m.insider;
  return m.common;
}

function InsiderRoleReveal({
  myRole,
  myName,
  hasAcknowledged,
  progress,
  onAcknowledge,
}: {
  myRole: InsiderRole;
  myName: string;
  hasAcknowledged: boolean;
  progress: { current: number; total: number };
  onAcknowledge: () => void;
}) {
  const [showRoleIntro, setShowRoleIntro] = useState(true);

  useEffect(() => {
    setShowRoleIntro(true);
    const n = ROLE_REVEAL_INTRO_ORDER.length;
    const totalMs =
      Math.max(0, n - 1) * ROLE_REVEAL_FLIP_STAGGER_SEC * 1000 +
      ROLE_REVEAL_FLIP_DURATION_SEC * 1000 +
      ROLE_REVEAL_DWELL_AFTER_LAST_MS;
    const t = window.setTimeout(() => setShowRoleIntro(false), totalMs);
    return () => window.clearTimeout(t);
  }, []);

  const p = progress;

  if (showRoleIntro) {
    return (
      <div className="insider-role-reveal-all" aria-live="polite">
        <p className="insider-role-reveal-hint">ในเกมมี 3 บทบาทนี้ — ยังไม่บอกว่าใครเป็นใคร</p>
        <div className="insider-role-reveal-grid insider-role-reveal-grid--all">
          {ROLE_REVEAL_INTRO_ORDER.map((role, idx) => {
            const front = insiderRoleCardUrl(role);
            const tone = role === 'master' ? 'master' : role === 'insider' ? 'insider' : 'common';
            return (
              <div
                key={role}
                className={`insider-role-reveal-item insider-role-reveal-item--${tone}`}
              >
                <div className="insider-flip-perspective">
                  <motion.div
                    className="insider-flip-inner"
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: 180 }}
                    transition={{
                      delay: idx * ROLE_REVEAL_FLIP_STAGGER_SEC,
                      duration: ROLE_REVEAL_FLIP_DURATION_SEC,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="insider-flip-face insider-flip-face--back" aria-hidden />
                    <div className="insider-flip-face insider-flip-face--front">
                      <img src={front} alt={ROLE_TH[role]} className="insider-flip-img" />
                    </div>
                  </motion.div>
                </div>
                <div className="insider-role-reveal-role-label insider-role-reveal-role-label--solo">
                  {ROLE_TH[role]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="card insider-role-reveal-card">
      <div className="insider-role-reveal-card-art">
        <img
          src={insiderRoleCardUrl(myRole)}
          alt={ROLE_TH[myRole]}
          loading="eager"
          decoding="async"
        />
      </div>
      <div className="insider-role-reveal-card-body">
        <div className="insider-role-reveal-title">{ROLE_TH[myRole]}</div>
        <p className="insider-role-reveal-sub">{myName}</p>
        <p className="insider-role-ack-hint">
          ผู้เล่นรับทราบบทบาทแล้ว {p.current}/{p.total} คน — ต้องครบทุกคนถึงจะเริ่มเกม
        </p>
        {hasAcknowledged ? (
          <Button type="button" variant="secondary" className="insider-role-ack-btn" disabled>
            คุณรับทราบแล้ว — รอผู้เล่นคนอื่น…
          </Button>
        ) : (
          <Button type="button" className="insider-role-ack-btn" onClick={onAcknowledge}>
            รับทราบ พร้อมเล่น!
          </Button>
        )}
      </div>
    </div>
  );
}

function formatRemain(ms: number): string {
  if (ms <= 0) return '0:00';
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

interface Props {
  gameState: InsiderPlayerView;
  myId: string;
  sendAction: (a: InsiderAction) => void;
  onLeave: () => void;
  onRestart?: () => void;
}

export function InsiderGame({ gameState: gs, myId, sendAction, onLeave, onRestart }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [questionDraft, setQuestionDraft] = useState('');
  const finished = gs.gameResult != null;

  useEffect(() => {
    if (!finished) return;
    return startWinCelebrationLoop();
  }, [finished]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const send = useCallback((a: InsiderAction) => sendAction(a), [sendAction]);

  const isMaster = gs.masterId === myId;
  const deadlineMs = useMemo(() => {
    if (gs.phase === 'questioning' && gs.questioningEndsAtMs != null) return gs.questioningEndsAtMs;
    if (gs.phase === 'discussion' && gs.discussionEndsAtMs != null) return gs.discussionEndsAtMs;
    return null;
  }, [gs.phase, gs.questioningEndsAtMs, gs.discussionEndsAtMs]);

  const remainLabel = deadlineMs != null ? formatRemain(deadlineMs - now) : null;

  const pending = gs.pendingQuestionId
    ? gs.questionLog.find((q) => q.id === gs.pendingQuestionId)
    : undefined;

  const winnerNames =
    gs.gameResult?.winners.map((id) => gs.players.find((p) => p.id === id)?.name ?? id) ?? [];

  const inRoleReveal = gs.phase === 'role_reveal';

  return (
    <div className={`insider-page${inRoleReveal ? ' insider-page--wide' : ''}`}>
      <header className="insider-header">
        <h1 className="insider-title">Insider</h1>
        {!finished && (
          <div className="insider-header-actions">
            {onRestart && (
              <Button type="button" variant="secondary" onClick={onRestart}>
                <RotateCcw size={16} aria-hidden />
                เล่นใหม่
              </Button>
            )}
            <Button type="button" variant="danger" onClick={onLeave}>
              <LogOut size={16} aria-hidden />
              ออก
            </Button>
          </div>
        )}
      </header>

      {!finished && !inRoleReveal && (
        <p className="insider-role-pill">
          คุณคือ <strong>{ROLE_TH[gs.you.yourRole]}</strong>
          {isMaster && (
            <span className="insider-muted">
              {' '}
              · Master ตอบได้แค่ ใช่ / ไม่ใช่ / ไม่รู้ / ถูกต้อง
            </span>
          )}
        </p>
      )}

      {finished && gs.gameResult && gs.gameOverReveal && (
        <InsiderGameOver
          gameState={gs}
          winnerNames={winnerNames}
          onLeave={onLeave}
          onRestart={onRestart}
        />
      )}

      {!finished && !inRoleReveal && gs.lastEvent && (
        <p className="insider-event">{gs.lastEvent}</p>
      )}

      {inRoleReveal && gs.roleAcknowledgeProgress && (
        <InsiderRoleReveal
          myRole={gs.you.yourRole}
          myName={gs.you.name}
          hasAcknowledged={gs.hasAcknowledgedRole ?? false}
          progress={gs.roleAcknowledgeProgress}
          onAcknowledge={() => send({ type: 'acknowledge_role' })}
        />
      )}

      {!finished && gs.phase === 'master_reads' && (
        <section className="card insider-card">
          <h2>Master — อ่านคำลับ</h2>
          {isMaster ? (
            <>
              <p className="insider-muted">หมวด: {gs.categoryLabel}</p>
              <p className="insider-secret">{gs.secretWord}</p>
              <Button type="button" onClick={() => send({ type: 'master_ack_word' })}>
                อ่านแล้ว — ไปต่อ
              </Button>
            </>
          ) : (
            <p>รอ Master อ่านคำลับ…</p>
          )}
        </section>
      )}

      {!finished && gs.phase === 'insider_reads' && (
        <section className="card insider-card">
          <h2>Insider — จำคำให้แม่น</h2>
          {gs.you.yourRole === 'insider' ? (
            <>
              <p className="insider-muted">หมวด: {gs.categoryLabel}</p>
              <p className="insider-secret">{gs.secretWord}</p>
              <Button type="button" onClick={() => send({ type: 'insider_ack_word' })}>
                จำแล้ว — เริ่มถามตอบ
              </Button>
            </>
          ) : (
            <p>ห้ามพูด — รอ Insider ดูคำ (คุณหลับตาในเกมจริง)</p>
          )}
        </section>
      )}

      {!finished && gs.phase === 'questioning' && (
        <section className="card insider-card">
          <div className="insider-row">
            <h2>ถาม — ตอบ</h2>
            {remainLabel != null && <span className="insider-timer">เหลือ {remainLabel}</span>}
          </div>
          <p className="insider-hint">
            ผู้เล่นที่ไม่ใช่ Master พิมพ์คำถามต่อท้ายคนละครั้ง (รอ Master ตอบก่อนถามใหม่)
          </p>
          <ul className="insider-qlog">
            {gs.questionLog.map((q) => (
              <li key={q.id}>
                <span className="insider-q-from">{q.askerName}:</span> {q.text}
                {q.answer != null && (
                  <span className="insider-q-ans"> → {ANSWER_LABEL[q.answer]}</span>
                )}
              </li>
            ))}
          </ul>
          {!isMaster && gs.pendingQuestionId == null && (
            <div className="insider-ask-row">
              <input
                className="insider-input"
                value={questionDraft}
                onChange={(e) => setQuestionDraft(e.target.value)}
                placeholder="เช่น มันเป็นสัตว์หรือไม่?"
                maxLength={400}
              />
              <Button
                type="button"
                disabled={questionDraft.trim().length < 2}
                onClick={() => {
                  send({ type: 'ask_question', text: questionDraft.trim() });
                  setQuestionDraft('');
                }}
              >
                ถาม
              </Button>
            </div>
          )}
          {isMaster && pending && (
            <div className="insider-answer-grid">
              <p>
                ตอบคำถามจาก <strong>{pending.askerName}</strong>: {pending.text}
              </p>
              {(Object.keys(ANSWER_LABEL) as InsiderMasterAnswer[]).map((a) => (
                <Button
                  key={a}
                  type="button"
                  variant={a === 'correct' ? 'primary' : 'secondary'}
                  onClick={() => send({ type: 'master_answer', questionId: pending.id, answer: a })}
                >
                  {ANSWER_LABEL[a]}
                </Button>
              ))}
            </div>
          )}
          {!isMaster && gs.pendingQuestionId != null && (
            <p className="insider-muted">รอ Master ตอบคำถามปัจจุบัน…</p>
          )}
        </section>
      )}

      {!finished && gs.phase === 'discussion' && (
        <section className="card insider-card">
          <div className="insider-row">
            <h2>อภิปรายหา Insider</h2>
            {remainLabel != null && <span className="insider-timer">เหลือ {remainLabel}</span>}
          </div>
          <p>
            คำที่ถูกต้องถูกพบโดย <strong>{gs.solverName ?? '—'}</strong> — พูดคุยว่าใครทำตัวแปลก
          </p>
          {isMaster && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => send({ type: 'discussion_done' })}
            >
              จบการอภิปราย — ไปโหวต
            </Button>
          )}
        </section>
      )}

      {gs.phase === 'final_vote' && !finished && (
        <section className="card insider-card">
          <h2>โหวตว่าใครเป็น Insider</h2>
          <p className="insider-muted">
            โหวตแล้ว {gs.voteProgress.done}/{gs.voteProgress.total}
          </p>
          <div className="insider-vote-grid">
            {gs.players.map((p) => (
              <Button
                key={p.id}
                type="button"
                variant={gs.finalVotes[myId] === p.id ? 'primary' : 'secondary'}
                disabled={gs.finalVotes[myId] != null}
                onClick={() => send({ type: 'final_vote', targetId: p.id })}
              >
                {p.name}
              </Button>
            ))}
          </div>
          {gs.finalVotes[myId] != null && <p className="insider-muted">คุณโหวตแล้ว — รอคนอื่น</p>}
        </section>
      )}
    </div>
  );
}

function InsiderGameOver({
  gameState,
  winnerNames,
  onLeave,
  onRestart,
}: {
  gameState: InsiderPlayerView;
  winnerNames: string[];
  onLeave: () => void;
  onRestart?: () => void;
}) {
  const gr = gameState.gameResult!;
  const reveal = gameState.gameOverReveal!;
  const noWinners = gr.winners.length === 0;
  const insiderWon = !noWinners && gr.winners.length === 1 && gr.winners[0] === reveal.insiderId;

  let titleClass = 'insider-game-over-title insider-game-over-title--good';
  let titleText = '⚔️ Master & ชาวบ้านชนะ!';
  let hero = '🏆';
  if (noWinners) {
    titleClass = 'insider-game-over-title insider-game-over-title--neutral';
    titleText = 'เกมจบ';
    hero = '⏱️';
  } else if (insiderWon) {
    titleClass = 'insider-game-over-title insider-game-over-title--evil';
    titleText = '💀 Insider ชนะ!';
    hero = '💀';
  }

  return (
    <div
      className="insider-game-over-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insider-game-over-title"
    >
      <div className="insider-game-over-panel" onClick={(e) => e.stopPropagation()}>
        <div className="insider-game-over-hero" aria-hidden>
          {hero}
        </div>
        <h2 id="insider-game-over-title" className={titleClass}>
          {titleText}
        </h2>
        <p className="insider-game-over-reason">{gr.reason}</p>
        {winnerNames.length > 0 ? (
          <p className="insider-game-over-winners">
            <span className="insider-muted">ผู้ชนะ: </span>
            {winnerNames.join(' · ')}
          </p>
        ) : (
          <p className="insider-game-over-winners insider-muted">ไม่มีผู้ชนะ</p>
        )}

        <div className="insider-game-over-secret card">
          <p className="insider-game-over-secret-label">คำลับ</p>
          <p className="insider-game-over-secret-word">{reveal.secretWord}</p>
          <p className="insider-muted">หมวด {reveal.categoryLabel}</p>
        </div>

        <h3 className="insider-game-over-roles-heading">เปิดเผยบทบาททั้งหมด</h3>
        <div className="insider-game-over-role-grid">
          {gameState.players.map((p) => {
            const role = reveal.roles[p.id] ?? 'common';
            const label = ROLE_TH[role];
            const art = insiderRoleCardUrl(role);
            const tone = role === 'master' ? 'master' : role === 'insider' ? 'insider' : 'common';
            return (
              <div
                key={p.id}
                className={`insider-game-over-role-item insider-game-over-role-item--${tone}`}
              >
                <img
                  src={art}
                  alt={label}
                  className="insider-game-over-role-thumb"
                  loading="lazy"
                />
                <div className="insider-game-over-role-name">{p.name}</div>
                <div className="insider-game-over-role-label">
                  {label}
                  {p.id === reveal.insiderId ? ' 🎯' : ''}
                </div>
              </div>
            );
          })}
        </div>

        <div className="insider-game-over-actions">
          {onRestart && (
            <Button type="button" variant="secondary" size="lg" onClick={onRestart}>
              <RotateCcw size={18} aria-hidden />
              เริ่มเกมใหม่
            </Button>
          )}
          <Button type="button" size="lg" onClick={onLeave}>
            <Home size={18} aria-hidden />
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    </div>
  );
}
