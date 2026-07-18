import type { Flip7Card } from 'shared';
import { Skull } from 'lucide-react';
import { PlayerAvatar } from '../../../components/player-avatar';
import { Button, GameCardImage } from '../../../components/ui';
import { cardImage, cardLabel } from '../lib/flip7Ui';

export type Flip7BustModalState = {
  playerId: string;
  playerName: string;
  card: Flip7Card | null;
  id: number;
};

type Props = {
  bust: Flip7BustModalState;
  round: number;
  onClose: () => void;
};

export function Flip7BustModal({ bust, round, onClose }: Props) {
  return (
    <div
      key={`bust-${bust.playerId}-${round}`}
      className="modal-overlay f7-bust-overlay f7-bust-overlay--fatal"
      role="dialog"
      aria-modal
    >
      <div
        className="modal f7-bust-modal f7-bust-modal--fatal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="f7-bust-modal__header f7-bust-modal__header--fatal">
          <Skull className="f7-bust-modal__skull" aria-hidden strokeWidth={1.85} size={52} />
          <h2 className="f7-bust-modal__title f7-bust-modal__title--fatal">เลขซ้ำ — BUST</h2>
          <span className="f7-bust-modal__badge">OUT</span>
        </div>
        <p className="f7-bust-modal__text f7-bust-modal__text--fatal">
          <span className="f7-inline-who f7-inline-who--center">
            <PlayerAvatar
              playerId={bust.playerId}
              name={bust.playerName}
              size={32}
              decorative
              className="f7-player-avatar"
            />
            <strong className="f7-bust-modal__name">{bust.playerName}</strong>
          </span>
          {bust.card?.kind === 'number' ? ` จั่วเลข ${bust.card.value} ซ้ำ` : ' bust จากการ์ดซ้ำ'}
        </p>
        {bust.card ? (
          <div className="f7-bust-modal__card f7-bust-modal__card--fatal">
            <GameCardImage
              src={cardImage(bust.card)}
              alt={cardLabel(bust.card)}
              width={140}
              aspectRatio={469 / 768}
              showZoom={false}
            />
          </div>
        ) : null}
        <Button type="button" variant="danger" block onClick={onClose}>
          ปิด
        </Button>
      </div>
    </div>
  );
}
