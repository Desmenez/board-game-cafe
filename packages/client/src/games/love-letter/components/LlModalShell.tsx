import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

type Props = {
  title: ReactNode;
  titleId?: string;
  kicker?: ReactNode;
  layout?: 'compact' | 'wide';
  media?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  overlayClassName?: string;
};

/** Love Letter action-modal chrome (local — do not import EkModalShell). */
export function LlModalShell({
  title,
  titleId = 'll-modal-title',
  kicker,
  layout = 'compact',
  media,
  children,
  footer,
  className,
  overlayClassName,
}: Props) {
  return (
    <div
      className={cn('modal-overlay', overlayClassName)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={cn(
          'modal',
          'll-modal-shell',
          layout === 'wide' && 'll-modal-shell--wide',
          className,
        )}
      >
        {kicker ? <p className="ll-modal-shell__kicker">{kicker}</p> : null}
        <h2 id={titleId} className="ll-modal-shell__title">
          {title}
        </h2>
        {media ? <div className="ll-modal-shell__media">{media}</div> : null}
        {children ? <div className="ll-modal-shell__body">{children}</div> : null}
        {footer ? <div className="ll-modal-shell__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
