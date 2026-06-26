import { type SplendorChipKind, splendorChipImageUrl } from './cardMeta';
import { GEM_SHORT } from './splendorUtils';

type Props = {
  kind: SplendorChipKind;
  count?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
};

function chipLabel(kind: SplendorChipKind): string {
  return kind === 'gold' ? 'ทอง' : GEM_SHORT[kind];
}

export function SplendorChip({ kind, count, size = 'sm', className, title }: Props) {
  const label = title ?? chipLabel(kind);

  return (
    <span
      className={['splendor-chip-img', `splendor-chip-img--${size}`, className]
        .filter(Boolean)
        .join(' ')}
      title={label}
      aria-label={count !== undefined ? `${label} ${count}` : label}
    >
      <img
        src={splendorChipImageUrl(kind)}
        alt=""
        className="splendor-chip-img__art"
        loading="lazy"
        aria-hidden
      />
      {count !== undefined && (
        <span className="splendor-chip-img__count">{count}</span>
      )}
    </span>
  );
}
