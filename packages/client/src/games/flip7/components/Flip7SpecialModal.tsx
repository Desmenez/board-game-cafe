import { PlayerAvatar } from '../../../components/player-avatar';
import { Button, GameCardImage } from '../../../components/ui';
import { cardImage, cardLabel, specialCardDescription, type Flip7SpecialUi } from '../lib/flip7Ui';

type Props = {
  overlay: Flip7SpecialUi;
  onClose: () => void;
};

export function Flip7SpecialModal({ overlay, onClose }: Props) {
  return (
    <div className="modal-overlay f7-special-overlay" role="dialog" aria-modal>
      <div className="modal f7-special-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-center f7-special-modal__title">
          {overlay.titleOverride
            ? overlay.titleOverride
            : specialCardDescription(overlay.card).title}
        </h2>
        <p className="f7-special-modal__who">
          <span className="f7-inline-who">
            <PlayerAvatar
              playerId={overlay.playerId}
              name={overlay.playerName}
              size={28}
              decorative
              className="f7-player-avatar"
            />
            <strong>{overlay.playerName}</strong>
          </span>{' '}
          จั่วได้การ์ดพิเศษ
        </p>
        <div className="f7-special-modal__card">
          <GameCardImage
            src={cardImage(overlay.card)}
            alt={cardLabel(overlay.card)}
            width={180}
            aspectRatio={469 / 768}
            showZoom={false}
          />
        </div>
        <p className="f7-special-modal__body">{specialCardDescription(overlay.card).body}</p>
        <Button type="button" block className="f7-special-modal__close" onClick={onClose}>
          ปิด
        </Button>
      </div>
    </div>
  );
}
