import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import type {
  InsiderAction,
  InsiderMasterAnswer,
  InsiderPhase,
  InsiderPlayerView,
  InsiderRole,
} from 'shared';
import { Button } from '../../components/ui';
import { imageMap } from '../../imageMap';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import { BookOpen, Check, Home, Lock, LogOut, RotateCcw } from 'lucide-react';
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

function InsiderReadFlowPanel({
  phase,
  masterName,
  isMaster,
  isInsider,
  categoryLabel,
  secretWord,
  onMasterAck,
  onInsiderAck,
}: {
  phase: Extract<InsiderPhase, 'master_reads' | 'insider_reads'>;
  masterName: string;
  isMaster: boolean;
  isInsider: boolean;
  categoryLabel?: string;
  secretWord?: string;
  onMasterAck: () => void;
  onInsiderAck: () => void;
}) {
  const showWord = secretWord != null && secretWord.length > 0;
  const step1Done = phase === 'insider_reads';
  const step1Active = phase === 'master_reads' && !step1Done;
  const step2Active = phase === 'insider_reads';

  return (
    <section className="card insider-secret-shell" aria-labelledby="insider-readflow-title">
      <h2 id="insider-readflow-title" className="insider-secret-shell-title">
        <BookOpen className="insider-secret-shell-title-ic" aria-hidden />
        รอบอ่านคำลับ
      </h2>

      <ol className="insider-read-track" aria-label="ลำดับการอ่านคำลับ">
        <li
          className={`insider-read-step${step1Active ? ' insider-read-step--active' : ''}${step1Done ? ' insider-read-step--done' : ''}`}
        >
          <span className="insider-read-step-ic" aria-hidden>
            {step1Done ? <Check size={18} strokeWidth={2.5} /> : '1'}
          </span>
          <span className="insider-read-step-label">
            <span>Master — อ่านคำลับ</span>
            <span className="insider-read-step-who">{masterName}</span>
          </span>
        </li>
        <li className={`insider-read-step${step2Active ? ' insider-read-step--active' : ''}`}>
          <span className="insider-read-step-ic" aria-hidden>
            2
          </span>
          <span>Insider — อ่านคำลับ</span>
        </li>
      </ol>

      <div className="insider-read-status-banner" role="status" aria-live="polite">
        {phase === 'master_reads' && (
          <div
            className={
              isMaster
                ? 'insider-read-status-tile insider-read-status-tile--on-master'
                : 'insider-read-status-tile'
            }
          >
            <strong>Master — กำลังอ่านคำลับ</strong>
            <p className="insider-read-status-master-who">Master คนตอนนี้: {masterName}</p>
            {!isMaster && (
              <p className="insider-read-status-tile-hint">
                รอ {masterName} อ่านและกด &ldquo;อ่านแล้ว&rdquo;
              </p>
            )}
          </div>
        )}
        {phase === 'insider_reads' && (
          <div
            className={
              isInsider
                ? 'insider-read-status-tile insider-read-status-tile--on-insider'
                : isMaster
                  ? 'insider-read-status-tile insider-read-status-tile--on-master'
                  : 'insider-read-status-tile'
            }
          >
            <strong>Insider — กำลังอ่านคำลับ</strong>
            {isMaster && !isInsider && showWord && (
              <p className="insider-read-status-tile-hint">
                คุณอ่านคำแล้ว — ยังแสดงคำนี้ให้ดูกันลืม จนกว่า Insider จะกดยืนยัน
              </p>
            )}
            {isInsider && showWord && (
              <p className="insider-read-status-tile-hint">
                อ่านให้แม่น — กด &ldquo;จำแล้ว&rdquo; เมื่อพร้อม
              </p>
            )}
            {!isMaster && !isInsider && (
              <p className="insider-read-status-tile-hint">
                กรุณาหลีกมุมหรือหลับตา — รอ Insider กดยืนยันว่าจำคำแล้ว
              </p>
            )}
          </div>
        )}
      </div>

      <div
        className={`insider-secret-reveal-box${showWord ? ' insider-secret-reveal-box--lit' : ''}`}
      >
        {showWord ? (
          <>
            {categoryLabel != null && (
              <p className="insider-secret-reveal-cat">หมวด: {categoryLabel}</p>
            )}
            <p className="insider-secret-reveal-master" lang="th">
              Master: <strong>{masterName}</strong>
            </p>
            <p className="insider-secret-reveal-word" lang="th">
              {secretWord}
            </p>
          </>
        ) : (
          <div className="insider-secret-locked">
            <Lock className="insider-secret-locked-ic" aria-hidden />
            <p className="insider-secret-locked-title">ยังไม่ใช่ตาคุณ</p>
            <p className="insider-secret-locked-master-who">Master: {masterName}</p>
            {phase === 'master_reads' && (
              <p className="insider-muted">
                รอ <strong>{masterName}</strong> ฝ่าย Master อ่านก่อน — ถ้าคุณเป็น Insider
                จะเห็นคำนี้ในขั้นถัดไป
              </p>
            )}
            {phase === 'insider_reads' && !isInsider && (
              <p className="insider-muted">บทบาทนี้ไม่อ่านคำลับ — กรุณาไม่แอบมอง</p>
            )}
          </div>
        )}
      </div>

      <div className="insider-read-actions">
        {phase === 'master_reads' && isMaster && showWord && (
          <Button type="button" onClick={onMasterAck} className="insider-read-cta" size="md">
            อ่านแล้ว — ไปต่อ
          </Button>
        )}
        {phase === 'master_reads' && !isMaster && (
          <p className="insider-read-actions-wait insider-muted">รอ Master กดยืนยันต่อ</p>
        )}

        {phase === 'insider_reads' && isInsider && showWord && (
          <Button type="button" onClick={onInsiderAck} className="insider-read-cta" size="lg">
            จำแล้ว — เริ่มถามตอบ
          </Button>
        )}
        {phase === 'insider_reads' && isMaster && !isInsider && showWord && (
          <p className="insider-read-actions-wait insider-muted">
            รอ Insider กด &ldquo;จำแล้ว&rdquo; เพื่อเริ่มรอบถาม-ตอบ
          </p>
        )}
        {phase === 'insider_reads' && !isMaster && !isInsider && (
          <p className="insider-read-actions-wait insider-muted">รอ Insider กดยืนยัน</p>
        )}
      </div>
    </section>
  );
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
  const isInsider = gs.you.yourRole === 'insider';
  const canShowSecretRef =
    !finished &&
    gs.secretWord != null &&
    (gs.phase === 'questioning' || gs.phase === 'discussion') &&
    (isMaster || isInsider);

  const deadlineMs = useMemo(() => {
    if (gs.phase === 'questioning' && gs.questioningEndsAtMs != null) return gs.questioningEndsAtMs;
    if (gs.phase === 'discussion' && gs.discussionEndsAtMs != null) return gs.discussionEndsAtMs;
    return null;
  }, [gs.phase, gs.questioningEndsAtMs, gs.discussionEndsAtMs]);

  const remainLabel = deadlineMs != null ? formatRemain(deadlineMs - now) : null;

  const questionsNewestFirst = useMemo(() => [...gs.questionLog].reverse(), [gs.questionLog]);
  const unansweredCount = useMemo(
    () => gs.questionLog.filter((q) => q.answer == null).length,
    [gs.questionLog],
  );

  const insiderMasterMustAnswer =
    isMaster && gs.phase === 'questioning' && unansweredCount > 0;
  useYourTurnToast(insiderMasterMustAnswer, gs.phase === 'questioning');

  const winnerNames =
    gs.gameResult?.winners.map((id) => gs.players.find((p) => p.id === id)?.name ?? id) ?? [];

  const inRoleReveal = gs.phase === 'role_reveal';

  const masterName = useMemo(
    () => gs.players.find((p) => p.id === gs.masterId)?.name ?? '—',
    [gs.masterId, gs.players],
  );

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

      {/* {!finished && !inRoleReveal && gs.lastEvent && (
        <p className="insider-event">{gs.lastEvent}</p>
      )} */}

      {inRoleReveal && gs.roleAcknowledgeProgress && (
        <InsiderRoleReveal
          myRole={gs.you.yourRole}
          myName={gs.you.name}
          hasAcknowledged={gs.hasAcknowledgedRole ?? false}
          progress={gs.roleAcknowledgeProgress}
          onAcknowledge={() => send({ type: 'acknowledge_role' })}
        />
      )}

      {!finished && (gs.phase === 'master_reads' || gs.phase === 'insider_reads') && (
        <InsiderReadFlowPanel
          phase={gs.phase}
          masterName={masterName}
          isMaster={isMaster}
          isInsider={isInsider}
          categoryLabel={gs.categoryLabel}
          secretWord={gs.secretWord}
          onMasterAck={() => send({ type: 'master_ack_word' })}
          onInsiderAck={() => send({ type: 'insider_ack_word' })}
        />
      )}

      {!finished && canShowSecretRef && (
        <div className="card insider-secret-memory" aria-label="อ้างอิงคำลับ (กันลืม)">
          <div className="insider-secret-memory-kicker">คำลับของรอบนี้</div>
          {gs.categoryLabel != null && (
            <p className="insider-secret-memory-cat">หมวด: {gs.categoryLabel}</p>
          )}
          <p className="insider-secret-memory-word">{gs.secretWord}</p>
        </div>
      )}

      {!finished && gs.phase === 'questioning' && (
        <section className="card insider-card insider-questioning" aria-label="รอบถามตอบ">
          <div className="insider-row">
            <h2>ถาม — ตอบ</h2>
            {remainLabel != null && <span className="insider-timer">เหลือ {remainLabel}</span>}
          </div>
          {isMaster && unansweredCount > 0 && (
            <p className="insider-questioning-master-hint" role="status">
              มีคำถามรอตอบ <strong>{unansweredCount}</strong> ข้ — แต่ละข้อเลือกคำตอบได้อิสระ
            </p>
          )}
          <p className="insider-hint">
            {isMaster
              ? 'อ่านคำถามจากบนสู่ล่าง (ล่าสุดก่อน) แล้วกดปุ่มใต้แต่ละกล่อง ผู้เล่นอื่นเห็นคำตอบทุกคำถาม'
              : 'ทุกคน (ยกเว้น Master) ถามได้สม่ำเสมอ กดถามเพิ่มได้ตลอดไม่ต้องรอ — Master ตอบแยกแต่ละคำถาม'}
          </p>
          {!isMaster && (
            <div className="insider-ask-composer">
              <input
                className="insider-input"
                value={questionDraft}
                onChange={(e) => setQuestionDraft(e.target.value)}
                placeholder="เช่น มันเป็นสัตว์หรือไม่?"
                maxLength={400}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && questionDraft.trim().length >= 2) {
                    e.preventDefault();
                    send({ type: 'ask_question', text: questionDraft.trim() });
                    setQuestionDraft('');
                  }
                }}
                aria-label="พิมพ์คำถามถึง Master"
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
          <ul className="insider-q-feed">
            {questionsNewestFirst.map((q) => {
              const answered = q.answer != null;
              return (
                <li
                  key={q.id}
                  className={`insider-q-card${answered ? ' insider-q-card--answered' : ' insider-q-card--open'}`}
                >
                  <div className="insider-q-card-top">
                    <span className="insider-q-from">{q.askerName}</span>
                    {answered && q.answer != null && (
                      <span className="insider-q-answer-pill" data-ans={q.answer}>
                        {ANSWER_LABEL[q.answer]}
                      </span>
                    )}
                  </div>
                  <p className="insider-q-text">&ldquo;{q.text}&rdquo;</p>
                  {!answered && isMaster && (
                    <div
                      className="insider-q-master-btns"
                      role="group"
                      aria-label={`ตอบคำถามของ ${q.askerName}`}
                    >
                      {(Object.keys(ANSWER_LABEL) as InsiderMasterAnswer[]).map((a) => (
                        <Button
                          key={a}
                          type="button"
                          size="sm"
                          variant={a === 'correct' ? 'primary' : 'secondary'}
                          className="insider-q-ans-btn"
                          onClick={() =>
                            send({ type: 'master_answer', questionId: q.id, answer: a })
                          }
                        >
                          {ANSWER_LABEL[a]}
                        </Button>
                      ))}
                    </div>
                  )}
                  {!answered && !isMaster && (
                    <p className="insider-q-pending-hint">รอ Master ตอบข้อนี้…</p>
                  )}
                </li>
              );
            })}
          </ul>
          {gs.questionLog.length === 0 && (
            <p className="insider-q-empty">ยังไม่มีคำถาม — ลองพิมพ์เพื่อเริ่ม</p>
          )}
        </section>
      )}

      {!finished && gs.phase === 'discussion' && (
        <section className="card insider-card insider-discussion" aria-label="อภิปรายและโหวตจับ Insider">
          <div className="insider-row">
            <h2>อภิปราย + โหวตจับ Insider</h2>
            {remainLabel != null && <span className="insider-timer">เหลือ {remainLabel}</span>}
          </div>
          <p className="insider-discussion-intro">
            คำที่ถูกต้องถูกพบโดย <strong>{gs.solverName ?? '—'}</strong> — เลือกว่าใครน่าจะเป็น Insider
            แล้วกดยืนยัน ทุกคนเห็นการเลือกแบบเรียลไทม์
          </p>
          <p className="insider-muted insider-discussion-progress">
            ยืนยันโหวตแล้ว {gs.voteProgress.done}/{gs.voteProgress.total} คน · หมดเวลาจะนับเฉพาะคนที่กดยืนยัน
          </p>

          <div className="insider-discussion-roster" aria-label="สถานะการโหวตแต่ละคน">
            <h3 className="insider-discussion-roster-title">ใครเลือกใคร</h3>
            <ul className="insider-discussion-roster-list">
              {gs.players.map((p) => {
                const confirmedTarget = gs.finalVotes[p.id];
                const draftTarget = gs.discussionDraftVotes?.[p.id];
                const pickId = confirmedTarget ?? draftTarget;
                const pickName = pickId != null ? (gs.players.find((x) => x.id === pickId)?.name ?? '—') : null;
                const isConfirmed = confirmedTarget != null;
                return (
                  <li key={p.id} className="insider-discussion-roster-row">
                    <span className="insider-discussion-roster-voter">{p.name}</span>
                    {pickName == null ? (
                      <span className="insider-discussion-roster-none">ยังไม่เลือก</span>
                    ) : (
                      <span
                        className={
                          isConfirmed
                            ? 'insider-discussion-roster-pick insider-discussion-roster-pick--ok'
                            : 'insider-discussion-roster-pick insider-discussion-roster-pick--draft'
                        }
                      >
                        → {pickName}
                        {isConfirmed ? ' · ยืนยันแล้ว' : ' · รอยืนยัน'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {gs.finalVotes[myId] == null ? (
            <div className="insider-discussion-my">
              <h3 className="insider-discussion-my-title">โหวตของคุณ</h3>
              <p className="insider-muted insider-discussion-my-hint">
                เลือกผู้เล่นคนอื่น (ไม่รวมตัวเองและ Master — Master ไม่ใช่ Insider) แล้วกดยืนยัน
                — เปลี่ยนคนได้ก่อนยืนยัน
              </p>
              <div className="insider-discussion-target-grid">
                {gs.players
                  .filter((p) => p.id !== myId)
                  .map((p) => {
                    const draft = gs.discussionDraftVotes?.[myId];
                    const selected = draft === p.id;
                    const isMaster = p.id === gs.masterId;
                    return (
                      <Button
                        key={p.id}
                        type="button"
                        variant={selected ? 'primary' : 'secondary'}
                        className="insider-discussion-target-btn"
                        disabled={isMaster}
                        title={isMaster ? 'โหวต Master เป็นผู้รู้ไม่ได้' : undefined}
                        onClick={() => send({ type: 'discussion_pick', targetId: p.id })}
                      >
                        {p.name}
                      </Button>
                    );
                  })}
              </div>
              <div className="insider-discussion-confirm-wrap">
                <Button
                  type="button"
                  size="lg"
                  disabled={gs.discussionDraftVotes?.[myId] == null}
                  onClick={() => send({ type: 'discussion_confirm_vote' })}
                >
                  ยืนยันโหวตนี้
                </Button>
              </div>
            </div>
          ) : (
            <p className="insider-discussion-done-self insider-muted">
              คุณยืนยันโหวตแล้ว — รอคนอื่น ({gs.voteProgress.done}/{gs.voteProgress.total})
            </p>
          )}
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
  let titleText = '⚔️ Master & Common ชนะ!';
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
