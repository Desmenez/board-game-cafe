import type { ReactNode } from 'react';
import { Button } from '../../../components/ui';

export type ExplodingKittensSingleCardModalCard = {
  imageSrc: string;
  imageAlt: string;
  caption: ReactNode;
};

type Props = {
  open: boolean;
  title: ReactNode;
  /** e.g. lead paragraph above the card */
  intro?: ReactNode;
  /** Single-card preview; omit when using only bodyFallback */
  card?: ExplodingKittensSingleCardModalCard;
  /** When there is no card to show (e.g. private info) */
  bodyFallback?: ReactNode;
  primaryAction: { label: string; onClick: () => void };
  overlayClassName?: string;
  modalClassName?: string;
  titleClassName?: string;
};

/**
 * Shared modal shell for “one card + primary button” flows (draw reveal, steal reveal, three-claim result, etc.).
 */
export function ExplodingKittensSingleCardModal({
  open,
  title,
  intro,
  card,
  bodyFallback,
  primaryAction,
  overlayClassName = '',
  modalClassName = '',
  titleClassName,
}: Props) {
  if (!open) return null;

  const overlayCn = ['modal-overlay', overlayClassName].filter(Boolean).join(' ');
  const modalCn = ['modal', modalClassName].filter(Boolean).join(' ');

  return (
    <div className={overlayCn} role="dialog" aria-modal="true">
      <div className={modalCn}>
        <h2 className={titleClassName}>{title}</h2>
        {intro}
        {card ? (
          <div className="ek-modal-card-preview ek-modal-card-preview--single-card-modal">
            <img src={card.imageSrc} alt={card.imageAlt} className="ek-card-img" loading="lazy" />
            <div className="ek-card-caption text-center">{card.caption}</div>
          </div>
        ) : (
          (bodyFallback ?? null)
        )}
        <Button block onClick={primaryAction.onClick}>
          {primaryAction.label}
        </Button>
      </div>
    </div>
  );
}
