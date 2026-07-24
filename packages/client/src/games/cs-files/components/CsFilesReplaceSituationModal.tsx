import type { ReactNode } from 'react';
import type { CsFilesSceneTile } from 'shared';
import { Button, Dialog, DialogTitle } from '../../../components/ui';
import { cn } from '../../../utils/cn';

type Props = {
  open: boolean;
  pending: CsFilesSceneTile;
  situationTiles: CsFilesSceneTile[];
  canChoose: boolean;
  onReplace: (tileId: string) => void;
};

function SituationTilePreview({
  tile,
  variant,
  action,
}: {
  tile: CsFilesSceneTile;
  variant: 'pending' | 'old';
  action?: ReactNode;
}) {
  const isPending = variant === 'pending';
  return (
    <article
      className={cn(
        'rounded-card border p-3 text-orange-50 shadow-sm',
        isPending
          ? 'border-2 border-dashed border-orange-400/80 bg-orange-950/50'
          : 'border-orange-700/60 bg-orange-700/20',
      )}
    >
      <header className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-orange-300 uppercase">
            {isPending ? 'แผ่นใหม่' : 'แผ่นปัจจุบัน'}
          </p>
          <h3 className="font-display text-base font-semibold text-orange-50">{tile.label}</h3>
        </div>
        {action}
      </header>
      <ul className="grid gap-1">
        {tile.options.map((opt, i) => {
          const pinned = tile.pinIndex === i;
          return (
            <li
              key={`${tile.id}-${i}`}
              className={cn(
                'rounded-input border px-2.5 py-1.5 text-sm',
                pinned
                  ? 'border-orange-400 bg-orange-800/90 font-medium text-orange-50'
                  : 'border-orange-800/70 bg-orange-950/50 text-orange-100/90',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span>{opt}</span>
                {pinned ? (
                  <span className="text-xs font-semibold text-orange-300">หมุด</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

/** Modal ให้นิติฯ เลือกแผ่นส้มที่จะถูกแทนด้วยแผ่นใหม่ */
export function CsFilesReplaceSituationModal({
  open,
  pending,
  situationTiles,
  canChoose,
  onReplace,
}: Props) {
  if (!open) return null;

  return (
    <Dialog
      open
      onOpenChange={() => undefined}
      dismissible={false}
      className="room-night-dialog max-w-4xl w-[min(96vw,52rem)]! md:w-full!"
      overlayClassName="room-night-dialog-overlay"
    >
      <DialogTitle>แทนที่แผ่นสถานการณ์</DialogTitle>
      <p className="mb-4 text-sm text-ink-2">
        {canChoose
          ? 'แผ่นใหม่ด้านบน — เลือกแผ่นส้มด้านล่าง 1 ใบที่จะเอาออก (ห้ามเปลี่ยนสถานที่/สาเหตุการตาย)'
          : 'นักนิติวิทยาศาสตร์กำลังเลือกแผ่นสถานการณ์ที่จะถูกแทนที่'}
      </p>

      <div className="grid max-h-[min(70vh,42rem)] gap-5 overflow-y-auto pr-1">
        <section>
          <p className="mb-2 text-xs font-semibold tracking-wide text-pear uppercase">
            การ์ดใหม่ที่ได้มา
          </p>
          <SituationTilePreview tile={pending} variant="pending" />
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">
            เลือกแผ่นส้มที่จะถูกแทนที่ ({situationTiles.length} ใบ)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {situationTiles.map((tile) => (
              <SituationTilePreview
                key={tile.id}
                tile={tile}
                variant="old"
                action={
                  canChoose ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => onReplace(tile.id)}
                    >
                      แทนที่แผ่นนี้
                    </Button>
                  ) : null
                }
              />
            ))}
          </div>
        </section>
      </div>
    </Dialog>
  );
}
