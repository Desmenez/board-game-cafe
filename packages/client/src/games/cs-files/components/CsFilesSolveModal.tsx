import { useEffect, useMemo, useState } from 'react';
import type { CsFilesCardDef, CsFilesPlayerView, CsFilesSeatView } from 'shared';
import { Button, Dialog, DialogFooter, DialogTitle } from '../../../components/ui';
import { PlayerIdentity } from '../../../components/player-avatar';
import { useDeadlineCountdown } from '../../../hooks/useDeadlineCountdown';
import { csFilesCardUrl } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { CS_FILES_CARD_ASPECT_CLASS } from '../lib/roleMeta';

type Props = {
  open: boolean;
  onClose: () => void;
  gameState: CsFilesPlayerView;
  myId: string;
  onSubmit: (targetPlayerId: string, evidenceCardId: string, meansCardId: string) => void;
};

export function CsFilesSolveModal({ open, onClose, gameState: gs, myId, onSubmit }: Props) {
  const targets = useMemo(
    () => gs.seats.filter((s) => s.id !== gs.forensicId && s.id !== myId),
    [gs.forensicId, gs.seats, myId],
  );
  const [targetId, setTargetId] = useState<string | null>(null);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [meansId, setMeansId] = useState<string | null>(null);
  /** ล็อก deadline ตอนเปิด modal — อย่าตาม turnEndsAtMs ของคนถัดไป */
  const [myTurnDeadlineMs, setMyTurnDeadlineMs] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setMyTurnDeadlineMs(null);
      setTargetId(null);
      setEvidenceId(null);
      setMeansId(null);
      return;
    }
    setMyTurnDeadlineMs(gs.turnEndsAtMs ?? null);
    // จงใจไม่ใส่ turnEndsAtMs ใน deps — ต้องเป็น deadline ของตาที่เปิด modal เท่านั้น
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot on open
  }, [open]);

  const {
    label: remainLabel,
    expired,
    remainMs,
  } = useDeadlineCountdown(open ? myTurnDeadlineMs : null);

  useEffect(() => {
    if (!open) return;
    if (expired) {
      onClose();
      return;
    }
    // หมดตาแล้ว (ผ่านอัตโนมัติ / คนอื่นได้ตา) — ปิดทันที ไม่รอ countdown คนถัดไป
    if (gs.currentSpeakerId !== myId || gs.investigationSubPhase !== 'presenting') {
      onClose();
    }
  }, [expired, open, onClose, gs.currentSpeakerId, gs.investigationSubPhase, myId]);

  const me = gs.seats.find((s) => s.id === myId);
  const canSolve = Boolean(me?.hasBadge) && gs.myRole !== 'forensic';
  const canConfirm = Boolean(canSolve && targetId && evidenceId && meansId);
  const urgent = remainMs > 0 && remainMs <= 10_000;

  const pickEvidence = (seat: CsFilesSeatView, card: CsFilesCardDef) => {
    if (targetId != null && targetId !== seat.id) {
      setMeansId(null);
    }
    setTargetId(seat.id);
    setEvidenceId(card.id);
  };

  const pickMeans = (seat: CsFilesSeatView, card: CsFilesCardDef) => {
    if (targetId != null && targetId !== seat.id) {
      setEvidenceId(null);
    }
    setTargetId(seat.id);
    setMeansId(card.id);
  };

  if (!open) return null;

  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      className="room-night-dialog max-w-5xl w-[min(96vw,56rem)]!"
      overlayClassName="room-night-dialog-overlay"
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <DialogTitle className="mb-0!">ขอไขคดี</DialogTitle>
        {remainLabel ? (
          <p
            className={cn(
              'shrink-0 rounded-input border px-3 py-1.5 font-display text-base font-bold tabular-nums',
              urgent
                ? 'border-error/50 bg-error/10 text-error'
                : 'border-rule bg-paper-3 text-pear',
            )}
            aria-live="polite"
          >
            เหลือ {remainLabel}
          </p>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-ink-2">
        เลือกหลักฐาน (น้ำตาล) 1 ใบ และวิธีฆ่า (น้ำเงิน) 1 ใบของคนอื่นคนเดียวกัน แล้วกดยืนยัน
        (เลือกการ์ดของตัวเองไม่ได้)
        {remainLabel ? ' — หมดเวลาตาคุณแล้ว modal จะปิดอัตโนมัติ' : null}
      </p>

      <div className="grid max-h-[min(70vh,40rem)] gap-4 overflow-y-auto pr-1">
        {!canSolve ? (
          <p className="text-sm text-ink-2">คุณไม่มีสิทธิ์ไขคดีแล้ว (หรือเป็นนักนิติวิทยาศาสตร์)</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {targets.map((seat) => {
              const isSelectedOwner = targetId === seat.id;
              return (
                <section
                  key={seat.id}
                  className={cn(
                    'flex min-w-0 flex-col rounded-card border p-3',
                    isSelectedOwner
                      ? 'border-pear bg-paper-3 ring-2 ring-pear/35'
                      : 'border-rule bg-paper-2',
                  )}
                >
                  <div className="mb-3">
                    <PlayerIdentity
                      playerId={seat.id}
                      name={seat.id === myId ? `${seat.name} (คุณ)` : seat.name}
                      avatarSize={32}
                    />
                    {isSelectedOwner ? (
                      <p className="mt-1 text-xs font-medium text-pear">เจ้าของการ์ดที่เลือก</p>
                    ) : null}
                  </div>

                  <div className="grid min-w-0 gap-2">
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-amber-200/80 uppercase">
                        หลักฐาน
                      </p>
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {seat.brownCards.map((c) => {
                          const selected = evidenceId === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => pickEvidence(seat, c)}
                              aria-pressed={selected}
                              title={c.label}
                              className={cn(
                                'min-w-0 overflow-hidden rounded-sm border transition',
                                selected
                                  ? 'border-amber-400 ring-2 ring-amber-500/80'
                                  : 'border-amber-800/50 hover:border-amber-500/70',
                              )}
                            >
                              <img
                                src={csFilesCardUrl(c.publicId, c.version)}
                                alt={c.label}
                                className={cn(CS_FILES_CARD_ASPECT_CLASS, 'w-full object-cover')}
                                draggable={false}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-sky-200/80 uppercase">
                        วิธีฆ่า
                      </p>
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {seat.blueCards.map((c) => {
                          const selected = meansId === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => pickMeans(seat, c)}
                              aria-pressed={selected}
                              title={c.label}
                              className={cn(
                                'min-w-0 overflow-hidden rounded-sm border transition',
                                selected
                                  ? 'border-sky-400 ring-2 ring-sky-500/80'
                                  : 'border-sky-800/50 hover:border-sky-500/70',
                              )}
                            >
                              <img
                                src={csFilesCardUrl(c.publicId, c.version)}
                                alt={c.label}
                                className={cn(CS_FILES_CARD_ASPECT_CLASS, 'w-full object-cover')}
                                draggable={false}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={!canConfirm || expired}
          onClick={() => {
            if (targetId && evidenceId && meansId) {
              onSubmit(targetId, evidenceId, meansId);
              onClose();
            }
          }}
        >
          ยืนยันไขคดี
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
