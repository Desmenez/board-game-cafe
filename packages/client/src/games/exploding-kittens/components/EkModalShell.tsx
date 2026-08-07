import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import { EkActorsRow, type EkActorSlot } from './EkActorsRow';

type Props = {
  title: ReactNode;
  titleId?: string;
  kicker?: ReactNode;
  layout?: 'compact' | 'wide';
  actors?: { from: EkActorSlot; to?: EkActorSlot; ariaLabel?: string };
  actionLine?: { label?: string; value: ReactNode };
  /** Card hero / strip / status above body */
  media?: ReactNode;
  /** Shrink hero art so pick grids get more vertical space */
  mediaCompact?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  overlayClassName?: string;
};

/** Shared EK action-modal chrome: title → media → actors → action line → body → footer. */
export function EkModalShell({
  title,
  titleId = 'ek-modal-title',
  kicker,
  layout = 'compact',
  actors,
  actionLine,
  media,
  mediaCompact = false,
  children,
  footer,
  className,
  overlayClassName,
}: Props) {
  return (
    <div
      className={cn('modal-overlay', 'ek-reaction-overlay', overlayClassName)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={cn(
          'modal',
          'ek-modal-shell',
          layout === 'wide' && 'ek-modal-shell--wide',
          className,
        )}
      >
        {kicker ? <p className="ek-modal-shell__kicker">{kicker}</p> : null}
        <h2 id={titleId} className="ek-modal-shell__title">
          {title}
        </h2>

        {media ? (
          <div
            className={cn(
              'ek-modal-shell__media',
              mediaCompact && 'ek-modal-shell__media--compact',
            )}
          >
            {media}
          </div>
        ) : null}

        {actors ? (
          <EkActorsRow from={actors.from} to={actors.to} ariaLabel={actors.ariaLabel} />
        ) : null}

        {actionLine ? (
          <p className="ek-modal-shell__action-line">
            {actionLine.label ? (
              <span className="ek-modal-shell__action-line-label">{actionLine.label}</span>
            ) : null}
            <strong className="ek-modal-shell__action-line-value">{actionLine.value}</strong>
          </p>
        ) : null}

        {children ? <div className="ek-modal-shell__body">{children}</div> : null}

        {footer ? <div className="ek-modal-shell__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
