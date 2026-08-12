import { useState } from 'react';
import { PlayerAvatar } from '../../../components/player-avatar';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';

export type SkullBidLeader = {
  id: string;
  name: string;
};

type Props = {
  mode: 'open' | 'raise';
  minBid: number;
  maxBid: number;
  currentBid: number;
  /** Current highest bidder (raise phase). */
  leader?: SkullBidLeader | null;
  /** Whose turn to respond (raise phase). */
  activePlayerName?: string | null;
  /** Show +/- / bid / pass. */
  canAct: boolean;
  canPass?: boolean;
  mustBid?: boolean;
  myId?: string;
  onBid: (amount: number) => void;
  onPass?: () => void;
};

export function SkullBidControls({
  mode,
  minBid,
  maxBid,
  currentBid,
  leader,
  activePlayerName,
  canAct,
  canPass,
  mustBid,
  myId,
  onBid,
  onPass,
}: Props) {
  const initial = Math.min(Math.max(minBid, 1), Math.max(maxBid, 1));
  const [amount, setAmount] = useState(initial);

  const clamped = Math.min(Math.max(amount, minBid), maxBid);
  const canBid = canAct && maxBid >= minBid && minBid >= 1 && clamped >= minBid && clamped <= maxBid;
  const leaderIsMe = Boolean(leader && myId && leader.id === myId);

  return (
    <div className={cn('card skull-bid-card', mode === 'raise' && 'skull-bid-card--raise')}>
      <div className="skull-bid-card__head">
        <div className="skull-bid-card__titles">
          <h2 className="skull-panel-title">
            {mode === 'open' ? 'เปิดบิด' : 'ประมูล'}
          </h2>
          {mode === 'raise' && activePlayerName && !canAct ? (
            <p className="skull-panel-sub skull-bid-card__turn">
              ตาของ {activePlayerName}
            </p>
          ) : null}
          {mustBid ? (
            <p className="skull-panel-sub">มือว่าง — ต้องเปิดบิด</p>
          ) : null}
          {mode === 'open' && canAct && !mustBid ? (
            <p className="skull-panel-sub">เลือกจำนวนแล้วเปิดบิด</p>
          ) : null}
          {mode === 'raise' && canAct ? (
            <p className="skull-panel-sub">ยกระดับหรือผ่าน</p>
          ) : null}
        </div>

        {mode === 'raise' ? (
          <div className="skull-bid-hero" aria-live="polite">
            <span className="skull-bid-hero__label">บิดสูงสุด</span>
            <span className="skull-bid-hero__value">{currentBid}</span>
          </div>
        ) : null}
      </div>

      {mode === 'raise' && leader ? (
        <div
          className={cn('skull-bid-leader', leaderIsMe && 'skull-bid-leader--me')}
          aria-label={`บิดสูงสุดโดย ${leader.name}`}
        >
          <PlayerAvatar
            playerId={leader.id}
            name={leader.name}
            size={40}
            className="skull-bid-leader__avatar"
          />
          <div className="skull-bid-leader__meta">
            <span className="skull-bid-leader__tag">บิดสูงสุด</span>
            <span className="skull-bid-leader__name">
              {leaderIsMe ? `${leader.name} (คุณ)` : leader.name}
            </span>
          </div>
        </div>
      ) : null}

      {canAct ? (
        <>
          <div className="skull-bid-row">
            <Button
              type="button"
              variant="secondary"
              disabled={clamped <= minBid}
              onClick={() => setAmount((a) => Math.max(minBid, a - 1))}
              aria-label="ลดจำนวนบิด"
            >
              −
            </Button>
            <span className="skull-bid-value" aria-live="polite">
              {clamped}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={clamped >= maxBid}
              onClick={() => setAmount((a) => Math.min(maxBid, a + 1))}
              aria-label="เพิ่มจำนวนบิด"
            >
              +
            </Button>
          </div>

          <div className="skull-bid-actions">
            <Button type="button" disabled={!canBid} onClick={() => onBid(clamped)}>
              {mode === 'open' ? `เปิดบิด ${clamped}` : `บิด ${clamped}`}
            </Button>
            {canPass && onPass ? (
              <Button type="button" variant="secondary" onClick={onPass}>
                ผ่าน
              </Button>
            ) : null}
          </div>
        </>
      ) : mode === 'raise' ? (
        <p className="skull-bid-waiting" role="status">
          {activePlayerName
            ? `รอ ${activePlayerName} ยกระดับหรือผ่าน…`
            : 'รอผู้เล่นอื่นตัดสินใจ…'}
        </p>
      ) : null}
    </div>
  );
}
