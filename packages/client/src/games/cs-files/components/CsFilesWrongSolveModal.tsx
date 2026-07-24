import { ArrowRight } from 'lucide-react';
import type { CsFilesPlayerView } from 'shared';
import { Button, Dialog, DialogFooter, DialogTitle } from '../../../components/ui';
import { PlayerIdentity } from '../../../components/player-avatar';
import { csFilesCardUrl } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { CS_FILES_CARD_ASPECT_CLASS } from '../lib/roleMeta';

type Props = {
  gameState: CsFilesPlayerView;
  onClose: () => void;
};

/** แสดงเมื่อไขคดีผิด — บอกว่าใครกล่าวหาใคร และทายการ์ดอะไร */
export function CsFilesWrongSolveModal({ gameState: gs, onClose }: Props) {
  const result = gs.lastSolveResult;
  if (!result || result.correct) return null;

  const targetSeat = gs.seats.find((s) => s.id === result.targetPlayerId);
  const evidence = targetSeat?.brownCards.find((c) => c.id === result.evidenceCardId);
  const means = targetSeat?.blueCards.find((c) => c.id === result.meansCardId);

  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      className="room-night-dialog max-w-lg"
      overlayClassName="room-night-dialog-overlay"
    >
      <DialogTitle>ไขคดีไม่สำเร็จ</DialogTitle>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-card border border-error/35 bg-error/5 px-3 py-3">
          <div className="min-w-0 text-center">
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              ผู้กล่าวหา
            </p>
            <PlayerIdentity
              playerId={result.playerId}
              name={result.playerName}
              avatarSize={44}
              className="justify-center"
            />
          </div>
          <ArrowRight size={22} className="shrink-0 text-error/80" aria-hidden />
          <div className="min-w-0 text-center">
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              ถูกกล่าวหา
            </p>
            <PlayerIdentity
              playerId={result.targetPlayerId}
              name={result.targetPlayerName}
              avatarSize={44}
              className="justify-center"
            />
          </div>
        </div>

        <p className="text-center text-sm leading-relaxed text-ink-2">
          ทายผิด — ทั้งหลักฐานและวิธีฆ่าของ{' '}
          <strong className="text-ink">{result.targetPlayerName}</strong> ไม่ใช่คำตอบ
          <span className="mt-1 block text-xs text-ink-3">
            {result.playerName} หมดสิทธิ์ไขคดีแล้ว
          </span>
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          {evidence ? (
            <figure className="min-w-0 max-w-32 text-center">
              <img
                src={csFilesCardUrl(evidence.publicId, evidence.version)}
                alt={evidence.label}
                className={cn(
                  CS_FILES_CARD_ASPECT_CLASS,
                  'w-full rounded-sm border-2 border-error/70 object-cover',
                )}
              />
              <figcaption className="mt-1.5 text-xs text-ink-2">
                หลักฐาน · {evidence.label}
              </figcaption>
            </figure>
          ) : null}
          {means ? (
            <figure className="min-w-0 max-w-32 text-center">
              <img
                src={csFilesCardUrl(means.publicId, means.version)}
                alt={means.label}
                className={cn(
                  CS_FILES_CARD_ASPECT_CLASS,
                  'w-full rounded-sm border-2 border-error/70 object-cover',
                )}
              />
              <figcaption className="mt-1.5 text-xs text-ink-2">วิธีฆ่า · {means.label}</figcaption>
            </figure>
          ) : null}
        </div>
      </div>
      <DialogFooter className="justify-center">
        <Button type="button" variant="primary" onClick={onClose}>
          รับทราบ
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
