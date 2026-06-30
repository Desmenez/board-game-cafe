import type { SplendorCardView } from 'shared';
import { splendorDeckBackUrl, splendorDevCardImageUrl, SPLENDOR_NOBLE_BACK } from './cardMeta';

type Props = {
  card?: SplendorCardView;
  level?: 1 | 2 | 3;
  faceDown?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** tiny stack on player strip */
  size?: 'board' | 'hand' | 'tiny' | 'stack' | 'modal';
};

function joinClass(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

export function SplendorCardFace({
  card,
  level = 1,
  faceDown = false,
  className,
  onClick,
  disabled,
  size = 'board',
}: Props) {
  const src = faceDown
    ? level
      ? splendorDeckBackUrl(level)
      : SPLENDOR_NOBLE_BACK
    : card
      ? splendorDevCardImageUrl(card.artKey)
      : '';

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={joinClass(
        'splendor-card-face',
        `splendor-card-face--${size}`,
        faceDown && 'splendor-card-face--back',
        onClick && 'splendor-card-face--clickable',
        className,
      )}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={card && !faceDown ? `การ์ดระดับ ${card.level}` : 'การ์ดคว่ำ'}
    >
      {src ? (
        <img src={src} alt="" className="splendor-card-face__img" loading="lazy" aria-hidden />
      ) : null}
    </Tag>
  );
}
