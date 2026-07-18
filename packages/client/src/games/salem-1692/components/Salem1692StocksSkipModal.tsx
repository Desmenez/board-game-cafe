import type { Salem1692PendingStocksSkip } from 'shared';
import { Button } from '../../../components/ui';
import { PlayerIdentity } from '../../../components/player-avatar';
import { salem1692PlayingCardImage } from '../lib/cardMeta';

type Props = {
  pending: Salem1692PendingStocksSkip;
  myId: string;
  onAck: () => void;
};

export function Salem1692StocksSkipModal({ pending, myId, onAck }: Props) {
  const isSkipped = pending.playerId === myId;
  const nameLabel = `${pending.playerName}${isSkipped ? ' (คุณ)' : ''}`;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="s1692-stocks-skip-title"
    >
      <div className="modal s1692-select-modal" onClick={(e) => e.stopPropagation()}>
        <div className="s1692-select-modal__hero">
          <div className="s1692-select-modal__card-wrap">
            <img
              src={salem1692PlayingCardImage('stocks')}
              alt="Stocks"
              className="s1692-select-modal__card"
              width={722}
              height={1130}
            />
          </div>
          <div className="s1692-select-modal__copy">
            <h2 id="s1692-stocks-skip-title">ข้ามเทิร์น — Stocks</h2>
            {isSkipped ? (
              <p>
                คุณโดน Stocks — เทิร์นนี้ถูกข้าม การ์ด Stocks 1 ใบจะถูกทิ้งเมื่อคุณกดยอมรับ
                {pending.stocksRemainingAfter > 0
                  ? ` (ยังเหลือ Stocks อีก ${pending.stocksRemainingAfter} ใบสำหรับเทิร์นถัดไป)`
                  : ''}
              </p>
            ) : (
              <p>
                {pending.playerName} โดน Stocks — รอผู้เล่นยอมรับเพื่อข้ามเทิร์น
                {pending.stocksRemainingAfter > 0
                  ? ` (หลังข้ามจะเหลือ Stocks ${pending.stocksRemainingAfter} ใบ)`
                  : ''}
              </p>
            )}
          </div>
        </div>

        <div className="s1692-modal-actors" aria-label="ผู้ถูก Stocks">
          <div className="s1692-modal-actors__actor">
            <span className="s1692-modal-actors__role">ข้ามเทิร์นนี้</span>
            <PlayerIdentity playerId={pending.playerId} name={nameLabel} avatarSize={44} />
          </div>
        </div>

        <div className="s1692-select-modal__actions">
          {isSkipped ? (
            <Button type="button" onClick={onAck}>
              ยอมรับ — ข้ามเทิร์น
            </Button>
          ) : (
            <p className="s1692-select-modal__hint">รอ {pending.playerName} กดยอมรับ…</p>
          )}
        </div>
      </div>
    </div>
  );
}
