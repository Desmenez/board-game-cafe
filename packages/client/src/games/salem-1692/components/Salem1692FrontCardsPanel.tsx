import type { Salem1692PlayingCard } from 'shared';
import { BLACK_CAT_URL, salem1692CardLabelTh, salem1692PlayingCardImage } from '../lib/cardMeta';

type Props = {
  frontCards: Salem1692PlayingCard[];
  hasBlackCat: boolean;
  matchmakerPartnerName: string | null;
  accusationPoints: number;
};

export function Salem1692FrontCardsPanel({
  frontCards,
  hasBlackCat,
  matchmakerPartnerName,
  accusationPoints,
}: Props) {
  const empty = frontCards.length === 0 && !hasBlackCat;

  return (
    <section className="card s1692-front-panel" aria-label="การ์ดตรงหน้าคุณ">
      <div className="s1692-front-panel__head">
        <h2 className="s1692-section-title">การ์ดตรงหน้าคุณ</h2>
        <p className="s1692-section-desc">
          Accusation {accusationPoints} แต้ม
          {matchmakerPartnerName ? ` · Matchmaker เชื่อมกับ ${matchmakerPartnerName}` : ''}
        </p>
      </div>

      {empty ? (
        <p className="s1692-front-panel__empty">ยังไม่มีการ์ดตรงหน้า</p>
      ) : (
        <ul className="s1692-front-panel__row">
          {hasBlackCat ? (
            <li className="s1692-front-panel__item">
              <img
                src={BLACK_CAT_URL}
                alt="Black Cat"
                className="s1692-front-panel__img"
                width={722}
                height={1130}
              />
              <span className="s1692-front-panel__cap">Black Cat</span>
            </li>
          ) : null}
          {frontCards.map((card) => (
            <li key={card.id} className="s1692-front-panel__item">
              <img
                src={salem1692PlayingCardImage(card.kind)}
                alt={salem1692CardLabelTh(card.kind)}
                className="s1692-front-panel__img"
                loading="lazy"
              />
              <span className="s1692-front-panel__cap">
                {salem1692CardLabelTh(card.kind)}
                {card.kind === 'matchmaker' && matchmakerPartnerName
                  ? ` · ${matchmakerPartnerName}`
                  : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
