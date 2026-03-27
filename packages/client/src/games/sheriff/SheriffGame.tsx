import { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SheriffAction, SheriffCard, SheriffLegalGood, SheriffPlayerView } from 'shared';
import applesImg from '../../assets/sheriff/apples.jpg';
import cheeseImg from '../../assets/sheriff/cheese.jpg';
import breadImg from '../../assets/sheriff/bread.jpg';
import chickenImg from '../../assets/sheriff/chicken.jpg';
import pepperImg from '../../assets/sheriff/pepper.jpg';
import meadImg from '../../assets/sheriff/mead.jpg';
import silkImg from '../../assets/sheriff/silk.jpg';
import crossbowImg from '../../assets/sheriff/crossbow.jpg';
import feastPlateImg from '../../assets/sheriff/feast-plate.jpg';

interface Props {
  gameState: SheriffPlayerView;
  myId: string;
  sendAction: (action: SheriffAction) => void;
  onLeave: () => void;
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
};

const LEGAL_DECLARATION: SheriffLegalGood[] = ['apple', 'cheese', 'bread', 'chicken'];
const DRAW_SOURCE_LABEL: Record<'deck' | 'left' | 'right', string> = {
  deck: 'Deck',
  left: 'กองซ้าย',
  right: 'กองขวา',
};
const DRAW_SOURCE_CLASS: Record<'deck' | 'left' | 'right', string> = {
  deck: 'deck',
  left: 'left',
  right: 'right',
};

interface SortableDrawStepProps {
  stepId: string;
  index: number;
  source: 'deck' | 'left' | 'right';
  onRemove: () => void;
}

interface DraggableSourceChipProps {
  source: 'deck' | 'left' | 'right';
}

function DraggableSourceChip({ source }: DraggableSourceChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${source}`,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
  };
  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      className={`btn btn-secondary sheriff-draw-source-chip ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      + {DRAW_SOURCE_LABEL[source]}
    </button>
  );
}

function SortableDrawStep({ stepId, index, source, onRemove }: SortableDrawStepProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stepId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sheriff-draw-step source-${DRAW_SOURCE_CLASS[source]} ${isDragging ? 'dragging' : ''}`}
    >
      <button type="button" className="sheriff-draw-step-handle" {...attributes} {...listeners}>
        ::
      </button>
      <span>
        {index + 1}. {DRAW_SOURCE_LABEL[source]}
      </span>
      <button type="button" className="sheriff-draw-step-remove" onClick={onRemove}>
        ลบ
      </button>
    </div>
  );
}

export function SheriffGame({ gameState: gs, sendAction, onLeave }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [declaredGood, setDeclaredGood] = useState<SheriffLegalGood>('apple');
  const [discardPileIndex, setDiscardPileIndex] = useState<0 | 1>(0);
  const [drawFrom, setDrawFrom] = useState<Array<'deck' | 'left' | 'right'>>([]);
  const [showInspectionId, setShowInspectionId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const toggleCard = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const submitBag = () => {
    if (!gs.canBagNow || selectedIds.length < 1) return;
    sendAction({ type: 'set_bag', cardIds: selectedIds, declaredGood });
    setSelectedIds([]);
  };

  useEffect(() => {
    setDrawFrom((prev) => prev.slice(0, selectedIds.length));
  }, [selectedIds.length]);

  const appendDrawSource = (source: 'deck' | 'left' | 'right') => {
    setDrawFrom((prev) => {
      if (prev.length >= selectedIds.length) return prev;
      return [...prev, source];
    });
  };

  const removeDrawSourceAt = (idx: number) => {
    setDrawFrom((prev) => prev.filter((_, i) => i !== idx));
  };

  const drawStepIds = drawFrom.map((_, idx) => `step-${idx}`);
  const { setNodeRef: setDropzoneRef, isOver: isDropzoneOver } = useDroppable({ id: 'draw-dropzone' });

  const handleDrawStepDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId.startsWith('palette-')) {
      const source = activeId.replace('palette-', '') as 'deck' | 'left' | 'right';
      if (source === 'deck' || source === 'left' || source === 'right') {
        if (overId === 'draw-dropzone' || overId.startsWith('step-')) appendDrawSource(source);
      }
      return;
    }
    if (activeId === overId) return;
    const oldIndex = drawStepIds.indexOf(activeId);
    const newIndex = drawStepIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;
    setDrawFrom((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const submitMarket = () => {
    if (!gs.canMarketNow) return;
    if (drawFrom.length !== selectedIds.length) return;
    sendAction({ type: 'merchant_market', discardCardIds: selectedIds, discardPileIndex, drawFrom });
    setSelectedIds([]);
    setDrawFrom([]);
  };

  return (
    <div className="page container">
      <div className="phase-header">
        <h1>Sheriff of Nottingham</h1>
        <p>
          Sheriff: <strong>{gs.sheriffName}</strong>
          {gs.activeMerchantName ? (
            <>
              {' '}
              · Merchant ตอนนี้: <strong>{gs.activeMerchantName}</strong>
            </>
          ) : null}
        </p>
        {gs.lastRoundSummary && <p className="ek-last-event">ล่าสุด: {gs.lastRoundSummary}</p>}
      </div>

      {gs.phase === 'game_over' && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>🏆 จบเกม</h2>
            <div className="vote-results">
              {(gs.winners ?? []).map((w) => (
                <div key={w.id} className="vote-result-item approve">
                  {w.name}: {w.score}
                </div>
              ))}
            </div>
            {gs.scoreBreakdown && (
              <div className="card" style={{ marginTop: 12 }}>
                <h3>สรุปคะแนน</h3>
                <div className="vote-results">
                  {gs.scoreBreakdown.map((r) => (
                    <div key={`score-${r.id}`} className="vote-result-item approve">
                      <div>{r.name}</div>
                      <div style={{ fontSize: 12 }}>
                        เงิน {r.coins} + แผง {r.goodsValue} + โบนัส {r.bonus}
                      </div>
                      <div style={{ fontWeight: 700 }}>รวม {r.total}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button className="btn btn-primary btn-block" onClick={onLeave}>
              กลับห้อง
            </button>
          </div>
        </div>
      )}

      {gs.lastInspection &&
        `${gs.lastInspection.sheriffId}:${gs.lastInspection.merchantId}:${gs.lastInspection.inspected}:${gs.lastInspection.confiscatedCount}` !==
          showInspectionId && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal">
              <h2>🕵️ ผลการตรวจ</h2>
              <p>
                <strong>{gs.lastInspection.sheriffName}</strong>{' '}
                {gs.lastInspection.inspected ? 'ตรวจถุง' : 'ปล่อยผ่านถุง'} ของ{' '}
                <strong>{gs.lastInspection.merchantName}</strong>
              </p>
              <p style={{ color: 'var(--text-secondary)' }}>
                ของผ่านด่าน {gs.lastInspection.passedCount} ใบ · ถูกยึด {gs.lastInspection.confiscatedCount} ใบ
              </p>
              <p>
                Sheriff {gs.lastInspection.sheriffDelta >= 0 ? '+' : ''}
                {gs.lastInspection.sheriffDelta} เหรียญ · Merchant {gs.lastInspection.merchantDelta >= 0 ? '+' : ''}
                {gs.lastInspection.merchantDelta} เหรียญ
              </p>
              <button
                className="btn btn-primary btn-block"
                onClick={() =>
                  setShowInspectionId(
                    `${gs.lastInspection?.sheriffId}:${gs.lastInspection?.merchantId}:${gs.lastInspection?.inspected}:${gs.lastInspection?.confiscatedCount}`,
                  )
                }
              >
                รับทราบ
              </button>
            </div>
          </div>
        )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>ผู้เล่น</h3>
        <div className="vote-results">
          {gs.players.map((p) => (
            <div key={p.id} className={`vote-result-item ${p.id === gs.sheriffId ? 'reject' : 'approve'}`}>
              <div>{p.name}</div>
              <div style={{ fontSize: 12 }}>Coins: {p.coins}</div>
              <div style={{ fontSize: 12 }}>Hand: {p.handCount} · Stall: {p.stallCount}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>ตลาด (Discard Piles)</h3>
        <div className="ek-card-grid">
          <div className="ek-card-figure">
            {gs.discardTopLeft ? (
              <img
                src={CARD_IMAGE[gs.discardTopLeft]}
                alt={CARD_LABEL[gs.discardTopLeft]}
                className="ek-card-img"
                loading="lazy"
              />
            ) : (
              <div className="ek-card-caption">ว่าง</div>
            )}
            <div className="ek-card-caption">กองซ้าย ({gs.discardLeftCount})</div>
          </div>
          <div className="ek-card-figure">
            {gs.discardTopRight ? (
              <img
                src={CARD_IMAGE[gs.discardTopRight]}
                alt={CARD_LABEL[gs.discardTopRight]}
                className="ek-card-img"
                loading="lazy"
              />
            ) : (
              <div className="ek-card-caption">ว่าง</div>
            )}
            <div className="ek-card-caption">กองขวา ({gs.discardRightCount})</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>แผงสินค้าของคุณ ({gs.myStall.length})</h3>
        {gs.myStall.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>ยังไม่มีสินค้าในแผง</p>
        ) : (
          <div className="ek-card-grid">
            {gs.myStall.map((card) => (
              <div key={`stall-${card.id}`} className="ek-card-figure">
                <img src={CARD_IMAGE[card.type]} alt={CARD_LABEL[card.type]} className="ek-card-img" loading="lazy" />
                <div className="ek-card-caption">{CARD_LABEL[card.type]}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {gs.canInspectNow && gs.activeMerchantName && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>คุณคือ Sheriff</h3>
          <p>
            ตรวจถุงของ <strong>{gs.activeMerchantName}</strong> หรือปล่อยผ่าน
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger" onClick={() => sendAction({ type: 'sheriff_decide', inspect: true })}>
              Inspect
            </button>
            <button className="btn btn-secondary" onClick={() => sendAction({ type: 'sheriff_decide', inspect: false })}>
              Pass
            </button>
          </div>
        </div>
      )}

      {gs.canBagNow && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>จัดถุงสินค้า (1-5 ใบ)</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {LEGAL_DECLARATION.map((g) => (
              <button
                key={g}
                className={`btn ${declaredGood === g ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDeclaredGood(g)}
              >
                ประกาศเป็น {CARD_LABEL[g]}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={submitBag} disabled={selectedIds.length < 1}>
            ส่งถุง ({selectedIds.length}/5)
          </button>
        </div>
      )}

      {gs.canMarketNow && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Market Phase</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            เลือกการ์ดในมือที่จะทิ้ง, เลือกว่าจะทิ้งลงกองซ้ายหรือขวา, แล้วกำหนดแหล่งจั่วทีละใบ
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              className={`btn ${discardPileIndex === 0 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDiscardPileIndex(0)}
            >
              ทิ้งลงกองซ้าย
            </button>
            <button
              className={`btn ${discardPileIndex === 1 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDiscardPileIndex(1)}
            >
              ทิ้งลงกองขวา
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDrawStepDragEnd}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <DraggableSourceChip source="deck" />
              <DraggableSourceChip source="left" />
              <DraggableSourceChip source="right" />
              <button className="btn btn-danger" onClick={() => setDrawFrom([])}>
                ล้างลำดับจั่ว
              </button>
            </div>
            <div className="sheriff-draw-order-wrap">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                ลาก source ลงลิสต์เพื่อเพิ่ม และลากในลิสต์เพื่อสลับ ({drawFrom.length}/{selectedIds.length})
              </p>
              {drawFrom.length === 0 ? (
                <div
                  ref={setDropzoneRef}
                  className={`sheriff-draw-order-empty ${isDropzoneOver ? 'is-drop-target' : ''}`}
                >
                  ยังไม่ได้เพิ่มลำดับจั่ว (วาง source ที่นี่)
                </div>
              ) : (
                <div
                  ref={setDropzoneRef}
                  className={`sheriff-draw-order-dropzone ${isDropzoneOver ? 'is-drop-target' : ''}`}
                >
                <SortableContext items={drawStepIds} strategy={verticalListSortingStrategy}>
                  <div className="sheriff-draw-order-list">
                    {drawFrom.map((source, idx) => (
                      <SortableDrawStep
                        key={`draw-${idx}`}
                        stepId={drawStepIds[idx]}
                        index={idx}
                        source={source}
                        onRemove={() => removeDrawSourceAt(idx)}
                      />
                    ))}
                  </div>
                </SortableContext>
                </div>
              )}
            </div>
          </DndContext>
          <button className="btn btn-primary" onClick={submitMarket}>
            ยืนยัน Market ({selectedIds.length} ใบ)
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>การ์ดในมือ ({gs.myHand.length})</h3>
        <div className="ek-card-grid">
          {gs.myHand.map((card) => {
            const selected = selectedIds.includes(card.id);
            return (
              <button
                key={card.id}
                className="ek-hand-card-button"
                onClick={() => (gs.canBagNow || gs.canMarketNow) && toggleCard(card.id)}
                style={selected ? { borderColor: 'var(--accent)' } : undefined}
              >
                <img src={CARD_IMAGE[card.type]} alt={CARD_LABEL[card.type]} className="ek-card-img" loading="lazy" />
                <div className="ek-card-caption">{CARD_LABEL[card.type]}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-danger" onClick={onLeave}>
          ออกจากห้อง
        </button>
      </div>
    </div>
  );
}

