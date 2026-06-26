import type { SushiGoCard } from 'shared';
import { sushiGoMakiIcons } from 'shared';
import { CARD_BACK_URL, sushiGoCardImage, sushiGoCardLabelTh } from './cardMeta';

type Props = {
  card?: SushiGoCard;
  faceDown?: boolean;
  size?: 'board' | 'hand' | 'tiny';
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
  board: 'sg-card--board',
  hand: 'sg-card--hand',
  tiny: 'sg-card--tiny',
};

export function SushiGoCardFace({
  card,
  faceDown = false,
  size = 'board',
  onClick,
  disabled,
  selected,
  className,
}: Props) {
  const src = faceDown || !card ? CARD_BACK_URL : sushiGoCardImage(card.kind);
  const makiIcons = card && !faceDown ? sushiGoMakiIcons(card.kind) : 0;
  const rootClass = [
    'sg-card',
    SIZE_CLASS[size],
    selected ? 'sg-card--selected' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const label = card ? sushiGoCardLabelTh(card.kind) : 'การ์ดคว่ำ';

  const inner = (
    <>
      <img src={src} alt="" className="sg-card__img" loading="lazy" aria-hidden />
      {makiIcons > 0 ? (
        <span className="sr-only">{makiIcons} maki icons</span>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={rootClass}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={selected}
      >
        {inner}
      </button>
    );
  }

  return <div className={rootClass}>{inner}</div>;
}
