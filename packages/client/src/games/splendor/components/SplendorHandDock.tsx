import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { SplendorGem, SplendorGems, SplendorNobleView, SplendorPlayerRowView } from 'shared';
import { PlayerHand } from '../../../components/player-hand';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { SplendorCardFace } from './SplendorCardFace';
import { SplendorChip } from './SplendorChip';
import { SplendorDraggableChip } from './SplendorDraggableChip';
import { SplendorNobleTile } from './SplendorNobleTile';
import { SplendorPlayerDropZone } from './SplendorPlayerDropZone';
import { splendorChipImageUrl } from '../cardMeta';
import {
  SPLENDOR_DRAFT_DRAG_PREFIX,
  SPLENDOR_PLAYER_DRAG_PREFIX,
  buildPlayerTokenItems,
  type SplendorPlayerTokenItem,
} from '../splendorDragUtils';
import {
  GEM_SHORT,
  SPLENDOR_GEMS,
  buildReserveDockSlots,
  canAffordCard,
  costBreakdownText,
  reservedCount,
  sumGems,
  totalHeld,
} from '../splendorUtils';

type HandTab = 'tokens' | 'cards' | 'reserved';

type Props = {
  me: SplendorPlayerRowView;
  canActPlaying: boolean;
  canActReturn: boolean;
  takeDraft: SplendorGem[];
  returnDraft: SplendorGems & { gold: number };
  excess: number;
  dragMessage: string | null;
  selectedReservedId: string | null;
  /** Bank chip currently being dragged — forces tokens tab. */
  bankDragging: boolean;
  onConfirmTakeGems: () => void;
  onConfirmReturn: () => void;
  onClearTakeDraft: () => void;
  onSelectReserved: (cardId: string) => void;
  onBuyReserved: () => void;
};

export function SplendorHandDock({
  me,
  canActPlaying,
  canActReturn,
  takeDraft,
  returnDraft,
  excess,
  dragMessage,
  selectedReservedId,
  bankDragging,
  onConfirmTakeGems,
  onConfirmReturn,
  onClearTakeDraft,
  onSelectReserved,
  onBuyReserved,
}: Props) {
  const [tab, setTab] = useState<HandTab>('tokens');
  const heldCount = totalHeld(me.gems, me.gold);
  const returnSum = sumGems(returnDraft) + returnDraft.gold;
  const filled = reservedCount(me.reservedSlots);
  const purchasedCount = me.purchasedCards.length;

  const dockSlots = useMemo(() => buildReserveDockSlots(me.reservedSlots), [me.reservedSlots]);

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
    () => (canActReturn ? buildPlayerTokenItems(me.gems, me.gold, returnDraft) : []),
    [canActReturn, me.gems, me.gold, returnDraft],
  );

  useEffect(() => {
    if (canActReturn || bankDragging || takeDraft.length > 0) setTab('tokens');
  }, [bankDragging, canActReturn, takeDraft.length]);

  useEffect(() => {
    if (selectedReservedId) setTab('reserved');
  }, [selectedReservedId]);

  return (
    <aside className="splendor-hand-dock" role="region" aria-label="มือของคุณ">
      <div className="splendor-hand-dock__inner">
        <div className="splendor-hand-dock__header">
          <div className="splendor-hand-dock__tabs" role="tablist" aria-label="ประเภทบนมือ">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'tokens'}
              className={cn('splendor-hand-dock__tab', tab === 'tokens' && 'is-active')}
              onClick={() => setTab('tokens')}
            >
              โทเคน
              <span className="splendor-hand-dock__tab-count">{heldCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'cards'}
              className={cn('splendor-hand-dock__tab', tab === 'cards' && 'is-active')}
              onClick={() => setTab('cards')}
              disabled={canActReturn}
            >
              การ์ด
              <span className="splendor-hand-dock__tab-count">{purchasedCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'reserved'}
              className={cn('splendor-hand-dock__tab', tab === 'reserved' && 'is-active')}
              onClick={() => setTab('reserved')}
              disabled={canActReturn}
            >
              จอง
              <span className="splendor-hand-dock__tab-count">{filled}/3</span>
            </button>
          </div>

          <p className="splendor-hand-dock__stats">
            {me.prestige} แต้ม · {heldCount}/10 เม็ด
          </p>
        </div>

        {tab === 'tokens' ? (
          <>
            {!canActReturn && (dragMessage || canActPlaying) ? (
              <p
                className="splendor-hand-dock__hint splendor-hand-dock__hint--tab"
                role="status"
                aria-live="polite"
              >
                {dragMessage ??
                  (canActPlaying
                    ? takeDraft.length > 0
                      ? 'ลากกลับไปธนาคารเพื่อยกเลิก · หรือกดยืนยัน'
                      : 'ลากจากธนาคารมาที่นี่ · ลากสีเดียวกัน 2 ครั้ง = หยิบ 2 เม็ด'
                    : null)}
              </p>
            ) : null}
            <div className="splendor-hand-dock__body" role="tabpanel" aria-label="โทเคน">
              {canActReturn ? (
                <div className="splendor-hand-dock__return" aria-label="คืนโทเคน">
                  {returnTokenItems.length > 0 ? (
                    <div className="splendor-hand-dock__return-tokens">
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
                        renderCard={({ card: item }) => <SplendorChip kind={item.kind} size="md" />}
                        aria-label="ลากเพื่อคืนโทเคน"
                      />
                    </div>
                  ) : null}
                  <div className="splendor-hand-dock__return-meta">
                    <span
                      className={cn(
                        'splendor-hand-dock__return-progress',
                        returnSum === excess && 'is-ready',
                      )}
                      aria-live="polite"
                    >
                      {returnSum}/{excess}
                    </span>
                    <p className="splendor-hand-dock__hint" role="status">
                      {dragMessage ?? `ลากโทเคนไปวางที่ธนาคาร · เกิน ${excess} เม็ด`}
                    </p>
                    {returnSum > 0 ? (
                      <div className="splendor-hand-dock__draft" aria-label="กำลังจะคืน">
                        <span className="splendor-hand-dock__draft-label">จะคืน:</span>
                        {SPLENDOR_GEMS.map((g) =>
                          returnDraft[g] > 0 ? (
                            <SplendorChip key={g} kind={g} count={returnDraft[g]} size="sm" />
                          ) : null,
                        )}
                        {returnDraft.gold > 0 ? (
                          <SplendorChip kind="gold" count={returnDraft.gold} size="sm" />
                        ) : null}
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={returnSum !== excess}
                      onClick={onConfirmReturn}
                    >
                      ยืนยันคืน
                    </Button>
                  </div>
                </div>
              ) : (
                <SplendorPlayerDropZone active={canActPlaying} hideHint>
                  <div
                    className={cn(
                      'splendor-hand-dock__token-panel',
                      takeDraft.length > 0 && 'splendor-hand-dock__token-panel--split',
                    )}
                  >
                    <div className="splendor-hand-dock__token-held">
                      <div className="splendor-hand-dock__token-row" aria-label="โทเคนของคุณ">
                        {SPLENDOR_GEMS.map((g) =>
                          me.gems[g] > 0 ? (
                            <SplendorChip key={g} kind={g} count={me.gems[g]} size="sm" />
                          ) : null,
                        )}
                        {me.gold > 0 ? (
                          <SplendorChip kind="gold" count={me.gold} size="sm" />
                        ) : null}
                        {heldCount === 0 && takeDraft.length === 0 && !canActPlaying ? (
                          <span className="splendor-hand-dock__empty">ยังไม่มีโทเคน</span>
                        ) : null}
                      </div>
                    </div>

                    {takeDraft.length > 0 ? (
                      <div className="splendor-hand-dock__token-draft">
                        <div className="splendor-hand-dock__draft" aria-label="กำลังจะหยิบ">
                          <span className="splendor-hand-dock__draft-label">จะหยิบ:</span>
                          {takeDraft.map((g, i) => (
                            <SplendorDraggableChip
                              key={`${g}-${i}`}
                              dragId={`${SPLENDOR_DRAFT_DRAG_PREFIX}-${i}`}
                              kind={g}
                              size="sm"
                            />
                          ))}
                          {canActPlaying ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={onClearTakeDraft}
                            >
                              ล้าง
                            </Button>
                          ) : null}
                          {canActPlaying ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              onClick={onConfirmTakeGems}
                            >
                              ยืนยัน {takeDraft.length} เม็ด
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </SplendorPlayerDropZone>
              )}
            </div>
          </>
        ) : null}

        {tab === 'cards' ? (
          <div
            className="splendor-hand-dock__body splendor-hand-dock__body--cards"
            role="tabpanel"
            aria-label="การ์ดที่ซื้อ"
          >
            <div className="splendor-hand-dock__card-row">
              {me.nobles.length > 0 ? (
                <div className="splendor-hand-dock__nobles" aria-label="โนเบิล">
                  {me.nobles.map((n: SplendorNobleView) => (
                    <SplendorNobleTile key={n.id} noble={n} />
                  ))}
                </div>
              ) : null}
              {purchasedCount === 0 ? (
                <span className="splendor-hand-dock__empty">ยังไม่มีการ์ดที่ซื้อ</span>
              ) : (
                <div className="splendor-purchased-stacks">
                  {SPLENDOR_GEMS.map((g) => {
                    const cards = me.purchasedCards.filter((c) => c.bonus === g);
                    if (cards.length === 0) return null;
                    return (
                      <div
                        key={g}
                        className={`splendor-purchased-stack splendor-bonus-${g}`}
                        style={{ '--spl-stack-count': cards.length } as CSSProperties}
                        aria-label={`โบนัส${GEM_SHORT[g]} ${cards.length} ใบ`}
                      >
                        <div className="splendor-purchased-stack__header" aria-hidden>
                          <SplendorChip kind={g} count={cards.length} size="xs" />
                        </div>
                        <div className="splendor-purchased-stack__cards">
                          {cards.map((c, i) => (
                            <SplendorCardFace
                              key={c.id}
                              card={c}
                              size="hand"
                              className={i > 0 ? 'splendor-card-face--stacked' : ''}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {tab === 'reserved' ? (
          <div
            className="splendor-hand-dock__body splendor-hand-dock__body--reserved"
            role="tabpanel"
            aria-label="การ์ดที่จอง"
          >
            <div className="splendor-hand-dock__reserve">
              <div className="splendor-hand-dock__reserve-meta">
                <p className="splendor-hand-dock__hint">
                  {canActPlaying
                    ? filled > 0
                      ? 'คลิกการ์ดเพื่อเลือก แล้วกดซื้อ'
                      : 'แตะการ์ดบนกระดานเพื่อจอง (สูงสุด 3 ใบ)'
                    : filled > 0
                      ? `จอง ${filled}/3`
                      : 'ยังไม่มีการ์ดจอง'}
                </p>
                {canActPlaying && selectedCard ? (
                  <p className="splendor-hand-dock__cost" role="status">
                    {costBreakdownText(selectedCard, me.gems, me.gold, me.bonuses)}
                  </p>
                ) : null}
                {canActPlaying ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={!canBuy}
                    onClick={onBuyReserved}
                  >
                    ซื้อการ์ดที่เลือก
                  </Button>
                ) : null}
              </div>
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
          </div>
        ) : null}
      </div>
    </aside>
  );
}
