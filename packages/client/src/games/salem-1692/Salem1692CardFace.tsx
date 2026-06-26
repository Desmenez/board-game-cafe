import type { Salem1692PlayingCard } from 'shared';
import { salem1692CardLabelTh, salem1692PlayingCardImage, CARD_BACK_URL } from './cardMeta';

type Props = {
  card?: Salem1692PlayingCard;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

export function Salem1692CardFace({ card, faceDown, selected, onClick, className }: Props) {
  const src = faceDown || !card ? CARD_BACK_URL : salem1692PlayingCardImage(card.kind);
  const label = card ? salem1692CardLabelTh(card.kind) : '';

  return (
    <button
      type="button"
      className={[
        's1692-card',
        onClick ? 's1692-card--selectable' : '',
        selected ? 's1692-card--selected' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      disabled={!onClick}
      aria-label={label || 'การ์ด'}
    >
      <img src={src} alt="" className="s1692-card__img" />
      {card && !faceDown && <span className="s1692-card__label">{label}</span>}
    </button>
  );
}
