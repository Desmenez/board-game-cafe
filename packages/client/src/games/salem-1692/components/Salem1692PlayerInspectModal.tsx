import type { Salem1692PublicPlayer, Salem1692TryalCard } from 'shared';
import { Button } from '../../../components/ui';
import { PlayerIdentity } from '../../../components/player-avatar';
import { BLACK_CAT_URL, salem1692CardLabelTh, salem1692PlayingCardImage } from '../lib/cardMeta';
import { Salem1692TryalRow } from './Salem1692TryalRow';

type Props = {
  player: Salem1692PublicPlayer;
  isMe: boolean;
  /** Full tryal faces when inspecting yourself. */
  myTryals?: Salem1692TryalCard[];
  onClose: () => void;
};

export function Salem1692PlayerInspectModal({ player, isMe, myTryals, onClose }: Props) {
  const nameLabel = `${player.name}${isMe ? ' (คุณ)' : ''}`;
  const frontEmpty = player.frontCards.length === 0 && !player.hasBlackCat;
  const tryals = isMe && myTryals ? myTryals : (player.tryals ?? []);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="s1692-inspect-title"
      onClick={onClose}
    >
      <div
        className="modal s1692-select-modal s1692-inspect-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="s1692-select-modal__copy">
          <h2 id="s1692-inspect-title">การ์ดของ {nameLabel}</h2>
          <p>
            การ์ดตรงหน้าเปิดให้ทุกคนเห็น · Tryal ที่ยังไม่เปิดจะหมอบไว้
            {isMe ? ' (คุณเห็นหน้า Tryal ของตัวเอง)' : ''}
          </p>
        </div>

        <div className="s1692-modal-actors" aria-label="ผู้เล่น">
          <div className="s1692-modal-actors__actor">
            <PlayerIdentity
              playerId={player.id}
              name={nameLabel}
              avatarSize={44}
              frontCount={player.frontCards.length + (player.hasBlackCat ? 1 : 0)}
            />
          </div>
        </div>

        <section className="s1692-inspect-modal__section" aria-label="การ์ดตรงหน้า">
          <h3 className="s1692-inspect-modal__heading">การ์ดตรงหน้า</h3>
          {frontEmpty ? (
            <p className="s1692-inspect-modal__empty">ยังไม่มีการ์ดตรงหน้า</p>
          ) : (
            <ul className="s1692-front-panel__row">
              {player.hasBlackCat ? (
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
              {player.frontCards.map((card) => (
                <li key={card.id} className="s1692-front-panel__item">
                  <img
                    src={salem1692PlayingCardImage(card.kind)}
                    alt={salem1692CardLabelTh(card.kind)}
                    className="s1692-front-panel__img"
                    loading="lazy"
                  />
                  <span className="s1692-front-panel__cap">
                    {salem1692CardLabelTh(card.kind)}
                    {card.kind === 'matchmaker' && player.matchmakerPartnerName
                      ? ` · ${player.matchmakerPartnerName}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="s1692-inspect-modal__section" aria-label="Tryal">
          <Salem1692TryalRow tryals={tryals} title="Tryal" ownerView={isMe} size="sm" />
        </section>

        <div className="s1692-select-modal__actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            ปิด
          </Button>
        </div>
      </div>
    </div>
  );
}
