import type { LoveLetterCard } from 'shared';
import { Button } from '../../../components/ui';
import { CARD_IMAGE, roleLabel } from '../lib/cardMeta';
import { LoveLetterCardFace } from './LoveLetterCardFace';

type Props = {
  targetName: string;
  card: LoveLetterCard;
  onAck: () => void;
};

export function LoveLetterPriestPeekModal({ targetName, card, onAck }: Props) {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ll-peek-title"
    >
      <div className="modal ll-modal-shell ll-select-modal ll-modal-shell--wide">
        <div className="ll-select-modal__hero">
          <div className="ll-select-modal__card-wrap">
            <img
              src={CARD_IMAGE.priest}
              alt={roleLabel('priest')}
              className="ll-select-modal__card"
              width={440}
              height={600}
            />
          </div>
          <div className="ll-select-modal__copy">
            <h2 id="ll-peek-title" className="ll-modal-shell__title">
              Priest — แอบดูมือ
            </h2>
            <p className="ll-select-modal__hint">
              คุณเห็นการ์ดในมือของ {targetName} (ความลับ — อย่าเปิดเผย)
            </p>
            <p className="ll-select-modal__meta">เป้าหมาย: {targetName}</p>
          </div>
        </div>

        <div className="ll-priest-peek__reveal">
          <LoveLetterCardFace card={card} size="modal" />
          <p className="ll-priest-peek__label m-0">{roleLabel(card.role)}</p>
        </div>

        <div className="ll-modal-shell__footer">
          <Button type="button" onClick={onAck} className="w-full">
            ตกลง
          </Button>
        </div>
      </div>
    </div>
  );
}
