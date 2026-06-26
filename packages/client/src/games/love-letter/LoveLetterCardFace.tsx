import type { LoveLetterCard } from 'shared';
import { CARD_BACK_URL, loveLetterCardImage } from './cardMeta';

type Props = {
  card?: LoveLetterCard;
  faceDown?: boolean;
  size?: 'board' | 'hand' | 'tiny' | 'modal';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
  board: 'll-card--board',
  hand: 'll-card--hand',
  tiny: 'll-card--tiny',
  modal: 'll-card--modal',
};

export function LoveLetterCardFace({
  card,
  faceDown = false,
  size = 'board',
  onClick,
  disabled,
  className,
}: Props) {
  const src = faceDown || !card ? CARD_BACK_URL : loveLetterCardImage(card);
  const sizeClass = SIZE_CLASS[size];
  const rootClass = ['ll-card', sizeClass, className].filter(Boolean).join(' ');

  if (onClick) {
    return (
      <button
        type="button"
        className={rootClass}
        onClick={onClick}
        disabled={disabled}
        aria-label={card ? `การ์ด ${card.rank}` : 'การ์ดคว่ำ'}
      >
        <img src={src} alt="" className="ll-card__img" loading="lazy" aria-hidden />
      </button>
    );
  }

  return (
    <div className={rootClass}>
      <img src={src} alt="" className="ll-card__img" loading="lazy" aria-hidden />
    </div>
  );
}
