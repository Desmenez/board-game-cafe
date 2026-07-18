import type { Salem1692TryalCard, Salem1692TryalKind } from 'shared';
import { Eye } from 'lucide-react';
import { salem1692TryalImage, salem1692TryalLabelTh, TRYAL_BACK_URL } from '../lib/cardMeta';

export type Salem1692TryalView = {
  id: string;
  revealed: boolean;
  /** Required when `ownerView` or `revealed`. */
  kind?: Salem1692TryalKind | null;
};

type Props = {
  tryals: readonly (Salem1692TryalCard | Salem1692TryalView)[];
  title?: string;
  /** Owner always sees faces; `revealed` only marks public revelation. */
  ownerView?: boolean;
  /** `sm` = compact (role reveal); `md` = larger board strip. */
  size?: 'sm' | 'md';
  /** When set, unrevealed cards become buttons (e.g. Night Confess). */
  onSelectUnrevealed?: (tryalId: string) => void;
  /** Highlight the selected face-down Tryal (with onSelectUnrevealed). */
  selectedTryalId?: string | null;
};

export function Salem1692TryalRow({
  tryals,
  title,
  ownerView = false,
  size = 'md',
  onSelectUnrevealed,
  selectedTryalId = null,
}: Props) {
  return (
    <section
      className={['s1692-panel', 's1692-tryal-panel', size === 'sm' ? 's1692-tryal-panel--sm' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label={title ?? 'Tryal'}
    >
      {title && <h3 className="s1692-tryal-panel__title">{title}</h3>}
      <div className="s1692-tryal-row">
        {tryals.map((t) => {
          const kind = t.kind ?? null;
          const showFace = Boolean((ownerView || t.revealed) && kind);
          const isRevealed = t.revealed;
          const selectable = Boolean(onSelectUnrevealed && !isRevealed);
          const selected = selectable && selectedTryalId === t.id;
          const className = [
            's1692-card',
            size === 'sm' ? 's1692-card--tryal-sm' : 's1692-card--tryal',
            isRevealed ? 's1692-card--revealed' : '',
            selectable ? 's1692-card--selectable' : '',
            selected ? 's1692-card--selected' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const titleText = isRevealed
            ? `${showFace && kind ? salem1692TryalLabelTh(kind) : 'Tryal'} — เปิดแล้ว`
            : showFace && kind
              ? salem1692TryalLabelTh(kind)
              : selectable
                ? selected
                  ? 'Tryal ที่เลือก'
                  : 'แตะเพื่อเลือก'
                : 'Tryal';

          const body = (
            <>
              <img
                src={showFace && kind ? salem1692TryalImage(kind) : TRYAL_BACK_URL}
                alt=""
                className="s1692-card__img"
              />
              {showFace && kind ? (
                <span className="s1692-card__label">{salem1692TryalLabelTh(kind)}</span>
              ) : null}
              {isRevealed ? (
                <div className="s1692-card__revealed-overlay" aria-hidden>
                  <Eye
                    size={size === 'sm' ? 16 : 22}
                    strokeWidth={2.25}
                    className="s1692-card__revealed-icon"
                  />
                  <span className="s1692-card__revealed-text">เปิดแล้ว</span>
                </div>
              ) : null}
            </>
          );

          if (selectable && onSelectUnrevealed) {
            return (
              <button
                key={t.id}
                type="button"
                className={className}
                title={titleText}
                onClick={() => onSelectUnrevealed(t.id)}
              >
                {body}
              </button>
            );
          }

          return (
            <div key={t.id} className={className} title={titleText}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
