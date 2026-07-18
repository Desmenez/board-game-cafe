import { Trophy } from 'lucide-react';
import { PlayerAvatar } from '../../../components/player-avatar';
import { Button } from '../../../components/ui';

export type Flip7RoundWinModalState = {
  id: number;
  winners: Array<{ id: string; name: string; roundPoints: number }>;
};

type Props = {
  modal: Flip7RoundWinModalState;
  onClose: () => void;
};

export function Flip7RoundWinModal({ modal, onClose }: Props) {
  return (
    <div
      key={modal.id}
      className="modal-overlay f7-flip7-round-win-overlay f7-flip7-round-win-overlay--celebrate"
      role="dialog"
      aria-modal
    >
      <div
        className="modal f7-flip7-round-win-modal f7-flip7-round-win-modal--celebrate"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="f7-flip7-round-win__header">
          <Trophy className="f7-flip7-round-win__trophy" aria-hidden strokeWidth={1.65} size={52} />
          <h2 className="f7-flip7-round-win__title">Flip 7 สำเร็จ!</h2>
          <span className="f7-flip7-round-win__badge">LUCKY 7</span>
        </div>
        <p className="f7-flip7-round-win__lead">ผู้เล่นที่ทำ Flip 7 และแต้มที่ได้ในรอบนี้</p>
        <div className="f7-flip7-round-win__list">
          {modal.winners.map((w) => (
            <div key={w.id} className="f7-flip7-round-win__row">
              <span className="f7-flip7-round-win__who">
                <PlayerAvatar
                  playerId={w.id}
                  name={w.name}
                  size={32}
                  decorative
                  className="f7-player-avatar"
                />
                <span className="f7-flip7-round-win__name">{w.name}</span>
              </span>
              <span className="f7-flip7-round-win__pts">{w.roundPoints} แต้ม</span>
            </div>
          ))}
        </div>
        <Button type="button" variant="success" block onClick={onClose}>
          ปิด
        </Button>
      </div>
    </div>
  );
}
