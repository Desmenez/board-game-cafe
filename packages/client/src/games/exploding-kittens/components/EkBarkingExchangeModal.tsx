import { useEffect, useState } from 'react';
import type { ExplodingKittensAction, ExplodingKittensPlayerView } from 'shared';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { EkModalCard } from './EkModalCard';
import { EkModalShell } from './EkModalShell';

type BarkingExchangePrompt = NonNullable<ExplodingKittensPlayerView['barkingExchangePrompt']>;

type Props = {
  gs: ExplodingKittensPlayerView;
  myId: string;
  barkingExchangePrompt: BarkingExchangePrompt;
  sendAction: (action: ExplodingKittensAction) => void;
};

export function EkBarkingExchangeModal({ gs, myId, barkingExchangePrompt, sendAction }: Props) {
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
    (barkingExchangePrompt.stage === 'target_pick' && myId === barkingExchangePrompt.targetId) ||
    (barkingExchangePrompt.stage === 'actor_return' && myId === barkingExchangePrompt.actorId);

  const isWaiting =
    (barkingExchangePrompt.stage === 'target_pick' && myId !== barkingExchangePrompt.targetId) ||
    (barkingExchangePrompt.stage === 'actor_return' && myId !== barkingExchangePrompt.actorId);

  const isTargetPick = barkingExchangePrompt.stage === 'target_pick';

  return (
    <EkModalShell
      layout="wide"
      title={
        isTargetPick
          ? `Barking — มอบ ${barkingExchangePrompt.giveCount} ใบ`
          : `Barking — คืน ${barkingExchangePrompt.giveCount} ใบ`
      }
      media={<EkModalCard size="hero" cardType="barking_kitten" />}
      actors={{
        from: {
          id: barkingExchangePrompt.actorId,
          name: barkingExchangePrompt.actorName,
          role: 'ผู้เล่น Barking',
        },
        to: {
          id: barkingExchangePrompt.targetId,
          name: barkingExchangePrompt.targetName,
          role: 'เป้าหมาย',
        },
      }}
      actionLine={{
        label: 'แอ็กชัน',
        value: isTargetPick
          ? `เป้าหมายมอบ ${barkingExchangePrompt.giveCount} ใบให้ผู้เล่น`
          : `ผู้เล่นคืน ${barkingExchangePrompt.giveCount} ใบให้เป้าหมาย`,
      }}
      footer={
        isMyPick ? (
          <Button
            variant="primary"
            disabled={selectedIds.length !== barkingExchangePrompt.giveCount}
            onClick={() => {
              if (isTargetPick) {
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
            ยืนยัน ({selectedIds.length}/{barkingExchangePrompt.giveCount})
          </Button>
        ) : undefined
      }
    >
      {isMyPick ? (
        <>
          <p className="ek-modal-shell__hint">
            เลือกแล้ว {selectedIds.length}/{barkingExchangePrompt.giveCount} ใบ
          </p>
          <div className="ek-modal-pick-scroll">
            <div className="ek-modal-card-grid ek-modal-card-grid--4">
              {gs.myHand.map((c) => {
                const sel = selectedIds.includes(c.id);
                return (
                  <EkModalCard
                    key={c.id}
                    size="grid"
                    cardType={c.type}
                    className={cn(sel && 'ek-modal-card--selected')}
                    onClick={() => {
                      const max = barkingExchangePrompt.giveCount;
                      setSelectedIds((prev) => {
                        if (prev.includes(c.id)) return prev.filter((x) => x !== c.id);
                        if (prev.length >= max) return prev;
                        return [...prev, c.id];
                      });
                    }}
                  />
                );
              })}
            </div>
          </div>
        </>
      ) : null}
      {isWaiting ? <p className="ek-modal-shell__hint">รอผู้เล่นอื่นเลือกการ์ด…</p> : null}
    </EkModalShell>
  );
}
