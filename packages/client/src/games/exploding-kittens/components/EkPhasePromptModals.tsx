import { useEffect, useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import type { ComponentProps } from 'react';
import { DndContext } from '@dnd-kit/core';
import type { ExplodingKittensAction, ExplodingKittensPlayerView } from 'shared';
import { Button, Input, Slider } from '../../../components/ui';
import { CARD_IMAGE, CARD_LABEL } from '../lib/cardMeta';
import { EkModalCard } from './EkModalCard';
import { EkModalShell } from './EkModalShell';
import { EkDrawOrderHint } from './EkDrawOrderHint';
import { EkTopThreeModal } from './EkTopThreeModal';

type Props = {
  gs: ExplodingKittensPlayerView;
  myId: string;
  sendAction: (action: ExplodingKittensAction) => void;
  alterOrder: number[];
  alterFutureDndSensors: NonNullable<ComponentProps<typeof DndContext>['sensors']>;
  onAlterFutureDragEnd: (event: DragEndEvent) => void;
};

export function EkPhasePromptModals({
  gs,
  myId,
  sendAction,
  alterOrder,
  alterFutureDndSensors,
  onAlterFutureDragEnd,
}: Props) {
  /** ตำแหน่งแบบ 1-based: 1 = บนสุด, drawPileCount+1 = ล่างสุด — ส่งเซิร์ฟเวอร์เป็น index 0-based */
  const [defuseInsertSlot, setDefuseInsertSlot] = useState(1);

  useEffect(() => {
    if (gs.phase !== 'defuse_reinsert' && gs.phase !== 'bury_reinsert') return;
    const maxSlot = gs.drawPileCount + 1;
    setDefuseInsertSlot((prev) => Math.max(1, Math.min(prev, maxSlot)));
  }, [gs.phase, gs.drawPileCount]);

  return (
    <>
      {gs.phase === 'potluck' && gs.potluckCurrentPlayerId === myId && (
        <EkModalShell
          layout="wide"
          title="Potluck — เลือกการ์ด 1 ใบวางบนกองจั่ว"
          media={<EkModalCard size="hero" cardType="potluck" />}
          mediaCompact
          actors={{
            from: {
              id: myId,
              name: gs.players.find((p) => p.id === myId)?.name ?? 'คุณ',
              role: 'ผู้วางการ์ด',
            },
          }}
          actionLine={{
            label: 'แอ็กชัน',
            value: 'วางจากมือบนสุดของกองจั่ว (ตามลำดับรอบโต๊ะ)',
          }}
        >
          <div className="ek-modal-pick-scroll">
            <div className="ek-modal-card-grid ek-modal-card-grid--4">
              {gs.myHand.map((c) => (
                <EkModalCard
                  key={c.id}
                  size="grid"
                  cardType={c.type}
                  onClick={() => sendAction({ type: 'potluck_contribute', cardId: c.id })}
                />
              ))}
            </div>
          </div>
        </EkModalShell>
      )}

      {gs.phase === 'garbage_collection' && gs.garbagePrompt && (
        <EkModalShell
          layout="wide"
          title="Garbage Collection — เลือกการ์ด 1 ใบใส่กองจั่ว"
          media={<EkModalCard size="hero" cardType="garbage_collection" />}
          mediaCompact
          actors={{
            from: {
              id: myId,
              name: gs.players.find((p) => p.id === myId)?.name ?? 'คุณ',
              role: 'ผู้ทิ้งลงกอง',
            },
          }}
          actionLine={{
            label: 'แอ็กชัน',
            value: 'ทุกคนเลือก 1 ใบจากมือ — สับเข้ากองจั่ว',
          }}
        >
          <div className="ek-modal-pick-scroll">
            <div className="ek-modal-card-grid ek-modal-card-grid--4">
              {gs.myHand.map((c) => (
                <EkModalCard
                  key={c.id}
                  size="grid"
                  cardType={c.type}
                  onClick={() => sendAction({ type: 'garbage_contribute', cardId: c.id })}
                />
              ))}
            </div>
          </div>
        </EkModalShell>
      )}

      {(gs.phase === 'defuse_reinsert' || gs.phase === 'bury_reinsert') &&
        gs.defusePrompt?.playerId === myId && (
          <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
            <div
              className="modal ek-modal-shell ek-deck-reinsert-modal"
              aria-labelledby="ek-deck-reinsert-title"
            >
              <h2 id="ek-deck-reinsert-title" className="ek-modal-shell__title">
                {gs.phase === 'bury_reinsert'
                  ? 'Bury — ฝังการ์ดกลับกอง'
                  : 'Defuse — ใส่ระเบิดกลับกอง'}
              </h2>
              <p className="ek-modal-shell__hint">1 = บนสุด · {gs.drawPileCount + 1} = ล่างสุด</p>

              {gs.phase === 'bury_reinsert' && gs.buryReinsertCardType != null ? (
                <div className="ek-modal-shell__media ek-modal-shell__media--compact">
                  <EkModalCard size="hero" cardType={gs.buryReinsertCardType} />
                </div>
              ) : gs.phase === 'defuse_reinsert' ? (
                <div className="ek-modal-shell__media ek-modal-shell__media--compact">
                  <EkModalCard size="hero" cardType="exploding_kitten" />
                </div>
              ) : null}

              <EkDrawOrderHint
                players={gs.players}
                fromPlayerId={myId}
                myId={myId}
                insertSlot={defuseInsertSlot}
              />

              <div className="ek-deck-reinsert-controls">
                <Slider
                  label="ตำแหน่งในกอง"
                  valueLabel={String(defuseInsertSlot)}
                  min={1}
                  max={gs.drawPileCount + 1}
                  value={defuseInsertSlot}
                  onChange={(e) => setDefuseInsertSlot(Number(e.target.value))}
                />
                <div className="ek-deck-reinsert-controls__row">
                  <span className="ek-deck-reinsert-controls__label">ตำแหน่ง</span>
                  <Input
                    id="defuse-index-input"
                    aria-label="ตำแหน่ง"
                    className="ek-deck-reinsert-controls__input"
                    type="number"
                    min={1}
                    max={gs.drawPileCount + 1}
                    value={defuseInsertSlot}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (Number.isNaN(next)) return;
                      setDefuseInsertSlot(Math.max(1, Math.min(next, gs.drawPileCount + 1)));
                    }}
                  />
                  <Button
                    onClick={() =>
                      sendAction(
                        gs.phase === 'bury_reinsert'
                          ? { type: 'bury_reinsert', index: defuseInsertSlot - 1 }
                          : { type: 'defuse_reinsert', index: defuseInsertSlot - 1 },
                      )
                    }
                  >
                    ยืนยันตำแหน่ง
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {gs.phase === 'alter_future_reorder' && gs.alterFuturePrompt?.playerId === myId && (
        <EkTopThreeModal
          mode="alter-the-future"
          title={
            gs.alterFuturePrompt.isShareFuture
              ? 'Share the Future'
              : gs.alterFuturePrompt.topCards.length > 3
                ? 'Alter the Future 5x'
                : 'Alter the Future'
          }
          top3={gs.alterFuturePrompt.topCards}
          alterOrder={alterOrder}
          cardVisuals={{ label: CARD_LABEL, image: CARD_IMAGE }}
          sensors={alterFutureDndSensors}
          onDragEnd={onAlterFutureDragEnd}
          onConfirm={() => sendAction({ type: 'alter_future_reorder', order: alterOrder })}
          actor={{
            id: myId,
            name: gs.players.find((p) => p.id === myId)?.name ?? 'คุณ',
            role: 'ผู้จัดกอง',
          }}
        />
      )}

      {gs.phase === 'defuse_prompt' && gs.defusePrompt?.playerId === myId && (
        <div
          className="modal-overlay ek-reaction-overlay ek-defuse-danger-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ek-defuse-danger-title"
        >
          <div className="modal ek-defuse-danger-modal">
            <p className="ek-defuse-danger-kicker">
              {gs.defusePrompt.isBarkingDetonation
                ? 'Barking Kitten — ตัดสินใจเดี๋ยวนี้'
                : 'การ์ดระเบิด — ตัดสินใจเดี๋ยวนี้'}
            </p>
            <h3 id="ek-defuse-danger-title" className="ek-defuse-danger-title">
              คุณมี Defuse — กดเพื่อใช้
            </h3>
            <p className="ek-defuse-danger-body">
              {gs.defusePrompt.isBarkingDetonation
                ? 'ใช้ Defuse เพื่อรอดจาก Barking Kitten (ไม่ต้องวาง Exploding Kitten กลับกอง)'
                : 'หลังใช้ Defuse คุณจะเลือกตำแหน่งวาง Exploding Kitten กลับเข้ากองได้'}
            </p>
            <Button variant="success" block onClick={() => sendAction({ type: 'use_defuse' })}>
              ใช้ Defuse
            </Button>
          </div>
        </div>
      )}

      {gs.phase === 'five_cats_pick_discard' && gs.fiveCatsPrompt?.pickerId === myId && (
        <EkModalShell
          layout="wide"
          title="เลือกการ์ดจากกองทิ้ง"
          actors={{
            from: {
              id: myId,
              name: gs.players.find((p) => p.id === myId)?.name ?? 'คุณ',
              role: 'ผู้หยิบ',
            },
          }}
          actionLine={{ label: 'แอ็กชัน', value: 'คอมโบ 5 แมว — เลือก 1 ใบจากกองทิ้ง' }}
        >
          {gs.discardCards.length === 0 ? (
            <p className="ek-modal-shell__hint">กองทิ้งว่าง — ยังหยิบไม่ได้</p>
          ) : (
            <div className="ek-modal-pick-scroll">
              <div className="ek-modal-card-grid ek-modal-card-grid--4">
                {gs.discardCards.map((card, i) => (
                  <EkModalCard
                    key={`pick-discard-${card.id}`}
                    size="grid"
                    cardType={card.type}
                    caption={`#${i + 1} ${CARD_LABEL[card.type]}`}
                    onClick={() =>
                      sendAction({ type: 'five_cats_pick_discard', discardCardId: card.id })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </EkModalShell>
      )}
    </>
  );
}
