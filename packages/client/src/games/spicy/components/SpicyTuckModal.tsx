import { useState } from 'react';
import type { SpicyCard } from 'shared';
import { GameCardActionModal } from '../../../components/game-shell';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { spicyCardBackUrl, spicyCardFaceUrl, spicyCardLabelTh } from '../art';

type Props = {
  open: boolean;
  hand: SpicyCard[];
  onConfirm: (cardIds: string[]) => void;
};

export function SpicyTuckModal({ open, hand, onConfirm }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const hero = hand[0];

  return (
    <GameCardActionModal
      open={open}
      onOpenChange={() => {}}
      dismissible={false}
      titleId="spicy-tuck-title"
      descriptionId="spicy-tuck-desc"
      title="Change Your Luck"
      description="เลือก 0–2 ใบจากมือเพื่อสอดใต้ใบ 5 (ใบที่สอดจะไม่ถูกท้า)"
      cardSrc={hero ? spicyCardFaceUrl(hero) : spicyCardBackUrl()}
      cardAlt={hero ? spicyCardLabelTh(hero) : 'มือ'}
      cardAspectRatio="331 / 514"
      meta={`เลือกได้สูงสุด 2 · ตอนนี้ ${selected.length}`}
      footer={
        <Button
          type="button"
          onClick={() => {
            onConfirm(selected);
            setSelected([]);
          }}
        >
          ยืนยันสอด ({selected.length})
        </Button>
      }
    >
      <div className="spicy-tuck-grid" role="group" aria-label="เลือกการ์ดสอด">
        {hand.map((c) => {
          const on = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className={cn('spicy-tuck-pick', on && 'spicy-tuck-pick--on')}
              onClick={() => {
                setSelected((prev) => {
                  if (prev.includes(c.id)) return prev.filter((x) => x !== c.id);
                  if (prev.length >= 2) return prev;
                  return [...prev, c.id];
                });
              }}
            >
              <img src={spicyCardFaceUrl(c)} alt={spicyCardLabelTh(c)} />
            </button>
          );
        })}
      </div>
    </GameCardActionModal>
  );
}
