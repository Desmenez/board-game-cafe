import type { Salem1692TryalCard } from 'shared';
import { salem1692TryalImage, salem1692TryalLabelTh, CARD_BACK_URL } from './cardMeta';

type Props = {
  tryals: Salem1692TryalCard[];
  title?: string;
};

export function Salem1692TryalRow({ tryals, title }: Props) {
  return (
    <section className="s1692-panel" aria-label={title ?? 'Tryal'}>
      {title && <h3 style={{ marginTop: 0 }}>{title}</h3>}
      <div className="s1692-tryal-row">
        {tryals.map((t) => (
          <div key={t.id} className="s1692-card" title={t.revealed ? salem1692TryalLabelTh(t.kind) : 'Tryal'}>
            <img
              src={t.revealed ? salem1692TryalImage(t.kind) : CARD_BACK_URL}
              alt=""
              className="s1692-card__img"
            />
            {t.revealed && <span className="s1692-card__label">{salem1692TryalLabelTh(t.kind)}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
