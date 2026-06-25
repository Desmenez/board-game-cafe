import { FUGITIVE_CARD_BACK, fugitiveCardImageUrl } from './cardMeta';
import './fugitive.css';

export function FugitiveCardFace({
  value,
  faceDown = false,
  escape = false,
  className = '',
}: {
  value?: number;
  faceDown?: boolean;
  escape?: boolean;
  className?: string;
}) {
  const src = faceDown
    ? FUGITIVE_CARD_BACK
    : value !== undefined
      ? fugitiveCardImageUrl(value)
      : '';

  if (!src) {
    return (
      <div
        className={['fugitive-card fugitive-card--face-down', className].filter(Boolean).join(' ')}
        aria-label="Hideout คว่ำ"
      />
    );
  }

  return (
    <div
      className={[
        'fugitive-card',
        faceDown ? 'fugitive-card--face-down' : '',
        escape ? 'fugitive-card--escape' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={
        faceDown ? 'Hideout คว่ำ' : value !== undefined ? `การ์ด ${value}` : 'การ์ด'
      }
    >
      <img src={src} alt="" className="fugitive-card__img" loading="lazy" aria-hidden />
    </div>
  );
}
