import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type {
  ExplodingKittensAction,
  ExplodingKittensCard,
  ExplodingKittensCardType,
  ExplodingKittensPlayerView,
} from 'shared';
import { isCatCard, validateFiveDistinctCatCombo, validateSameCatCombo } from 'shared';
import { Button, Input, Slider } from '../../components/ui';
import { fireDefuseDrawConfetti, startWinCelebrationLoop } from '../../utils/winCelebration';
import { LogOut, RotateCcw } from 'lucide-react';
import { ExplodingKittensSingleCardModal } from './components/ExplodingKittensSingleCardModal';
import { EkTopThreeModal } from './components/EkTopThreeModal';
import { CARD_BACK_URL, CARD_IMAGE, CARD_LABEL } from './lib/cardMeta';
import { buildTurnCellClass, getPlayerFrontRowBadges, spotlightColClass } from './lib/playerBadges';
import { getTurnSpotlight } from './lib/turnSpotlight';
import { getReactionOneLiner } from './lib/reactionOneLiner';
import { EkModalTurnOrderStrip, EkSpotlightFrontBadges } from './components/EkTurnOrderUi';
import { getTurnOrderDockHint } from './lib/turnOrderDockHint';
import { EkSortableHandCard } from './components/EkSortableHandCard';
import { ExplodingKittensDeckStack } from './components/ExplodingKittensDeckStack';
import { ExplosionGif } from './components/ExplosionGif';
import './exploding-kittens.css';

interface Props {
  gameState: ExplodingKittensPlayerView;
  myId: string;
  sendAction: (action: ExplodingKittensAction) => void;
  onLeave: () => void;
  /** เฉพาะหัวห้อง — เริ่มรอบใหม่ในห้องเดิม */
  onRestart?: () => void;
}

/** โหมด reaction — ไม่เลือก Nope/ผ่าน ภายในเวลานี้จะส่งผ่านอัตโนมัติ */
const REACTION_AUTO_PASS_MS = 10_000;

const EK_PHASE_HINT: Partial<Record<ExplodingKittensPlayerView['phase'], string>> = {
  reaction: 'รอให้ทุกคนตอบ Nope / Pass',
  explosion_reveal: 'เปิดการ์ดระเบิด',
  defuse_prompt: 'ผู้จั่วระเบิดตัดสินใจ Defuse',
  defuse_reinsert: 'เลือกตำแหน่งใส่ระเบิดกลับกอง',
  bury_draw: 'จั่ว 1 ใบเพื่อฝังกลับกอง (Bury)',
  bury_reinsert: 'เลือกตำแหน่งฝังการ์ดกลับกอง (Bury)',
  favor_target: 'เลือกเป้าหมาย Favor',
  favor_give: 'เลือกการ์ดมอบให้ (Favor)',
  targeted_attack_target: 'เลือกเป้าหมาย Targeted Attack',
  five_cats_pick_discard: 'เลือกการ์ดจากกองทิ้ง (คอมโบ 5 แมว)',
  alter_future_reorder: 'จัดลำดับ 3 ใบบนสุดของกองจั่ว',
  ill_take_target: "เลือกเป้าหมาย I'll Take That",
  potluck: 'วางการ์ด 1 ใบบนกองจั่ว (Potluck)',
  barking_kitten_show: 'Barking Kitten — ทุกคนรับทราบ (ไม่มี Nope)',
  barking_exchange: 'Barking Kittens — แลกมือ (มอบแล้วคืน)',
  game_over: 'เกมจบแล้ว',
};

function canPlayAsSingle(type: ExplodingKittensCardType): boolean {
  return [
    'attack',
    'targeted_attack',
    'skip',
    'shuffle',
    'see_future',
    'alter_future',
    'draw_from_bottom',
    'favor',
    'alter_future_now',
    'share_future_3x',
    'super_skip',
    'personal_attack_3x',
    'bury',
    'potluck',
    'tower_of_power',
    'ill_take_that',
    'barking_kitten',
  ].includes(type);
}

/** prefix 1–4 cards while selecting a 5-distinct-cat combo (no non-feral duplicates) */
function fiveDistinctCatPrefix(cards: { type: ExplodingKittensCardType }[]): boolean {
  const n = cards.length;
  if (n < 1 || n > 4) return false;
  if (!cards.every((c) => isCatCard(c.type))) return false;
  const nonFeral = cards.filter((c) => c.type !== 'feral_cat').map((c) => c.type);
  return new Set(nonFeral).size === nonFeral.length;
}

function isBarkingPairCards(cards: { type: ExplodingKittensCardType }[]): boolean {
  return cards.length === 2 && cards.every((c) => c.type === 'barking_kitten');
}

function selectionIsPlayable(
  cards: { type: ExplodingKittensCardType }[],
  gs: ExplodingKittensPlayerView,
): boolean {
  const n = cards.length;
  if (n === 0) return false;
  if (n === 1) {
    const t = cards[0].type;
    if (t === 'bury' && gs.illTakeActorOnMe) return false;
    /** Barking หน้าโต๊ะ + ใบในมือ → เล่นเป็นคู่เลือกเป้าหมาย */
    if (t === 'barking_kitten' && gs.barkingLonerPlayerId === gs.me.id) return true;
    return canPlayAsSingle(t) || t === 'favor' || t === 'targeted_attack';
  }
  if (n === 2) {
    if (isBarkingPairCards(cards)) return true;
    return validateSameCatCombo(cards);
  }
  if (n === 3) return validateSameCatCombo(cards);
  if (n === 5) return validateFiveDistinctCatCombo(cards);
  return false;
}

function selectionIsValidPrefix(cards: { type: ExplodingKittensCardType }[]): boolean {
  const n = cards.length;
  if (n === 0) return true;
  if (n === 1) {
    const t = cards[0].type;
    if (t === 'nope' || t === 'defuse' || t === 'exploding_kitten') return false;
    if (canPlayAsSingle(t) || t === 'favor' || t === 'targeted_attack') return true;
    if (isCatCard(t)) return true;
    return false;
  }
  if (n === 2) {
    if (cards.every((c) => c.type === 'barking_kitten')) return true;
    if (!cards.every((c) => isCatCard(c.type))) return false;
    return validateSameCatCombo(cards) || fiveDistinctCatPrefix(cards);
  }
  if (n === 3) {
    if (!cards.every((c) => isCatCard(c.type))) return false;
    return validateSameCatCombo(cards) || fiveDistinctCatPrefix(cards);
  }
  if (n === 4) {
    if (!cards.every((c) => isCatCard(c.type))) return false;
    return fiveDistinctCatPrefix(cards);
  }
  if (n === 5) {
    if (!cards.every((c) => isCatCard(c.type))) return false;
    return validateFiveDistinctCatCombo(cards);
  }
  return false;
}

type PlayTargetModalState =
  | { kind: 'pair'; cardIdA: string; cardIdB: string }
  | { kind: 'barking_pair'; cardIdA: string; cardIdB: string }
  | { kind: 'barking_loner_pair'; cardId: string }
  | {
      kind: 'three';
      cardIdA: string;
      cardIdB: string;
      cardIdC: string;
      step: 'target' | 'type';
      targetId?: string;
    };

export function ExplodingKittensGame({
  gameState: gs,
  myId,
  sendAction,
  onLeave,
  onRestart,
}: Props) {
  const [hoveredFavorCard, setHoveredFavorCard] = useState<ExplodingKittensCardType | null>(null);
  /** ตำแหน่งแบบ 1-based: 1 = บนสุด, drawPileCount+1 = ล่างสุด — ส่งเซิร์ฟเวอร์เป็น index 0-based */
  const [defuseInsertSlot, setDefuseInsertSlot] = useState(1);
  const [seenStealNoticeId, setSeenStealNoticeId] = useState<number | null>(null);
  const [showStealPopup, setShowStealPopup] = useState(false);
  const [seenThreeClaimNoticeId, setSeenThreeClaimNoticeId] = useState<number | null>(null);
  const [showThreeClaimPopup, setShowThreeClaimPopup] = useState(false);
  const [seenFiveCatsDiscardPickNoticeId, setSeenFiveCatsDiscardPickNoticeId] = useState<
    number | null
  >(null);
  const [showFiveCatsDiscardPickPopup, setShowFiveCatsDiscardPickPopup] = useState(false);
  const [selectedPlayIds, setSelectedPlayIds] = useState<string[]>([]);
  const [playTargetModal, setPlayTargetModal] = useState<PlayTargetModalState | null>(null);
  const [alterOrder, setAlterOrder] = useState<[number, number, number]>([0, 1, 2]);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [drawFly, setDrawFly] = useState<{
    left: number;
    top: number;
    w: number;
    h: number;
    dx: number;
    dy: number;
    run: boolean;
  } | null>(null);
  const [deckShuffleTick, setDeckShuffleTick] = useState(0);
  const [handZoomCardType, setHandZoomCardType] = useState<ExplodingKittensCardType | null>(null);
  const [reactionPassEndsAt, setReactionPassEndsAt] = useState<number | null>(null);
  const [, setReactionCountdownTick] = useState(0);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const handZoneRef = useRef<HTMLDivElement>(null);
  const turnOrderPanelId = useId();
  const [turnOrderExpanded, setTurnOrderExpanded] = useState(false);
  const [seeFutureModalOpen, setSeeFutureModalOpen] = useState(false);
  const seeFuturePeekKey = gs.seenTopCards?.join('|') ?? '';
  const [shareFutureModalOpen, setShareFutureModalOpen] = useState(false);
  const shareFuturePeekKey = gs.shareFuturePeek?.top3.join('|') ?? '';
  /** จั่วแล้วโชว์มุมล่างขวา: snap → shown → leave แล้ว ack อัตโนมัติ */
  const [drawRevealAnim, setDrawRevealAnim] = useState<'off' | 'snap' | 'shown' | 'leave'>('off');
  const drawRevealKey = gs.drawReveal ? `${gs.drawReveal.type}:${gs.myHand.length}` : null;
  const isMyTurn = gs.currentPlayerId === myId;
  const aliveCount = gs.players.filter((p) => p.alive).length;
  const phaseHint = gs.phase !== 'turn' ? EK_PHASE_HINT[gs.phase] : undefined;
  const aliveOpponents = gs.players.filter((p) => p.id !== myId && p.alive);
  const stealPairTargets = aliveOpponents.filter(
    (p) => p.handCount > 0 || (gs.towerWearerId === p.id && (gs.towerStashCount ?? 0) > 0),
  );
  const favorTargetOptions = aliveOpponents.filter((p) => p.handCount > 0);
  const illTakeTargetOptions = aliveOpponents.filter(
    (p) => !(gs.illTakeBlockedTargets ?? []).includes(p.id),
  );
  const me = gs.players.find((p) => p.id === myId);
  const turnSpotlight = getTurnSpotlight(gs);
  const pa = gs.pendingAction;
  const reactionOneLiner = pa ? getReactionOneLiner(gs) : '';
  const turnOrderDockHint = getTurnOrderDockHint(gs, myId);
  const barkingShow = gs.barkingKittenShow;
  const hasAckedBarkingShow = Boolean(barkingShow?.acknowledgedBy.includes(myId));
  const barkingExchangePrompt = gs.barkingExchangePrompt;
  const [barkingExchangeSel, setBarkingExchangeSel] = useState<string[]>([]);
  useEffect(() => {
    setBarkingExchangeSel([]);
  }, [
    barkingExchangePrompt?.stage,
    barkingExchangePrompt?.actorId,
    barkingExchangePrompt?.targetId,
    barkingExchangePrompt?.giveCount,
  ]);
  const canDrawCard =
    Boolean(me?.alive) &&
    gs.drawPileCount > 0 &&
    !drawFly &&
    !gs.drawReveal &&
    ((gs.phase === 'turn' && isMyTurn) ||
      (gs.phase === 'bury_draw' && gs.buryDrawPlayerId === myId));

  const startDrawWithAnimation = () => {
    if (!canDrawCard) return;
    const pile = drawPileRef.current;
    const hand = handZoneRef.current;
    if (!pile || !hand) {
      sendAction({ type: 'draw_card' });
      return;
    }
    const a = pile.getBoundingClientRect();
    const b = hand.getBoundingClientRect();
    const w = Math.min(88, Math.max(56, a.width * 0.55));
    const h = w * (4 / 3);
    const left = a.left + a.width / 2 - w / 2;
    const top = a.top + a.height / 2 - h / 2;
    const destX = b.left + b.width / 2 - w / 2;
    const destY = b.top + Math.min(56, b.height * 0.2);
    const dx = destX - left;
    const dy = destY - top;
    if (Math.abs(dx) + Math.abs(dy) < 12) {
      sendAction({ type: 'draw_card' });
      return;
    }
    setDrawFly({ left, top, w, h, dx, dy, run: false });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDrawFly((prev) => (prev ? { ...prev, run: true } : null));
      });
    });
  };

  const onDrawFlyTransitionEnd = (e: React.TransitionEvent<HTMLImageElement>) => {
    if (e.propertyName !== 'transform') return;
    sendAction({ type: 'draw_card' });
    setDrawFly(null);
  };

  const hasNope = gs.myHand.some((c) => c.type === 'nope');
  const blockedNopeSelfAction = Boolean(pa && myId === pa.actorId && pa.nopeCount === 0);
  const blockedNopeOwnChain = Boolean(pa && myId === pa.lastNopePlayerId);
  const canReactNope =
    gs.phase === 'reaction' &&
    hasNope &&
    Boolean(me?.alive) &&
    !blockedNopeSelfAction &&
    !blockedNopeOwnChain;
  const hasPassedReaction =
    gs.phase === 'reaction' && (gs.pendingAction?.passedBy.includes(myId) ?? false);

  const showReactionActions =
    gs.phase === 'reaction' && pa && !(pa.actorId === myId && pa.nopeCount === 0);

  const needsReactionAutoPass = showReactionActions && !hasPassedReaction && Boolean(me?.alive);

  const reactionSessionKey = useMemo(() => {
    if (gs.phase !== 'reaction' || !gs.pendingAction) return '';
    const p = gs.pendingAction;
    return `${p.actorId}:${p.type}:${p.nopeCount}:${p.passedBy.join(',')}:${p.lastNopePlayerId ?? ''}`;
  }, [gs.phase, gs.pendingAction]);

  const reactionRemainingMs =
    needsReactionAutoPass && reactionPassEndsAt != null
      ? Math.max(0, reactionPassEndsAt - Date.now())
      : needsReactionAutoPass
        ? REACTION_AUTO_PASS_MS
        : 0;
  const reactionCountdownFrac = Math.min(1, reactionRemainingMs / REACTION_AUTO_PASS_MS);

  const selectedPlayCards = selectedPlayIds
    .map((id) => gs.myHand.find((c) => c.id === id))
    .filter((c): c is { id: string; type: ExplodingKittensCardType } => Boolean(c));
  const handSelectAlterNowOnly = gs.phase === 'turn' && !isMyTurn && gs.drawPileCount >= 3;
  const handSelectActive =
    gs.phase === 'turn' && Boolean(me?.alive) && (isMyTurn || handSelectAlterNowOnly);
  const canPlayAlterNowInterrupt =
    handSelectAlterNowOnly &&
    selectedPlayCards.length === 1 &&
    selectedPlayCards[0].type === 'alter_future_now';
  const canPlaySelected =
    Boolean(me?.alive) &&
    ((gs.phase === 'turn' && isMyTurn && selectionIsPlayable(selectedPlayCards, gs)) ||
      canPlayAlterNowInterrupt);

  const illTakeBlocksBury = Boolean(gs.illTakeActorOnMe);

  /** ลำดับการ์ดในมือ (เฉพาะฝั่ง client — จัดเรียงลากวางตอนไม่ได้เลือกเล่นการ์ด) */
  const [handDisplayOrder, setHandDisplayOrder] = useState<string[]>([]);
  useEffect(() => {
    const ids = gs.myHand.map((c) => c.id);
    setHandDisplayOrder((prev) => {
      if (prev.length === 0) return ids;
      const idSet = new Set(ids);
      const kept = prev.filter((id) => idSet.has(id));
      const newcomers = ids.filter((id) => !kept.includes(id));
      return [...kept, ...newcomers];
    });
  }, [gs.myHand]);

  const orderedHand = useMemo((): ExplodingKittensCard[] => {
    const map = new Map(gs.myHand.map((c) => [c.id, c]));
    if (handDisplayOrder.length === 0) return gs.myHand;
    return handDisplayOrder
      .map((id) => map.get(id))
      .filter((c): c is ExplodingKittensCard => c != null);
  }, [gs.myHand, handDisplayOrder]);

  const canReorderHand = Boolean(me?.alive) && gs.myHand.length > 1;

  const handDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onHandDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const a = String(active.id);
    const o = String(over.id);
    setHandDisplayOrder((items) => {
      const oldIndex = items.indexOf(a);
      const newIndex = items.indexOf(o);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handSortIds = handDisplayOrder.length > 0 ? handDisplayOrder : gs.myHand.map((c) => c.id);

  const alterFutureDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onAlterFutureDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    if (![0, 1, 2].includes(oldIndex) || ![0, 1, 2].includes(newIndex)) return;
    setAlterOrder((prev) => arrayMove([...prev], oldIndex, newIndex) as [number, number, number]);
  };

  const toggleHandSelect = (cardId: string) => {
    if (!handSelectActive) return;
    const card = gs.myHand.find((c) => c.id === cardId);
    if (!card) return;
    if (card.type === 'nope' || card.type === 'defuse' || card.type === 'exploding_kitten') {
      return;
    }
    if (card.type === 'bury' && gs.illTakeActorOnMe) return;

    /** นอกเทิร์น — เลือกได้เฉพาะ Alter the Future NOW */
    if (handSelectAlterNowOnly) {
      if (card.type !== 'alter_future_now') return;
      setSelectedPlayIds((prev) => (prev.length === 1 && prev[0] === cardId ? [] : [cardId]));
      return;
    }

    /** Barking อยู่ใน canPlayAsSingle แต่ต้องเลือกได้ 2 ใบ — ห้ามเข้าโหมด effect ใบเดียว */
    const clickedIsBarking = card.type === 'barking_kitten';
    const clickedIsEffect = canPlayAsSingle(card.type) && !clickedIsBarking;
    const clickedIsCat = isCatCard(card.type);

    setSelectedPlayIds((prev) => {
      const prevCards = prev
        .map((id) => gs.myHand.find((c) => c.id === id))
        .filter((c): c is { id: string; type: ExplodingKittensCardType } => Boolean(c));
      const prevHadEffect = prevCards.some(
        (c) => canPlayAsSingle(c.type) && c.type !== 'barking_kitten',
      );

      // Barking Kitten คู่ — เลือกได้ 2 ใบแล้วกดเล่น (ต้องมาก่อน effect ใบเดียว)
      if (clickedIsBarking) {
        if (prevHadEffect) return [cardId];
        if (prev.length === 1 && prev[0] === cardId) return [];
        if (prev.length === 0) return [cardId];
        if (prev.length === 1) {
          const p0 = gs.myHand.find((c) => c.id === prev[0]);
          if (p0?.type === 'barking_kitten' && prev[0] !== cardId) return [prev[0], cardId];
          return [cardId];
        }
        if (prev.length === 2) {
          return prev.includes(cardId) ? prev.filter((id) => id !== cardId) : prev;
        }
        return [cardId];
      }

      // การ์ด effect (เล่นใบเดียว): แตะใบอื่นแทนที่ทันที — แตะใบเดิมซ้ำ = ยกเลิก
      if (clickedIsEffect) {
        if (prev.length === 1 && prev[0] === cardId) return [];
        return [cardId];
      }

      // การ์ดแมว: ถ้าเคยเลือก effect อยู่ ให้ล้างแล้วเริ่มจากแมวใบนี้
      if (clickedIsCat) {
        if (prevHadEffect) {
          return [cardId];
        }
        if (prev.includes(cardId)) {
          return prev.filter((id) => id !== cardId);
        }
        const nextIds = [...prev, cardId];
        const nextCards = nextIds
          .map((id) => gs.myHand.find((c) => c.id === id))
          .filter((c): c is { id: string; type: ExplodingKittensCardType } => Boolean(c));
        if (!selectionIsValidPrefix(nextCards)) return prev;
        return nextIds;
      }

      return prev;
    });
  };

  const confirmPlaySelected = () => {
    if (!canPlaySelected) return;
    const cards = selectedPlayCards;
    const n = cards.length;
    if (n === 1) {
      if (cards[0].type === 'barking_kitten' && gs.barkingLonerPlayerId === gs.me.id) {
        setPlayTargetModal({ kind: 'barking_loner_pair', cardId: cards[0].id });
        return;
      }
      sendAction({ type: 'play_card', cardId: cards[0].id });
      setSelectedPlayIds([]);
      return;
    }
    if (n === 2 && isBarkingPairCards(cards)) {
      setPlayTargetModal({ kind: 'barking_pair', cardIdA: cards[0].id, cardIdB: cards[1].id });
      return;
    }
    if (n === 2) {
      setPlayTargetModal({ kind: 'pair', cardIdA: cards[0].id, cardIdB: cards[1].id });
      return;
    }
    if (n === 3) {
      setPlayTargetModal({
        kind: 'three',
        cardIdA: cards[0].id,
        cardIdB: cards[1].id,
        cardIdC: cards[2].id,
        step: 'target',
      });
      return;
    }
    if (n === 5) {
      sendAction({
        type: 'play_five_cats',
        cardIds: [cards[0].id, cards[1].id, cards[2].id, cards[3].id, cards[4].id],
      });
      setSelectedPlayIds([]);
    }
  };

  const confirmPairTarget = (targetId: string) => {
    if (playTargetModal?.kind !== 'pair') return;
    sendAction({
      type: 'play_pair',
      cardIdA: playTargetModal.cardIdA,
      cardIdB: playTargetModal.cardIdB,
      targetId,
    });
    setPlayTargetModal(null);
    setSelectedPlayIds([]);
  };

  const confirmBarkingPairTarget = (targetId: string) => {
    if (playTargetModal?.kind !== 'barking_pair') return;
    sendAction({
      type: 'play_barking_pair',
      cardIdA: playTargetModal.cardIdA,
      cardIdB: playTargetModal.cardIdB,
      targetId,
    });
    setPlayTargetModal(null);
    setSelectedPlayIds([]);
  };

  const confirmBarkingLonerPairTarget = (targetId: string) => {
    if (playTargetModal?.kind !== 'barking_loner_pair') return;
    sendAction({
      type: 'play_barking_table_pair',
      cardId: playTargetModal.cardId,
      targetId,
    });
    setPlayTargetModal(null);
    setSelectedPlayIds([]);
  };

  const confirmThreeClaim = (targetId: string, requestedType: ExplodingKittensCardType) => {
    if (playTargetModal?.kind !== 'three') return;
    sendAction({
      type: 'play_three_claim',
      cardIdA: playTargetModal.cardIdA,
      cardIdB: playTargetModal.cardIdB,
      cardIdC: playTargetModal.cardIdC,
      targetId,
      requestedType,
    });
    setPlayTargetModal(null);
    setSelectedPlayIds([]);
  };

  const reactNope = () => {
    const nopeCard = gs.myHand.find((c) => c.type === 'nope');
    if (!nopeCard) return;
    sendAction({ type: 'react_nope', cardId: nopeCard.id });
  };

  useEffect(() => {
    const handSet = new Set(gs.myHand.map((c) => c.id));
    setSelectedPlayIds((prev) => prev.filter((id) => handSet.has(id)));
    setPlayTargetModal((pm) => {
      if (!pm) return null;
      if (pm.kind === 'pair' || pm.kind === 'barking_pair') {
        return handSet.has(pm.cardIdA) && handSet.has(pm.cardIdB) ? pm : null;
      }
      if (pm.kind === 'barking_loner_pair') {
        return handSet.has(pm.cardId) ? pm : null;
      }
      if (pm.kind === 'three') {
        return handSet.has(pm.cardIdA) && handSet.has(pm.cardIdB) && handSet.has(pm.cardIdC)
          ? pm
          : null;
      }
      return null;
    });
  }, [gs.myHand]);

  /** เคลียร์การเลือกเล่นจากมือเมื่อออกจากเทิร์นปกติ — แต่ห้ามเคลียร์ตอนนอกเทิร์นที่ยังเล่น Alter the Future NOW ได้ (กองจั่ว ≥ 3) */
  useEffect(() => {
    if (gs.phase !== 'turn') {
      setSelectedPlayIds([]);
      setPlayTargetModal(null);
      return;
    }
    if (!isMyTurn) {
      const allowAlterNowOffTurn = gs.drawPileCount >= 3;
      if (!allowAlterNowOffTurn) {
        setSelectedPlayIds([]);
        setPlayTargetModal(null);
      }
    }
  }, [gs.phase, isMyTurn, gs.drawPileCount]);

  useEffect(() => {
    if (gs.phase !== 'game_over') return;
    return startWinCelebrationLoop();
  }, [gs.phase]);

  const gameOverRanking = useMemo(() => {
    if (gs.phase !== 'game_over' || !gs.eliminationOrder?.length) return [];
    return [...gs.eliminationOrder].reverse().map((playerId, i) => ({
      playerId,
      place: i + 1,
      name: gs.players.find((p) => p.id === playerId)?.name ?? playerId,
    }));
  }, [gs.phase, gs.eliminationOrder, gs.players]);

  useEffect(() => {
    if (gs.lastEvent?.includes('สับกองการ์ด')) {
      setDeckShuffleTick((n) => n + 1);
    }
  }, [gs.lastEvent]);

  useEffect(() => {
    if (!needsReactionAutoPass || !reactionSessionKey) {
      setReactionPassEndsAt(null);
      return;
    }
    const ends = Date.now() + REACTION_AUTO_PASS_MS;
    setReactionPassEndsAt(ends);
    const iv = window.setInterval(() => setReactionCountdownTick((x) => x + 1), 100);
    const t = window.setTimeout(() => {
      sendAction({ type: 'react_pass' });
    }, REACTION_AUTO_PASS_MS);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(t);
      setReactionPassEndsAt(null);
    };
  }, [needsReactionAutoPass, reactionSessionKey, sendAction]);

  useEffect(() => {
    if (gs.phase !== 'defuse_reinsert' && gs.phase !== 'bury_reinsert') return;
    const maxSlot = gs.drawPileCount + 1;
    setDefuseInsertSlot((prev) => Math.max(1, Math.min(prev, maxSlot)));
  }, [gs.phase, gs.drawPileCount]);

  useEffect(() => {
    if (gs.drawReveal?.type !== 'defuse') return;
    fireDefuseDrawConfetti();
  }, [gs.drawReveal?.type]);

  useEffect(() => {
    if (!drawRevealKey || !gs.drawReveal) {
      setDrawRevealAnim('off');
      return;
    }
    setDrawRevealAnim('snap');
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setDrawRevealAnim('shown'));
    });
    const tLeave = window.setTimeout(() => setDrawRevealAnim('leave'), 1500);
    const tAck = window.setTimeout(() => {
      sendAction({ type: 'acknowledge_draw_reveal' });
    }, 2000);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(tLeave);
      window.clearTimeout(tAck);
    };
  }, [drawRevealKey, gs.drawReveal, sendAction]);

  useEffect(() => {
    if (!seeFuturePeekKey) return;
    setSeeFutureModalOpen(true);
  }, [seeFuturePeekKey]);

  useEffect(() => {
    if (!shareFuturePeekKey) {
      setShareFutureModalOpen(false);
      return;
    }
    setShareFutureModalOpen(true);
  }, [shareFuturePeekKey]);

  useEffect(() => {
    const notice = gs.stealNotice;
    if (!notice) return;
    if (seenStealNoticeId === notice.id) return;
    setSeenStealNoticeId(notice.id);
    setShowStealPopup(true);
  }, [gs.stealNotice, seenStealNoticeId]);

  useEffect(() => {
    if (!showStealPopup || !gs.stealNotice) return;
    // Spectators (non-involved players) don't see the stolen card type;
    // auto-dismiss their popup so flow stays fast.
    if (gs.stealNotice.cardType !== undefined) return;
    const t = window.setTimeout(() => setShowStealPopup(false), 2500);
    return () => window.clearTimeout(t);
  }, [showStealPopup, gs.stealNotice]);

  useEffect(() => {
    const notice = gs.threeClaimNotice;
    if (!notice) return;
    if (seenThreeClaimNoticeId === notice.id) return;
    setSeenThreeClaimNoticeId(notice.id);
    setShowThreeClaimPopup(true);
  }, [gs.threeClaimNotice, seenThreeClaimNoticeId]);

  useEffect(() => {
    const notice = gs.fiveCatsDiscardPickNotice;
    if (!notice) return;
    if (seenFiveCatsDiscardPickNoticeId === notice.id) return;
    setSeenFiveCatsDiscardPickNoticeId(notice.id);
    setShowFiveCatsDiscardPickPopup(true);
  }, [gs.fiveCatsDiscardPickNotice, seenFiveCatsDiscardPickNoticeId]);

  useEffect(() => {
    if (!gs.alterFuturePrompt) return;
    setAlterOrder([0, 1, 2]);
  }, [gs.alterFuturePrompt?.playerId]);

  return (
    <div className="page container">
      {showStealPopup && gs.stealNotice && (
        <ExplodingKittensSingleCardModal
          open
          title="🃏 มีการขโมยการ์ด"
          intro={
            <p>
              <strong>{gs.stealNotice.actorName}</strong> ขโมยการ์ดจาก{' '}
              <strong>{gs.stealNotice.targetName}</strong>
            </p>
          }
          card={
            gs.stealNotice.cardType
              ? {
                  imageSrc: CARD_IMAGE[gs.stealNotice.cardType],
                  imageAlt: CARD_LABEL[gs.stealNotice.cardType],
                  caption: (
                    <>
                      การ์ดที่เกี่ยวข้อง: <strong>{CARD_LABEL[gs.stealNotice.cardType]}</strong>
                    </>
                  ),
                }
              : undefined
          }
          bodyFallback={
            !gs.stealNotice.cardType ? (
              <p style={{ color: 'var(--text-secondary)' }}>การ์ดที่ถูกขโมยเป็นข้อมูลส่วนตัว</p>
            ) : undefined
          }
          primaryAction={{ label: 'รับทราบ', onClick: () => setShowStealPopup(false) }}
        />
      )}

      {showThreeClaimPopup && gs.threeClaimNotice && (
        <ExplodingKittensSingleCardModal
          open
          title="🧩 ผลคอมโบ 3 ใบ"
          intro={
            <p>
              <strong>{gs.threeClaimNotice.actorName}</strong>{' '}
              {gs.threeClaimNotice.stolenFromTower ? (
                gs.threeClaimNotice.success ? (
                  <>
                    เรียกถูก — ได้การ์ดจาก Tower ของ{' '}
                    <strong>{gs.threeClaimNotice.targetName}</strong>
                  </>
                ) : (
                  <>
                    เรียกชนิดที่ไม่มีใน Tower ของ <strong>{gs.threeClaimNotice.targetName}</strong>{' '}
                    — เสียฟรี
                  </>
                )
              ) : (
                <>
                  เรียกการ์ด <strong>{CARD_LABEL[gs.threeClaimNotice.requestedType]}</strong> จาก{' '}
                  <strong>{gs.threeClaimNotice.targetName}</strong>
                </>
              )}
            </p>
          }
          card={{
            imageSrc:
              CARD_IMAGE[
                gs.threeClaimNotice.stolenFromTower &&
                gs.threeClaimNotice.success &&
                gs.threeClaimNotice.actualStolenType
                  ? gs.threeClaimNotice.actualStolenType
                  : gs.threeClaimNotice.requestedType
              ],
            imageAlt:
              CARD_LABEL[
                gs.threeClaimNotice.stolenFromTower &&
                gs.threeClaimNotice.success &&
                gs.threeClaimNotice.actualStolenType
                  ? gs.threeClaimNotice.actualStolenType
                  : gs.threeClaimNotice.requestedType
              ],
            caption: gs.threeClaimNotice.stolenFromTower
              ? gs.threeClaimNotice.success
                ? '✅ มีชนิดนี้ใน Tower'
                : '❌ ไม่มีชนิดนี้ใน Tower'
              : gs.threeClaimNotice.success
                ? '✅ เป้าหมายมีการ์ดที่เรียก'
                : '❌ เป้าหมายไม่มีการ์ดที่เรียก',
          }}
          primaryAction={{ label: 'รับทราบ', onClick: () => setShowThreeClaimPopup(false) }}
        />
      )}

      {showFiveCatsDiscardPickPopup && gs.fiveCatsDiscardPickNotice && (
        <ExplodingKittensSingleCardModal
          open
          title="🐱 หยิบจากกองทิ้ง (คอมโบ 5 แมว)"
          intro={
            <p>
              <strong>{gs.fiveCatsDiscardPickNotice.pickerName}</strong> หยิบการ์ดจากกองทิ้ง
            </p>
          }
          card={{
            imageSrc: CARD_IMAGE[gs.fiveCatsDiscardPickNotice.cardType],
            imageAlt: CARD_LABEL[gs.fiveCatsDiscardPickNotice.cardType],
            caption: (
              <>
                การ์ดที่ได้: <strong>{CARD_LABEL[gs.fiveCatsDiscardPickNotice.cardType]}</strong>
              </>
            ),
          }}
          primaryAction={{
            label: 'รับทราบ',
            onClick: () => setShowFiveCatsDiscardPickPopup(false),
          }}
        />
      )}

      {gs.phase === 'explosion_reveal' && gs.explosionReveal && (
        <div className="ek-explosion-overlay" role="dialog" aria-modal="true">
          <ExplosionGif />
          <div className="ek-explosion-caption">
            <h2 className="ek-explosion-title">💥 EXPLODING KITTEN!</h2>
            <p className="ek-explosion-sub">
              <strong>{gs.explosionReveal.playerName}</strong> จั่วการ์ดระเบิด!
            </p>
            <p className="ek-explosion-note">
              {gs.explosionReveal.hasDefuse ? 'ต้องกดใช้ Defuse' : 'ถ้าไม่มี Defuse จะตายทันที'}
            </p>
          </div>
        </div>
      )}

      <div className="card ek-status-summary">
        <div className="ek-status-summary__head">
          <div className="ek-status-summary__head-main">
            <h1 className="ek-status-summary__title">Exploding Kittens</h1>
            <span className="ek-status-summary__mode">
              {gs.mode === 'party_pack' ? 'Party Pack' : 'Original'}
            </span>
          </div>
          <div className="ek-status-summary__head-actions">
            {onRestart && (
              <Button type="button" variant="secondary" onClick={onRestart}>
                <RotateCcw size={16} aria-hidden />
                เล่นใหม่
              </Button>
            )}
            <Button type="button" variant="danger" onClick={onLeave}>
              <LogOut size={16} aria-hidden />
              ออกจากห้อง
            </Button>
          </div>
        </div>

        <div className="ek-turn-spotlight" aria-label="ลำดับการเล่นรอบโต๊ะ">
          <div className={`ek-turn-spotlight__col${spotlightColClass(gs, turnSpotlight.prev)}`}>
            <span className="ek-turn-spotlight__label">คนที่แล้ว</span>
            {turnSpotlight.prev ? (
              <>
                <span className="ek-turn-spotlight__name">{turnSpotlight.prev.name}</span>
                {turnSpotlight.prev.id === myId && (
                  <span className="ek-turn-spotlight__you">คุณ</span>
                )}
                <EkSpotlightFrontBadges gs={gs} player={turnSpotlight.prev} />
                {turnSpotlight.prev.pendingTurns > 1 && (
                  <span className="ek-turn-spotlight__meta">
                    ค้าง {turnSpotlight.prev.pendingTurns} เทิร์น
                  </span>
                )}
              </>
            ) : (
              <span className="ek-turn-spotlight__empty">—</span>
            )}
          </div>
          <div
            className={`ek-turn-spotlight__col ek-turn-spotlight__col--current${spotlightColClass(gs, turnSpotlight.current)}`}
          >
            <span className="ek-turn-spotlight__label">ตาปัจจุบัน</span>
            {turnSpotlight.current ? (
              <>
                <span className="ek-turn-spotlight__name">{turnSpotlight.current.name}</span>
                {turnSpotlight.current.id === myId && turnSpotlight.current.alive && (
                  <span className="ek-turn-spotlight__you">คุณ</span>
                )}
                {!turnSpotlight.current.alive && (
                  <span className="ek-turn-spotlight__dead">ตายแล้ว</span>
                )}
                <EkSpotlightFrontBadges gs={gs} player={turnSpotlight.current} />
                <span className="ek-turn-spotlight__meta">
                  เหลือ {gs.pendingTurnsForCurrent} เทิร์น
                </span>
              </>
            ) : (
              <span className="ek-turn-spotlight__empty">—</span>
            )}
          </div>
          <div className={`ek-turn-spotlight__col${spotlightColClass(gs, turnSpotlight.next)}`}>
            <span className="ek-turn-spotlight__label">คนต่อไป</span>
            {turnSpotlight.next ? (
              <>
                <span className="ek-turn-spotlight__name">{turnSpotlight.next.name}</span>
                {turnSpotlight.next.id === myId && (
                  <span className="ek-turn-spotlight__you">คุณ</span>
                )}
                <EkSpotlightFrontBadges gs={gs} player={turnSpotlight.next} />
                {turnSpotlight.next.pendingTurns > 1 && (
                  <span className="ek-turn-spotlight__meta">
                    ค้าง {turnSpotlight.next.pendingTurns} เทิร์น
                  </span>
                )}
              </>
            ) : (
              <span className="ek-turn-spotlight__empty">—</span>
            )}
          </div>
        </div>

        <button
          type="button"
          className={`ek-turn-order-toggle${turnOrderExpanded ? ' is-open' : ''}`}
          aria-expanded={turnOrderExpanded}
          aria-controls={turnOrderPanelId}
          onClick={() => setTurnOrderExpanded((v) => !v)}
        >
          <span className="ek-turn-order-toggle__text">
            <span className="ek-turn-order-toggle__title">ลำดับการเล่น</span>
            <span className="ek-turn-order-toggle__meta">
              {turnOrderExpanded ? 'แตะเพื่อซ่อน' : `แสดงผู้เล่นทั้งหมด · ${gs.players.length} คน`}
            </span>
          </span>
          <span className="ek-turn-order-toggle__chevron" aria-hidden>
            ▼
          </span>
        </button>

        <div
          id={turnOrderPanelId}
          className={`ek-turn-order-panel${turnOrderExpanded ? ' is-open' : ''}`}
          aria-hidden={!turnOrderExpanded}
        >
          <div className="ek-turn-order-panel__inner">
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                margin: '0 0 10px',
                lineHeight: 1.35,
              }}
            >
              ลำดับรอบโต๊ะและคนเริ่มก่อนถูกสุ่มตอนเริ่มเกม
            </p>
            <div className="ek-turn-grid" role="list">
              {gs.players.map((p) => {
                const frontBadges = getPlayerFrontRowBadges(gs, p.id, p.alive);
                return (
                  <div
                    key={p.id}
                    role="listitem"
                    className={buildTurnCellClass(gs, p, frontBadges)}
                  >
                    {frontBadges.length > 0 && p.alive && (
                      <div className="ek-turn-cell-front-badges" aria-label="การ์ดหน้าตัว">
                        {frontBadges.map((b) => (
                          <span
                            key={b.key}
                            className={`ek-front-badge ek-front-badge--${b.variant}`}
                            title={b.title}
                          >
                            {b.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {!p.alive && (
                      <span className="ek-turn-cell-skull" role="img" aria-label="ตายแล้ว">
                        <span aria-hidden className="size-12">
                          💀
                        </span>
                      </span>
                    )}
                    <div className="ek-turn-cell-name">{p.name}</div>
                    <div className="ek-turn-cell-hand">การ์ดในมือ: {p.handCount} ใบ</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <ul className="ek-status-summary__tiles">
          <li className="ek-stat-tile">
            <span className="ek-stat-tile__label">คุณ</span>
            <span className="ek-stat-tile__value">
              <span className="ek-status-summary__strong">{me?.name ?? '-'}</span>
              {!me?.alive && <span className="ek-status-summary__dead"> · ตายแล้ว</span>}
            </span>
          </li>
          <li className="ek-stat-tile">
            <span className="ek-stat-tile__label">กองจั่ว / ทิ้ง</span>
            <span className="ek-stat-tile__value ek-status-summary__strong">
              {gs.drawPileCount} / {gs.discardCount}
            </span>
          </li>
          {gs.discardTop != null && (
            <li className="ek-stat-tile">
              <span className="ek-stat-tile__label">บนกองทิ้ง</span>
              <span className="ek-stat-tile__value">{CARD_LABEL[gs.discardTop]}</span>
            </li>
          )}
          <li className="ek-stat-tile">
            <span className="ek-stat-tile__label">ผู้รอด</span>
            <span className="ek-stat-tile__value ek-status-summary__strong">
              {aliveCount}/{gs.players.length}
            </span>
          </li>
          <li className="ek-stat-tile">
            <span className="ek-stat-tile__label">มือคุณ</span>
            <span className="ek-stat-tile__value ek-status-summary__strong">
              {gs.myHand.length} ใบ
            </span>
          </li>
          {phaseHint && (
            <li className="ek-stat-tile ek-stat-tile--wide">
              <span className="ek-stat-tile__label">สถานะเกม</span>
              <span className="ek-stat-tile__value">{phaseHint}</span>
            </li>
          )}
        </ul>
        {gs.lastEvent && (
          <p className="ek-status-summary__event">
            <span className="ek-status-summary__event-label">เหตุการณ์ล่าสุด</span>
            {gs.lastEvent}
          </p>
        )}
      </div>

      {gs.phase === 'game_over' && (
        <div
          className="modal-overlay ek-game-over-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ek-game-over-title"
        >
          <div className="modal ek-game-over-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ek-game-over-toolbar">
              <p className="ek-game-over-kicker" id="ek-game-over-title">
                🏆 เกมจบแล้ว
              </p>
              <div className="ek-game-over-toolbar-actions">
                {onRestart ? (
                  <Button type="button" variant="secondary" size="lg" onClick={onRestart}>
                    <RotateCcw size={16} aria-hidden />
                    เล่นใหม่
                  </Button>
                ) : (
                  <span className="ek-game-over-wait-host ek-game-over-wait-host--toolbar">
                    รอหัวห้องกด «เล่นใหม่»
                  </span>
                )}
                <Button type="button" variant="danger" size="lg" onClick={onLeave}>
                  <LogOut size={16} aria-hidden />
                  ออกจากห้อง
                </Button>
              </div>
            </div>

            <div className="ek-game-over-hero" aria-live="polite">
              <p className="ek-game-over-hero-label">ผู้ชนะ</p>
              <p className="ek-game-over-hero-names">{gs.winnerName ?? gs.winnerId ?? '—'}</p>
            </div>

            {gameOverRanking.length > 0 && (
              <>
                <h3 className="ek-game-over-ranking-heading">
                  ลำดับการตกรอบ{' '}
                  <span className="ek-game-over-ranking-sub">(ตายช้าสุด → ตายเร็วสุด)</span>
                </h3>
                <ul className="ek-game-over-ranking-list">
                  {gameOverRanking.map((row) => (
                    <li key={row.playerId} className="ek-game-over-ranking-row">
                      <span className="ek-game-over-ranking-place">{row.place}</span>
                      <span className="ek-game-over-ranking-name">
                        {row.name}
                        {row.playerId === myId ? ' (คุณ)' : ''}
                      </span>
                      <span className="ek-game-over-ranking-badge">ตกรอบ</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {gs.seenTopCards && gs.seenTopCards.length > 0 && seeFutureModalOpen && (
        <EkTopThreeModal
          mode="see-the-future"
          cards={gs.seenTopCards}
          cardVisuals={{ label: CARD_LABEL, image: CARD_IMAGE }}
          onAck={() => setSeeFutureModalOpen(false)}
        />
      )}

      {gs.seenTopCards && gs.seenTopCards.length > 0 && !seeFutureModalOpen && (
        <button
          type="button"
          className="ek-see-future-reopen"
          onClick={() => setSeeFutureModalOpen(true)}
        >
          ดูการ์ดบนกอง ({gs.seenTopCards.length} ใบ)
        </button>
      )}

      {gs.shareFuturePeek && gs.shareFuturePeek.top3.length > 0 && shareFutureModalOpen && (
        <EkTopThreeModal
          mode="share-the-future"
          cards={gs.shareFuturePeek.top3}
          cardVisuals={{ label: CARD_LABEL, image: CARD_IMAGE }}
          onAck={() => {
            sendAction({ type: 'acknowledge_share_future_peek' });
            setShareFutureModalOpen(false);
          }}
        />
      )}

      {gs.shareFuturePeek && gs.shareFuturePeek.top3.length > 0 && !shareFutureModalOpen && (
        <button
          type="button"
          className="ek-see-future-reopen"
          onClick={() => setShareFutureModalOpen(true)}
        >
          ดู Share the Future (3 ใบ)
        </button>
      )}

      {turnOrderDockHint && (
        <aside className="ek-modal-turn-strip-dock" aria-label="ลำดับการเล่น — ติดขอบจอ">
          <EkModalTurnOrderStrip gs={gs} myId={myId} hint={turnOrderDockHint} />
        </aside>
      )}

      {gs.phase === 'reaction' && pa && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal ek-reaction-modal">
            <p id="ek-reaction-title" className="ek-reaction-kicker">
              {pa.nopeCount > 0 ? 'Chain Nope' : 'มีผู้เล่นการ์ด'}
            </p>

            {pa.nopeCount > 0 ? (
              <div className="ek-reaction-nope-spotlight">
                <div className="ek-modal-card-preview ek-modal-card-preview--reaction-hero">
                  <img
                    src={CARD_IMAGE.nope}
                    alt={CARD_LABEL.nope}
                    className="ek-card-img"
                    loading="lazy"
                  />
                </div>
                <p className="ek-reaction-hero-caption">
                  <strong>{pa.lastNopePlayerName ?? '?'}</strong>
                  <span className="ek-reaction-hero-action"> · Nope</span>
                  <span className="ek-reaction-hero-sub"> · {reactionOneLiner}</span>
                </p>
              </div>
            ) : (
              pa.playedCardTypes &&
              pa.playedCardTypes.length > 0 && (
                <div className="ek-reaction-card-strip ek-reaction-card-strip--hero">
                  {pa.playedCardTypes.map((t, i) => (
                    <div
                      key={`${t}-${i}`}
                      className="ek-reaction-card-cell ek-modal-card-preview ek-modal-card-preview--reaction-hero"
                    >
                      <img
                        src={CARD_IMAGE[t]}
                        alt=""
                        className="ek-card-img"
                        loading="lazy"
                        aria-hidden
                      />
                      <span className="ek-reaction-card-caption">{CARD_LABEL[t]}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {pa.nopeCount === 0 && (
              <p className="ek-reaction-one-liner">
                <span className="ek-reaction-one-liner-label">การ์ดที่เล่น</span>{' '}
                <strong className="text-white text-base">{reactionOneLiner}</strong>
              </p>
            )}

            <p className="ek-reaction-progress">
              ตอบแล้ว {pa.passedBy.length}/{aliveCount} คน
            </p>

            {pa.actorId === myId && pa.nopeCount === 0 ? (
              <p className="ek-reaction-wait">รอผู้อื่น (คุณเล่นการ์ดแล้ว)</p>
            ) : (
              <>
                <div className="ek-reaction-actions">
                  <Button
                    className="ek-reaction-nope-btn"
                    variant="danger"
                    disabled={!canReactNope}
                    onClick={reactNope}
                  >
                    Nope
                  </Button>
                  <div className="ek-reaction-pass-wrap">
                    <div
                      className="ek-reaction-pass-countdown-fill"
                      style={{
                        transform: `scaleX(${Math.max(0.02, reactionCountdownFrac)})`,
                      }}
                      aria-hidden
                    />
                    <Button
                      className="ek-reaction-pass-btn"
                      variant="secondary"
                      disabled={hasPassedReaction}
                      onClick={() => sendAction({ type: 'react_pass' })}
                      aria-label={
                        hasPassedReaction
                          ? 'ผ่านแล้ว'
                          : needsReactionAutoPass
                            ? `ผ่าน เหลือ ${Math.max(0, Math.ceil(reactionRemainingMs / 1000))} วินาที จะผ่านอัตโนมัติ`
                            : 'ผ่าน — ไม่ยกเลิกเอฟเฟ็กต์'
                      }
                    >
                      {hasPassedReaction
                        ? 'ผ่านแล้ว'
                        : needsReactionAutoPass
                          ? `ผ่าน · ${Math.max(0, Math.ceil(reactionRemainingMs / 1000))} วิ`
                          : 'ผ่าน'}
                    </Button>
                  </div>
                </div>
                {hasNope && me?.alive && !canReactNope && (
                  <p className="ek-reaction-nope-blocked">
                    {blockedNopeSelfAction && 'ห้าม Nope การ์ดตัวเอง'}
                    {blockedNopeOwnChain &&
                      !blockedNopeSelfAction &&
                      'ห้าม Nope ต่อจากตัวเอง — รอคนอื่น'}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {gs.phase === 'barking_kitten_show' && barkingShow && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal ek-reaction-modal">
            <p className="ek-reaction-kicker">Barking Kitten</p>

            <div className="ek-reaction-nope-spotlight">
              <div className="ek-modal-card-preview ek-modal-card-preview--reaction-hero">
                <img
                  src={CARD_IMAGE.barking_kitten}
                  alt={CARD_LABEL.barking_kitten}
                  className="ek-card-img"
                  loading="lazy"
                />
              </div>
              <p className="ek-reaction-hero-caption">
                <strong>{barkingShow.actorName}</strong>
                <span className="ek-reaction-hero-action"> · เล่นการ์ดนี้</span>
                <span className="ek-reaction-hero-sub"> · ทุกคนเห็น · ใช้ Nope ไม่ได้</span>
              </p>
            </div>

            <p className="ek-reaction-one-liner">
              <span className="ek-reaction-one-liner-label">หมายเหตุ</span>{' '}
              <strong className="text-white text-base">
                ไม่ใช่ช่วง Reaction — ไม่มี Nope / Pass
              </strong>
            </p>

            <p className="ek-reaction-progress">
              รับทราบแล้ว {barkingShow.acknowledgedBy.length}/{aliveCount} คน
            </p>

            <div
              className="ek-reaction-actions"
              style={{ gridTemplateColumns: '1fr', maxWidth: 280, margin: '8px auto 0' }}
            >
              <Button
                variant="primary"
                disabled={hasAckedBarkingShow}
                onClick={() => sendAction({ type: 'acknowledge_barking_kitten_show' })}
              >
                {hasAckedBarkingShow ? 'รับทราบแล้ว' : 'รับทราบ'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {gs.phase === 'barking_exchange' && barkingExchangePrompt && (
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
            {((barkingExchangePrompt.stage === 'target_pick' &&
              myId === barkingExchangePrompt.targetId) ||
              (barkingExchangePrompt.stage === 'actor_return' &&
                myId === barkingExchangePrompt.actorId)) && (
              <>
                <p className="ek-hovered-card-name" style={{ marginBottom: 8 }}>
                  เลือกแล้ว {barkingExchangeSel.length}/{barkingExchangePrompt.giveCount} ใบ
                </p>
                <div className="ek-modal-card-grid ek-modal-card-grid--dense ek-favor-give-grid">
                  {gs.myHand.map((c) => {
                    const sel = barkingExchangeSel.includes(c.id);
                    return (
                      <Button
                        key={c.id}
                        variant={sel ? 'primary' : 'ghost'}
                        className="ek-modal-card-pick-btn"
                        onClick={() => {
                          const max = barkingExchangePrompt.giveCount;
                          setBarkingExchangeSel((prev) => {
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
                  disabled={barkingExchangeSel.length !== barkingExchangePrompt.giveCount}
                  onClick={() => {
                    if (barkingExchangePrompt.stage === 'target_pick') {
                      sendAction({
                        type: 'barking_exchange_target_give',
                        cardIds: barkingExchangeSel,
                      });
                    } else {
                      sendAction({
                        type: 'barking_exchange_actor_return',
                        cardIds: barkingExchangeSel,
                      });
                    }
                  }}
                >
                  ยืนยัน
                </Button>
              </>
            )}
            {((barkingExchangePrompt.stage === 'target_pick' &&
              myId !== barkingExchangePrompt.targetId) ||
              (barkingExchangePrompt.stage === 'actor_return' &&
                myId !== barkingExchangePrompt.actorId)) && (
              <p style={{ color: 'var(--text-secondary)' }}>รอผู้เล่นอื่นเลือกการ์ด…</p>
            )}
          </div>
        </div>
      )}

      {gs.phase === 'ill_take_target' && gs.illTakePrompt && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>I&apos;ll Take That — เลือกเป้าหมาย</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.88rem' }}>
              จั่วถัดไปของเป้าหมายจะมอบให้คุณ · ห้ามเลือกคนที่มีการ์ดนี้อยู่หน้าแล้ว
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {illTakeTargetOptions.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>ไม่มีเป้าหมายที่เลือกได้</p>
              ) : (
                illTakeTargetOptions.map((p) => (
                  <Button
                    key={p.id}
                    variant="secondary"
                    onClick={() => sendAction({ type: 'ill_take_choose_target', targetId: p.id })}
                  >
                    {p.name}
                  </Button>
                ))
              )}
            </div>
            <div className="w-full" style={{ marginTop: 12 }}>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => sendAction({ type: 'ill_take_cancel' })}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}

      {gs.phase === 'favor_target' && gs.favorPrompt?.fromId === myId && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Favor — เลือกเป้าหมาย</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.88rem' }}>
              เลือกคนที่มีการ์ด · แล้วคนอื่นจึง Nope/ผ่าน ได้
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {favorTargetOptions.map((p) => (
                <Button
                  key={p.id}
                  variant="secondary"
                  onClick={() => sendAction({ type: 'favor_choose_target', targetId: p.id })}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {gs.phase === 'targeted_attack_target' && gs.targetedAttackPrompt?.fromId === myId && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Targeted Attack — เลือกเป้าหมาย</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.88rem' }}>
              เป้าหมายเล่น 2 เทิร์น · แล้วคนอื่นจึง Nope/ผ่าน ได้
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {aliveOpponents.map((p) => (
                <Button
                  key={p.id}
                  variant="secondary"
                  onClick={() =>
                    sendAction({ type: 'targeted_attack_choose_target', targetId: p.id })
                  }
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {playTargetModal?.kind === 'pair' && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>เลือกเป้าหมาย — คู่แมว</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              ขโมยการ์ดสุ่ม 1 ใบจากผู้เล่นที่เลือก
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {stealPairTargets.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>ไม่มีผู้เล่นที่มีการ์ดให้ขโมย</p>
              ) : (
                stealPairTargets.map((p) => (
                  <Button key={p.id} variant="secondary" onClick={() => confirmPairTarget(p.id)}>
                    {p.name}
                  </Button>
                ))
              )}
            </div>
            <Button
              variant="ghost"
              block
              style={{ marginTop: 12 }}
              onClick={() => setPlayTargetModal(null)}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {playTargetModal?.kind === 'barking_pair' && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Barking Kitten — เลือกเป้าหมาย</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              เล่นคู่จากมือ — เป้าหมายมอบครึ่งมือ (ปัดขึ้น) แล้วคุณคืนจำนวนเท่ากัน (กฎใหม่)
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {aliveOpponents.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>ไม่มีผู้เล่นอื่น</p>
              ) : (
                aliveOpponents.map((p) => (
                  <Button
                    key={p.id}
                    variant="secondary"
                    onClick={() => confirmBarkingPairTarget(p.id)}
                  >
                    {p.name}
                  </Button>
                ))
              )}
            </div>
            <Button
              variant="ghost"
              block
              style={{ marginTop: 12 }}
              onClick={() => setPlayTargetModal(null)}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {playTargetModal?.kind === 'barking_loner_pair' && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Barking Kitten — คู่ (หน้าโต๊ะ + มือ)</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              รวมการ์ดหน้าโต๊ะของคุณกับใบในมือ — เลือกผู้เล่นเพื่อแลกมือ (ครึ่งมือ ปัดขึ้น)
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {aliveOpponents.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>ไม่มีผู้เล่นอื่น</p>
              ) : (
                aliveOpponents.map((p) => (
                  <Button
                    key={p.id}
                    variant="secondary"
                    onClick={() => confirmBarkingLonerPairTarget(p.id)}
                  >
                    {p.name}
                  </Button>
                ))
              )}
            </div>
            <Button
              variant="ghost"
              block
              style={{ marginTop: 12 }}
              onClick={() => setPlayTargetModal(null)}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {playTargetModal?.kind === 'three' && playTargetModal.step === 'target' && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>เลือกเป้าหมาย — สามใบเหมือนกัน</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              เลือกผู้เล่นที่จะเรียกการ์ดจากมือ
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {aliveOpponents.map((p) => (
                <Button
                  key={p.id}
                  variant="secondary"
                  onClick={() =>
                    setPlayTargetModal({ ...playTargetModal, step: 'type', targetId: p.id })
                  }
                >
                  {p.name}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              block
              style={{ marginTop: 12 }}
              onClick={() => setPlayTargetModal(null)}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {playTargetModal?.kind === 'three' &&
        playTargetModal.step === 'type' &&
        playTargetModal.targetId && (
          <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
            <div className="modal ek-multi-card-modal">
              <h2>เลือกการ์ดชนิดใดก็ได้</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                จาก{' '}
                <strong>
                  {gs.players.find((p) => p.id === playTargetModal.targetId)?.name ?? 'เป้าหมาย'}
                </strong>
              </p>
              <div className="ek-modal-card-grid ek-modal-card-grid--dense ek-three-claim-type-grid">
                {(Object.keys(CARD_LABEL) as ExplodingKittensCardType[]).map((wanted) => (
                  <Button
                    key={`three-claim-${wanted}`}
                    variant="ghost"
                    className="ek-modal-card-pick-btn"
                    onClick={() => confirmThreeClaim(playTargetModal.targetId!, wanted)}
                  >
                    <div className="ek-modal-card-preview">
                      <img
                        src={CARD_IMAGE[wanted]}
                        alt=""
                        className="ek-card-img"
                        loading="lazy"
                        aria-hidden
                      />
                    </div>
                    <div className="ek-card-caption">{CARD_LABEL[wanted]}</div>
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                block
                style={{ marginTop: 12 }}
                onClick={() =>
                  setPlayTargetModal({
                    kind: 'three',
                    cardIdA: playTargetModal.cardIdA,
                    cardIdB: playTargetModal.cardIdB,
                    cardIdC: playTargetModal.cardIdC,
                    step: 'target',
                  })
                }
              >
                กลับ
              </Button>
            </div>
          </div>
        )}

      {gs.phase === 'favor_give' && gs.favorPrompt?.targetId === myId && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal ek-multi-card-modal" style={{ maxWidth: 380 }}>
            {myId === gs.towerWearerId && (gs.towerStashCount ?? 0) > 0 ? (
              <>
                <h2>คุณถูก Favor — Tower of Power</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                  กฎมงกุฎ: ฝ่ายขอจะได้การ์ดสุ่มจาก Tower ของคุณก่อน (ไม่เลือกจากมือ) จน stash หมด
                </p>
                <Button
                  variant="primary"
                  block
                  onClick={() => sendAction({ type: 'favor_give_from_tower' })}
                >
                  มอบการ์ดสุ่มจาก Tower ({gs.towerStashCount} ใบในมงกุฎ)
                </Button>
              </>
            ) : (
              <>
                <h2>คุณถูก Favor — เลือกการ์ดที่จะให้</h2>
                <p className="ek-hovered-card-name ek-favor-give-hint">
                  {hoveredFavorCard
                    ? `กำลังเลือก: ${CARD_LABEL[hoveredFavorCard]}`
                    : 'ชี้หรือแตะการ์ดเพื่อดูชื่อ'}
                </p>
                <div className="ek-modal-card-grid ek-modal-card-grid--dense ek-favor-give-grid">
                  {gs.myHand.map((c) => (
                    <Button
                      key={c.id}
                      variant="ghost"
                      className="ek-modal-card-pick-btn"
                      onMouseEnter={() => setHoveredFavorCard(c.type)}
                      onMouseLeave={() => setHoveredFavorCard(null)}
                      onClick={() => sendAction({ type: 'favor_choose_give', cardId: c.id })}
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
              </>
            )}
          </div>
        </div>
      )}

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

      <div className="card ek-piles-row" style={{ marginBottom: 16 }}>
        <div className="ek-piles-grid">
          <div className="ek-pile-box ek-pile-draw">
            <h4 className="ek-pile-title">กองจั่ว</h4>
            <div className="ek-deck-stack" ref={drawPileRef} aria-hidden>
              <ExplodingKittensDeckStack shuffleTick={deckShuffleTick} />
            </div>
            <div>
              <p className="ek-pile-count">{gs.drawPileCount} ใบ</p>
              <Button
                className="ek-pile-action"
                disabled={!canDrawCard}
                onClick={startDrawWithAnimation}
              >
                จั่วการ์ด
              </Button>
            </div>
          </div>
          <div className="ek-pile-box ek-pile-discard">
            <h4 className="ek-pile-title">กองทิ้ง</h4>
            <div className="ek-discard-face">
              {gs.discardTop ? (
                <img
                  src={CARD_IMAGE[gs.discardTop]}
                  alt={CARD_LABEL[gs.discardTop]}
                  className="ek-discard-top-img"
                />
              ) : (
                <div className="ek-discard-empty">ยังว่าง</div>
              )}
            </div>
            <div>
              <p className="ek-pile-count">{gs.discardCount} ใบ</p>
              <Button
                variant="secondary"
                className="ek-pile-action"
                disabled={gs.discardHistory.length === 0}
                onClick={() => setShowDiscardModal(true)}
              >
                ดูรายละเอียด
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="card ek-hand-zone" style={{ marginBottom: 16 }} ref={handZoneRef}>
        <div className="ek-hand-zone__head">
          <h3>มือของคุณ ({gs.myHand.length} ใบ)</h3>
          {handSelectActive && (
            <Button disabled={!canPlaySelected} onClick={confirmPlaySelected}>
              เล่นการ์ด
            </Button>
          )}
        </div>
        {handSelectActive && (
          <p className="ek-hand-hint">
            <strong>Effect</strong> แตะใบใหม่เพื่อสลับ (แตะใบเดิมซ้ำ = ยกเลิก) ·{' '}
            <strong>แมว</strong> เลือกหลายใบเป็นคู่ / สาม / ห้าแมว · แตะ Effect จะยกเลิกแมวที่เลือก
            แล้วกด <strong>เล่นการ์ด</strong>
          </p>
        )}
        {handSelectActive && illTakeBlocksBury && gs.myHand.some((c) => c.type === 'bury') && (
          <p className="ek-hand-hint ek-hand-hint--ill-take-bury">
            I&apos;ll Take That ค้าง — เล่น <strong>Bury</strong>{' '}
            ไม่ได้จนกว่าจะจั่วจบเทิร์นตามการ์ดนั้น
          </p>
        )}
        {canReorderHand && (
          <p className="ek-hand-reorder-hint">
            แตะหน้าการ์ดเพื่อเลือกเล่น · ลากที่แถบ <strong>ลากเรียง</strong>{' '}
            ด้านล่างการ์ดเพื่อจัดเรียงมือ
          </p>
        )}
        <DndContext
          sensors={handDndSensors}
          collisionDetection={closestCenter}
          onDragEnd={onHandDragEnd}
        >
          <SortableContext items={handSortIds} strategy={rectSortingStrategy}>
            <div className="ek-card-grid ek-hand-grid ek-hand-grid--sortable" role="list">
              {orderedHand.map((c) => {
                const blockedType =
                  c.type === 'nope' || c.type === 'defuse' || c.type === 'exploding_kitten';
                const buryBlockedByIllTake = c.type === 'bury' && illTakeBlocksBury;
                const canSelectCard =
                  handSelectActive &&
                  !blockedType &&
                  !buryBlockedByIllTake &&
                  (!handSelectAlterNowOnly || c.type === 'alter_future_now');
                return (
                  <EkSortableHandCard
                    key={c.id}
                    card={c}
                    showDragHandle={canReorderHand}
                    selectionActive={handSelectActive}
                    selected={selectedPlayIds.includes(c.id)}
                    canSelectCard={canSelectCard}
                    onToggleSelect={() => toggleHandSelect(c.id)}
                    onPeek={(t) => setHandZoomCardType(t)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <ExplodingKittensSingleCardModal
        open={handZoomCardType !== null}
        title="ดูการ์ดแบบเต็ม"
        card={
          handZoomCardType
            ? {
                imageSrc: CARD_IMAGE[handZoomCardType],
                imageAlt: CARD_LABEL[handZoomCardType],
                caption: CARD_LABEL[handZoomCardType],
              }
            : undefined
        }
        primaryAction={{ label: 'ปิด', onClick: () => setHandZoomCardType(null) }}
        overlayClassName="ek-reaction-overlay"
        modalClassName="ek-hand-zoom-modal"
      />

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

      {showDiscardModal && (
        <div
          className="modal-overlay ek-reaction-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ek-discard-modal-title"
          onClick={() => setShowDiscardModal(false)}
        >
          <div
            className="modal ek-discard-modal ek-multi-card-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="ek-discard-modal-title">กองทิ้งทั้งหมด</h2>
            <p className="ek-see-future-modal-hint">เรียงจากใหม่ → เก่า (ซ้ายไปขวา)</p>
            {gs.discardHistory.length === 0 ? (
              <p className="ek-discard-modal-empty">ยังไม่มีการ์ดในกองทิ้ง</p>
            ) : (
              <div className="ek-modal-card-grid ek-discard-modal-grid ek-see-future-modal-cards">
                {gs.discardHistory.map((t, i) => (
                  <div key={`discard-${i}`} className="ek-modal-card-preview">
                    <img
                      src={CARD_IMAGE[t]}
                      alt={CARD_LABEL[t]}
                      className="ek-card-img"
                      loading="lazy"
                    />
                    <div className="ek-card-caption">
                      {i + 1}. {CARD_LABEL[t]}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button block onClick={() => setShowDiscardModal(false)}>
              ปิด
            </Button>
          </div>
        </div>
      )}

      {drawFly && (
        <img
          src={CARD_BACK_URL}
          alt=""
          className="ek-draw-fly-card"
          style={{
            position: 'fixed',
            left: drawFly.left,
            top: drawFly.top,
            width: drawFly.w,
            height: drawFly.h,
            zIndex: 10000,
            pointerEvents: 'none',
            borderRadius: 10,
            objectFit: 'cover',
            boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
            transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
            transform: drawFly.run
              ? `translate(${drawFly.dx}px, ${drawFly.dy}px)`
              : 'translate(0,0)',
          }}
          onTransitionEnd={onDrawFlyTransitionEnd}
        />
      )}

      {gs.drawReveal && drawRevealAnim !== 'off' && (
        <div
          className={`ek-draw-reveal-peek${drawRevealAnim === 'shown' ? ' ek-draw-reveal-peek--shown' : ''}${drawRevealAnim === 'leave' ? ' ek-draw-reveal-peek--leave' : ''}`}
          role="status"
          aria-live="polite"
          aria-label={`จั่วได้ ${CARD_LABEL[gs.drawReveal.type]}`}
        >
          <img
            src={CARD_IMAGE[gs.drawReveal.type]}
            alt=""
            className="ek-draw-reveal-peek__img"
            loading="eager"
            aria-hidden
          />
          <div className="ek-draw-reveal-peek__label">{CARD_LABEL[gs.drawReveal.type]}</div>
        </div>
      )}
    </div>
  );
}
