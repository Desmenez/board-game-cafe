import { useEffect, useState } from 'react';
import type { ExplodingKittensAction, ExplodingKittensPlayerView } from 'shared';
import { Button } from '../../../components/ui';
import { CARD_IMAGE, CARD_LABEL } from '../lib/cardMeta';

type BarkingExchangePrompt = NonNullable<ExplodingKittensPlayerView['barkingExchangePrompt']>;

type Props = {
  gs: ExplodingKittensPlayerView;
  myId: string;
  barkingExchangePrompt: BarkingExchangePrompt;
  sendAction: (action: ExplodingKittensAction) => void;
};

export function EkBarkingExchangeModal({
  gs,
  myId,
  barkingExchangePrompt,
  sendAction,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [
    barkingExchangePrompt.stage,
    barkingExchangePrompt.actorId,
    barkingExchangePrompt.targetId,
    barkingExchangePrompt.giveCount,
  ]);

  const isMyPick =
    (barkingExchangePrompt.stage === 'target_pick' &&
      myId === barkingExchangePrompt.targetId) ||
    (barkingExchangePrompt.stage === 'actor_return' &&
      myId === barkingExchangePrompt.actorId);

  const isWaiting =
    (barkingExchangePrompt.stage === 'target_pick' &&
      myId !== barkingExchangePrompt.targetId) ||
    (barkingExchangePrompt.stage === 'actor_return' &&
      myId !== barkingExchangePrompt.actorId);

  return (
    <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
      <div className="modal ek-multi-card-modal">
        <h2>
          {barkingExchangePrompt.stage === 'target_pick'
            ? `Barking Kittens — เลือกมอบ ${barkingExchangePrompt.giveCount} ใบ`
            : `Barking Kittens — เลือกคืน ${barkingExchangePrompt.giveCount} ใบ`}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
          {barkingExchangePrompt.stage === 'target_pick' ? (
            <>
              มอบ <strong>{barkingExchangePrompt.giveCount}</strong> ใบจากมือให้{' '}
              <strong>{barkingExchangePrompt.actorName}</strong> (ครึ่งมือของเป้าหมาย ปัดขึ้น)
            </>
          ) : (
            <>
              เลือกคืน <strong>{barkingExchangePrompt.giveCount}</strong> ใบให้{' '}
              <strong>{barkingExchangePrompt.targetName}</strong> — การ์ดใบไหนก็ได้ในมือคุณ
            </>
          )}
        </p>
        {isMyPick && (
          <>
            <p className="ek-hovered-card-name" style={{ marginBottom: 8 }}>
              เลือกแล้ว {selectedIds.length}/{barkingExchangePrompt.giveCount} ใบ
            </p>
            <div className="ek-modal-card-grid ek-modal-card-grid--dense ek-favor-give-grid">
              {gs.myHand.map((c) => {
                const sel = selectedIds.includes(c.id);
                return (
                  <Button
                    key={c.id}
                    variant={sel ? 'primary' : 'ghost'}
                    className="ek-modal-card-pick-btn"
                    onClick={() => {
                      const max = barkingExchangePrompt.giveCount;
                      setSelectedIds((prev) => {
                        if (prev.includes(c.id)) return prev.filter((x) => x !== c.id);
                        if (prev.length >= max) return prev;
                        return [...prev, c.id];
                      });
                    }}
                  >
                    <div className="ek-modal-card-preview">
                      <img
                        src={CARD_IMAGE[c.type]}
                        alt=""
                        className="ek-card-img"
                        loading="lazy"
                        aria-hidden
                      />
                    </div>
                    <div className="ek-card-caption">{CARD_LABEL[c.type]}</div>
                  </Button>
                );
              })}
            </div>
            <Button
              variant="primary"
              block
              style={{ marginTop: 12 }}
              disabled={selectedIds.length !== barkingExchangePrompt.giveCount}
              onClick={() => {
                if (barkingExchangePrompt.stage === 'target_pick') {
                  sendAction({
                    type: 'barking_exchange_target_give',
                    cardIds: selectedIds,
                  });
                } else {
                  sendAction({
                    type: 'barking_exchange_actor_return',
                    cardIds: selectedIds,
                  });
                }
              }}
            >
              ยืนยัน
            </Button>
          </>
        )}
        {isWaiting && (
          <p style={{ color: 'var(--text-secondary)' }}>รอผู้เล่นอื่นเลือกการ์ด…</p>
        )}
      </div>
    </div>
  );
}
