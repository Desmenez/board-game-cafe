import { useMemo } from 'react';
import type {
  SplendorGem,
  SplendorGems,
  SplendorNobleView,
  SplendorPlayerRowView,
} from 'shared';
import { PlayerHand } from '../../components/player-hand';
import { Button } from '../../components/ui';
import { SplendorCardFace } from './SplendorCardFace';
import { SplendorChip } from './SplendorChip';
import { SplendorNobleTile } from './SplendorNobleTile';
import { SplendorPlayerDropZone } from './SplendorPlayerDropZone';
import { splendorChipImageUrl } from './cardMeta';
import {
  SPLENDOR_PLAYER_DRAG_PREFIX,
  buildPlayerTokenItems,
  type SplendorPlayerTokenItem,
} from './splendorDragUtils';
import {
  GEM_SHORT,
  SPLENDOR_GEMS,
  buildReserveDockSlots,
  canAffordCard,
  costBreakdownText,
  reservedCount,
  sumGems,
  totalHeld,
} from './splendorUtils';

type Props = {
  me: SplendorPlayerRowView;
  canActPlaying: boolean;
  canActReturn: boolean;
  takeDraft: SplendorGem[];
  returnDraft: SplendorGems & { gold: number };
  excess: number;
  dragMessage: string | null;
  selectedReservedId: string | null;
  onConfirmTakeGems: () => void;
  onConfirmReturn: () => void;
  onClearTakeDraft: () => void;
  onSelectReserved: (cardId: string) => void;
  onBuyReserved: () => void;
};

export function SplendorPlayerPanel({
  me,
  canActPlaying,
  canActReturn,
  takeDraft,
  returnDraft,
  excess,
  dragMessage,
  selectedReservedId,
  onConfirmTakeGems,
  onConfirmReturn,
  onClearTakeDraft,
  onSelectReserved,
  onBuyReserved,
}: Props) {
  const heldCount = totalHeld(me.gems, me.gold);
  const returnSum = sumGems(returnDraft) + returnDraft.gold;

  const dockSlots = useMemo(
    () => buildReserveDockSlots(me.reservedSlots),
    [me.reservedSlots],
  );
  const filled = reservedCount(me.reservedSlots);

  const selectedCard = useMemo(() => {
    if (!selectedReservedId) return null;
    for (const slot of dockSlots) {
      if (slot.kind === 'card' && slot.card.id === selectedReservedId) return slot.card;
    }
    return null;
  }, [dockSlots, selectedReservedId]);

  const canBuy =
    canActPlaying &&
    selectedCard !== null &&
    canAffordCard(selectedCard, me.gems, me.gold, me.bonuses);

  const returnTokenItems = useMemo(
    () =>
      canActReturn ? buildPlayerTokenItems(me.gems, me.gold, returnDraft) : [],
    [canActReturn, me.gems, me.gold, returnDraft],
  );

  return (
    <section className="card splendor-player-panel" aria-label="ของคุณ">
      <h2 className="splendor-player-panel__title">ของคุณ</h2>

      <div className="splendor-player-panel__stats">
        <span>{me.prestige} แต้ม</span>
        <span>{heldCount}/10 เม็ด</span>
      </div>

      {!canActReturn && (
        <div className="splendor-player-panel__tokens" aria-label="โทเคนของคุณ">
          {SPLENDOR_GEMS.map((g) =>
            me.gems[g] > 0 ? <SplendorChip key={g} kind={g} count={me.gems[g]} size="sm" /> : null,
          )}
          {me.gold > 0 && <SplendorChip kind="gold" count={me.gold} size="sm" />}
          {heldCount === 0 && <span className="splendor-player-panel__empty">ยังไม่มีโทเคน</span>}
        </div>
      )}

      {takeDraft.length > 0 && (
        <div className="splendor-player-panel__draft" aria-label="กำลังจะหยิบ">
          <span className="splendor-player-panel__draft-label">จะหยิบ:</span>
          {takeDraft.map((g, i) => (
            <SplendorChip key={`${g}-${i}`} kind={g} size="sm" />
          ))}
          {canActPlaying && (
            <Button type="button" size="sm" variant="secondary" onClick={onClearTakeDraft}>
              ล้าง
            </Button>
          )}
        </div>
      )}

      {(dragMessage || canActPlaying) && (
        <p className="splendor-player-panel__message" role="status" aria-live="polite">
          {dragMessage ??
            (canActPlaying
              ? 'ลากจากธนาคารมาที่นี่ · ลากสีเดียวกัน 2 ครั้ง = หยิบ 2 เม็ด'
              : null)}
        </p>
      )}

      {canActPlaying && (
        <SplendorPlayerDropZone active>
          {takeDraft.length > 0 && (
            <div className="splendor-player-panel__actions">
              <Button type="button" variant="primary" onClick={onConfirmTakeGems}>
                ยืนยันหยิบ {takeDraft.length} เม็ด
              </Button>
            </div>
          )}
        </SplendorPlayerDropZone>
      )}

      {canActReturn && (
        <div className="splendor-player-panel__return" aria-label="คืนโทเคน">
          <div className="splendor-player-panel__return-header">
            <h3 className="splendor-player-panel__subtitle">คืนโทเคน</h3>
            <span
              className={[
                'splendor-player-panel__return-progress',
                returnSum === excess ? 'splendor-player-panel__return-progress--ready' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-live="polite"
            >
              {returnSum}/{excess}
            </span>
          </div>

          <p className="splendor-player-panel__return-hint" role="status">
            {dragMessage ?? `ลากโทเคนไปวางที่ธนาคาร · เกิน ${excess} เม็ดจากขีดจำกัด 10`}
          </p>

          {returnSum > 0 && (
            <div className="splendor-player-panel__return-draft" aria-label="กำลังจะคืน">
              <span className="splendor-player-panel__draft-label">จะคืน:</span>
              {SPLENDOR_GEMS.map((g) =>
                returnDraft[g] > 0 ? (
                  <SplendorChip key={g} kind={g} count={returnDraft[g]} size="sm" />
                ) : null,
              )}
              {returnDraft.gold > 0 && (
                <SplendorChip kind="gold" count={returnDraft.gold} size="sm" />
              )}
            </div>
          )}

          {returnTokenItems.length > 0 && (
            <PlayerHand
              cards={returnTokenItems}
              getCardId={(item: SplendorPlayerTokenItem) => item.id}
              dragMode="play"
              dockPeek={false}
              draggableIdPrefix={SPLENDOR_PLAYER_DRAG_PREFIX}
              className="splendor-player-token-hand"
              getPreview={(item) => ({
                src: splendorChipImageUrl(item.kind),
                alt: item.kind === 'gold' ? 'ทอง' : GEM_SHORT[item.kind],
              })}
              renderCard={({ card: item }) => (
                <SplendorChip kind={item.kind} size="md" />
              )}
              aria-label="ลากเพื่อคืนโทเคน"
            />
          )}

          <div className="splendor-player-panel__return-actions">
            <Button
              type="button"
              variant="primary"
              disabled={returnSum !== excess}
              onClick={onConfirmReturn}
            >
              ยืนยันคืนโทเคน
            </Button>
          </div>
        </div>
      )}

      <div className="splendor-player-panel__reserve" aria-label="การ์ดที่จอง">
        <h3 className="splendor-player-panel__subtitle">การ์ดที่จอง ({filled}/3)</h3>

        <p className="splendor-player-panel__hint">
          {canActPlaying
            ? filled > 0
              ? 'คลิกการ์ดเพื่อเลือก แล้วกดซื้อ'
              : 'แตะการ์ดบนกระดานเพื่อจอง (สูงสุด 3 ใบ)'
            : filled > 0
              ? `จอง ${filled}/3`
              : 'ยังไม่มีการ์ดจอง'}
        </p>

        {canActPlaying && selectedCard && (
          <p className="splendor-player-panel__cost" role="status">
            {costBreakdownText(selectedCard, me.gems, me.gold, me.bonuses)}
          </p>
        )}

        {canActPlaying && (
          <Button type="button" variant="primary" disabled={!canBuy} onClick={onBuyReserved}>
            ซื้อการ์ดที่เลือก
          </Button>
        )}

        <div className="splendor-reserve-slots" aria-label="ช่องจอง">
          {dockSlots.map((item) => {
            if (item.kind === 'empty') {
              return (
                <div
                  key={`empty-${item.slot}`}
                  className="splendor-reserve-slot splendor-reserve-slot--empty"
                  aria-label={`ช่องจอง ${item.slot + 1} ว่าง`}
                >
                  <span className="splendor-reserve-slot__label">ว่าง</span>
                </div>
              );
            }

            const { card } = item;
            const isSelected = selectedReservedId === card.id;

            return (
              <SplendorCardFace
                key={card.id}
                card={card}
                size="hand"
                className={isSelected ? 'splendor-card-face--selected' : ''}
                onClick={canActPlaying ? () => onSelectReserved(card.id) : undefined}
                disabled={!canActPlaying}
              />
            );
          })}
        </div>
      </div>

      {me.purchasedCards.length > 0 && (
        <div className="splendor-player-panel__purchased">
          <h3 className="splendor-player-panel__subtitle">การ์ดที่ซื้อแล้ว</h3>
          <div className="splendor-purchased-stacks">
            {SPLENDOR_GEMS.map((g) => {
              const cards = me.purchasedCards.filter((c) => c.bonus === g);
              if (cards.length === 0) return null;
              return (
                <div key={g} className={`splendor-purchased-stack splendor-bonus-${g}`}>
                  {cards.map((c, i) => (
                    <SplendorCardFace
                      key={c.id}
                      card={c}
                      size="hand"
                      className={i > 0 ? 'splendor-card-face--stacked' : ''}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {me.nobles.length > 0 && (
        <div className="splendor-player-panel__nobles">
          <h3 className="splendor-player-panel__subtitle">โนเบิล</h3>
          <div className="splendor-player-panel__noble-row">
            {me.nobles.map((n: SplendorNobleView) => (
              <SplendorNobleTile key={n.id} noble={n} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
