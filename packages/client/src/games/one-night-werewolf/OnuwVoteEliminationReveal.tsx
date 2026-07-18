import type { OnuwPlayerView } from 'shared';
import {
  ONUW_VOTE_ELIMINATION_FLIP_MS,
  ONUW_VOTE_ELIMINATION_FLIP_STAGGER_MS,
  onuwTeamForRole,
} from 'shared';
import { motion } from 'motion/react';
import { User } from 'lucide-react';
import { Dialog, DialogDescription, DialogTitle } from '../../components/ui';
import { useDeadlineCountdown } from '../../hooks/useDeadlineCountdown';
import { onuwCardBackUrl, onuwRoleCardUrl } from '../../imageMap';
import { ROLE_LABEL_EN, ROLE_LABEL_TH, TEAM_LABEL_TH } from './onuwRoles';

const ONUW_VOTE_ELIM_FLIP_STAGGER_SEC = ONUW_VOTE_ELIMINATION_FLIP_STAGGER_MS / 1000;
const ONUW_VOTE_ELIM_FLIP_DURATION_SEC = ONUW_VOTE_ELIMINATION_FLIP_MS / 1000;

function OnuwVoteRevealNextPhaseHint({ endsAtMs }: { endsAtMs: number | null }) {
  const { remainMs } = useDeadlineCountdown(endsAtMs);
  if (endsAtMs == null) {
    return (
      <p className="onuw-vote-reveal-footer-text">
        หลังเปิดการ์ดครบ เกมจะไปขั้นต่อไปอัตโนมัติ — ไม่ต้องกดปิด
      </p>
    );
  }
  const sec = Math.max(0, Math.ceil(remainMs / 1000));
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

export function OnuwVoteEliminationRevealModal({ gs }: { gs: OnuwPlayerView }) {
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
