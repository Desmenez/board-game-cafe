import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS, type Transform } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';
import type {
  SheriffAction,
  SheriffCard,
  SheriffGoodType,
  SheriffLegalGood,
  SheriffPlayerView,
} from 'shared';
import { sheriffHeadImageUrl } from '../../imageMap';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import './sheriff.css';
import applesImg from '../../assets/sheriff/apples.jpg';
import cheeseImg from '../../assets/sheriff/cheese.jpg';
import breadImg from '../../assets/sheriff/bread.jpg';
import chickenImg from '../../assets/sheriff/chicken.jpg';
import pepperImg from '../../assets/sheriff/pepper.jpg';
import meadImg from '../../assets/sheriff/mead.jpg';
import silkImg from '../../assets/sheriff/silk.jpg';
import crossbowImg from '../../assets/sheriff/crossbow.jpg';
import feastPlateImg from '../../assets/sheriff/feast-plate.jpg';
import dragonPepperImg from '../../assets/sheriff/dragon-pepper.jpg';
import brimstoneOilImg from '../../assets/sheriff/brimstone-oil.jpg';
import oliveOilImg from '../../assets/sheriff/olive-oil.jpg';
import strawberryMeadImg from '../../assets/sheriff/strawberry-mead.jpg';
import goldenSilkImg from '../../assets/sheriff/golden-silk.jpg';
import heavyCrossbowImg from '../../assets/sheriff/heavy-crossbow.jpg';
import princeJohnSwordImg from "../../assets/sheriff/prince-john's-sword.jpg";
import royalSummonsImg from '../../assets/sheriff/royal-summons.jpg';
import arcaneScrollsImg from '../../assets/sheriff/arcane-scrolls.jpg';
import greenApplesImg from '../../assets/sheriff/green-apples.jpg';
import goldenApplesImg from '../../assets/sheriff/golder-apples.jpg';
import bleuCheeseImg from '../../assets/sheriff/bleu-cheese.jpg';
import goudaCheeseImg from '../../assets/sheriff/gouda-cheese.jpg';
import ryeBreadImg from '../../assets/sheriff/rye-bread.jpg';
import pumpernickelBreadImg from '../../assets/sheriff/pumpernickel-bread.jpg';
import royalRoosterImg from '../../assets/sheriff/royal-rooster.jpg';
import { Button } from '../../components/ui';

/** prefix แยก sortable ถุงจาก id การ์ด */
const BAG_SORTABLE_PREFIX = 'bag-draft-';
const BAG_DRAFT_DROP_ZONE_ID = 'sheriff-bag-draft-zone';
/** โซนมือตอนร่างถุง — ใช้ชื่อเดียวกับ SheriffHandBagDropzone */
const SHERIFF_BAG_HAND_DROP_ID = 'sheriff-bag-hand-dropzone';

function bagSortableId(cardId: string): string {
  return `${BAG_SORTABLE_PREFIX}${cardId}`;
}
function bagCardIdFromSortable(dndId: string): string | undefined {
  return dndId.startsWith(BAG_SORTABLE_PREFIX)
    ? dndId.slice(BAG_SORTABLE_PREFIX.length)
    : undefined;
}

/**
 * ลากจากถุง: ตัดโซนร่างถุง (กล่องใหญ่) ออกจากผลชน — ไม่งั้น closestCenter มักชนที่นี่แทนมือ
 * ลากจากมือเข้าถุง: ใช้ closestCenter เต็ม (ต้องชน sheriff-bag-draft-zone ได้)
 */
const closestCenterBagDragNoParentZone: CollisionDetection = (args) => {
  const list = closestCenter(args);
  const aid = String(args.active.id);
  if (!aid.startsWith(BAG_SORTABLE_PREFIX)) return list;
  const filtered = list.filter((c) => String(c.id) !== BAG_DRAFT_DROP_ZONE_ID);
  return filtered.length > 0 ? filtered : list;
};

/** ลากจากร่างถุง: ถ้า pointer อยู่ในกล่องมือให้ชนที่นี่ก่อน — ลดการสลับไปชนการ์ดในมือ/ในร่าง */
const sheriffCollisionDetection: CollisionDetection = (args) => {
  const aid = String(args.active.id);
  if (aid.startsWith(BAG_SORTABLE_PREFIX)) {
    const pointerHits = pointerWithin(args);
    const handHit = pointerHits.find((c) => String(c.id) === SHERIFF_BAG_HAND_DROP_ID);
    if (handHit) return [handHit];
  }
  return closestCenterBagDragNoParentZone(args);
};

interface Props {
  gameState: SheriffPlayerView;
  myId: string;
  sendAction: (action: SheriffAction) => void;
  onLeave: () => void;
  /** หัวห้องเท่านั้น — เริ่มรอบใหม่ในห้องเดิม */
  onRestart?: () => void;
}

const CARD_LABEL: Record<SheriffCard['type'], string> = {
  apple: 'Apple',
  cheese: 'Cheese',
  bread: 'Bread',
  chicken: 'Chicken',
  pepper: 'Pepper',
  mead: 'Mead',
  silk: 'Silk',
  crossbow: 'Crossbow',
  feast_plate: 'Feast Plate',
  dragon_pepper: 'Dragon Pepper',
  brimstone_oil: 'Brimstone Oil',
  olive_oil: 'Olive Oil',
  strawberry_mead: 'Strawberry Mead',
  golden_silk: 'Golden Silk',
  heavy_crossbow: 'Heavy Crossbow',
  prince_johns_sword: "Prince John's Sword",
  royal_summons: 'Royal Summons',
  arcane_scrolls: 'Arcane Scrolls',
  green_apples: 'Green Apples',
  golden_apples: 'Golden Apples',
  bleu_cheese: 'Bleu Cheese',
  gouda_cheese: 'Gouda Cheese',
  rye_bread: 'Rye Bread',
  pumpernickel_bread: 'Pumpernickel Bread',
  royal_rooster: 'Royal Rooster',
};

const CARD_IMAGE: Record<SheriffCard['type'], string> = {
  apple: applesImg,
  cheese: cheeseImg,
  bread: breadImg,
  chicken: chickenImg,
  pepper: pepperImg,
  mead: meadImg,
  silk: silkImg,
  crossbow: crossbowImg,
  feast_plate: feastPlateImg,
  dragon_pepper: dragonPepperImg,
  brimstone_oil: brimstoneOilImg,
  olive_oil: oliveOilImg,
  strawberry_mead: strawberryMeadImg,
  golden_silk: goldenSilkImg,
  heavy_crossbow: heavyCrossbowImg,
  prince_johns_sword: princeJohnSwordImg,
  royal_summons: royalSummonsImg,
  arcane_scrolls: arcaneScrollsImg,
  green_apples: greenApplesImg,
  golden_apples: goldenApplesImg,
  bleu_cheese: bleuCheeseImg,
  gouda_cheese: goudaCheeseImg,
  rye_bread: ryeBreadImg,
  pumpernickel_bread: pumpernickelBreadImg,
  royal_rooster: royalRoosterImg,
};

const LEGAL_DECLARATION: SheriffLegalGood[] = ['apple', 'cheese', 'bread', 'chicken'];

/** dnd-kit ปรับ scale ตามขนาด droppable ที่ชน — โซน market ใหญ่ทำให้การ์ด/ปุ่มยืด; ใช้แค่ translate ตอนลาก */
function dragStyleTranslateOnly(transform: Transform | null | undefined) {
  if (transform == null) return undefined;
  return CSS.Translate.toString(transform);
}

function DraggableStagedMarketCard({
  card,
  canDrag,
  onPeek,
}: {
  card: SheriffCard;
  canDrag: boolean;
  onPeek: (t: SheriffCard['type']) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `staged-${card.id}`,
    disabled: !canDrag,
  });
  const style = {
    transform: dragStyleTranslateOnly(transform),
    opacity: isDragging ? 0.88 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sheriff-market-staged-wrap${isDragging ? ' sheriff-market-staged-wrap--dragging' : ''}`}
      {...attributes}
    >
      <div className="sheriff-market-staged-drag" {...listeners}>
        <img
          src={CARD_IMAGE[card.type]}
          alt={CARD_LABEL[card.type]}
          className="sheriff-card-img"
          loading="lazy"
        />
        <div className="sheriff-card-caption">{CARD_LABEL[card.type]}</div>
      </div>
      <button
        type="button"
        className="sheriff-market-staged-zoom-btn"
        aria-label={`ดูการ์ด ${CARD_LABEL[card.type]} แบบเต็ม`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onPeek(card.type);
        }}
      >
        ?
      </button>
    </div>
  );
}

function MarketPileSlot({
  side,
  topType,
  count,
  onOpenStack,
  canDrop,
  drawButton,
  stagedCards,
  remoteStaging,
  onPeekStaged,
}: {
  side: 'left' | 'right';
  topType?: SheriffCard['type'];
  count: number;
  onOpenStack: () => void;
  canDrop: boolean;
  drawButton?: { label: string; disabled: boolean; onClick: () => void } | null;
  stagedCards: SheriffCard[];
  /** ผู้เล่นอื่นเห็นการ์ดที่ Merchant คิวตลาดกำลังเลือกทิ้ง */
  remoteStaging?: { merchantName: string; cardTypes: SheriffGoodType[] };
  onPeekStaged: (t: SheriffCard['type']) => void;
}) {
  const dropId = side === 'left' ? 'market-left' : 'market-right';
  const { setNodeRef, isOver } = useDroppable({ id: dropId, disabled: !canDrop });
  const label = side === 'left' ? 'กองทิ้งซ้าย' : 'กองทิ้งขวา';
  const showStaging = stagedCards.length > 0;
  const showRemote = !showStaging && remoteStaging != null && remoteStaging.cardTypes.length > 0;
  return (
    <div
      ref={setNodeRef}
      className={`sheriff-market-pile ${isOver && canDrop ? 'sheriff-market-pile--over' : ''}`}
      data-side={side}
    >
      <div className="sheriff-market-pile__label">{label}</div>
      <div
        className={`sheriff-market-pile__top${showStaging || showRemote ? ' sheriff-market-pile__top--staging' : ''}`}
      >
        {showStaging ? (
          <div className="sheriff-market-pile__staging-block">
            {topType ? (
              <div className="sheriff-market-pile__board-row">
                <img
                  src={CARD_IMAGE[topType]}
                  alt=""
                  className="sheriff-market-pile__board-img"
                  loading="lazy"
                />
                <span className="sheriff-market-pile__board-cap">บนกอง</span>
              </div>
            ) : null}
            <div className="sheriff-market-pile__staging">
              <p className="sheriff-market-pile__staging-label">กำลังทิ้ง (ลากกลับมือเพื่อคืน)</p>
              <div className="sheriff-market-pile__staging-cards">
                {stagedCards.map((card) => (
                  <DraggableStagedMarketCard
                    key={card.id}
                    card={card}
                    canDrag={canDrop}
                    onPeek={onPeekStaged}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : showRemote ? (
          <div className="sheriff-market-pile__staging-block">
            {topType ? (
              <div className="sheriff-market-pile__board-row">
                <img
                  src={CARD_IMAGE[topType]}
                  alt=""
                  className="sheriff-market-pile__board-img"
                  loading="lazy"
                />
                <span className="sheriff-market-pile__board-cap">บนกอง</span>
              </div>
            ) : null}
            <div className="sheriff-market-pile__staging">
              <p className="sheriff-market-pile__staging-label sheriff-market-pile__staging-label--live">
                <strong>{remoteStaging.merchantName}</strong> กำลังเลือกทิ้งที่นี่ (เรียลไทม์)
              </p>
              <div className="sheriff-market-pile__staging-cards sheriff-market-pile__staging-cards--readonly">
                {remoteStaging.cardTypes.map((type, idx) => (
                  <div
                    key={`remote-st-${side}-${idx}-${type}`}
                    className="sheriff-market-staged-wrap sheriff-market-staged-wrap--remote"
                  >
                    <div className="sheriff-market-staged-drag sheriff-market-staged-drag--static">
                      <img
                        src={CARD_IMAGE[type]}
                        alt={CARD_LABEL[type]}
                        className="sheriff-card-img"
                        loading="lazy"
                      />
                      <div className="sheriff-card-caption">{CARD_LABEL[type]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : topType ? (
          <img
            src={CARD_IMAGE[topType]}
            alt={CARD_LABEL[topType]}
            className="sheriff-card-img"
            loading="lazy"
          />
        ) : (
          <div className="sheriff-market-pile__empty">ว่าง</div>
        )}
      </div>
      <div className="sheriff-market-pile__meta">{count} ใบ</div>
      <button
        type="button"
        className="btn btn-secondary btn-sm sheriff-market-pile__stack-btn"
        onClick={onOpenStack}
      >
        ดูกองการ์ด (บน → ล่าง)
      </button>
      {drawButton ? (
        <button
          type="button"
          className="btn btn-primary btn-sm sheriff-market-draw-btn"
          disabled={drawButton.disabled}
          onClick={drawButton.onClick}
        >
          {drawButton.label}
        </button>
      ) : null}
      {canDrop && (
        <p className="sheriff-market-pile__hint">ลากการ์ดจากมือมาวางทิ้งที่นี่ (สูงสุด 5 ใบ)</p>
      )}
    </div>
  );
}

function DeckPileSlot({
  drawPileCount,
  drawButton,
}: {
  drawPileCount: number;
  drawButton?: { label: string; disabled: boolean; onClick: () => void } | null;
}) {
  return (
    <div className="sheriff-market-deck">
      <div className="sheriff-market-pile__label">กองจั่ว</div>
      <div className="sheriff-market-deck__visual" aria-hidden>
        <div className="sheriff-market-deck__back" />
      </div>
      <div className="sheriff-market-pile__meta">เหลือ {drawPileCount} ใบ</div>
      {drawButton ? (
        <button
          type="button"
          className="btn btn-primary btn-sm sheriff-market-draw-btn"
          disabled={drawButton.disabled}
          onClick={drawButton.onClick}
        >
          {drawButton.label}
        </button>
      ) : null}
    </div>
  );
}

/** หลังลากจบ บางเบราว์เซอร์ยังส่ง click — กันไม่ให้สลับการเลือกจากคลิกปลอม */
function useSuppressClickAfterDragEnd(isDragging: boolean) {
  const prevDragging = useRef(false);
  const ignoreClickRef = useRef(false);
  useEffect(() => {
    if (prevDragging.current && !isDragging) {
      ignoreClickRef.current = true;
      const t = window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, 120);
      prevDragging.current = isDragging;
      return () => window.clearTimeout(t);
    }
    prevDragging.current = isDragging;
  }, [isDragging]);
  return ignoreClickRef;
}

function DraggableHandCard({
  card,
  canDragToMarket,
  canDragToBag,
  interactive,
  onPeek,
  selectForBag,
}: {
  card: SheriffCard;
  canDragToMarket: boolean;
  canDragToBag: boolean;
  /** false เมื่อไม่ใช่ Merchant ตอนนี้ — ห้ามคลิกเลือกและห้ามลาก */
  interactive: boolean;
  onPeek: (type: SheriffCard['type']) => void;
  /** คลิกที่การ์ดหลายใบแล้วกดปุ่ม «ใส่ถุง» (ทางเลือกแทน DnD) */
  selectForBag?: { selected: boolean; onToggle: () => void } | null;
}) {
  const canDrag = (canDragToMarket || canDragToBag) && interactive;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hand-${card.id}`,
    disabled: !canDrag,
  });
  const ignoreClickAfterDragRef = useSuppressClickAfterDragEnd(isDragging);
  const wrapStyle = {
    transform: dragStyleTranslateOnly(transform),
    opacity: isDragging ? 0.85 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={wrapStyle}
      className={`sheriff-hand-card-with-zoom${selectForBag?.selected ? ' sheriff-hand-card-with-zoom--selected' : ''}`}
      {...attributes}
    >
      <button
        type="button"
        disabled={!interactive}
        className={`sheriff-hand-card-btn${canDrag ? ' sheriff-hand-card-btn--draggable' : ''}${!interactive ? ' sheriff-hand-card-btn--locked' : ''}${isDragging ? ' sheriff-hand-card--dragging' : ''}`}
        {...(canDrag ? listeners : {})}
        title={selectForBag ? 'คลิกเพื่อเลือก/ยกเลิก หลายใบ แล้วกด «ใส่ถุง» มุมขวาบน' : undefined}
        onClick={
          selectForBag
            ? (e) => {
                if (ignoreClickAfterDragRef.current) return;
                e.stopPropagation();
                selectForBag.onToggle();
              }
            : undefined
        }
      >
        <img
          src={CARD_IMAGE[card.type]}
          alt={CARD_LABEL[card.type]}
          className="sheriff-card-img"
          loading="lazy"
        />
        <div className="sheriff-card-caption">{CARD_LABEL[card.type]}</div>
      </button>
      <button
        type="button"
        className="sheriff-hand-card-zoom-btn"
        aria-label={`ดูการ์ด ${CARD_LABEL[card.type]} แบบเต็ม`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onPeek(card.type);
        }}
      >
        ?
      </button>
    </div>
  );
}

function SheriffHandZoomModal({
  cardType,
  onClose,
}: {
  cardType: SheriffCard['type'] | null;
  onClose: () => void;
}) {
  if (cardType === null) return null;
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheriff-hand-zoom-title"
      onClick={onClose}
    >
      <div className="modal sheriff-hand-zoom-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="sheriff-hand-zoom-title">ดูการ์ดแบบเต็ม</h2>
        <div className="sheriff-hand-zoom-preview">
          <img
            src={CARD_IMAGE[cardType]}
            alt={CARD_LABEL[cardType]}
            className="sheriff-card-img"
            loading="lazy"
          />
          <div className="sheriff-card-caption" style={{ textAlign: 'center' }}>
            {CARD_LABEL[cardType]}
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
          ปิด
        </button>
      </div>
    </div>
  );
}

function SheriffHandMarketDropzone({
  disabled,
  children,
}: {
  disabled: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'sheriff-hand-dropzone',
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      className={`sheriff-hand-market-dropzone${isOver && !disabled ? ' sheriff-hand-market-dropzone--over' : ''}`}
    >
      {children}
    </div>
  );
}

function SheriffHandBagDropzone({
  disabled,
  children,
}: {
  disabled: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'sheriff-bag-hand-dropzone',
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      className={`sheriff-hand-market-dropzone${isOver && !disabled ? ' sheriff-hand-market-dropzone--over' : ''}`}
    >
      {children}
    </div>
  );
}

function SheriffBagDraftDropzone({
  disabled,
  children,
}: {
  disabled: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'sheriff-bag-draft-zone',
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      className={`sheriff-bag-draft-zone${isOver && !disabled ? ' sheriff-bag-draft-zone--over' : ''}`}
    >
      {children}
    </div>
  );
}

function BagDraftSortableCard({
  card,
  canDrag,
  onPeek,
  selectForHand,
}: {
  card: SheriffCard;
  canDrag: boolean;
  onPeek: (t: SheriffCard['type']) => void;
  selectForHand?: { selected: boolean; onToggle: () => void } | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bagSortableId(card.id),
    disabled: !canDrag,
  });
  const ignoreClickAfterDragRef = useSuppressClickAfterDragEnd(isDragging);
  const style = {
    transform: dragStyleTranslateOnly(transform),
    transition,
    /** ซ่อนต้นทางเมื่อใช้ DragOverlay (ลากจากถุง) — ลดการซ้อนและรู้สึกลื่นขึ้น */
    opacity: isDragging ? 0 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sheriff-bag-draft-card${isDragging ? ' sheriff-bag-draft-card--dragging' : ''}${selectForHand?.selected ? ' sheriff-bag-draft-card--selected' : ''}`}
      {...attributes}
    >
      <div
        className="sheriff-bag-draft-drag"
        {...listeners}
        title={selectForHand ? 'คลิกเพื่อเลือก/ยกเลิก หลายใบ แล้วกด «คืนมือ» มุมขวาบน' : undefined}
        onClick={
          selectForHand
            ? (e) => {
                if (ignoreClickAfterDragRef.current) return;
                e.stopPropagation();
                selectForHand.onToggle();
              }
            : undefined
        }
      >
        <img
          src={CARD_IMAGE[card.type]}
          alt={CARD_LABEL[card.type]}
          className="sheriff-card-img"
          loading="lazy"
        />
        <div className="sheriff-card-caption">{CARD_LABEL[card.type]}</div>
      </div>
      <button
        type="button"
        className="sheriff-hand-card-zoom-btn"
        aria-label={`ดูการ์ด ${CARD_LABEL[card.type]} แบบเต็ม`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onPeek(card.type);
        }}
      >
        ?
      </button>
    </div>
  );
}

function BagSubmittedReadonlyCard({
  card,
  onPeek,
}: {
  card: SheriffCard;
  onPeek: (t: SheriffCard['type']) => void;
}) {
  return (
    <div className="sheriff-bag-draft-card sheriff-bag-draft-card--readonly">
      <div className="sheriff-bag-draft-drag" aria-hidden>
        <img
          src={CARD_IMAGE[card.type]}
          alt={CARD_LABEL[card.type]}
          className="sheriff-card-img"
          loading="lazy"
        />
        <div className="sheriff-card-caption">{CARD_LABEL[card.type]}</div>
      </div>
      <button
        type="button"
        className="sheriff-hand-card-zoom-btn"
        aria-label={`ดูการ์ด ${CARD_LABEL[card.type]} แบบเต็ม`}
        onClick={() => onPeek(card.type)}
      >
        ?
      </button>
    </div>
  );
}

function MarketDrawRevealModal({ reveal }: { reveal: SheriffPlayerView['marketDrawReveal'] }) {
  const [hiddenRevealId, setHiddenRevealId] = useState<number | null>(null);
  /** ผูกกับ revealId เท่านั้น — อย่าใช้ [reveal] เพราะแต่ละ broadcast สร้าง object ใหม่ จะรีเซ็ตการปิดโมดัลทุกครั้งที่ state อื่นเปลี่ยน (เช่น bag_draft) */
  const revealId = reveal?.revealId;
  useEffect(() => {
    if (revealId == null) return;
    setHiddenRevealId(null);
    const t = window.setTimeout(() => setHiddenRevealId(revealId), 10_000);
    return () => window.clearTimeout(t);
  }, [revealId]);
  if (!reveal || hiddenRevealId === reveal.revealId) return null;
  const pileLabel =
    reveal.fromPile === 'deck'
      ? 'กองจั่ว'
      : reveal.fromPile === 'left'
        ? 'กองทิ้งซ้าย'
        : 'กองทิ้งขวา';
  const modalTitle = reveal.fromPile === 'deck' ? 'จั่วจากกองจั่ว' : 'จั่วจากกองทิ้ง';
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheriff-market-reveal-title"
    >
      <div className="modal sheriff-market-reveal-modal">
        <h2 id="sheriff-market-reveal-title">{modalTitle}</h2>
        <p className="sheriff-section-desc">
          {reveal.fromPile === 'deck' ? (
            <>
              คุณจั่วจาก{pileLabel}ได้การ์ดดังนี้{' '}
              <span className="sheriff-market-reveal-privacy">(เห็นเฉพาะคุณ)</span>
            </>
          ) : (
            <>
              <strong>{reveal.merchantName}</strong> จั่วจาก{pileLabel} ได้การ์ดดังนี้
              (แสดงให้ทุกคน)
            </>
          )}
        </p>
        <div className="sheriff-market-reveal-grid">
          {reveal.cardTypes.map((type, idx) => (
            <div key={`reveal-${idx}-${type}`} className="sheriff-card-figure">
              <img
                src={CARD_IMAGE[type]}
                alt={CARD_LABEL[type]}
                className="sheriff-card-img"
                loading="lazy"
              />
              <div className="sheriff-card-caption">{CARD_LABEL[type]}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 12 }}
          onClick={() => setHiddenRevealId(reveal.revealId)}
        >
          ปิด
        </button>
      </div>
    </div>
  );
}

export function SheriffGame({ gameState: gs, sendAction, onLeave, onRestart }: Props) {
  const [marketStaging, setMarketStaging] = useState<{ pile: 0 | 1 | null; ids: string[] }>({
    pile: null,
    ids: [],
  });
  const [declaredGood, setDeclaredGood] = useState<SheriffLegalGood>('apple');
  const [bribeAmount, setBribeAmount] = useState<number>(0);
  const bribeSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showInspectionId, setShowInspectionId] = useState<string | null>(null);
  const [inspectionRevealCount, setInspectionRevealCount] = useState<number>(0);
  const [pileModal, setPileModal] = useState<'left' | 'right' | null>(null);
  const [handZoomType, setHandZoomType] = useState<SheriffCard['type'] | null>(null);
  /** คลิกการ์ดหลายใบแล้วกด «ใส่ถุง» / «คืนมือ» แทน DnD */
  const [selectedHandForBagIds, setSelectedHandForBagIds] = useState<string[]>([]);
  const [selectedBagDraftIds, setSelectedBagDraftIds] = useState<string[]>([]);
  /** แสดง DragOverlay ตอนลากจากร่างถุง — การ์ดต้นทางซ่อน opacity เพื่อไม่ซ้อนภาพ */
  const [bagDragOverlayCard, setBagDragOverlayCard] = useState<SheriffCard | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const canInteractHand = gs.canMarketNow || gs.canDraftBag;
  /** มือเหลือ 1 ใบห้ามทิ้ง (ต้องเก็บไว้อย่างน้อย 1) */
  const canDragHandToMarket = gs.canMarketNow && gs.myHand.length > 1;
  const canDragToBag = gs.canDraftBag && !gs.canMarketNow;

  const draftIds = gs.myBagDraft?.cardIds ?? [];
  const draftDecl = gs.myBagDraft?.declaredGood ?? declaredGood;
  const waitingForOthersBags =
    gs.phase === 'parallel_bagging' &&
    gs.me.id !== gs.sheriffId &&
    gs.myBagCount > 0 &&
    !gs.canDraftBag &&
    !gs.canSubmitBagNow;
  const parallelBagSubmitted = gs.parallelBagSubmittedCount ?? 0;
  const parallelBagTotal = gs.parallelBagMerchantTotal ?? 0;
  const showParallelBagSubmitButton =
    gs.phase === 'parallel_bagging' && gs.me.id !== gs.sheriffId && parallelBagTotal > 0;

  const sortedScoreBreakdown = useMemo(() => {
    if (!gs.scoreBreakdown?.length) return [];
    return [...gs.scoreBreakdown].sort((a, b) => b.total - a.total);
  }, [gs.scoreBreakdown]);

  const sortedWinners = useMemo(() => {
    if (!gs.winners?.length) return [];
    return [...gs.winners].sort((a, b) => b.score - a.score);
  }, [gs.winners]);

  const winnerIdSet = useMemo(() => new Set((gs.winners ?? []).map((w) => w.id)), [gs.winners]);

  const handIdsKeyForSelectPrune = gs.myHand
    .map((c) => c.id)
    .sort()
    .join(',');
  const draftIdsKey = draftIds.join(',');
  const marketStagingIdsKey = marketStaging.ids.join(',');

  useEffect(() => {
    if (!gs.canDraftBag) {
      setSelectedHandForBagIds([]);
      setSelectedBagDraftIds([]);
    }
  }, [gs.canDraftBag]);

  useEffect(() => {
    const visible = gs.canMarketNow
      ? gs.myHand.filter((c) => !marketStaging.ids.includes(c.id))
      : gs.myHand.filter((c) => !draftIds.includes(c.id));
    const allowed = new Set(visible.map((c) => c.id));
    setSelectedHandForBagIds((prev) => {
      const next = prev.filter((id) => allowed.has(id));
      return next.length === prev.length && next.every((id, i) => prev[i] === id) ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serialized keys (handIdsKeyForSelectPrune, draftIdsKey, marketStagingIdsKey) track array contents
  }, [gs.canMarketNow, handIdsKeyForSelectPrune, draftIdsKey, marketStagingIdsKey]);

  useEffect(() => {
    const allowed = new Set(draftIds);
    setSelectedBagDraftIds((prev) => {
      const next = prev.filter((id) => allowed.has(id));
      return next.length === prev.length && next.every((id, i) => prev[i] === id) ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draftIdsKey tracks draftIds
  }, [draftIdsKey]);

  useEffect(() => {
    if (gs.myBagDraft?.declaredGood) setDeclaredGood(gs.myBagDraft.declaredGood);
  }, [gs.myBagDraft?.declaredGood]);

  const pickDeclaration = (g: SheriffLegalGood) => {
    setDeclaredGood(g);
    if (!gs.canDraftBag || draftIds.length < 1) return;
    sendAction({ type: 'bag_draft', cardIds: draftIds, declaredGood: g });
  };

  const submitBagToSheriff = () => {
    if (!gs.canSubmitBagNow || draftIds.length < 1) return;
    sendAction({ type: 'submit_bag' });
  };

  useEffect(() => {
    if (gs.phase !== 'game_over') return;
    return startWinCelebrationLoop();
  }, [gs.phase]);

  useEffect(() => {
    if (gs.canMarketNow) {
      setMarketStaging({ pile: null, ids: [] });
    }
  }, [gs.canMarketNow, gs.activeMerchantId]);

  /** ซิงก์การ์ดที่กำลังเลือกทิ้งไปเซิร์ฟเวอร์ — ผู้เล่นอื่นเห็นแบบเรียลไทม์ */
  useEffect(() => {
    if (!gs.canMarketNow) return;
    const timer = window.setTimeout(() => {
      sendAction({
        type: 'market_stage_preview',
        discardPileIndex: marketStaging.pile,
        cardIds: marketStaging.ids,
      });
    }, 70);
    return () => window.clearTimeout(timer);
  }, [
    gs.canMarketNow,
    gs.activeMerchantId,
    marketStaging.pile,
    marketStaging.ids.join(','),
    sendAction,
  ]);

  useEffect(() => {
    if (!gs.canSetBribeFreely) return;
    if (bribeSendTimerRef.current) return;
    setBribeAmount(gs.myCurrentBribe ?? 0);
  }, [gs.myCurrentBribe, gs.canSetBribeFreely]);

  useEffect(() => {
    if (!gs.lastInspection || gs.lastInspection.id === showInspectionId) return;
    setInspectionRevealCount(0);
    const total = gs.lastInspection.passedCards.length + gs.lastInspection.confiscatedCards.length;
    if (total <= 0) return;
    const timer = window.setInterval(() => {
      setInspectionRevealCount((prev) => {
        if (prev >= total) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 480);
    return () => window.clearInterval(timer);
  }, [gs.lastInspection, showInspectionId]);

  /** ปิดโมดัลผลการตรวจอัตโนมัติหลัง 10 วินาที */
  useEffect(() => {
    if (!gs.lastInspection || gs.lastInspection.id === showInspectionId) return;
    const id = gs.lastInspection.id;
    const t = window.setTimeout(() => {
      setShowInspectionId(id);
    }, 10_000);
    return () => window.clearTimeout(t);
  }, [gs.lastInspection?.id, showInspectionId]);

  const nStaging = marketStaging.ids.length;
  const drawLabel = nStaging > 0 ? `จั่ว ${nStaging} ใบ` : '';

  const submitMarketDraw = (drawSource: 'deck' | 'left' | 'right') => {
    if (!gs.canMarketNow) return;
    const { ids, pile } = marketStaging;
    if (ids.length < 1 || pile === null) return;
    sendAction({
      type: 'merchant_market',
      discardCardIds: ids,
      discardPileIndex: pile,
      drawSource,
    });
    setMarketStaging({ pile: null, ids: [] });
  };

  const deckDrawButton =
    canDragHandToMarket && nStaging > 0 && marketStaging.pile !== null
      ? {
          label: drawLabel,
          disabled: gs.drawPileCount < nStaging,
          onClick: () => submitMarketDraw('deck'),
        }
      : null;

  const leftDrawButton =
    canDragHandToMarket && nStaging > 0 && marketStaging.pile === 1
      ? {
          label: drawLabel,
          disabled: gs.discardLeftCount < nStaging,
          onClick: () => submitMarketDraw('left'),
        }
      : null;

  const rightDrawButton =
    canDragHandToMarket && nStaging > 0 && marketStaging.pile === 0
      ? {
          label: drawLabel,
          disabled: gs.discardRightCount < nStaging,
          onClick: () => submitMarketDraw('right'),
        }
      : null;

  const stagedResolvedCards: SheriffCard[] = marketStaging.ids
    .map((id) => gs.myHand.find((c) => c.id === id))
    .filter((c): c is SheriffCard => Boolean(c));

  const stagedForLeft = marketStaging.pile === 0 ? stagedResolvedCards : [];
  const stagedForRight = marketStaging.pile === 1 ? stagedResolvedCards : [];

  const pub = gs.marketStagingPublic;
  const showOthersStaging = gs.phase === 'merchant_market' && !gs.canMarketNow && pub != null;
  const remoteLeft =
    showOthersStaging && pub.discardPileIndex === 0
      ? { merchantName: pub.merchantName, cardTypes: pub.cardTypes }
      : undefined;
  const remoteRight =
    showOthersStaging && pub.discardPileIndex === 1
      ? { merchantName: pub.merchantName, cardTypes: pub.cardTypes }
      : undefined;

  const handCardsForDisplay = gs.canMarketNow
    ? gs.myHand.filter((c) => !marketStaging.ids.includes(c.id))
    : gs.myHand.filter((c) => !draftIds.includes(c.id));

  const draftCardsResolved: SheriffCard[] = draftIds
    .map((id) => gs.myHand.find((c) => c.id === id))
    .filter((c): c is SheriffCard => Boolean(c));

  const removeCardFromMarketStaging = (cardId: string) => {
    setMarketStaging((prev) => {
      const ids = prev.ids.filter((id) => id !== cardId);
      return { ids, pile: ids.length === 0 ? null : prev.pile };
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const cid = bagCardIdFromSortable(id);
    if (cid) {
      const card = gs.myHand.find((c) => c.id === cid);
      setBagDragOverlayCard(card ?? null);
    } else {
      setBagDragOverlayCard(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setBagDragOverlayCard(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const curDraftIds = gs.myBagDraft?.cardIds ?? [];
    const curDecl = gs.myBagDraft?.declaredGood ?? declaredGood;
    const activeBagCardId = bagCardIdFromSortable(activeId);
    const overBagCardId = bagCardIdFromSortable(overId);

    if (
      curDraftIds.length > 0 &&
      gs.canDraftBag &&
      activeBagCardId &&
      overBagCardId &&
      curDraftIds.includes(activeBagCardId) &&
      curDraftIds.includes(overBagCardId) &&
      activeBagCardId !== overBagCardId
    ) {
      const oldIndex = curDraftIds.indexOf(activeBagCardId);
      const newIndex = curDraftIds.indexOf(overBagCardId);
      if (oldIndex >= 0 && newIndex >= 0) {
        sendAction({
          type: 'bag_draft',
          cardIds: arrayMove(curDraftIds, oldIndex, newIndex),
          declaredGood: curDecl,
        });
      }
      return;
    }

    if (
      activeBagCardId &&
      curDraftIds.includes(activeBagCardId) &&
      overId === 'sheriff-bag-hand-dropzone' &&
      gs.canDraftBag
    ) {
      sendAction({
        type: 'bag_draft',
        cardIds: curDraftIds.filter((id) => id !== activeBagCardId),
        declaredGood: curDecl,
      });
      return;
    }

    if (activeId.startsWith('staged-') && canDragHandToMarket) {
      if (overId === 'sheriff-hand-dropzone') {
        const cardId = activeId.slice('staged-'.length);
        removeCardFromMarketStaging(cardId);
        return;
      }
      if (overId === 'market-left' || overId === 'market-right') {
        toast.error('ลากกลับไปที่การ์ดในมือเพื่อคืนการ์ด');
      }
      return;
    }

    /** วางจากมือเข้าถุง: closestCenter มักชนการ์ดในร่าง (bag-draft-*) แทนกล่องโซน — ต้องยอมรับทั้งคู่ */
    const overBagDraftCardInZone = overBagCardId != null && curDraftIds.includes(overBagCardId);
    if (
      activeId.startsWith('hand-') &&
      canDragToBag &&
      (overId === 'sheriff-bag-draft-zone' || overBagDraftCardInZone)
    ) {
      const cardId = activeId.slice('hand-'.length);
      const cur = gs.myBagDraft?.cardIds ?? [];
      if (cur.includes(cardId)) return;
      if (cur.length >= 5) {
        toast.error('ใส่ในถุงได้สูงสุด 5 ใบ');
        return;
      }
      sendAction({ type: 'bag_draft', cardIds: [...cur, cardId], declaredGood: curDecl });
      return;
    }

    if (activeId.startsWith('hand-') && canDragHandToMarket) {
      if (overId === 'market-left' || overId === 'market-right') {
        const pile = overId === 'market-left' ? 0 : 1;
        const cardId = activeId.slice('hand-'.length);
        setMarketStaging((prev) => {
          if (prev.ids.includes(cardId)) return prev;
          if (prev.ids.length >= 5) return prev;
          if (prev.pile !== null && prev.pile !== pile) {
            toast.error('ทิ้งได้แค่กองเดียวต่อครั้ง — นำการ์ดออกจากรายการทิ้งแล้วลองใหม่');
            return prev;
          }
          return {
            pile: prev.pile === null ? pile : prev.pile,
            ids: [...prev.ids, cardId],
          };
        });
      }
    }
  };

  const toggleHandSelectForBag = (id: string) => {
    setSelectedHandForBagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleBagDraftSelectForHand = (id: string) => {
    setSelectedBagDraftIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const moveHandSelectionToBag = () => {
    if (!canDragToBag || selectedHandForBagIds.length === 0) return;
    const cur = gs.myBagDraft?.cardIds ?? [];
    const curDecl = gs.myBagDraft?.declaredGood ?? declaredGood;
    const toAdd = selectedHandForBagIds.filter(
      (id) => !cur.includes(id) && gs.myHand.some((c) => c.id === id),
    );
    if (toAdd.length === 0) return;
    const cap = 5 - cur.length;
    if (toAdd.length > cap) {
      toast.error('ใส่ในถุงได้สูงสุด 5 ใบ — เลือกน้อยลงหรือเอาออกจากถุงก่อน');
      return;
    }
    sendAction({ type: 'bag_draft', cardIds: [...cur, ...toAdd], declaredGood: curDecl });
    setSelectedHandForBagIds([]);
  };

  const moveBagSelectionToHand = () => {
    if (!gs.canDraftBag || selectedBagDraftIds.length === 0) return;
    const cur = gs.myBagDraft?.cardIds ?? [];
    const curDecl = gs.myBagDraft?.declaredGood ?? declaredGood;
    const remove = new Set(selectedBagDraftIds);
    sendAction({
      type: 'bag_draft',
      cardIds: cur.filter((id) => !remove.has(id)),
      declaredGood: curDecl,
    });
    setSelectedBagDraftIds([]);
  };

  const scheduleBribeToServer = (amount: number) => {
    if (!gs.canSetBribeFreely) return;
    if (bribeSendTimerRef.current) window.clearTimeout(bribeSendTimerRef.current);
    bribeSendTimerRef.current = window.setTimeout(() => {
      sendAction({ type: 'set_bribe', amount });
      bribeSendTimerRef.current = null;
    }, 120);
  };

  return (
    <div className="page container flex flex-col gap-4">
      {gs.phase === 'game_over' && (
        <div className="modal-overlay sheriff-game-over-overlay" role="dialog" aria-modal="true">
          <div className="modal sheriff-game-over-modal">
            <div className="sheriff-game-over-header">
              <h2 id="sheriff-game-over-title" className="sheriff-game-over-title">
                จบเกม
              </h2>
              <p className="sheriff-game-over-subtitle">อันดับจากคะแนนรวม (มาก → น้อย)</p>
            </div>

            {sortedScoreBreakdown.length > 0 ? (
              <ol
                className="sheriff-game-over-list"
                aria-label="ตารางคะแนน"
                aria-describedby="sheriff-game-over-title"
              >
                {sortedScoreBreakdown.map((r, index) => {
                  const rank = index + 1;
                  const rankLabel =
                    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
                  const isChampion = winnerIdSet.has(r.id);
                  return (
                    <li
                      key={r.id}
                      className={`sheriff-game-over-row${index === 0 ? ' sheriff-game-over-row--first' : ''}${isChampion ? ' sheriff-game-over-row--winner' : ''}`}
                    >
                      <span className="sheriff-game-over-rank" aria-hidden>
                        {rankLabel}
                      </span>
                      <div className="sheriff-game-over-main">
                        <div className="sheriff-game-over-name-row">
                          <span className="sheriff-game-over-name">{r.name}</span>
                          {isChampion ? (
                            <span className="sheriff-game-over-badge">แชมป์</span>
                          ) : null}
                        </div>
                        <div className="sheriff-game-over-breakdown">
                          <span>เงิน {r.coins}</span>
                          <span className="sheriff-game-over-breakdown-sep">·</span>
                          <span>แผง {r.goodsValue}</span>
                          <span className="sheriff-game-over-breakdown-sep">·</span>
                          <span>โบนัส {r.bonus}</span>
                        </div>
                      </div>
                      <span className="sheriff-game-over-total">{r.total}</span>
                    </li>
                  );
                })}
              </ol>
            ) : sortedWinners.length > 0 ? (
              <ol className="sheriff-game-over-list" aria-label="ผู้ชนะ">
                {sortedWinners.map((w, index) => {
                  const rank = index + 1;
                  const rankLabel =
                    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
                  return (
                    <li
                      key={w.id}
                      className={`sheriff-game-over-row sheriff-game-over-row--winner${index === 0 ? ' sheriff-game-over-row--first' : ''}`}
                    >
                      <span className="sheriff-game-over-rank" aria-hidden>
                        {rankLabel}
                      </span>
                      <div className="sheriff-game-over-main">
                        <div className="sheriff-game-over-name-row">
                          <span className="sheriff-game-over-name">{w.name}</span>
                          <span className="sheriff-game-over-badge">แชมป์</span>
                        </div>
                      </div>
                      <span className="sheriff-game-over-total">{w.score}</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="sheriff-game-over-empty">ไม่มีข้อมูลคะแนน</p>
            )}

            <div className="sheriff-game-over-actions">
              {onRestart ? (
                <Button type="button" variant="secondary" block size="md" onClick={onRestart}>
                  เล่นใหม่
                </Button>
              ) : (
                <p className="sheriff-game-over-wait-host">
                  รอหัวห้องกด «เล่นใหม่» เพื่อเริ่มรอบใหม่ในห้องนี้
                </p>
              )}
              <Button type="button" variant="primary" block size="md" onClick={onLeave}>
                กลับห้อง
              </Button>
            </div>
          </div>
        </div>
      )}

      {gs.lastInspection && gs.lastInspection.id !== showInspectionId && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal sheriff-inspection-modal">
            <h2>{gs.lastInspection.inspected ? '🕵️ ผลการตรวจถุง' : '🛡️ ผลการปล่อยผ่านถุง'}</h2>
            <p>
              <strong>{gs.lastInspection.sheriffName}</strong>{' '}
              {gs.lastInspection.inspected ? 'ตรวจถุง' : 'ปล่อยผ่านถุง'} ของ{' '}
              <strong>{gs.lastInspection.merchantName}</strong>
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              ของผ่านด่าน {gs.lastInspection.passedCount} ใบ · ถูกยึด{' '}
              {gs.lastInspection.confiscatedCount} ใบ
            </p>
            <p>
              Sheriff {gs.lastInspection.sheriffDelta >= 0 ? '+' : ''}
              {gs.lastInspection.sheriffDelta} เหรียญ · Merchant{' '}
              {gs.lastInspection.merchantDelta >= 0 ? '+' : ''}
              {gs.lastInspection.merchantDelta} เหรียญ
            </p>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
              ประกาศถุง: <strong>{CARD_LABEL[gs.lastInspection.declaredGood]}</strong>
              {gs.lastInspection.bribePaid > 0 ? (
                <>
                  {' '}
                  · สินบนที่จ่ายจริง <strong>{gs.lastInspection.bribePaid}</strong>
                </>
              ) : null}
            </p>
            <p
              className="sheriff-inspection-bag-hint"
              style={{ color: 'var(--text-secondary)', marginTop: 6 }}
            >
              {gs.lastInspection.inspected
                ? 'ด้านล่างคือของในถุงจริงหลังเปิดตรวจ (ผ่านด่าน / ถูกยึด)'
                : 'ด้านล่างคือของในถุงที่นำเข้า — เมื่อปล่อยผ่านของทั้งหมดนี้เข้าแผงตามกติกา'}
            </p>
            <div className="sheriff-inspection-reveal-list">
              {[...gs.lastInspection.passedCards, ...gs.lastInspection.confiscatedCards]
                .slice(0, inspectionRevealCount)
                .map((type, idx) => (
                  <div
                    key={`inspect-reveal-${idx}`}
                    className="sheriff-card-figure sheriff-inspection-reveal-item"
                  >
                    <img
                      src={CARD_IMAGE[type]}
                      alt={CARD_LABEL[type]}
                      className="sheriff-card-img"
                      loading="lazy"
                    />
                    <div className="sheriff-card-caption">{CARD_LABEL[type]}</div>
                  </div>
                ))}
            </div>
            <p
              className="sheriff-inspection-auto-close-hint"
              style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 10px' }}
            >
              ปิดอัตโนมัติใน 10 วินาที · หรือกดรับทราบ
            </p>
            <button
              className="btn btn-primary btn-block"
              onClick={() => setShowInspectionId(gs.lastInspection?.id ?? null)}
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={sheriffCollisionDetection}
        onDragStart={handleDragStart}
        onDragCancel={() => setBagDragOverlayCard(null)}
        onDragEnd={handleDragEnd}
      >
        <header className="phase-header">
          <h1 className="sheriff-game-title">Sheriff of Nottingham</h1>
          <div className="sheriff-game-status">
            <p className="sheriff-game-you">
              <span className="sheriff-game-you__label">คุณเล่นในนาม</span>
              <span className="sheriff-game-you__name">{gs.me.name}</span>
              {gs.me.id === gs.sheriffId ? (
                <span className="sheriff-game-role-pill sheriff-game-role-pill--sheriff">
                  Sheriff
                </span>
              ) : null}
              {gs.phase === 'merchant_market' && gs.activeMerchantId === gs.me.id ? (
                <span className="sheriff-badge sheriff-badge--merchant">พ่อค้า ตอนนี้</span>
              ) : null}
            </p>
            <dl className="sheriff-game-meta">
              <div className="sheriff-game-meta__row">
                <dt>นายอำเภอ รอบนี้</dt>
                <dd>{gs.sheriffName}</dd>
              </div>
              {gs.phase === 'parallel_bagging' ? (
                <div className="sheriff-game-meta__row">
                  <dt>ขั้นตอน</dt>
                  <dd>ทุกพ่อค้าร่างถุงและยืนยันส่งถุงให้ครบ</dd>
                </div>
              ) : gs.phase === 'sheriff_judging' ? (
                <div className="sheriff-game-meta__row">
                  <dt>ขั้นตอน</dt>
                  <dd>ส่งถุงครบแล้ว — Sheriff เลือกตรวจหรือผ่านแต่ละคน</dd>
                </div>
              ) : gs.activeMerchantName ? (
                <div className="sheriff-game-meta__row">
                  <dt>พ่อค้า กำลังขนของ</dt>
                  <dd>{gs.activeMerchantName}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          {gs.lastRoundSummary ? (
            <p className="sheriff-last-event sheriff-game-last">ล่าสุด: {gs.lastRoundSummary}</p>
          ) : null}
        </header>

        <section className="card sheriff-players-card">
          <details className="sheriff-players-accordion" open>
            <summary className="sheriff-players-summary">
              <span className="sheriff-section-title sheriff-players-summary__title">ผู้เล่น</span>
            </summary>
            <div className="sheriff-players-accordion-body">
              <p className="sheriff-section-desc">
                เหรียญ · การ์ดในมือ · แผงสินค้า (ชนิดซ้ำแสดง ×จำนวนใต้ภาพ)
              </p>
              <ul className="sheriff-player-list">
                {gs.players.map((p) => (
                  <li
                    key={p.id}
                    className={`sheriff-player-row ${p.id === gs.sheriffId ? 'sheriff-player-row--sheriff' : 'sheriff-player-row--merchant'}`}
                  >
                    <div className="sheriff-player-row__head">
                      <div className="sheriff-player-row__name">
                        {p.id === gs.sheriffId && sheriffHeadImageUrl ? (
                          <img
                            src={sheriffHeadImageUrl}
                            alt=""
                            className="sheriff-row-portrait"
                            width={40}
                            height={40}
                            loading="lazy"
                          />
                        ) : null}
                        <span>{p.name}</span>
                        {p.id === gs.sheriffId ? (
                          <span className="sheriff-badge sheriff-badge--gold">นายอำเภอ</span>
                        ) : (
                          <span className="sheriff-badge sheriff-badge--merchant">พ่อค้า</span>
                        )}
                      </div>
                      <dl className="sheriff-player-row__stats">
                        <div>
                          <dt>เหรียญ</dt>
                          <dd>{p.coins}</dd>
                        </div>
                        <div>
                          <dt>ในมือ</dt>
                          <dd>{p.handCount}</dd>
                        </div>
                        <div>
                          <dt>แผง</dt>
                          <dd>{p.stallCount}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="sheriff-player-row__stall" aria-label={`แผงสินค้า ${p.name}`}>
                      {p.stallGroups.length === 0 ? (
                        <span className="sheriff-player-stall-empty">แผงว่าง</span>
                      ) : (
                        p.stallGroups.map((g) => (
                          <div key={g.type} className="sheriff-player-stall-pile">
                            <img
                              src={CARD_IMAGE[g.type]}
                              alt={CARD_LABEL[g.type]}
                              className="sheriff-player-stall-img"
                              loading="lazy"
                              title={CARD_LABEL[g.type]}
                            />
                            {g.count > 1 ? (
                              <span className="sheriff-player-stall-count">×{g.count}</span>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </section>

        <section className="card sheriff-market-card">
          <h2 className="sheriff-section-title">ตลาด</h2>
          <p className="sheriff-section-desc">
            {canDragHandToMarket
              ? 'ลากการ์ดจากมือไปทิ้งกองซ้ายหรือขวา (สูงสุด 5 ใบ ต่อครั้ง) แล้วกด “จั่ว N ใบ” ที่กองจั่วหรือกองทิ้งอีกฝั่ง — เลือกได้แหล่งเดียว'
              : gs.canMarketNow && gs.myHand.length <= 1
                ? 'มือเหลือ 1 ใบ — ไม่สามารถทิ้งการ์ดในขั้นตอนตลาดได้'
                : 'กองทิ้งซ้าย / กองจั่ว / กองทิ้งขวา — ดูสถานะกองและเปิดดูการ์ดในกองได้'}
          </p>
          {gs.canMarketNow ? (
            <div className="sheriff-market-pass-row">
              <Button
                variant="primary"
                onClick={() => {
                  setMarketStaging({ pile: null, ids: [] });
                  sendAction({ type: 'merchant_market_pass' });
                }}
                disabled={!canDragHandToMarket}
              >
                ผ่าน — ไม่ทิ้งการ์ด
              </Button>
              <p className="sheriff-market-pass-hint">
                ข้ามการทิ้งและจั่วในรอบตลาดนี้ — ไปคิวถัดไปหรือจบตลาด
              </p>
            </div>
          ) : null}
          {canDragHandToMarket && nStaging > 0 ? (
            <p className="sheriff-market-staging-hint">
              กำลังทิ้ง <strong>{nStaging}</strong> ใบไปกอง
              {marketStaging.pile === 0 ? 'ซ้าย' : 'ขวา'} — การ์ดอยู่ที่กองทิ้ง ·
              ลากกลับมาที่มือเพื่อคืน หรือกดจั่วเมื่อพร้อม
            </p>
          ) : null}
          <div className="sheriff-market-trio">
            <MarketPileSlot
              side="left"
              topType={gs.discardTopLeft}
              count={gs.discardLeftCount}
              onOpenStack={() => setPileModal('left')}
              canDrop={canDragHandToMarket}
              drawButton={leftDrawButton}
              stagedCards={stagedForLeft}
              remoteStaging={remoteLeft}
              onPeekStaged={(t) => setHandZoomType(t)}
            />
            <DeckPileSlot drawPileCount={gs.drawPileCount} drawButton={deckDrawButton} />
            <MarketPileSlot
              side="right"
              topType={gs.discardTopRight}
              count={gs.discardRightCount}
              onOpenStack={() => setPileModal('right')}
              canDrop={canDragHandToMarket}
              drawButton={rightDrawButton}
              stagedCards={stagedForRight}
              remoteStaging={remoteRight}
              onPeekStaged={(t) => setHandZoomType(t)}
            />
          </div>
        </section>

        {gs.phase === 'sheriff_judging' &&
        gs.me.id !== gs.sheriffId &&
        gs.merchantBribeOffers &&
        gs.merchantBribeOffers.length > 0 ? (
          <section className="card sheriff-judge-offers-card" style={{ marginBottom: 16 }}>
            <h3 className="sheriff-bag-card__title">สินบน (อัปเดตแบบเรียลไทม์)</h3>
            <p className="sheriff-section-desc">
              พ่อค้าปรับจำนวนได้จนกว่า Sheriff จะกดตรวจหรือผ่าน — ผ่านแล้ว Sheriff
              เก็บสินบนตามที่เห็นตอนกด
            </p>
            <ul className="sheriff-judge-offer-list">
              {gs.merchantBribeOffers.map((o) => (
                <li key={o.playerId} className="sheriff-judge-offer-row">
                  <span className="sheriff-judge-offer-name">{o.name}</span>
                  <span className="sheriff-judge-offer-amount">{o.amount} เหรียญ</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {gs.phase === 'sheriff_judging' && gs.canSetBribeFreely ? (
          <section className="card sheriff-bag-card" style={{ marginBottom: 16 }}>
            <h3 className="sheriff-bag-card__title">เสนอสินบน</h3>
            <p className="sheriff-section-desc">
              พิมพ์จำนวนได้ตลอด — ทุกคนเห็นยอดด้านบน · หาก Sheriff กดผ่าน คุณจ่ายตามยอดนี้ ·
              หากถูกตรวจ สินบนจะไม่ถูกเก็บ
            </p>
            <div className="sheriff-bribe-with-bag">
              <div className="sheriff-bribe-with-bag__input-col w-72">
                <div className="sheriff-bag-bribe-row">
                  <input
                    type="number"
                    className="input sheriff-bag-bribe-input"
                    min={0}
                    max={gs.me.coins}
                    value={bribeAmount}
                    onChange={(e) => {
                      const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                      setBribeAmount(n);
                      scheduleBribeToServer(n);
                    }}
                    aria-label="จำนวนเหรียญสินบน"
                  />
                </div>
                <p className="sheriff-card-caption">คุณมี {gs.me.coins} เหรียญ</p>
              </div>
              <div
                className="sheriff-bribe-with-bag__bag-col"
                aria-label="การ์ดในถุงที่ส่งแล้ว (ดูอย่างเดียว)"
              >
                <p className="sheriff-bribe-with-bag__bag-label">ถุงของคุณ</p>
                <div className="sheriff-bag-draft-inner sheriff-bag-draft-inner--readonly sheriff-bribe-with-bag__cards">
                  {gs.myBag.length === 0 ? (
                    <p className="sheriff-bag-draft-placeholder">—</p>
                  ) : (
                    gs.myBag.map((card) => (
                      <BagSubmittedReadonlyCard
                        key={card.id}
                        card={card}
                        onPeek={(t) => setHandZoomType(t)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {gs.canInspectNow && gs.sheriffMerchantPanels && gs.sheriffMerchantPanels.length > 0 ? (
          <section className="card sheriff-judge-panels-card" style={{ marginBottom: 16 }}>
            <h3 className="sheriff-bag-card__title">คุณคือ Sheriff — เลือกตรวจหรือผ่านแต่ละคน</h3>
            <p className="sheriff-section-desc">
              ผ่าน = เก็บสินบนตามยอดด้านบน · ตรวจ = ไม่เก็บสินบน แล้วไล่ไพ่ในถุงตามกติกา
            </p>
            <div className="sheriff-judge-grid">
              {gs.sheriffMerchantPanels.map((panel) => (
                <div
                  key={panel.playerId}
                  className={`sheriff-judge-panel${panel.pending ? '' : ' sheriff-judge-panel--done'}`}
                >
                  <div className="sheriff-judge-panel__name">{panel.name}</div>
                  <div className="sheriff-judge-panel__decl">
                    ประกาศ: <strong>{CARD_LABEL[panel.declaredGood]}</strong>
                  </div>
                  <div className="sheriff-judge-panel__bribe">
                    สินบน: <strong>{panel.bribe}</strong> เหรียญ
                  </div>
                  {panel.pending ? (
                    <div className="sheriff-judge-panel__actions">
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() =>
                          sendAction({
                            type: 'sheriff_decide',
                            targetMerchantId: panel.playerId,
                            inspect: true,
                          })
                        }
                      >
                        ตรวจ
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          sendAction({
                            type: 'sheriff_decide',
                            targetMerchantId: panel.playerId,
                            inspect: false,
                          })
                        }
                      >
                        ผ่าน
                      </button>
                    </div>
                  ) : (
                    <p className="sheriff-judge-panel__done">ตัดสินแล้ว</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {(gs.canDraftBag || gs.canSubmitBagNow || waitingForOthersBags) && (
          <div className="card sheriff-bag-card" style={{ marginBottom: 16 }}>
            <div className="sheriff-bag-card__title-row">
              <h3 className="sheriff-bag-card__title">ร่างถุงสินค้า (1–5 ใบ)</h3>
              {!waitingForOthersBags && gs.canDraftBag && selectedBagDraftIds.length > 0 ? (
                <Button variant="secondary" size="sm" onClick={moveBagSelectionToHand}>
                  คืนมือ ({selectedBagDraftIds.length})
                </Button>
              ) : null}
            </div>

            {waitingForOthersBags ? (
              <>
                <p className="sheriff-section-desc" style={{ marginBottom: 12 }}>
                  คุณยืนยันส่งถุงแล้ว — รอให้พ่อค้าคนอื่นกดยืนยันส่งถุงให้ครบทุกคน
                  จากนั้นจะเข้าสู่ขั้นให้ Sheriff เลือกตรวจหรือผ่าน
                </p>
                <p className="sheriff-bag-decl-label">ประกาศว่าเป็นสินค้าถูกกฎหมายประเภทใด</p>
                <div
                  className="sheriff-bag-decl-strip sheriff-bag-decl-strip--readonly"
                  role="group"
                  aria-label="ประเภทที่ประกาศ (ดูอย่างเดียว)"
                >
                  {LEGAL_DECLARATION.map((g) => (
                    <button
                      key={g}
                      type="button"
                      disabled
                      className={`sheriff-bag-decl-chip${(gs.myDeclaredGood ?? declaredGood) === g ? ' sheriff-bag-decl-chip--active' : ''}`}
                    >
                      {CARD_LABEL[g]}
                    </button>
                  ))}
                </div>
                <SheriffBagDraftDropzone disabled>
                  <div className="sheriff-bag-draft-inner sheriff-bag-draft-inner--readonly">
                    {gs.myBag.length === 0 ? (
                      <p className="sheriff-bag-draft-placeholder">—</p>
                    ) : (
                      gs.myBag.map((card) => (
                        <BagSubmittedReadonlyCard
                          key={card.id}
                          card={card}
                          onPeek={(t) => setHandZoomType(t)}
                        />
                      ))
                    )}
                  </div>
                </SheriffBagDraftDropzone>
              </>
            ) : (
              <>
                <p className="sheriff-section-desc" style={{ marginBottom: 10 }}>
                  คลิกการ์ดในร่างถุงหลายใบแล้วกด «คืนมือ» มุมขวาบน · หรือลากการ์ดจากมือมาวางในถุง
                  จัดเรียงได้อิสระ · เลือกประเภทที่ประกาศจากแถบด้านล่าง ·
                  ลากการ์ดจากถุงกลับมาที่มือเพื่อเอาออก · เมื่อทุกพ่อค้าจบตลาดแล้ว
                  ให้กดยืนยันส่งถุงให้ครบทุกคน (ไม่ต้องรอคิว)
                </p>
                <p className="sheriff-bag-decl-label">ประกาศว่าเป็นสินค้าถูกกฎหมายประเภทใด</p>
                <div
                  className="sheriff-bag-decl-strip"
                  role="group"
                  aria-label="เลือกประเภทสินค้าที่ประกาศ"
                >
                  {LEGAL_DECLARATION.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`sheriff-bag-decl-chip${draftDecl === g ? ' sheriff-bag-decl-chip--active' : ''}`}
                      onClick={() => pickDeclaration(g)}
                    >
                      {CARD_LABEL[g]}
                    </button>
                  ))}
                </div>
                <SheriffBagDraftDropzone disabled={!gs.canDraftBag}>
                  <SortableContext
                    items={draftIds.map(bagSortableId)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="sheriff-bag-draft-inner">
                      {draftCardsResolved.length === 0 ? (
                        <p className="sheriff-bag-draft-placeholder">
                          ลากการ์ดจากมือมาวางที่นี่ (สูงสุด 5 ใบ)
                        </p>
                      ) : (
                        draftCardsResolved.map((card) => (
                          <BagDraftSortableCard
                            key={card.id}
                            card={card}
                            canDrag={gs.canDraftBag}
                            onPeek={(t) => setHandZoomType(t)}
                            selectForHand={
                              gs.canDraftBag
                                ? {
                                    selected: selectedBagDraftIds.includes(card.id),
                                    onToggle: () => toggleBagDraftSelectForHand(card.id),
                                  }
                                : undefined
                            }
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </SheriffBagDraftDropzone>
              </>
            )}
            {showParallelBagSubmitButton ? (
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                onClick={submitBagToSheriff}
                disabled={waitingForOthersBags || !gs.canSubmitBagNow || draftIds.length < 1}
              >
                ส่งถุงให้ Sheriff ตรวจ ({parallelBagSubmitted}/{parallelBagTotal})
              </button>
            ) : null}
          </div>
        )}

        <section className="card sheriff-hand-card">
          <div className="sheriff-section-head sheriff-hand-section-head">
            <h2 className="sheriff-section-title">การ์ดในมือ ({handCardsForDisplay.length})</h2>
            {canDragToBag && selectedHandForBagIds.length > 0 ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={moveHandSelectionToBag}
              >
                ใส่ถุง ({selectedHandForBagIds.length})
              </button>
            ) : null}
          </div>
          <p className="sheriff-section-desc">
            {!canInteractHand
              ? 'ตอนนี้ไม่ใช่ตาคุณในตลาดหรือร่างถุง — ดูการ์ดในมืออย่างเดียว (ลากไม่ได้)'
              : gs.canMarketNow
                ? 'ลากจากมือไปกองทิ้ง (สูงสุด 5 ใบ) — การ์ดจะไปอยู่ที่กอง · ลากจากกองกลับมาที่มือเพื่อคืนก่อนกดจั่ว'
                : gs.canDraftBag
                  ? 'คลิกการ์ดหลายใบแล้วกด «ใส่ถุง» มุมขวาบน · หรือลากการ์ดไปยังโซน “ร่างถุง” ด้านบน — การ์ดในมือที่ยังไม่ได้ใส่ถุงแสดงที่นี่'
                  : 'ดูการ์ดในมือ'}
          </p>
          {gs.canMarketNow ? (
            <SheriffHandMarketDropzone disabled={!canDragHandToMarket}>
              <div className="sheriff-card-grid sheriff-hand-grid">
                {handCardsForDisplay.map((card) => (
                  <DraggableHandCard
                    key={card.id}
                    card={card}
                    canDragToMarket={canDragHandToMarket}
                    canDragToBag={false}
                    interactive={canInteractHand}
                    onPeek={(t) => setHandZoomType(t)}
                  />
                ))}
              </div>
            </SheriffHandMarketDropzone>
          ) : gs.canDraftBag ? (
            <SheriffHandBagDropzone disabled={!canDragToBag}>
              <div className="sheriff-card-grid sheriff-hand-grid">
                {handCardsForDisplay.map((card) => (
                  <DraggableHandCard
                    key={card.id}
                    card={card}
                    canDragToMarket={false}
                    canDragToBag={canDragToBag}
                    interactive={canInteractHand}
                    onPeek={(t) => setHandZoomType(t)}
                    selectForBag={
                      canDragToBag
                        ? {
                            selected: selectedHandForBagIds.includes(card.id),
                            onToggle: () => toggleHandSelectForBag(card.id),
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            </SheriffHandBagDropzone>
          ) : (
            <div className="sheriff-card-grid sheriff-hand-grid">
              {handCardsForDisplay.map((card) => (
                <DraggableHandCard
                  key={card.id}
                  card={card}
                  canDragToMarket={false}
                  canDragToBag={false}
                  interactive={canInteractHand}
                  onPeek={(t) => setHandZoomType(t)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="card sheriff-stall-card">
          <h2 className="sheriff-section-title">แผงสินค้าของคุณ ({gs.myStall.length})</h2>
          {gs.myStall.length === 0 ? (
            <p className="sheriff-section-desc" style={{ marginBottom: 0 }}>
              ยังไม่มีสินค้าในแผง
            </p>
          ) : (
            <div className="sheriff-card-grid">
              {gs.myStall.map((card) => (
                <div key={`stall-${card.id}`} className="sheriff-card-figure">
                  <img
                    src={CARD_IMAGE[card.type]}
                    alt={CARD_LABEL[card.type]}
                    className="sheriff-card-img"
                    loading="lazy"
                  />
                  <div className="sheriff-card-caption">{CARD_LABEL[card.type]}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <DragOverlay
          className="sheriff-bag-drag-overlay-root"
          dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }}
        >
          {bagDragOverlayCard ? (
            <div className="sheriff-bag-draft-card sheriff-bag-draft-card--overlay">
              <div className="sheriff-bag-draft-drag">
                <img
                  src={CARD_IMAGE[bagDragOverlayCard.type]}
                  alt={CARD_LABEL[bagDragOverlayCard.type]}
                  className="sheriff-card-img"
                  loading="lazy"
                />
                <div className="sheriff-card-caption">{CARD_LABEL[bagDragOverlayCard.type]}</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <SheriffHandZoomModal cardType={handZoomType} onClose={() => setHandZoomType(null)} />

      {gs.marketDrawReveal ? <MarketDrawRevealModal reveal={gs.marketDrawReveal} /> : null}

      {pileModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheriff-pile-modal-title"
          onClick={() => setPileModal(null)}
        >
          <div className="modal sheriff-pile-modal" onClick={(e) => e.stopPropagation()}>
            <h2 id="sheriff-pile-modal-title">
              {pileModal === 'left' ? 'กองทิ้งซ้าย' : 'กองทิ้งขวา'} — จากบนลงล่าง
            </h2>
            <p className="sheriff-section-desc">
              ใบบนสุดอยู่ด้านบนของรายการ · แสดงสูงสุด 5 ใบล่าสุดที่ทิ้ง
              {(pileModal === 'left' ? gs.discardLeftCount : gs.discardRightCount) > 5
                ? ' (มีการ์ดในกองมากกว่านี้)'
                : ''}
            </p>
            <ol className="sheriff-pile-modal-list">
              {(pileModal === 'left' ? gs.discardLeftPreview : gs.discardRightPreview).map(
                (type, idx) => (
                  <li key={`pile-${pileModal}-${idx}`} className="sheriff-pile-modal-item">
                    <span className="sheriff-pile-modal-rank">{idx + 1}</span>
                    <img
                      src={CARD_IMAGE[type]}
                      alt={CARD_LABEL[type]}
                      className="sheriff-pile-modal-img"
                      loading="lazy"
                    />
                    <span>{CARD_LABEL[type]}</span>
                  </li>
                ),
              )}
            </ol>
            {(pileModal === 'left' ? gs.discardLeftPreview : gs.discardRightPreview).length ===
            0 ? (
              <p className="sheriff-section-desc">ยังไม่มีการ์ดในกอง</p>
            ) : null}
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => setPileModal(null)}
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <button type="button" className="btn btn-danger" onClick={onLeave}>
          ออกจากห้อง
        </button>
      </div>
    </div>
  );
}
