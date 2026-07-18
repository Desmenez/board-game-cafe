import { useEffect, useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import type { ComponentProps } from 'react';
import { DndContext } from '@dnd-kit/core';
import type { ExplodingKittensAction, ExplodingKittensPlayerView } from 'shared';
import { Button, Input, Slider } from '../../../components/ui';
import { CARD_IMAGE, CARD_LABEL } from '../lib/cardMeta';
import { EkTopThreeModal } from './EkTopThreeModal';

type Props = {
  gs: ExplodingKittensPlayerView;
  myId: string;
  sendAction: (action: ExplodingKittensAction) => void;
  alterOrder: [number, number, number];
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
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal ek-multi-card-modal">
            <h2>Potluck — เลือกการ์ด 1 ใบวางบนกองจั่ว</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              วางจากมือของคุณบนสุดของกองจั่ว (ตามลำดับรอบโต๊ะ)
            </p>
            <div className="ek-modal-card-grid ek-modal-card-grid--dense ek-favor-give-grid">
              {gs.myHand.map((c) => (
                <Button
                  key={c.id}
                  variant="ghost"
                  className="ek-modal-card-pick-btn"
                  onClick={() => sendAction({ type: 'potluck_contribute', cardId: c.id })}
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
              ))}
            </div>
          </div>
        </div>
      )}

      {(gs.phase === 'defuse_reinsert' || gs.phase === 'bury_reinsert') &&
        gs.defusePrompt?.playerId === myId && (
          <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
            <div
              className="modal ek-multi-card-modal ek-deck-reinsert-modal"
              aria-labelledby="ek-deck-reinsert-title"
            >
              <h3 id="ek-deck-reinsert-title">
                {gs.phase === 'bury_reinsert'
                  ? 'Bury — เลือกตำแหน่งฝังการ์ดกลับกอง'
                  : 'Defuse สำเร็จ — ใส่ Exploding Kitten กลับกอง'}
              </h3>
              <p className="ek-see-future-modal-hint" style={{ marginBottom: 12 }}>
                1 = บนสุดของกองที่จะถูกจั่วก่อน · {gs.drawPileCount + 1} = ล่างสุด —
                ยืนยันแล้วจบเทิร์น
              </p>
              {gs.phase === 'bury_reinsert' && gs.buryReinsertCardType != null && (
                <div className="ek-deck-reinsert-card-preview">
                  <p className="ek-deck-reinsert-card-preview__label">การ์ดที่จะฝัง</p>
                  <div className="ek-modal-card-preview ek-deck-reinsert-card-preview__card">
                    <img
                      src={CARD_IMAGE[gs.buryReinsertCardType]}
                      alt={CARD_LABEL[gs.buryReinsertCardType]}
                      className="ek-card-img"
                      loading="lazy"
                    />
                    <div className="ek-card-caption">{CARD_LABEL[gs.buryReinsertCardType]}</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
                <Slider
                  label="ตำแหน่งในกอง"
                  valueLabel={String(defuseInsertSlot)}
                  min={1}
                  max={gs.drawPileCount + 1}
                  value={defuseInsertSlot}
                  onChange={(e) => setDefuseInsertSlot(Number(e.target.value))}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    ตำแหน่ง
                  </span>
                  <Input
                    id="defuse-index-input"
                    aria-label="ตำแหน่ง"
                    style={{ width: 90 }}
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
          top3={gs.alterFuturePrompt.top3}
          alterOrder={alterOrder}
          cardVisuals={{ label: CARD_LABEL, image: CARD_IMAGE }}
          sensors={alterFutureDndSensors}
          onDragEnd={onAlterFutureDragEnd}
          onConfirm={() => sendAction({ type: 'alter_future_reorder', order: alterOrder })}
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
            <p className="ek-defuse-danger-kicker">การ์ดระเบิด — ตัดสินใจเดี๋ยวนี้</p>
            <h3 id="ek-defuse-danger-title" className="ek-defuse-danger-title">
              คุณมี Defuse — กดเพื่อใช้
            </h3>
            <p className="ek-defuse-danger-body">
              หลังใช้ Defuse คุณจะเลือกตำแหน่งวาง Exploding Kitten กลับเข้ากองได้
            </p>
            <Button variant="success" block onClick={() => sendAction({ type: 'use_defuse' })}>
              ใช้ Defuse
            </Button>
          </div>
        </div>
      )}

      {gs.phase === 'five_cats_pick_discard' && gs.fiveCatsPrompt?.pickerId === myId && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal ek-multi-card-modal">
            <h3>เลือกการ์ดจากกองทิ้ง</h3>
            {gs.discardCards.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>กองทิ้งว่าง — ยังหยิบไม่ได้</p>
            ) : (
              <div className="ek-modal-card-grid ek-modal-card-grid--dense ek-five-cats-pick-grid">
                {gs.discardCards.map((card, i) => (
                  <Button
                    key={`pick-discard-${card.id}`}
                    variant="ghost"
                    className="ek-modal-card-pick-btn"
                    onClick={() =>
                      sendAction({ type: 'five_cats_pick_discard', discardCardId: card.id })
                    }
                  >
                    <div className="ek-modal-card-preview">
                      <img
                        src={CARD_IMAGE[card.type]}
                        alt=""
                        className="ek-card-img"
                        loading="lazy"
                        aria-hidden
                      />
                    </div>
                    <div className="ek-card-caption">
                      เลือก #{i + 1} {CARD_LABEL[card.type]}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
