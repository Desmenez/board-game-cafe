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
        'rounded-card border px-2 py-1.5 text-orange-50',
        isPending
          ? 'border-2 border-dashed border-orange-400/80 bg-orange-950/50'
          : 'border-orange-700/60 bg-orange-700/20',
      )}
    >
      <header className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold tracking-wide text-orange-300 uppercase">
            {isPending ? 'แผ่นใหม่' : tile.label}
          </p>
          {isPending ? (
            <h3 className="truncate text-sm font-semibold text-orange-50">{tile.label}</h3>
          ) : null}
        </div>
        {action}
      </header>
      <ul className="grid grid-cols-2 gap-1">
        {tile.options.map((opt, i) => {
          const pinned = tile.pinIndex === i;
          return (
            <li
              key={`${tile.id}-${i}`}
              className={cn(
                'flex items-center gap-1 rounded-input border px-1.5 py-1 text-xs leading-snug',
                pinned
                  ? 'border-orange-400 bg-orange-800/90 font-medium text-orange-50'
                  : 'border-orange-800/70 bg-orange-950/50 text-orange-100/90',
              )}
            >
              {pinned ? (
                <span className="size-1.5 shrink-0 rounded-full bg-orange-300" aria-hidden />
              ) : null}
              <span className="min-w-0">{opt}</span>
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
      className="room-night-dialog max-w-3xl w-full max-h-[min(92dvh,44rem)] overflow-y-auto"
      overlayClassName="room-night-dialog-overlay"
    >
      <DialogTitle>แทนที่แผ่นสถานการณ์</DialogTitle>
      <p className="mb-2 text-xs text-ink-2">
        {canChoose
          ? 'แผ่นใหม่ด้านบน — เลือกแผ่นส้มด้านล่าง 1 ใบที่จะเอาออก'
          : 'นักนิติวิทยาศาสตร์กำลังเลือกแผ่นสถานการณ์ที่จะถูกแทนที่'}
      </p>

      <div className="grid max-h-[min(55vh,28rem)] gap-2 overflow-y-auto overscroll-contain pr-1">
        <section className="grid gap-1">
          <p className="text-[0.65rem] font-semibold tracking-wide text-pear uppercase">
            การ์ดใหม่ที่ได้มา
          </p>
          <SituationTilePreview tile={pending} variant="pending" />
        </section>

        <section className="grid gap-1">
          <p className="text-[0.65rem] font-semibold tracking-wide text-ink-3 uppercase">
            เลือกแผ่นที่จะแทนที่ ({situationTiles.length})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
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
                      แทนที่
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
