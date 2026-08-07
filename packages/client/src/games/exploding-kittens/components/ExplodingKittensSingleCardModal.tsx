import type { ReactNode } from 'react';
import { Button } from '../../../components/ui';
import type { EkActorSlot } from './EkActorsRow';
import { EkModalCard } from './EkModalCard';
import { EkModalShell } from './EkModalShell';

export type ExplodingKittensSingleCardModalCard = {
  imageSrc: string;
  imageAlt: string;
  caption: ReactNode;
};

type Props = {
  open: boolean;
  title: ReactNode;
  /** @deprecated Prefer actors + actionLine via shell — kept for callers */
  intro?: ReactNode;
  card?: ExplodingKittensSingleCardModalCard;
  bodyFallback?: ReactNode;
  primaryAction: { label: string; onClick: () => void };
  actors?: { from: EkActorSlot; to?: EkActorSlot };
  actionLine?: { label?: string; value: ReactNode };
  overlayClassName?: string;
  modalClassName?: string;
  titleClassName?: string;
};

/** Thin wrapper over EkModalShell for one-card + primary CTA flows. */
export function ExplodingKittensSingleCardModal({
  open,
  title,
  intro,
  card,
  bodyFallback,
  primaryAction,
  actors,
  actionLine,
  overlayClassName,
  modalClassName,
}: Props) {
  if (!open) return null;

  return (
    <EkModalShell
      title={title}
      actors={actors}
      actionLine={actionLine}
      media={
        card ? (
          <EkModalCard size="hero" src={card.imageSrc} alt={card.imageAlt} caption={card.caption} />
        ) : undefined
      }
      className={modalClassName}
      overlayClassName={overlayClassName}
      footer={
        <Button variant="primary" onClick={primaryAction.onClick}>
          {primaryAction.label}
        </Button>
      }
    >
      {!card && bodyFallback ? bodyFallback : null}
      {!actors && intro ? <div className="ek-modal-shell__hint">{intro}</div> : null}
    </EkModalShell>
  );
}
