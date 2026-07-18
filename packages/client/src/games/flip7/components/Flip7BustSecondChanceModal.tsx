import type { Flip7Action, Flip7PendingActionView, Flip7PublicPlayer } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { Button, GameCardImage } from '../../../components/ui';
import { cardImage, cardLabel } from '../lib/flip7Ui';

type BustScPending = Extract<Flip7PendingActionView, { mode: 'bust_second_chance' }>;

type Props = {
  pending: BustScPending;
  players: Flip7PublicPlayer[];
  myId: string;
  canAct: boolean;
  sendAction: (action: Flip7Action) => void;
};

export function Flip7BustSecondChanceModal({ pending, players, myId, canAct, sendAction }: Props) {
  const scName = players.find((p) => p.id === pending.playerId)?.name ?? pending.playerId;

  return (
    <div className="modal-overlay f7-bust-sc-overlay" role="dialog" aria-modal>
      <div className="modal f7-bust-modal f7-bust-sc-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-center">เลขซ้ำ</h2>
        <p className="f7-bust-modal__text">
          <span className="f7-inline-who f7-inline-who--center">
            <PlayerAvatar
              playerId={pending.playerId}
              name={scName}
              size={28}
              decorative
              className="f7-player-avatar"
            />
            <strong>{scName}</strong>
          </span>
          {pending.duplicateCard.kind === 'number'
            ? ` จั่วเลข ${pending.duplicateCard.value} ซ้ำ`
            : ''}
        </p>
        <p className="f7-bust-sc-modal__hint">
          คุณมี Second Chance — เลือกใช้เพื่อทิ้งเลขนี้และการ์ด Second Chance หรือยอม Bust
        </p>
        <div className="f7-bust-modal__card">
          <GameCardImage
            src={cardImage(pending.duplicateCard)}
            alt={cardLabel(pending.duplicateCard)}
            width={140}
            aspectRatio={469 / 768}
            showZoom={false}
          />
        </div>
        {pending.playerId === myId && canAct ? (
          <div className="f7-bust-sc-modal__actions">
            <Button
              type="button"
              block
              onClick={() =>
                sendAction({
                  type: 'resolve_bust_second_chance',
                  useSecondChance: true,
                } satisfies Flip7Action)
              }
            >
              ใช้ Second Chance
            </Button>
          </div>
        ) : (
          <p className="f7-hint f7-special-modal__hint">รอผู้เล่นตัดสินใจ…</p>
        )}
      </div>
    </div>
  );
}
