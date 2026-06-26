import type { SplendorNobleView } from 'shared';
import { splendorNobleImageUrl } from './cardMeta';
import { SplendorChip } from './SplendorChip';
import { SPLENDOR_GEMS } from './splendorUtils';

type Props = {
  noble: SplendorNobleView;
  onClick?: () => void;
  selectable?: boolean;
};

export function SplendorNobleTile({ noble, onClick, selectable }: Props) {
  const src = splendorNobleImageUrl(noble.artKey);
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={[
        'splendor-noble-tile',
        selectable ? 'splendor-noble-tile--selectable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      title={noble.name}
      aria-label={noble.name}
    >
      <img src={src} alt="" className="splendor-noble-tile__img" loading="lazy" aria-hidden />
      <span className="splendor-noble-tile__name" aria-hidden>
        {noble.name}
      </span>
      <div className="splendor-noble-tile__reqs" aria-hidden>
        {SPLENDOR_GEMS.map((g) =>
          noble.requires[g] > 0 ? (
            <SplendorChip key={g} kind={g} count={noble.requires[g]} size="xs" />
          ) : null,
        )}
      </div>
    </Tag>
  );
}
