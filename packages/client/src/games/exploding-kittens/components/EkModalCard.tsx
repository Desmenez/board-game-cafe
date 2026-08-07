import type { ReactNode } from 'react';
import type { ExplodingKittensCardType } from 'shared';
import { cn } from '../../../utils/cn';
import { CARD_IMAGE, CARD_LABEL } from '../lib/cardMeta';

export type EkModalCardSize = 'hero' | 'grid';

type Props = {
  size?: EkModalCardSize;
  cardType?: ExplodingKittensCardType;
  src?: string;
  alt?: string;
  caption?: ReactNode;
  /** Hide decorative alt when caption already labels the card */
  decorative?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
};

/** Equal-size EK card preview for modal hero / pick grids. */
export function EkModalCard({
  size = 'hero',
  cardType,
  src,
  alt,
  caption,
  decorative,
  className,
  onClick,
  disabled,
}: Props) {
  const imageSrc = src ?? (cardType ? CARD_IMAGE[cardType] : undefined);
  const imageAlt = alt ?? (cardType ? CARD_LABEL[cardType] : '');
  const label = caption ?? (cardType ? CARD_LABEL[cardType] : undefined);

  if (!imageSrc) return null;

  const body = (
    <>
      <img
        src={imageSrc}
        alt={decorative ? '' : imageAlt}
        className="ek-card-img"
        loading="lazy"
        aria-hidden={decorative || undefined}
      />
      {label != null && label !== '' ? <div className="ek-modal-card__caption">{label}</div> : null}
    </>
  );

  const sizeClass = size === 'grid' ? 'ek-modal-card--grid' : 'ek-modal-card--hero';

  if (onClick) {
    return (
      <button
        type="button"
        className={cn('ek-modal-card', sizeClass, className)}
        onClick={onClick}
        disabled={disabled}
      >
        {body}
      </button>
    );
  }

  return <div className={cn('ek-modal-card', sizeClass, className)}>{body}</div>;
}
