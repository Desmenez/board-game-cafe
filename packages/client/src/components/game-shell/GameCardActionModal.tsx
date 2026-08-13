import type { CSSProperties, ReactNode } from 'react';
import { Dialog } from '../ui';
import { cn } from '../../utils/cn';
import './game-shell.css';

export interface GameCardActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prevent Escape/backdrop close (secret reveals, required acks). Default true. */
  dismissible?: boolean;
  titleId: string;
  title: ReactNode;
  description?: ReactNode;
  descriptionId?: string;
  /** Hero card art — required for card-driven actions. */
  cardSrc: string;
  cardAlt: string;
  /** CSS aspect-ratio for the hero card (e.g. `331 / 514`). Default `2 / 3`. */
  cardAspectRatio?: string;
  /** Small meta line under the hint (count, phase, etc.). */
  meta?: ReactNode;
  /** Avatar row(s) — prefer `PlayerIdentity`. */
  actors?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  wide?: boolean;
}

/**
 * Canonical in-game card action modal (Love Letter / Salem select-modal layout).
 * Use for declare / target / reveal / tuck — never invent a compact Dialog without hero art.
 */
export function GameCardActionModal({
  open,
  onOpenChange,
  dismissible = true,
  titleId,
  title,
  description,
  descriptionId,
  cardSrc,
  cardAlt,
  cardAspectRatio = '2 / 3',
  meta,
  actors,
  children,
  footer,
  className,
  contentClassName,
  wide = true,
}: GameCardActionModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={dismissible}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      // Portaled to body — must remap Midnight tokens (else legacy purple .modal).
      overlayClassName="room-night-dialog-overlay"
      contentClassName={cn(
        'game-card-action-modal room-night-dialog rounded-card border border-rule bg-paper-2 text-ink',
        wide && 'game-card-action-modal--wide',
        contentClassName,
        className,
      )}
    >
      <div className="game-card-action-modal__hero">
        <div className="game-card-action-modal__card-wrap">
          <img
            src={cardSrc}
            alt={cardAlt}
            className="game-card-action-modal__card"
            style={{ aspectRatio: cardAspectRatio } as CSSProperties}
          />
        </div>
        <div className="game-card-action-modal__copy">
          <h2 id={titleId} className="game-card-action-modal__title">
            {title}
          </h2>
          {description != null ? (
            <p id={descriptionId} className="game-card-action-modal__hint">
              {description}
            </p>
          ) : null}
          {meta != null ? <div className="game-card-action-modal__meta">{meta}</div> : null}
          {actors != null ? <div className="game-card-action-modal__actors">{actors}</div> : null}
        </div>
      </div>

      {children != null ? <div className="game-card-action-modal__body">{children}</div> : null}

      {footer != null ? <div className="game-card-action-modal__footer">{footer}</div> : null}
    </Dialog>
  );
}
