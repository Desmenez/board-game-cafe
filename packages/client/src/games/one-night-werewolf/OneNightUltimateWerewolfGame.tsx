import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  OnuwAction,
  OnuwNightSecretView,
  OnuwNightStepKind,
  OnuwPlayerView,
  OnuwRole,
  OnuwTeam,
} from 'shared';
import {
  ONUW_NIGHT_STEP_MS,
  ONUW_ROLE_DESCRIPTION_TH,
  ONUW_VOTE_ELIMINATION_FLIP_MS,
  ONUW_VOTE_ELIMINATION_FLIP_STAGGER_MS,
  ONUW_VOTE_PHASE_MS,
  onuwOrderedCompositionSlots,
  onuwTeamForRole,
} from 'shared';
import { motion } from 'motion/react';
import { GamePlayHeader, GameShell } from '../../components/game-shell';
import { Button, Dialog, DialogDescription, DialogFooter, DialogTitle } from '../../components/ui';
import { onuwCardBackUrl, onuwRoleCardUrl } from '../../imageMap';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import { User } from 'lucide-react';
import './onuw.css';

const ONUW_COMPOSITION_FLIP_STAGGER_SEC = 0.28;
const ONUW_COMPOSITION_FLIP_DURATION_SEC = 0.95;

const ONUW_VOTE_ELIM_FLIP_STAGGER_SEC = ONUW_VOTE_ELIMINATION_FLIP_STAGGER_MS / 1000;
const ONUW_VOTE_ELIM_FLIP_DURATION_SEC = ONUW_VOTE_ELIMINATION_FLIP_MS / 1000;

const ROLE_LABEL_TH: Record<OnuwRole, string> = {
  werewolf: 'มนุษย์หมาป่า',
  doppelganger: 'Doppelgänger',
  minion: 'ลูกสมุน',
  mason: 'ช่างหิน',
  seer: 'หมอดู',
  robber: 'โจร',
  troublemaker: 'คนสร้างปัญหา',
  drunk: 'คนเมา',
  insomniac: 'คนนอนไม่หลับ',
  hunter: 'นักล่า',
  tanner: 'ทันเนอร์',
  villager: 'ชาวบ้าน',
};

const ROLE_LABEL_EN: Record<OnuwRole, string> = {
  werewolf: 'Werewolf',
  doppelganger: 'Doppelgänger',
  minion: 'Minion',
  mason: 'Mason',
  seer: 'Seer',
  robber: 'Robber',
  troublemaker: 'Troublemaker',
  drunk: 'Drunk',
  insomniac: 'Insomniac',
  hunter: 'Hunter',
  tanner: 'Tanner',
  villager: 'Villager',
};

const TEAM_LABEL_TH: Record<OnuwTeam, string> = {
  werewolf_team: 'ฝ่ายหมาป่า',
  village_team: 'ฝ่ายหมู่บ้าน',
};

const NIGHT_KIND_TH: Record<OnuwNightStepKind, string> = {
  doppelganger: ROLE_LABEL_TH.doppelganger,
  werewolf: ROLE_LABEL_TH.werewolf,
  minion: ROLE_LABEL_TH.minion,
  mason: ROLE_LABEL_TH.mason,
  seer: ROLE_LABEL_TH.seer,
  robber: ROLE_LABEL_TH.robber,
  troublemaker: ROLE_LABEL_TH.troublemaker,
  drunk: ROLE_LABEL_TH.drunk,
  insomniac: ROLE_LABEL_TH.insomniac,
};

/** บทที่ไม่มีขั้นตื่นกลางคืนในกติกานี้ */
const ONUW_ROLES_WITHOUT_NIGHT_ACTION: ReadonlySet<OnuwRole> = new Set([
  'villager',
  'hunter',
  'tanner',
]);

/** เรียงการ์ดในชุดเกม — slotKey ซิงก์กับเซิร์ฟเวอร์ (shared `onuwOrderedCompositionSlots`) */
function buildOrderedCompositionSlots(rolesInPlay: OnuwPlayerView['rolesInPlay']): {
  role: OnuwRole;
  artKey: string;
  label: string;
  slotKey: string;
}[] {
  return onuwOrderedCompositionSlots(rolesInPlay).map((s) => ({
    ...s,
    label: ROLE_LABEL_TH[s.role],
  }));
}

function artKeyForNightScheduledRole(
  rolesInPlay: OnuwPlayerView['rolesInPlay'],
  kind: OnuwNightStepKind,
): string {
  const row = rolesInPlay.find((r) => r.role === kind);
  return row?.artKeys[0] ?? '';
}

function OnuwNightSlotTimer({
  mode,
  endsAtMs,
}: {
  mode: 'past' | 'current' | 'upcoming';
  endsAtMs: number | null;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (mode !== 'current' || endsAtMs == null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [mode, endsAtMs]);

  if (mode === 'past') {
    return (
      <span className="onuw-night-schedule-slot-timer onuw-night-schedule-slot-timer--done">✓</span>
    );
  }
  if (mode === 'upcoming') {
    return (
      <span className="onuw-night-schedule-slot-timer onuw-night-schedule-slot-timer--muted">
        —
      </span>
    );
  }
  if (endsAtMs == null) {
    return <span className="onuw-night-schedule-slot-timer">—</span>;
  }
  const sec = Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
  return (
    <span className="onuw-night-schedule-slot-timer" role="timer" aria-live="polite">
      เหลือ {sec} วินาที
    </span>
  );
}

function OnuwNightScheduleStrip({
  nightList,
  nightCurIdx,
  endsAtMs,
  rolesInPlay,
}: {
  nightList: NonNullable<OnuwPlayerView['nightSteps']>;
  nightCurIdx: number;
  endsAtMs: number | null;
  rolesInPlay: OnuwPlayerView['rolesInPlay'];
}) {
  const [detailCard, setDetailCard] = useState<{ role: OnuwRole; artKey: string } | null>(null);

  const passiveCompositionSlots = useMemo(
    () =>
      buildOrderedCompositionSlots(rolesInPlay).filter((s) =>
        ONUW_ROLES_WITHOUT_NIGHT_ACTION.has(s.role),
      ),
    [rolesInPlay],
  );

  return (
    <>
      <div className="onuw-night-schedule-inner">
        <div
          className="onuw-night-schedule-strip"
          role="list"
          aria-label="ลำดับขั้นคืนและเวลานับถอยหลัง"
        >
          {nightList.map((st, i) => {
            const role = st.kind as OnuwRole;
            const artKey = artKeyForNightScheduledRole(rolesInPlay, st.kind);
            const thumbSrc = artKey ? onuwRoleCardUrl(artKey) : onuwCardBackUrl();
            const labelTh = NIGHT_KIND_TH[st.kind];
            const isPast = nightCurIdx >= 0 && i < nightCurIdx;
            const isCurrent = nightCurIdx >= 0 && i === nightCurIdx;
            const mode: 'past' | 'current' | 'upcoming' = isPast
              ? 'past'
              : isCurrent
                ? 'current'
                : 'upcoming';
            return (
              <div
                key={`${st.kind}-${i}`}
                role="listitem"
                className={`onuw-night-schedule-slot${isCurrent ? ' onuw-night-schedule-slot--current' : ''}`}
              >
                <span className="onuw-night-schedule-slot-idx">{i + 1}</span>
                <div className="onuw-night-schedule-slot-visual">
                  <button
                    type="button"
                    className="onuw-card-help-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailCard({ role, artKey });
                    }}
                    aria-label={`คำอธิบาย ${labelTh}`}
                  >
                    ?
                  </button>
                  <div className="onuw-night-schedule-card-wrap">
                    <img
                      src={thumbSrc}
                      alt=""
                      className="onuw-night-schedule-slot-img"
                      decoding="async"
                    />
                  </div>
                </div>
                <span className="onuw-night-schedule-slot-name">{labelTh}</span>
                <OnuwNightSlotTimer mode={mode} endsAtMs={endsAtMs} />
              </div>
            );
          })}
          {passiveCompositionSlots.map((slot, pi) => {
            const thumbSrc = slot.artKey ? onuwRoleCardUrl(slot.artKey) : onuwCardBackUrl();
            const firstPassive = pi === 0;
            return (
              <div
                key={`passive-${slot.slotKey}`}
                role="listitem"
                className={`onuw-night-schedule-slot onuw-night-schedule-slot--passive${firstPassive ? ' onuw-night-schedule-slot--passive-first' : ''}`}
                aria-label={`${slot.label} — ไม่มีขั้นตื่นกลางคืน ไม่จับเวลา`}
              >
                <span
                  className="onuw-night-schedule-slot-idx onuw-night-schedule-slot-idx--passive"
                  aria-hidden
                >
                  —
                </span>
                <div className="onuw-night-schedule-slot-visual">
                  <button
                    type="button"
                    className="onuw-card-help-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailCard({ role: slot.role, artKey: slot.artKey });
                    }}
                    aria-label={`คำอธิบาย ${slot.label}`}
                  >
                    ?
                  </button>
                  <div className="onuw-night-schedule-card-wrap">
                    <img
                      src={thumbSrc}
                      alt=""
                      className="onuw-night-schedule-slot-img"
                      decoding="async"
                    />
                  </div>
                </div>
                <span className="onuw-night-schedule-slot-name">{slot.label}</span>
                <span className="onuw-night-schedule-slot-timer onuw-night-schedule-slot-timer--muted onuw-night-schedule-slot-timer--passive-only">
                  ไม่ตื่นกลางคืน
                </span>
              </div>
            );
          })}
        </div>
        <p className="onuw-night-schedule-note">
          ไม่แสดงชื่อผู้เล่นเพื่อไม่ให้ล่วงรู้บทคนอื่นจากจอเดียว — ขั้นที่มีเลขจับเวลา{' '}
          {ONUW_NIGHT_STEP_MS / 1000} วินาที — หลังทำแอ็กชันแล้วยังรอจบเวลาขั้นอยู่ —
          การ์ดขวาสุดเป็นบทที่ไม่ตื่นกลางคืน (ไม่จับเวลา กด ? ดูความสามารถ)
        </p>
      </div>

      <Dialog
        open={detailCard !== null}
        onOpenChange={(open) => {
          if (!open) setDetailCard(null);
        }}
        contentClassName={
          detailCard !== null
            ? `modal onuw-role-detail-dialog onuw-role-detail-dialog--${onuwTeamForRole(detailCard.role)}`
            : 'modal onuw-role-detail-dialog'
        }
        aria-labelledby="onuw-night-schedule-role-detail-title"
      >
        {detailCard !== null ? (
          <>
            <div className="onuw-role-detail-heading">
              <span
                className={`onuw-role-detail-team onuw-role-detail-team--${onuwTeamForRole(detailCard.role)}`}
              >
                {TEAM_LABEL_TH[onuwTeamForRole(detailCard.role)]}
              </span>
              <DialogTitle
                id="onuw-night-schedule-role-detail-title"
                className="onuw-role-detail-title"
              >
                {ROLE_LABEL_TH[detailCard.role]}
              </DialogTitle>
              <p className="onuw-role-detail-title-en">{ROLE_LABEL_EN[detailCard.role]}</p>
            </div>
            <div className="onuw-role-detail-body">
              <img
                src={detailCard.artKey ? onuwRoleCardUrl(detailCard.artKey) : onuwCardBackUrl()}
                alt=""
                className="onuw-role-detail-img"
              />
              <DialogDescription className="onuw-role-detail-desc">
                {ONUW_ROLE_DESCRIPTION_TH[detailCard.role]}
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDetailCard(null)}>
                ปิด
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </Dialog>
    </>
  );
}

function OnuwCompositionFlipFace({
  flipIndex,
  frontSrc,
  label,
  noteBelow,
  onHelp,
}: {
  flipIndex: number;
  frontSrc: string;
  label: string;
  /** ข้อความใต้ชื่อการ์ด เช่น บทที่ไม่ตื่นกลางคืน */
  noteBelow?: string;
  onHelp?: () => void;
}) {
  const backSrc = onuwCardBackUrl();

  return (
    <div className="onuw-flip-slot">
      {onHelp ? (
        <button
          type="button"
          className="onuw-card-help-btn"
          onClick={(e) => {
            e.stopPropagation();
            onHelp();
          }}
          aria-label={`คำอธิบาย ${label}`}
        >
          ?
        </button>
      ) : null}
      <div className="onuw-flip-perspective">
        <motion.div
          className="onuw-flip-inner"
          initial={{ rotateY: 0 }}
          animate={{ rotateY: 180 }}
          transition={{
            delay: flipIndex * ONUW_COMPOSITION_FLIP_STAGGER_SEC,
            duration: ONUW_COMPOSITION_FLIP_DURATION_SEC,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="onuw-flip-face onuw-flip-face--back" aria-hidden>
            <img src={backSrc} alt="" className="onuw-flip-img" decoding="async" />
          </div>
          <div className="onuw-flip-face onuw-flip-face--front">
            <img src={frontSrc} alt={label} className="onuw-flip-img" decoding="async" />
          </div>
        </motion.div>
      </div>
      <div className="onuw-role-caption onuw-role-caption--below-flip">
        <span>{label}</span>
        {noteBelow ? <span className="onuw-composition-passive-note">{noteBelow}</span> : null}
      </div>
    </div>
  );
}

function OnuwVoteRevealNextPhaseHint({ endsAtMs }: { endsAtMs: number | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (endsAtMs == null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 400);
    return () => window.clearInterval(id);
  }, [endsAtMs]);
  if (endsAtMs == null) {
    return (
      <p className="onuw-vote-reveal-footer-text">
        หลังเปิดการ์ดครบ เกมจะไปขั้นต่อไปอัตโนมัติ — ไม่ต้องกดปิด
      </p>
    );
  }
  const sec = Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
  return (
    <p className="onuw-vote-reveal-footer-text" role="status" aria-live="polite">
      {sec > 0 ? (
        <>
          ขั้นต่อไปในอีกประมาณ <strong className="onuw-vote-reveal-footer-sec">{sec}</strong> วินาที
          — ไม่ต้องกดปิด
        </>
      ) : (
        <>กำลังไปขั้นต่อไป…</>
      )}
    </p>
  );
}

function OnuwVoteEliminationRevealModal({ gs }: { gs: OnuwPlayerView }) {
  const backSrc = onuwCardBackUrl();
  const count = gs.revealEliminations.length;

  return (
    <Dialog
      open
      onOpenChange={() => {}}
      overlayClassName="onuw-vote-reveal-overlay"
      contentClassName="modal onuw-vote-reveal-dialog"
      aria-labelledby="onuw-vote-reveal-title"
      aria-describedby="onuw-vote-reveal-desc"
    >
      <header className="onuw-vote-reveal-dialog-header">
        <span className="onuw-vote-reveal-kicker">หลังโหวต</span>
        <div className="onuw-vote-reveal-title-row">
          <DialogTitle id="onuw-vote-reveal-title" className="onuw-vote-reveal-heading">
            ผู้ถูกโหวตออก
          </DialogTitle>
          <span className="onuw-vote-reveal-count-pill" aria-label={`จำนวน ${count} คน`}>
            {count} คน
          </span>
        </div>
        <DialogDescription id="onuw-vote-reveal-desc" className="onuw-vote-reveal-lead">
          พลิกการ์ดด้านล่างเพื่อดู<strong>บทบาทจริง</strong>หน้าที่นั่ง (หลังคืนจบ) —
          จากนั้นระบบจะพาไป Hunter หรือสรุปผลตามกติกา
        </DialogDescription>
      </header>

      <div className="onuw-vote-reveal-grid" role="list">
        {gs.revealEliminations.map((rev, idx) => {
          const name = gs.players.find((p) => p.id === rev.playerId)?.name ?? '?';
          const labelTh = ROLE_LABEL_TH[rev.role];
          const team = onuwTeamForRole(rev.role);
          return (
            <article
              key={rev.playerId}
              className={`onuw-vote-reveal-item onuw-vote-reveal-item--${team}`}
              role="listitem"
              aria-label={`${name} ถูกโหวตออก — ${labelTh}`}
            >
              <div className="onuw-vote-reveal-item-head">
                <p className="onuw-vote-reveal-player-row">
                  <User
                    className="onuw-vote-reveal-player-icon"
                    size={17}
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  <span className="onuw-vote-reveal-player-name">{name}</span>
                </p>
                <span className={`onuw-vote-reveal-team-chip onuw-vote-reveal-team-chip--${team}`}>
                  {TEAM_LABEL_TH[team]}
                </span>
              </div>

              <div className="onuw-vote-reveal-flip-wrap">
                <div className="onuw-flip-slot onuw-vote-reveal-slot">
                  <div className="onuw-flip-perspective">
                    <motion.div
                      className="onuw-flip-inner"
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 180 }}
                      transition={{
                        delay: idx * ONUW_VOTE_ELIM_FLIP_STAGGER_SEC,
                        duration: ONUW_VOTE_ELIM_FLIP_DURATION_SEC,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{ transformStyle: 'preserve-3d', transformOrigin: 'center center' }}
                    >
                      <div className="onuw-flip-face onuw-flip-face--back" aria-hidden>
                        <img src={backSrc} alt="" className="onuw-flip-img" decoding="async" />
                      </div>
                      <div className="onuw-flip-face onuw-flip-face--front">
                        <img
                          src={onuwRoleCardUrl(rev.artKey)}
                          alt={labelTh}
                          className="onuw-flip-img"
                          decoding="async"
                        />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="onuw-vote-reveal-role-foot">
                <span className="onuw-vote-reveal-role-th">{labelTh}</span>
                <span className="onuw-vote-reveal-role-en">{ROLE_LABEL_EN[rev.role]}</span>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="onuw-vote-reveal-footer">
        <OnuwVoteRevealNextPhaseHint endsAtMs={gs.voteEliminationRevealEndsAtMs} />
      </footer>
    </Dialog>
  );
}

function OnuwCompositionStage({
  rolesInPlay,
  compositionAckProgress,
  hasAcknowledgedComposition,
  sendAction,
}: {
  rolesInPlay: OnuwPlayerView['rolesInPlay'];
  compositionAckProgress: NonNullable<OnuwPlayerView['compositionAckProgress']> | null;
  hasAcknowledgedComposition: boolean;
  sendAction: (action: OnuwAction) => void;
}) {
  const [detailCard, setDetailCard] = useState<{ role: OnuwRole; artKey: string } | null>(null);
  const [compositionAckSent, setCompositionAckSent] = useState(false);

  const orderedCompositionSlots = useMemo(
    () => buildOrderedCompositionSlots(rolesInPlay),
    [rolesInPlay],
  );

  const compositionAckDisabled = hasAcknowledgedComposition || compositionAckSent;

  return (
    <>
      <section className="onuw-stage card onuw-composition-stage">
        <div className="onuw-composition-centered">
          <h2>การ์ดในเกมนี้</h2>
          <p className="onuw-desc onuw-composition-lead">
            สุ่มจากกล่อง 16 ใบให้ครบผู้เล่น + การ์ดกลาง 3 ใบ — เรียงตามลำดับแอ็กชันกลางคืน
            (จำชุดนี้ไว้ก่อนเริ่มคืน)
          </p>

          <div className="onuw-composition-grid" aria-label="การ์ดในชุดเกม เรียงลำดับกลางคืน">
            {orderedCompositionSlots.map((slot, idx) => (
              <OnuwCompositionFlipFace
                key={slot.slotKey}
                flipIndex={idx}
                frontSrc={onuwRoleCardUrl(slot.artKey)}
                label={slot.label}
                noteBelow={
                  ONUW_ROLES_WITHOUT_NIGHT_ACTION.has(slot.role) ? 'ไม่ตื่นตอนกลางคืน' : undefined
                }
                onHelp={() => setDetailCard({ role: slot.role, artKey: slot.artKey })}
              />
            ))}
          </div>

          <div className="onuw-composition-actions">
            <Button
              type="button"
              disabled={compositionAckDisabled}
              onClick={() => {
                if (compositionAckDisabled) return;
                setCompositionAckSent(true);
                sendAction({ type: 'acknowledge_composition' });
              }}
            >
              รับทราบการ์ดในเกม
            </Button>
            {compositionAckProgress ? (
              <p className="onuw-event">
                รับทราบแล้ว {compositionAckProgress.current}/{compositionAckProgress.total} คน
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <Dialog
        open={detailCard !== null}
        onOpenChange={(open) => {
          if (!open) setDetailCard(null);
        }}
        contentClassName={
          detailCard !== null
            ? `modal onuw-role-detail-dialog onuw-role-detail-dialog--${onuwTeamForRole(detailCard.role)}`
            : 'modal onuw-role-detail-dialog'
        }
        aria-labelledby="onuw-role-detail-title"
      >
        {detailCard !== null ? (
          <>
            <div className="onuw-role-detail-heading">
              <span
                className={`onuw-role-detail-team onuw-role-detail-team--${onuwTeamForRole(detailCard.role)}`}
              >
                {TEAM_LABEL_TH[onuwTeamForRole(detailCard.role)]}
              </span>
              <DialogTitle id="onuw-role-detail-title" className="onuw-role-detail-title">
                {ROLE_LABEL_TH[detailCard.role]}
              </DialogTitle>
              <p className="onuw-role-detail-title-en">{ROLE_LABEL_EN[detailCard.role]}</p>
            </div>
            <div className="onuw-role-detail-body">
              <img
                src={onuwRoleCardUrl(detailCard.artKey)}
                alt=""
                className="onuw-role-detail-img"
              />
              <DialogDescription className="onuw-role-detail-desc">
                {ONUW_ROLE_DESCRIPTION_TH[detailCard.role]}
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDetailCard(null)}>
                ปิด
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </Dialog>
    </>
  );
}

function OnuwRoleRevealSection({
  myRole,
  myRoleArtKey,
  descriptionTh,
  hasAcknowledgedRole,
  roleRevealProgress,
  sendAction,
}: {
  myRole: OnuwRole;
  myRoleArtKey: string;
  descriptionTh: string | null | undefined;
  hasAcknowledgedRole: boolean;
  roleRevealProgress: OnuwPlayerView['roleRevealProgress'];
  sendAction: (action: OnuwAction) => void;
}) {
  const team = onuwTeamForRole(myRole);
  const desc = descriptionTh ?? ONUW_ROLE_DESCRIPTION_TH[myRole];

  return (
    <section className={`onuw-stage card onuw-role-reveal-stage onuw-role-reveal-stage--${team}`}>
      <p className="onuw-role-reveal-eyebrow">บทบาทของคุณ</p>
      <div className="onuw-role-detail-heading">
        <span className={`onuw-role-detail-team onuw-role-detail-team--${team}`}>
          {TEAM_LABEL_TH[team]}
        </span>
        <h2 className="onuw-role-detail-title">{ROLE_LABEL_TH[myRole]}</h2>
        <p className="onuw-role-detail-title-en">{ROLE_LABEL_EN[myRole]}</p>
      </div>
      <div className="onuw-role-detail-body">
        <img
          src={onuwRoleCardUrl(myRoleArtKey)}
          alt={ROLE_LABEL_TH[myRole]}
          className="onuw-role-detail-img"
          loading="lazy"
          decoding="async"
        />
        <p className="onuw-role-detail-desc">{desc}</p>
      </div>
      <div className="onuw-role-reveal-actions">
        {!hasAcknowledgedRole ? (
          <Button type="button" onClick={() => sendAction({ type: 'acknowledge_role' })}>
            รับทราบ — จำบทบาทแล้ว
          </Button>
        ) : (
          <Button type="button" variant="secondary" disabled>
            คุณรับทราบแล้ว — รอผู้อื่น…
          </Button>
        )}
        {roleRevealProgress ? (
          <p className="onuw-event">
            {roleRevealProgress.current}/{roleRevealProgress.total} คนรับทราบแล้ว
          </p>
        ) : null}
      </div>
    </section>
  );
}

function OnuwVoteCountdown({ endsAtMs, totalMs }: { endsAtMs: number; totalMs: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [endsAtMs]);
  const msLeft = Math.max(0, endsAtMs - Date.now());
  const sec = Math.ceil(msLeft / 1000);
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  const progressPct = Math.min(100, Math.max(0, (msLeft / totalMs) * 100));
  const totalMin = totalMs / 60_000;

  return (
    <div className="onuw-vote-countdown-wrap" role="timer" aria-live="polite">
      <p className="onuw-vote-countdown-eyebrow">ถอยหลังสูงสุด {totalMin} นาที</p>
      <div className="onuw-vote-countdown-digits" aria-label={`เหลือ ${mm} นาที ${ss} วินาที`}>
        <div className="onuw-vote-countdown-segment">
          <span className="onuw-vote-countdown-num">{mm}</span>
          <span className="onuw-vote-countdown-unit">นาที</span>
        </div>
        <span className="onuw-vote-countdown-colon" aria-hidden>
          :
        </span>
        <div className="onuw-vote-countdown-segment">
          <span className="onuw-vote-countdown-num">{ss.toString().padStart(2, '0')}</span>
          <span className="onuw-vote-countdown-unit">วินาที</span>
        </div>
      </div>
      <div className="onuw-vote-countdown-progress" aria-hidden>
        <div className="onuw-vote-countdown-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
}

function OnuwDayVoteSection({
  gs,
  myId,
  sendAction,
}: {
  gs: OnuwPlayerView;
  myId: string;
  sendAction: (action: OnuwAction) => void;
}) {
  const orderedSlots = useMemo(() => {
    const pickMap = new Map(
      (gs.roleConfidenceSlots ?? []).map((r) => [r.slotKey, r.pickers] as const),
    );
    return buildOrderedCompositionSlots(gs.rolesInPlay).map((slot) => ({
      ...slot,
      pickers: pickMap.get(slot.slotKey) ?? [],
    }));
  }, [gs.rolesInPlay, gs.roleConfidenceSlots]);

  const confidenceSlotKeyByPlayerId = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of gs.roleConfidenceSlots ?? []) {
      for (const picker of row.pickers) {
        m.set(picker.playerId, row.slotKey);
      }
    }
    return m;
  }, [gs.roleConfidenceSlots]);

  const slotMetaByKey = useMemo(
    () => new Map(orderedSlots.map((s) => [s.slotKey, s] as const)),
    [orderedSlots],
  );

  const [voteDraftId, setVoteDraftId] = useState<string | null>(null);
  const [roleDetailCard, setRoleDetailCard] = useState<{ role: OnuwRole; artKey: string } | null>(
    null,
  );

  useEffect(() => {
    setVoteDraftId(null);
  }, [gs.myVoteTargetId, gs.myVoteAbstained]);

  const selectedForVote = voteDraftId ?? gs.myVoteTargetId ?? null;
  const confirmDisabled =
    selectedForVote == null ||
    selectedForVote === myId ||
    (gs.myVoteTargetId != null && selectedForVote === gs.myVoteTargetId);

  const abstainDisabled = gs.myVoteAbstained && voteDraftId === null;

  const votedNames = gs.voteParticipantStatus?.filter((r) => r.hasVoted).map((r) => r.name) ?? [];
  const pendingNames =
    gs.voteParticipantStatus?.filter((r) => !r.hasVoted).map((r) => r.name) ?? [];

  return (
    <>
      <section className="onuw-stage card onuw-day-vote-stage">
        <header className="onuw-phase-banner onuw-phase-banner--day">
          <span className="onuw-phase-banner-kicker">ช่วงเกม</span>
          <span className="onuw-phase-banner-title">กลางวัน</span>
        </header>

        {gs.votePhaseEndsAtMs != null ? (
          <div className="onuw-vote-deadline-bar" role="status">
            <span className="onuw-vote-deadline-label">เวลากลางวันถอยหลัง</span>
            <OnuwVoteCountdown endsAtMs={gs.votePhaseEndsAtMs} totalMs={ONUW_VOTE_PHASE_MS} />
            <span className="onuw-vote-deadline-hint">
              เมื่อครบ {ONUW_VOTE_PHASE_MS / 60_000} นาทีถ้ายังไม่ครบทุกคนยืนยันโหวตหรือไม่โหวต =
              ทุกคนแพ้
            </span>
          </div>
        ) : null}

        <p className="onuw-desc onuw-day-vote-lead">
          พูดคุยจากข้อมูลตอนคืน — ดูการ์ดในชุดเกมด้านล่าง และ<strong>โหวตผู้เล่น</strong>
          ที่สงสัยว่าเป็นมนุษย์หมาป่า (แตะชื่อแล้วกดยืนยันโหวต · ไม่โหวตตัวเอง · หรือกด
          <strong>ไม่โหวต</strong>ถ้ามั่นใจว่าไม่มีหมาป่าในผู้เล่น)
        </p>

        <div className="onuw-day-section">
          <h3 className="onuw-day-section-title">การ์ดในเกมนี้</h3>
          <p className="onuw-day-section-lead">
            แตะการ์ดบทที่คุณ<strong>มั่นใจมากที่สุด</strong>ว่าอยู่ในเกม —
            ชื่อของผู้เล่นจะโผล่ใต้การ์ดให้ทุกคนในห้องเห็น
            (แตะการ์ดเดิมอีกครั้งเพื่อยกเลิกการเลือกของคุณ)
          </p>
          <div className="onuw-day-role-grid" aria-label="การ์ดในชุดเกม">
            {orderedSlots.map((slot) => {
              const myPick = gs.myRoleConfidenceSlotKey === slot.slotKey;
              return (
                <div key={slot.slotKey} className="onuw-day-role-slot">
                  <button
                    type="button"
                    className={`onuw-day-role-tile${myPick ? ' onuw-day-role-tile--selected' : ''}`}
                    onClick={() =>
                      sendAction({
                        type: 'day_role_confidence',
                        slotKey: myPick ? null : slot.slotKey,
                      })
                    }
                  >
                    <div className="onuw-day-role-card-wrap">
                      <img
                        src={onuwRoleCardUrl(slot.artKey)}
                        alt=""
                        className="onuw-day-role-img"
                        decoding="async"
                      />
                    </div>
                    <span className="onuw-day-role-label">{slot.label}</span>
                    {slot.pickers.length > 0 ? (
                      <div className="onuw-day-role-confidence-tags">
                        {slot.pickers.map((p) => (
                          <span
                            key={p.playerId}
                            className={`onuw-day-role-confidence-tag${p.playerId === myId ? ' onuw-day-role-confidence-tag--me' : ''}`}
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="onuw-card-help-btn onuw-day-role-help-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setRoleDetailCard({ role: slot.role, artKey: slot.artKey });
                    }}
                    aria-label={`คำอธิบาย ${slot.label}`}
                  >
                    ?
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="onuw-day-section onuw-day-section--vote">
          <h3 className="onuw-day-section-title">โหวตผู้เล่น</h3>
          <p className="onuw-day-section-lead">
            แตะชื่อเพื่อเลือก จากนั้นกดยืนยันโหวต —
            หรือกดไม่โหวตถ้าทุกคนพร้อมยอมรับว่าไม่มีมนุษย์หมาป่าในผู้เล่น
          </p>

          <div className="onuw-day-player-grid" aria-label="เลือกผู้เล่นเพื่อโหวต">
            {gs.players.map((p) => {
              const isMe = p.id === myId;
              const isSel = selectedForVote === p.id;
              const pickedKey = confidenceSlotKeyByPlayerId.get(p.id);
              const pickedSlot = pickedKey ? slotMetaByKey.get(pickedKey) : undefined;
              const roleThumbSrc =
                pickedSlot?.artKey != null && pickedSlot.artKey !== ''
                  ? onuwRoleCardUrl(pickedSlot.artKey)
                  : null;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isMe}
                  className={`onuw-day-player-tile${isSel ? ' onuw-day-player-tile--selected' : ''}${isMe ? ' onuw-day-player-tile--me' : ''}`}
                  onClick={() => setVoteDraftId(p.id)}
                >
                  <span className="onuw-day-player-tile-avatar" aria-hidden>
                    {roleThumbSrc ? (
                      <img
                        src={roleThumbSrc}
                        alt=""
                        className="onuw-day-player-tile-role-img"
                        decoding="async"
                      />
                    ) : (
                      <span className="onuw-day-player-tile-avatar-fallback">
                        <User size={28} strokeWidth={2} aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="onuw-day-player-tile-name">{p.name}</span>
                  {isMe ? <span className="onuw-day-player-tile-note">คุณ</span> : null}
                </button>
              );
            })}
          </div>

          <div className="onuw-day-vote-confirm-row">
            <div className="onuw-day-vote-confirm-actions">
              <Button
                type="button"
                disabled={confirmDisabled}
                onClick={() => {
                  if (selectedForVote == null || selectedForVote === myId) return;
                  sendAction({ type: 'vote', targetId: selectedForVote });
                }}
              >
                {gs.myVoteTargetId != null && selectedForVote === gs.myVoteTargetId
                  ? 'โหวตแล้ว'
                  : gs.myVoteTargetId != null || gs.myVoteAbstained
                    ? 'ยืนยันเปลี่ยนโหวต'
                    : 'ยืนยันโหวต'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={abstainDisabled}
                onClick={() => sendAction({ type: 'vote_abstain' })}
              >
                {gs.myVoteAbstained && voteDraftId === null ? 'ไม่โหวตแล้ว' : 'ไม่โหวต'}
              </Button>
            </div>
            {gs.myVoteAbstained && voteDraftId === null ? (
              <p className="onuw-day-vote-pick-summary">
                คุณเลือก<strong>ไม่โหวต</strong> (ไม่นับคะแนนให้ใคร)
              </p>
            ) : selectedForVote != null && selectedForVote !== myId ? (
              <p className="onuw-day-vote-pick-summary">
                เลือก:{' '}
                <strong>{gs.players.find((p) => p.id === selectedForVote)?.name ?? '?'}</strong>
              </p>
            ) : null}
          </div>

          {gs.voteProgress && gs.voteParticipantStatus ? (
            <div className="onuw-vote-status-panel">
              <p className="onuw-vote-status-line">
                <span className="onuw-vote-status-label">โหวตแล้ว</span>{' '}
                <strong>
                  {gs.voteProgress.current}/{gs.voteProgress.total}
                </strong>{' '}
                คน
              </p>
              {votedNames.length > 0 ? (
                <p className="onuw-vote-status-names onuw-vote-status-names--done">
                  <span className="onuw-vote-status-sub">รายชื่อที่ยืนยันแล้ว:</span>{' '}
                  {votedNames.join(' · ')}
                </p>
              ) : null}
              {pendingNames.length > 0 ? (
                <p className="onuw-vote-status-names onuw-vote-status-names--pending">
                  <span className="onuw-vote-status-sub">ยังไม่โหวต:</span>{' '}
                  {pendingNames.join(' · ')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <Dialog
        open={roleDetailCard !== null}
        onOpenChange={(open) => {
          if (!open) setRoleDetailCard(null);
        }}
        contentClassName={
          roleDetailCard !== null
            ? `modal onuw-role-detail-dialog onuw-role-detail-dialog--${onuwTeamForRole(roleDetailCard.role)}`
            : 'modal onuw-role-detail-dialog'
        }
        aria-labelledby="onuw-day-vote-role-detail-title"
      >
        {roleDetailCard !== null ? (
          <>
            <div className="onuw-role-detail-heading">
              <span
                className={`onuw-role-detail-team onuw-role-detail-team--${onuwTeamForRole(roleDetailCard.role)}`}
              >
                {TEAM_LABEL_TH[onuwTeamForRole(roleDetailCard.role)]}
              </span>
              <DialogTitle id="onuw-day-vote-role-detail-title" className="onuw-role-detail-title">
                {ROLE_LABEL_TH[roleDetailCard.role]}
              </DialogTitle>
              <p className="onuw-role-detail-title-en">{ROLE_LABEL_EN[roleDetailCard.role]}</p>
            </div>
            <div className="onuw-role-detail-body">
              <img
                src={
                  roleDetailCard.artKey ? onuwRoleCardUrl(roleDetailCard.artKey) : onuwCardBackUrl()
                }
                alt=""
                className="onuw-role-detail-img"
              />
              <DialogDescription className="onuw-role-detail-desc">
                {ONUW_ROLE_DESCRIPTION_TH[roleDetailCard.role]}
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setRoleDetailCard(null)}>
                ปิด
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </Dialog>
    </>
  );
}

type OnuwMorningRosterRow = NonNullable<OnuwPlayerView['morningRoster']>[number];

function sortMorningRowsForGameOver(rows: OnuwMorningRosterRow[]): OnuwMorningRosterRow[] {
  return [...rows].sort((a, b) => {
    const rc = ROLE_LABEL_TH[a.role].localeCompare(ROLE_LABEL_TH[b.role], 'th');
    if (rc !== 0) return rc;
    return a.name.localeCompare(b.name, 'th');
  });
}

function OnuwGameOverSection({ gs }: { gs: OnuwPlayerView }) {
  const [roleDetailCard, setRoleDetailCard] = useState<{ role: OnuwRole; artKey: string } | null>(
    null,
  );

  const result = gs.gameResult!;
  const roster = gs.morningRoster ?? [];
  const forfeit =
    result.reason.includes('ไม่ทำแอ็กชันกลางคืน') || result.reason.includes('หมดเวลาโหวต');

  const wolfRows = roster.filter((r) => onuwTeamForRole(r.role) === 'werewolf_team');
  const villageRows = roster.filter((r) => onuwTeamForRole(r.role) !== 'werewolf_team');

  const winnerSet = new Set(result.winners);
  const primaryWinnerTeam: OnuwTeam | null =
    result.winners.length === 0
      ? null
      : (() => {
          const w0 = result.winners[0];
          const row = roster.find((x) => x.playerId === w0);
          return row ? onuwTeamForRole(row.role) : null;
        })();

  const sectionOrder: OnuwTeam[] =
    primaryWinnerTeam === 'werewolf_team'
      ? ['werewolf_team', 'village_team']
      : ['village_team', 'werewolf_team'];

  const winnerNames = result.winners.map(
    (id) =>
      roster.find((r) => r.playerId === id)?.name ??
      gs.players.find((p) => p.id === id)?.name ??
      id,
  );

  return (
    <>
      <section className="onuw-stage card onuw-game-over">
        <h2 className="text-center text-4xl! font-bold">จบเกม</h2>

        {forfeit ? (
          <div className="onuw-forfeit-banner" role="alert">
            <strong>เกมจบก่อนกำหนด</strong>
            <p>{result.reason}</p>
          </div>
        ) : (
          <p className="onuw-game-over-reason">
            <strong>{result.reason}</strong>
          </p>
        )}

        <div className="onuw-game-over-hero">
          <p className="onuw-game-over-hero-kicker">ผู้ชนะ</p>
          {result.winners.length > 0 ? (
            <p className="onuw-game-over-hero-names">{winnerNames.join(' · ')}</p>
          ) : (
            <p className="onuw-game-over-hero-names onuw-game-over-hero-names--none">ไม่มีผู้ชนะ</p>
          )}
        </div>

        <div className="onuw-game-over-teams">
          {sectionOrder.map((team) => {
            const rows = team === 'werewolf_team' ? wolfRows : villageRows;
            const won = primaryWinnerTeam === team;
            const gridRows = sortMorningRowsForGameOver(rows);
            const title = team === 'werewolf_team' ? 'ทีมมนุษย์หมาป่า' : 'ทีมหมู่บ้าน';
            return (
              <section
                key={team}
                className={`onuw-game-over-team onuw-game-over-team--${team === 'werewolf_team' ? 'wolves' : 'village'}${won ? ' onuw-game-over-team--won' : ''}`}
              >
                <header className="onuw-game-over-team-head">
                  <h3 className="onuw-game-over-team-title">{title}</h3>
                  {won ? <span className="onuw-game-over-won-badge">ชนะ</span> : null}
                </header>
                {gridRows.length === 0 ? (
                  <p className="onuw-game-over-empty">ไม่มีผู้เล่นในทีมนี้</p>
                ) : (
                  <div className="onuw-game-over-team-grid">
                    {gridRows.map((m) => (
                      <div key={m.playerId} className="onuw-game-over-player-cell">
                        <div className="onuw-game-over-player-card-visual">
                          <button
                            type="button"
                            className="onuw-card-help-btn onuw-game-over-card-help-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleDetailCard({ role: m.role, artKey: m.artKey });
                            }}
                            aria-label={`คำอธิบาย ${ROLE_LABEL_TH[m.role]}`}
                          >
                            ?
                          </button>
                          <div className="onuw-game-over-player-card-frame">
                            <img
                              src={onuwRoleCardUrl(m.artKey)}
                              alt=""
                              className="onuw-game-over-player-card-img"
                              decoding="async"
                            />
                          </div>
                        </div>
                        <span className="onuw-game-over-player-role-label">
                          {ROLE_LABEL_TH[m.role]}
                        </span>
                        <span
                          className={
                            winnerSet.has(m.playerId)
                              ? 'onuw-game-over-player-name onuw-game-over-player-name--winner'
                              : 'onuw-game-over-player-name'
                          }
                        >
                          {m.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {gs.revealEliminations.length > 0 || gs.hunterShotReveals.length > 0 ? (
          <div className="onuw-game-over-events">
            <h4 className="onuw-game-over-events-title">เหตุการณ์ระหว่างเกม</h4>
            <div className="onuw-game-over-event-grid">
              {gs.revealEliminations.map((rev) => (
                <div key={`vote-${rev.playerId}`} className="onuw-game-over-event-card">
                  <p className="onuw-game-over-event-kind">ถูกโหวตออก</p>
                  <p className="onuw-game-over-event-player">
                    {gs.players.find((p) => p.id === rev.playerId)?.name ?? rev.playerId}
                  </p>
                  <div className="onuw-game-over-event-visual">
                    <button
                      type="button"
                      className="onuw-card-help-btn onuw-game-over-card-help-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoleDetailCard({ role: rev.role, artKey: rev.artKey });
                      }}
                      aria-label={`คำอธิบาย ${ROLE_LABEL_TH[rev.role]}`}
                    >
                      ?
                    </button>
                    <img
                      src={onuwRoleCardUrl(rev.artKey)}
                      alt=""
                      className="onuw-game-over-event-img"
                      decoding="async"
                    />
                  </div>
                  <span className="onuw-game-over-event-role">{ROLE_LABEL_TH[rev.role]}</span>
                </div>
              ))}
              {gs.hunterShotReveals.map((rev) => (
                <div key={`hunt-${rev.playerId}`} className="onuw-game-over-event-card">
                  <p className="onuw-game-over-event-kind">ถูก Hunter ยิง</p>
                  <p className="onuw-game-over-event-player">
                    {gs.players.find((p) => p.id === rev.playerId)?.name ?? rev.playerId}
                  </p>
                  <div className="onuw-game-over-event-visual">
                    <button
                      type="button"
                      className="onuw-card-help-btn onuw-game-over-card-help-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoleDetailCard({ role: rev.role, artKey: rev.artKey });
                      }}
                      aria-label={`คำอธิบาย ${ROLE_LABEL_TH[rev.role]}`}
                    >
                      ?
                    </button>
                    <img
                      src={onuwRoleCardUrl(rev.artKey)}
                      alt=""
                      className="onuw-game-over-event-img"
                      decoding="async"
                    />
                  </div>
                  <span className="onuw-game-over-event-role">{ROLE_LABEL_TH[rev.role]}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <Dialog
        open={roleDetailCard !== null}
        onOpenChange={(open) => {
          if (!open) setRoleDetailCard(null);
        }}
        contentClassName={
          roleDetailCard !== null
            ? `modal onuw-role-detail-dialog onuw-role-detail-dialog--${onuwTeamForRole(roleDetailCard.role)}`
            : 'modal onuw-role-detail-dialog'
        }
        aria-labelledby="onuw-game-over-role-detail-title"
      >
        {roleDetailCard !== null ? (
          <>
            <div className="onuw-role-detail-heading">
              <span
                className={`onuw-role-detail-team onuw-role-detail-team--${onuwTeamForRole(roleDetailCard.role)}`}
              >
                {TEAM_LABEL_TH[onuwTeamForRole(roleDetailCard.role)]}
              </span>
              <DialogTitle id="onuw-game-over-role-detail-title" className="onuw-role-detail-title">
                {ROLE_LABEL_TH[roleDetailCard.role]}
              </DialogTitle>
              <p className="onuw-role-detail-title-en">{ROLE_LABEL_EN[roleDetailCard.role]}</p>
            </div>
            <div className="onuw-role-detail-body">
              <img
                src={
                  roleDetailCard.artKey ? onuwRoleCardUrl(roleDetailCard.artKey) : onuwCardBackUrl()
                }
                alt=""
                className="onuw-role-detail-img"
              />
              <DialogDescription className="onuw-role-detail-desc">
                {ONUW_ROLE_DESCRIPTION_TH[roleDetailCard.role]}
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setRoleDetailCard(null)}>
                ปิด
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </Dialog>
    </>
  );
}

interface Props {
  gameState: OnuwPlayerView;
  myId: string;
  sendAction: (action: OnuwAction) => void;
  onLeave: () => void;
  onRestart?: () => void;
  isHost?: boolean;
}

function NightSecretCardImg({ artKey, caption }: { artKey: string; caption?: string }) {
  return (
    <figure className="onuw-secret-card-fig">
      <img src={onuwRoleCardUrl(artKey)} alt="" className="onuw-secret-card-img" decoding="async" />
      {caption ? <figcaption className="onuw-secret-card-cap">{caption}</figcaption> : null}
    </figure>
  );
}

/** ผลลับจากคืน — เน้นรูปการ์ด */
function NightSecretVisual({ secret }: { secret: OnuwNightSecretView }) {
  switch (secret.kind) {
    case 'doppel_peek':
      return (
        <div className="onuw-secret-visual">
          <div className="onuw-secret-cards-row">
            <NightSecretCardImg
              artKey={secret.sawArtKey}
              caption={`การ์ดของ ${secret.targetName}`}
            />
          </div>
          <p className="onuw-secret-hint">
            คุณสวมบท <strong>{ROLE_LABEL_TH[secret.sawRole]}</strong> ตลอดคืนนี้ —
            การ์ดของเขายังอยู่ที่เดิม
          </p>
        </div>
      );
    case 'wolf_pack':
      return (
        <div className="onuw-secret-visual onuw-secret-visual--text">
          <p className="onuw-secret-lead">เพื่อนมนุษย์หมาป่า</p>
          <p className="onuw-secret-names">
            {secret.teammateNames.length ? secret.teammateNames.join(' · ') : 'คุณคนเดียวในผู้เล่น'}
          </p>
        </div>
      );
    case 'wolf_solo':
      return (
        <div className="onuw-secret-visual">
          <div className="onuw-secret-cards-row">
            <NightSecretCardImg
              artKey={secret.sawArtKey}
              caption={`กลาง ${secret.centerIndex + 1}`}
            />
          </div>
        </div>
      );
    case 'minion_peek':
      return (
        <div className="onuw-secret-visual onuw-secret-visual--text">
          <p className="onuw-secret-lead">มนุษย์หมาป่าในเกม</p>
          <p className="onuw-secret-names">
            {secret.werewolfNames.length ? secret.werewolfNames.join(' · ') : 'ไม่มีในผู้เล่น'}
          </p>
        </div>
      );
    case 'mason_peek':
      return (
        <div className="onuw-secret-visual onuw-secret-visual--text">
          <p className="onuw-secret-lead">ช่างหินด้วยกัน</p>
          <p className="onuw-secret-names">
            {secret.masonNames.length ? secret.masonNames.join(' · ') : 'คุณคนเดียว'}
          </p>
        </div>
      );
    case 'seer_player':
      return (
        <div className="onuw-secret-visual">
          <div className="onuw-secret-cards-row">
            <NightSecretCardImg artKey={secret.sawArtKey} caption={secret.targetName} />
          </div>
        </div>
      );
    case 'seer_center':
      return (
        <div className="onuw-secret-visual">
          <div className="onuw-secret-cards-row onuw-secret-cards-row--pair">
            <NightSecretCardImg artKey={secret.artKeys[0]!} caption="กลางใบที่ 1" />
            <NightSecretCardImg artKey={secret.artKeys[1]!} caption="กลางใบที่ 2" />
          </div>
        </div>
      );
    case 'robber_swap':
      return (
        <div className="onuw-secret-visual">
          <div className="onuw-secret-cards-row">
            <NightSecretCardImg
              artKey={secret.newRoleArtKey}
              caption={`สลับกับ ${secret.tookFromName} — บทบาทใหม่`}
            />
          </div>
        </div>
      );
    case 'troublemaker_done':
      return (
        <div className="onuw-secret-visual onuw-secret-visual--text">
          <p className="onuw-secret-hint">
            สลับการ์ดระหว่าง <strong>{secret.swappedNames[0]}</strong> กับ{' '}
            <strong>{secret.swappedNames[1]}</strong>
          </p>
        </div>
      );
    case 'drunk_done':
      return (
        <div className="onuw-secret-visual onuw-secret-visual--text">
          <div className="onuw-secret-drunk-visual">
            <img src={onuwCardBackUrl()} alt="" className="onuw-secret-drunk-back" />
          </div>
          <p className="onuw-secret-hint">{secret.noteTh}</p>
        </div>
      );
    case 'insomniac':
      return (
        <div className="onuw-secret-visual">
          <div className="onuw-secret-cards-row onuw-secret-cards-row--pair">
            <NightSecretCardImg artKey={secret.startedArtKey} caption="ตอนเริ่มคืน" />
            <span className="onuw-secret-arrow" aria-hidden>
              →
            </span>
            <NightSecretCardImg artKey={secret.endedArtKey} caption="ตอนตื่น" />
          </div>
        </div>
      );
    default:
      return null;
  }
}

function OnuwNightPlayerPickGrid({
  players,
  selectedId,
  onSelect,
  disabled = false,
}: {
  players: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="onuw-night-pick-grid">
      {players.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          className={`onuw-night-pick-tile${selectedId === p.id ? ' onuw-night-pick-tile--selected' : ''}`}
          onClick={() => onSelect(p.id)}
        >
          <div className="onuw-night-pick-thumb-wrap">
            <img
              src={onuwCardBackUrl()}
              alt=""
              className="onuw-night-pick-thumb"
              decoding="async"
            />
          </div>
          <span className="onuw-night-pick-name">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

function OnuwNightCenterPickGrid({
  value,
  onChange,
  labels = ['กลาง 1', 'กลาง 2', 'กลาง 3'] as [string, string, string],
  disabled = false,
}: {
  value: 0 | 1 | 2;
  onChange: (v: 0 | 1 | 2) => void;
  labels?: [string, string, string];
  disabled?: boolean;
}) {
  return (
    <div className="onuw-night-pick-grid onuw-night-pick-grid--center">
      {([0, 1, 2] as const).map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          className={`onuw-night-pick-tile${value === i ? ' onuw-night-pick-tile--selected' : ''}`}
          onClick={() => onChange(i)}
        >
          <div className="onuw-night-pick-thumb-wrap">
            <img
              src={onuwCardBackUrl()}
              alt=""
              className="onuw-night-pick-thumb"
              decoding="async"
            />
          </div>
          <span className="onuw-night-pick-name">{labels[i]}</span>
        </button>
      ))}
    </div>
  );
}

function OnuwNightActions({
  gs,
  myId,
  sendAction,
}: {
  gs: OnuwPlayerView;
  myId: string;
  sendAction: (action: OnuwAction) => void;
}) {
  const kind = gs.currentNightKind;
  const actors = gs.nightActors ?? [];
  const [seerMode, setSeerMode] = useState<'player' | 'center'>('player');
  const [peekPlayer, setPeekPlayer] = useState('');
  const [centerA, setCenterA] = useState<0 | 1 | 2>(0);
  const [centerB, setCenterB] = useState<0 | 1 | 2>(1);
  const [robberTgt, setRobberTgt] = useState('');
  const [tmA, setTmA] = useState('');
  const [tmB, setTmB] = useState('');
  const [doppelTgt, setDoppelTgt] = useState('');
  const [drunkC, setDrunkC] = useState<0 | 1 | 2>(0);
  const [wolfC, setWolfC] = useState<0 | 1 | 2>(0);
  const [nightSubmitLocked, setNightSubmitLocked] = useState(false);

  const others = useMemo(() => gs.players.filter((p) => p.id !== myId), [gs.players, myId]);
  const isActor = gs.phase === 'night' && kind != null && actors.includes(myId);

  const doppelPeekSecret = gs.nightSecretView?.kind === 'doppel_peek' ? gs.nightSecretView : null;
  const doppelNeedsInstantFollowUp =
    kind === 'doppelganger' &&
    doppelPeekSecret != null &&
    (doppelPeekSecret.sawRole === 'seer' ||
      doppelPeekSecret.sawRole === 'robber' ||
      doppelPeekSecret.sawRole === 'troublemaker' ||
      doppelPeekSecret.sawRole === 'drunk');

  const submitNightAction = useCallback(
    (action: OnuwAction) => {
      if (nightSubmitLocked) return;
      setNightSubmitLocked(true);
      sendAction(action);
    },
    [nightSubmitLocked, sendAction],
  );

  useEffect(() => {
    if (!isActor) setNightSubmitLocked(false);
  }, [isActor]);

  useEffect(() => {
    setNightSubmitLocked(false);
  }, [
    gs.nightStepIndex,
    gs.currentNightKind,
    doppelPeekSecret?.targetName,
    doppelPeekSecret?.sawRole,
  ]);

  useEffect(() => {
    if (!nightSubmitLocked) return;
    const id = window.setTimeout(() => setNightSubmitLocked(false), 4000);
    return () => window.clearTimeout(id);
  }, [nightSubmitLocked]);

  if (!isActor || !kind) return null;

  const lock = nightSubmitLocked;

  if (kind === 'doppelganger') {
    if (doppelNeedsInstantFollowUp && doppelPeekSecret) {
      const fr = doppelPeekSecret.sawRole;
      if (fr === 'seer') {
        return (
          <div className="onuw-night-actions">
            <p className="onuw-night-actions-label">
              คุณก็อปเป็นหมอดู — ทำแอ็กชันหมอดูในขั้นนี้ (จะไม่ตื่นซ้ำในขั้นหมอดู)
            </p>
            <div className="onuw-night-mode-row">
              <Button
                type="button"
                variant={seerMode === 'player' ? 'primary' : 'secondary'}
                disabled={lock}
                onClick={() => setSeerMode('player')}
              >
                ดูผู้เล่น 1 คน
              </Button>
              <Button
                type="button"
                variant={seerMode === 'center' ? 'primary' : 'secondary'}
                disabled={lock}
                onClick={() => setSeerMode('center')}
              >
                ดูกลาง 2 ใบ
              </Button>
            </div>
            {seerMode === 'player' ? (
              <>
                <p className="onuw-night-actions-label">เลือกผู้เล่นหนึ่งคน</p>
                <OnuwNightPlayerPickGrid
                  players={others}
                  selectedId={peekPlayer}
                  onSelect={setPeekPlayer}
                  disabled={lock}
                />
                <Button
                  type="button"
                  disabled={!peekPlayer || lock}
                  onClick={() =>
                    submitNightAction({ type: 'night_seer_peek_player', targetId: peekPlayer })
                  }
                >
                  ดูการ์ด
                </Button>
              </>
            ) : (
              <>
                <p className="onuw-night-actions-label">เลือกการ์ดกลางสองช่องที่ต่างกัน</p>
                <p className="onuw-night-sub-label">ช่องแรก</p>
                <OnuwNightCenterPickGrid value={centerA} onChange={setCenterA} disabled={lock} />
                <p className="onuw-night-sub-label">ช่องที่สอง</p>
                <OnuwNightCenterPickGrid value={centerB} onChange={setCenterB} disabled={lock} />
                <Button
                  type="button"
                  disabled={centerA === centerB || lock}
                  onClick={() =>
                    submitNightAction({
                      type: 'night_seer_peek_center',
                      indexA: centerA,
                      indexB: centerB,
                    })
                  }
                >
                  ดูการ์ดกลาง
                </Button>
              </>
            )}
          </div>
        );
      }
      if (fr === 'robber') {
        return (
          <div className="onuw-night-actions">
            <p className="onuw-night-actions-label">
              คุณก็อปเป็นโจร — เลือกสลับการ์ดในขั้นนี้ (จะไม่ตื่นซ้ำในขั้นโจร)
            </p>
            <OnuwNightPlayerPickGrid
              players={others}
              selectedId={robberTgt}
              onSelect={setRobberTgt}
              disabled={lock}
            />
            <Button
              type="button"
              disabled={!robberTgt || lock}
              onClick={() => submitNightAction({ type: 'night_robber_swap', targetId: robberTgt })}
            >
              สลับการ์ด
            </Button>
          </div>
        );
      }
      if (fr === 'troublemaker') {
        const othersMinusA = tmA ? others.filter((p) => p.id !== tmA) : others;
        return (
          <div className="onuw-night-actions">
            <p className="onuw-night-actions-label">
              คุณก็อปเป็นคนสร้างปัญหา — เลือกสองคนในขั้นนี้ (จะไม่ตื่นซ้ำในขั้นนั้น)
            </p>
            <p className="onuw-night-sub-label">คนที่ 1</p>
            <OnuwNightPlayerPickGrid
              players={others}
              selectedId={tmA}
              disabled={lock}
              onSelect={(id) => {
                setTmA(id);
                if (tmB === id) setTmB('');
              }}
            />
            <p className="onuw-night-sub-label">คนที่ 2</p>
            <OnuwNightPlayerPickGrid
              players={othersMinusA}
              selectedId={tmB}
              onSelect={setTmB}
              disabled={lock}
            />
            <Button
              type="button"
              disabled={!tmA || !tmB || tmA === tmB || lock}
              onClick={() =>
                submitNightAction({
                  type: 'night_troublemaker_swap',
                  playerAId: tmA,
                  playerBId: tmB,
                })
              }
            >
              สลับการ์ดของทั้งสองคน
            </Button>
          </div>
        );
      }
      if (fr === 'drunk') {
        return (
          <div className="onuw-night-actions">
            <p className="onuw-night-actions-label">
              คุณก็อปเป็นคนเมา — เลือกการ์ดกลางในขั้นนี้ (จะไม่ตื่นซ้ำในขั้นคนเมา)
            </p>
            <OnuwNightCenterPickGrid value={drunkC} onChange={setDrunkC} disabled={lock} />
            <Button
              type="button"
              disabled={lock}
              onClick={() =>
                submitNightAction({ type: 'night_drunk_take_center', centerIndex: drunkC })
              }
            >
              สลับกับการ์ดกลาง
            </Button>
          </div>
        );
      }
    }

    return (
      <div className="onuw-night-actions">
        <p className="onuw-night-actions-label">แตะผู้เล่นหนึ่งคนเพื่อดูการ์ดของเขา</p>
        <OnuwNightPlayerPickGrid
          players={others}
          selectedId={doppelTgt}
          onSelect={setDoppelTgt}
          disabled={lock}
        />
        <Button
          type="button"
          disabled={!doppelTgt || lock}
          onClick={() => submitNightAction({ type: 'night_doppel_peek', targetId: doppelTgt })}
        >
          ดูการ์ด
        </Button>
      </div>
    );
  }

  if (kind === 'werewolf') {
    if (gs.nightWolfIsPack === true) {
      return (
        <div className="onuw-night-actions">
          <Button
            type="button"
            disabled={lock}
            onClick={() => submitNightAction({ type: 'night_ack' })}
          >
            ยืนยัน — ดูเพื่อนแล้ว
          </Button>
        </div>
      );
    }
    if (gs.nightWolfIsPack === false) {
      return (
        <div className="onuw-night-actions">
          <p className="onuw-night-actions-label">เลือกการ์ดกลาง 1 ใบที่จะเปิดดู</p>
          <OnuwNightCenterPickGrid value={wolfC} onChange={setWolfC} disabled={lock} />
          <Button
            type="button"
            disabled={lock}
            onClick={() =>
              submitNightAction({ type: 'night_wolf_peek_center', centerIndex: wolfC })
            }
          >
            เปิดการ์ดกลาง
          </Button>
        </div>
      );
    }
    return null;
  }

  if (kind === 'minion' || kind === 'mason' || kind === 'insomniac') {
    return (
      <div className="onuw-night-actions">
        <Button
          type="button"
          disabled={lock}
          onClick={() => submitNightAction({ type: 'night_ack' })}
        >
          ยืนยัน
        </Button>
      </div>
    );
  }

  if (kind === 'seer') {
    return (
      <div className="onuw-night-actions">
        <div className="onuw-night-mode-row">
          <Button
            type="button"
            variant={seerMode === 'player' ? 'primary' : 'secondary'}
            disabled={lock}
            onClick={() => setSeerMode('player')}
          >
            ดูผู้เล่น 1 คน
          </Button>
          <Button
            type="button"
            variant={seerMode === 'center' ? 'primary' : 'secondary'}
            disabled={lock}
            onClick={() => setSeerMode('center')}
          >
            ดูกลาง 2 ใบ
          </Button>
        </div>
        {seerMode === 'player' ? (
          <>
            <p className="onuw-night-actions-label">เลือกผู้เล่นหนึ่งคน</p>
            <OnuwNightPlayerPickGrid
              players={others}
              selectedId={peekPlayer}
              onSelect={setPeekPlayer}
              disabled={lock}
            />
            <Button
              type="button"
              disabled={!peekPlayer || lock}
              onClick={() =>
                submitNightAction({ type: 'night_seer_peek_player', targetId: peekPlayer })
              }
            >
              ดูการ์ด
            </Button>
          </>
        ) : (
          <>
            <p className="onuw-night-actions-label">เลือกการ์ดกลางสองช่องที่ต่างกัน</p>
            <p className="onuw-night-sub-label">ช่องแรก</p>
            <OnuwNightCenterPickGrid value={centerA} onChange={setCenterA} disabled={lock} />
            <p className="onuw-night-sub-label">ช่องที่สอง</p>
            <OnuwNightCenterPickGrid value={centerB} onChange={setCenterB} disabled={lock} />
            <Button
              type="button"
              disabled={centerA === centerB || lock}
              onClick={() =>
                submitNightAction({
                  type: 'night_seer_peek_center',
                  indexA: centerA,
                  indexB: centerB,
                })
              }
            >
              ดูการ์ดกลาง
            </Button>
          </>
        )}
      </div>
    );
  }

  if (kind === 'robber') {
    return (
      <div className="onuw-night-actions">
        <p className="onuw-night-actions-label">เลือกผู้เล่นหนึ่งคนเพื่อสลับการ์ด</p>
        <OnuwNightPlayerPickGrid
          players={others}
          selectedId={robberTgt}
          onSelect={setRobberTgt}
          disabled={lock}
        />
        <Button
          type="button"
          disabled={!robberTgt || lock}
          onClick={() => submitNightAction({ type: 'night_robber_swap', targetId: robberTgt })}
        >
          สลับการ์ด
        </Button>
      </div>
    );
  }

  if (kind === 'troublemaker') {
    const othersMinusA = tmA ? others.filter((p) => p.id !== tmA) : others;
    return (
      <div className="onuw-night-actions">
        <p className="onuw-night-actions-label">เลือกผู้เล่นสองคน (ไม่รวมคุณ)</p>
        <p className="onuw-night-sub-label">คนที่ 1</p>
        <OnuwNightPlayerPickGrid
          players={others}
          selectedId={tmA}
          disabled={lock}
          onSelect={(id) => {
            setTmA(id);
            if (tmB === id) setTmB('');
          }}
        />
        <p className="onuw-night-sub-label">คนที่ 2</p>
        <OnuwNightPlayerPickGrid
          players={othersMinusA}
          selectedId={tmB}
          onSelect={setTmB}
          disabled={lock}
        />
        <Button
          type="button"
          disabled={!tmA || !tmB || tmA === tmB || lock}
          onClick={() =>
            submitNightAction({
              type: 'night_troublemaker_swap',
              playerAId: tmA,
              playerBId: tmB,
            })
          }
        >
          สลับการ์ดของทั้งสองคน
        </Button>
      </div>
    );
  }

  if (kind === 'drunk') {
    return (
      <div className="onuw-night-actions">
        <p className="onuw-night-actions-label">เลือกการ์ดกลางหนึ่งใบเพื่อสลับกับการ์ดของคุณ</p>
        <OnuwNightCenterPickGrid value={drunkC} onChange={setDrunkC} disabled={lock} />
        <Button
          type="button"
          disabled={lock}
          onClick={() =>
            submitNightAction({ type: 'night_drunk_take_center', centerIndex: drunkC })
          }
        >
          สลับกับการ์ดกลาง
        </Button>
      </div>
    );
  }

  return null;
}

export function OneNightUltimateWerewolfGame({
  gameState: gs,
  myId,
  sendAction,
  onLeave,
  onRestart,
  isHost,
}: Props) {
  useEffect(() => {
    if (gs.phase !== 'game_over') return;
    return startWinCelebrationLoop();
  }, [gs.phase]);

  const nightList = gs.nightSteps ?? [];
  const nightCurIdx =
    gs.phase === 'night' &&
    gs.nightStepIndex != null &&
    gs.nightStepIndex >= 0 &&
    gs.nightStepIndex < nightList.length
      ? gs.nightStepIndex
      : nightList.findIndex((st) => st.kind === gs.currentNightKind);
  const hunterRevealCard = gs.phase === 'hunter_reveal' ? gs.hunterRevealCard : null;

  const onuwNightIsMyStep =
    gs.phase === 'night' && gs.currentNightKind != null && (gs.nightActors ?? []).includes(myId);
  useYourTurnToast(onuwNightIsMyStep, gs.phase === 'night');

  return (
    <GameShell className="onuw-root">
      <GamePlayHeader
        title="One Night Ultimate Werewolf"
        subtitle={gs.lastEvent}
        onLeave={onLeave}
        onRestart={isHost ? onRestart : undefined}
        leaveLabel="full"
      />

      {gs.phase === 'composition' && (
        <OnuwCompositionStage
          rolesInPlay={gs.rolesInPlay}
          compositionAckProgress={gs.compositionAckProgress}
          hasAcknowledgedComposition={gs.hasAcknowledgedComposition}
          sendAction={sendAction}
        />
      )}

      {gs.phase === 'role_reveal' && gs.myRole && gs.myRoleArtKey && (
        <OnuwRoleRevealSection
          myRole={gs.myRole}
          myRoleArtKey={gs.myRoleArtKey}
          descriptionTh={gs.myRoleDescriptionTh}
          hasAcknowledgedRole={gs.hasAcknowledgedRole}
          roleRevealProgress={gs.roleRevealProgress}
          sendAction={sendAction}
        />
      )}

      {gs.phase === 'night' && (
        <section className="onuw-stage card onuw-night-stage">
          <header className="onuw-phase-banner onuw-phase-banner--night">
            <span className="onuw-phase-banner-kicker">ช่วงเกม</span>
            <span className="onuw-phase-banner-title">กลางคืน</span>
          </header>

          {nightList.length > 0 ? (
            <section
              className="onuw-night-block onuw-night-block--schedule"
              aria-labelledby="onuw-night-schedule-heading"
            >
              <h3 id="onuw-night-schedule-heading" className="onuw-night-block-title">
                ลำดับแอ็กชันกลางคืน
              </h3>
              <p className="onuw-night-block-lead">เวลานับถอยหลังอยู่ใต้การ์ดแต่ละขั้น</p>
              <OnuwNightScheduleStrip
                nightList={nightList}
                nightCurIdx={nightCurIdx}
                endsAtMs={gs.nightStepEndsAtMs}
                rolesInPlay={gs.rolesInPlay}
              />
            </section>
          ) : null}

          <section
            className="onuw-night-block onuw-night-block--intel-actions"
            aria-labelledby="onuw-night-intel-heading"
          >
            <h3 id="onuw-night-intel-heading" className="onuw-night-block-title">
              การ์ดและข้อมูลที่คุณรู้
            </h3>
            <p className="onuw-night-block-lead">การ์ดเริ่มต้น · ข้อมูลล่าสุดจากขั้นที่ผ่านมา</p>

            <div className="onuw-night-play-layout">
              {gs.myRole != null && gs.myRoleArtKey != null ? (
                <aside className="onuw-night-my-role">
                  <h4 className="onuw-night-my-role-title">การ์ดของคุณในตอนแรก</h4>
                  <div className="onuw-night-my-role-card">
                    <img
                      src={onuwRoleCardUrl(gs.myRoleArtKey)}
                      alt=""
                      className="onuw-night-my-role-img"
                      decoding="async"
                    />
                  </div>
                  <p className="onuw-night-my-role-name">{ROLE_LABEL_TH[gs.myRole]}</p>
                  <p className="onuw-night-my-role-desc">
                    {gs.myRoleDescriptionTh ?? ONUW_ROLE_DESCRIPTION_TH[gs.myRole]}
                  </p>
                </aside>
              ) : null}
              <div className="onuw-night-play-intel">
                {gs.nightSecretView ? (
                  <div className="onuw-secret-panel">
                    <p className="onuw-secret-panel-title">การ์ด / ข้อมูลล่าสุดที่คุณรู้</p>
                    <NightSecretVisual secret={gs.nightSecretView} />
                  </div>
                ) : (
                  <div className="onuw-night-intel-placeholder">
                    <p>
                      {gs.myRole != null && gs.myRoleArtKey != null
                        ? 'ยังไม่มีข้อมูลใหม่จากขั้นกลางคืนในตอนนี้ — ดูการ์ดเริ่มต้นจากคอลัมน์ด้านซ้าย'
                        : 'หลังคุณทำขั้นตอนหรือได้รับข้อมูล การ์ดและข้อความจะแสดงที่นี่'}
                    </p>
                  </div>
                )}
                <div className="onuw-night-block-actions onuw-night-block-actions--in-intel-column">
                  <h4 className="onuw-night-block-subtitle" id="onuw-night-action-heading">
                    แอ็กชันในขั้นนี้
                  </h4>
                  {gs.nightPromptTh ? (
                    <p className="onuw-night-prompt-line">{gs.nightPromptTh}</p>
                  ) : null}
                  {!(gs.nightActors ?? []).includes(myId) ? (
                    <p className="onuw-night-wait-banner">
                      รอขั้นนี้จบ — <strong>อย่าให้ใครเห็นหน้าจอของคุณ</strong>
                    </p>
                  ) : null}
                  <OnuwNightActions gs={gs} myId={myId} sendAction={sendAction} />
                </div>
              </div>
            </div>
          </section>
        </section>
      )}

      {gs.phase === 'vote' && <OnuwDayVoteSection gs={gs} myId={myId} sendAction={sendAction} />}

      {gs.phase === 'vote_elimination_reveal' && gs.revealEliminations.length > 0 ? (
        <OnuwVoteEliminationRevealModal gs={gs} />
      ) : null}

      {hunterRevealCard && (
        <section className="onuw-stage card onuw-hunter-reveal-stage">
          <h2>เปิดการ์ดผู้ถูก Hunter ยิง</h2>
          <p className="onuw-desc">
            <strong>
              {gs.players.find((p) => p.id === hunterRevealCard.playerId)?.name ?? '?'}
            </strong>{' '}
            ถูกเลือกให้ออกจากเกม — บทบาทหน้าที่นั่งตอนกลางวัน (หลังคืน) คือ
          </p>
          <div className="onuw-hunter-reveal-card-wrap">
            <img
              src={onuwRoleCardUrl(hunterRevealCard.artKey)}
              alt={ROLE_LABEL_TH[hunterRevealCard.role]}
              className="onuw-hunter-reveal-card-img"
              decoding="async"
            />
            <div className="onuw-role-caption">{ROLE_LABEL_TH[hunterRevealCard.role]}</div>
          </div>
          {!gs.hasAcknowledgedHunterReveal ? (
            <Button type="button" onClick={() => sendAction({ type: 'acknowledge_hunter_reveal' })}>
              รับทราบ — ดูการ์ดแล้ว
            </Button>
          ) : (
            <Button type="button" variant="secondary" disabled>
              คุณรับทราบแล้ว — รอผู้อื่น…
            </Button>
          )}
          {gs.hunterRevealAckProgress ? (
            <p className="onuw-event">
              รับทราบแล้ว {gs.hunterRevealAckProgress.current}/{gs.hunterRevealAckProgress.total} คน
            </p>
          ) : null}
        </section>
      )}

      {gs.phase === 'hunter_shot' && (
        <section className="onuw-stage card">
          <h2>Hunter ยิง</h2>
          {gs.hunterMustShoot ? (
            <>
              <p className="onuw-desc">
                เลือกยิงผู้เล่นคนใดก็ได้ที่ยังไม่ถูกโหวต (และยังไม่ถูก Hunter ยิงในรอบนี้) —
                หลังเลือกทุกคนจะเห็นการ์ดของคนนั้น แล้วค่อยสรุปผล
              </p>
              <div className="onuw-vote-grid">
                {gs.players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="onuw-chip-btn"
                    disabled={p.id === myId || (gs.hunterExcludedTargetIds ?? []).includes(p.id)}
                    onClick={() => sendAction({ type: 'hunter_shoot', targetId: p.id })}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="onuw-event">
              รอ Hunter ที่ยังไม่ยิงเลือกเป้าหมาย:{' '}
              <strong>
                {(gs.hunterPendingShooterIds ?? [])
                  .map((id) => gs.players.find((p) => p.id === id)?.name ?? id)
                  .join(' · ') || '—'}
              </strong>
            </p>
          )}
        </section>
      )}

      {gs.phase === 'game_over' && gs.gameResult ? <OnuwGameOverSection gs={gs} /> : null}
    </GameShell>
  );
}
