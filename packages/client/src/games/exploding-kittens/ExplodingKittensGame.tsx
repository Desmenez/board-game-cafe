import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type {
  ExplodingKittensAction,
  ExplodingKittensCard,
  ExplodingKittensCardType,
  ExplodingKittensPlayerView,
} from 'shared';
import { isCatCard, validateFiveDistinctCatCombo, validateSameCatCombo } from 'shared';
import { Button } from '../../components/ui';
import {
  PlayerHand,
  PLAYER_HAND_DOCK_PEEK_RESERVE_PX,
  PLAYER_HAND_DOCK_RESERVE_PX,
  useLockBodyScroll,
  useNewlyDrawnCardIds,
  usePlayDragSensors,
} from '../../components/player-hand';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { fireDefuseDrawConfetti, startWinCelebrationLoop } from '../../utils/winCelebration';
import { GamePlayHeader, GameShell } from '../../components/game-shell';
import { ExplodingKittensSingleCardModal } from './components/ExplodingKittensSingleCardModal';
import { EkTopThreeModal } from './components/EkTopThreeModal';
import { EkDiscardPlayDropzone } from './components/EkDiscardPlayDropzone';
import { EkNoticeModals } from './components/EkNoticeModals';
import { EkExplosionReveal } from './components/EkExplosionReveal';
import { EkStatusSummary } from './components/EkStatusSummary';
import { EkGameOverModal } from './components/EkGameOverModal';
import { EkReactionModal } from './components/EkReactionModal';
import { EkBarkingShowModal } from './components/EkBarkingShowModal';
import { EkBarkingExchangeModal } from './components/EkBarkingExchangeModal';
import { EkTargetPickModals, type PlayTargetModalState } from './components/EkTargetPickModals';
import { EkFavorGiveModal } from './components/EkFavorGiveModal';
import { EkPhasePromptModals } from './components/EkPhasePromptModals';
import { DeckStack } from '../../components/deck-stack';
import { CARD_BACK_URL, CARD_IMAGE, CARD_LABEL } from './lib/cardMeta';
import { getTurnSpotlight } from './lib/turnSpotlight';
import { getReactionOneLiner } from './lib/reactionOneLiner';
import { EkModalTurnOrderStrip } from './components/EkTurnOrderUi';
import { getTurnOrderDockHint } from './lib/turnOrderDockHint';
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

export function ExplodingKittensGame({
  gameState: gs,
  myId,
  sendAction,
  onLeave,
  onRestart,
}: Props) {
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
  const [handOrganizeMode, setHandOrganizeMode] = useState(false);
  const [handDragCardId, setHandDragCardId] = useState<string | null>(null);
  const [deckShuffleTick, setDeckShuffleTick] = useState(0);
  const [handZoomCardType, setHandZoomCardType] = useState<ExplodingKittensCardType | null>(null);
  const [reactionPassEndsAt, setReactionPassEndsAt] = useState<number | null>(null);
  const [, setReactionCountdownTick] = useState(0);
  const drawPileRef = useRef<HTMLDivElement>(null);
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
  const ekMainTurn = gs.phase === 'turn' && isMyTurn && Boolean(me?.alive);
  useYourTurnToast(ekMainTurn, gs.phase !== 'game_over');
  const turnSpotlight = getTurnSpotlight(gs);
  const pa = gs.pendingAction;
  const reactionOneLiner = pa ? getReactionOneLiner(gs) : '';
  const turnOrderDockHint = getTurnOrderDockHint(gs, myId);
  const barkingShow = gs.barkingKittenShow;
  const hasAckedBarkingShow = Boolean(barkingShow?.acknowledgedBy.includes(myId));
  const barkingExchangePrompt = gs.barkingExchangePrompt;
  const canDrawCard =
    Boolean(me?.alive) &&
    gs.drawPileCount > 0 &&
    !gs.drawReveal &&
    ((gs.phase === 'turn' && isMyTurn) ||
      (gs.phase === 'bury_draw' && gs.buryDrawPlayerId === myId));

  const startDraw = () => {
    if (!canDrawCard) return;
    sendAction({ type: 'draw_card' });
  };

  const tablePlaySensors = usePlayDragSensors();

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

  const handCardIds = useMemo(() => orderedHand.map((c) => c.id), [orderedHand]);
  const newlyDrawnIds = useNewlyDrawnCardIds(handCardIds);

  const catComboBuilding = useMemo(() => {
    if (selectedPlayCards.length === 0) return false;
    if (selectedPlayCards.length === 1) {
      const t = selectedPlayCards[0]!.type;
      if (canPlayAsSingle(t) && t !== 'barking_kitten') return false;
      if (t === 'favor' || t === 'targeted_attack') return false;
      if (t === 'barking_kitten' && gs.barkingLonerPlayerId === gs.me.id) return false;
      return isCatCard(t);
    }
    if (selectionIsPlayable(selectedPlayCards, gs)) return false;
    return selectedPlayCards.every((c) => isCatCard(c.type));
  }, [gs, selectedPlayCards]);

  const handDragMode =
    handOrganizeMode && canReorderHand
      ? ('reorder' as const)
      : handSelectActive && isMyTurn && !handSelectAlterNowOnly && !catComboBuilding
        ? ('play' as const)
        : ('none' as const);

  const showHandDock = orderedHand.length > 0;
  const handDockPeek = showHandDock && !handOrganizeMode;
  const isHandDragging = handDragCardId !== null;
  useLockBodyScroll(isHandDragging);

  const handDragCard = useMemo(() => {
    if (!handDragCardId) return null;
    return orderedHand.find((c) => c.id === handDragCardId) ?? null;
  }, [handDragCardId, orderedHand]);

  const discardPlayZoneActive =
    handDragMode === 'play' &&
    handDragCard != null &&
    selectionIsPlayable([handDragCard], gs) &&
    selectedPlayIds.length <= 1 &&
    (selectedPlayIds.length === 0 || selectedPlayIds[0] === handDragCard.id);

  const disabledHandCardIds = useMemo(() => {
    if (!handSelectActive || handOrganizeMode) {
      return orderedHand.map((c) => c.id);
    }
    return orderedHand
      .filter((c) => {
        if (c.type === 'nope' || c.type === 'defuse' || c.type === 'exploding_kitten') return true;
        if (c.type === 'bury' && illTakeBlocksBury) return true;
        if (handSelectAlterNowOnly && c.type !== 'alter_future_now') return true;
        return false;
      })
      .map((c) => c.id);
  }, [handOrganizeMode, handSelectActive, handSelectAlterNowOnly, illTakeBlocksBury, orderedHand]);

  useEffect(() => {
    if (handSelectActive && isMyTurn) setHandOrganizeMode(false);
  }, [handSelectActive, isMyTurn]);

  useEffect(() => {
    setHandDragCardId(null);
  }, [gs.phase, gs.currentPlayerId, isMyTurn]);

  const onHandReorder = useCallback((orderedIds: string[]) => {
    setHandDisplayOrder(orderedIds);
  }, []);

  const playCardsFromHand = useCallback(
    (cards: { id: string; type: ExplodingKittensCardType }[]) => {
      const n = cards.length;
      if (n === 1) {
        if (cards[0]!.type === 'barking_kitten' && gs.barkingLonerPlayerId === gs.me.id) {
          setPlayTargetModal({ kind: 'barking_loner_pair', cardId: cards[0]!.id });
          return;
        }
        sendAction({ type: 'play_card', cardId: cards[0]!.id });
        setSelectedPlayIds([]);
        return;
      }
      if (n === 2 && isBarkingPairCards(cards)) {
        setPlayTargetModal({ kind: 'barking_pair', cardIdA: cards[0]!.id, cardIdB: cards[1]!.id });
        return;
      }
      if (n === 2) {
        setPlayTargetModal({ kind: 'pair', cardIdA: cards[0]!.id, cardIdB: cards[1]!.id });
        return;
      }
      if (n === 3) {
        setPlayTargetModal({
          kind: 'three',
          cardIdA: cards[0]!.id,
          cardIdB: cards[1]!.id,
          cardIdC: cards[2]!.id,
          step: 'target',
        });
        return;
      }
      if (n === 5) {
        sendAction({
          type: 'play_five_cats',
          cardIds: [cards[0]!.id, cards[1]!.id, cards[2]!.id, cards[3]!.id, cards[4]!.id],
        });
        setSelectedPlayIds([]);
      }
    },
    [gs.barkingLonerPlayerId, gs.me.id, sendAction],
  );

  const playDraggedToDiscard = useCallback(
    (cardId: string) => {
      if (!handSelectActive || handSelectAlterNowOnly || !isMyTurn) return;
      if (selectedPlayIds.length >= 2) return;
      if (selectedPlayIds.length === 1 && selectedPlayIds[0] !== cardId) return;
      const card = gs.myHand.find((c) => c.id === cardId);
      if (!card) return;
      if (!selectionIsPlayable([card], gs)) return;
      playCardsFromHand([card]);
    },
    [gs, handSelectActive, handSelectAlterNowOnly, isMyTurn, playCardsFromHand, selectedPlayIds],
  );

  const onTableDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith('hand-')) setHandDragCardId(id.slice('hand-'.length));
  }, []);

  const onTableDragEnd = useCallback(
    (event: DragEndEvent) => {
      setHandDragCardId(null);
      const activeId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : '';
      if (activeId.startsWith('hand-') && overId === 'ek-discard-play-zone') {
        playDraggedToDiscard(activeId.slice('hand-'.length));
      }
    },
    [playDraggedToDiscard],
  );

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
    playCardsFromHand(selectedPlayCards);
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
    <GameShell
      className={['ek-page pb-64!', isHandDragging ? 'ek-page--dragging' : '']
        .filter(Boolean)
        .join(' ')}
      style={{
        paddingBottom: showHandDock
          ? handDockPeek
            ? PLAYER_HAND_DOCK_PEEK_RESERVE_PX
            : PLAYER_HAND_DOCK_RESERVE_PX
          : undefined,
      }}
    >
      <EkNoticeModals
        gs={gs}
        showStealPopup={showStealPopup}
        showThreeClaimPopup={showThreeClaimPopup}
        showFiveCatsDiscardPickPopup={showFiveCatsDiscardPickPopup}
        onDismissSteal={() => setShowStealPopup(false)}
        onDismissThreeClaim={() => setShowThreeClaimPopup(false)}
        onDismissFiveCats={() => setShowFiveCatsDiscardPickPopup(false)}
      />

      {gs.phase === 'explosion_reveal' && gs.explosionReveal && (
        <EkExplosionReveal reveal={gs.explosionReveal} />
      )}

      <GamePlayHeader
        title="Exploding Kittens"
        subtitle={gs.mode === 'party_pack' ? 'Party Pack' : 'Original'}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      <EkStatusSummary
        gs={gs}
        myId={myId}
        turnSpotlight={turnSpotlight}
        phaseHint={phaseHint}
        aliveCount={aliveCount}
        me={me}
      />

      <EkGameOverModal
        gs={gs}
        myId={myId}
        gameOverRanking={gameOverRanking}
        onLeave={onLeave}
        onRestart={onRestart}
      />

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
        <EkReactionModal
          gs={gs}
          myId={myId}
          pa={pa}
          reactionOneLiner={reactionOneLiner}
          aliveCount={aliveCount}
          canReactNope={canReactNope}
          hasPassedReaction={hasPassedReaction}
          needsReactionAutoPass={Boolean(needsReactionAutoPass)}
          reactionCountdownFrac={reactionCountdownFrac}
          reactionRemainingMs={reactionRemainingMs}
          hasNope={hasNope}
          me={me}
          blockedNopeSelfAction={blockedNopeSelfAction}
          blockedNopeOwnChain={blockedNopeOwnChain}
          onNope={reactNope}
          onPass={() => sendAction({ type: 'react_pass' })}
        />
      )}

      {gs.phase === 'barking_kitten_show' && barkingShow && (
        <EkBarkingShowModal
          barkingShow={barkingShow}
          aliveCount={aliveCount}
          hasAcked={hasAckedBarkingShow}
          onAck={() => sendAction({ type: 'acknowledge_barking_kitten_show' })}
        />
      )}

      {gs.phase === 'barking_exchange' && barkingExchangePrompt && (
        <EkBarkingExchangeModal
          gs={gs}
          myId={myId}
          barkingExchangePrompt={barkingExchangePrompt}
          sendAction={sendAction}
        />
      )}

      <EkTargetPickModals
        gs={gs}
        myId={myId}
        sendAction={sendAction}
        playTargetModal={playTargetModal}
        stealPairTargets={stealPairTargets}
        aliveOpponents={aliveOpponents}
        illTakeTargetOptions={illTakeTargetOptions}
        favorTargetOptions={favorTargetOptions}
        onConfirmPair={confirmPairTarget}
        onConfirmBarkingPair={confirmBarkingPairTarget}
        onConfirmBarkingLoner={confirmBarkingLonerPairTarget}
        onConfirmThreeClaim={confirmThreeClaim}
        onSetPlayTargetModal={setPlayTargetModal}
      />

      <EkFavorGiveModal gs={gs} myId={myId} sendAction={sendAction} />

      <EkPhasePromptModals
        gs={gs}
        myId={myId}
        sendAction={sendAction}
        alterOrder={alterOrder}
        alterFutureDndSensors={alterFutureDndSensors}
        onAlterFutureDragEnd={onAlterFutureDragEnd}
      />

      <DndContext
        sensors={tablePlaySensors}
        collisionDetection={pointerWithin}
        autoScroll={{ threshold: { x: 0.12, y: 0.18 } }}
        onDragStart={onTableDragStart}
        onDragCancel={() => setHandDragCardId(null)}
        onDragEnd={onTableDragEnd}
      >
        <div className="card ek-piles-row" style={{ marginBottom: 16 }}>
          <div className="ek-piles-grid">
            <div className="ek-pile-box ek-pile-draw">
              <h4 className="ek-pile-title">กองจั่ว</h4>
              <DeckStack
                ref={drawPileRef}
                backSrc={CARD_BACK_URL}
                className="ek-deck-stack"
                motionClassName="ek-deck-stack-motion"
                layerClassName="ek-deck-layer"
                shuffleTick={deckShuffleTick}
              />
              <div>
                <p className="ek-pile-count">{gs.drawPileCount} ใบ</p>
                <Button className="ek-pile-action" disabled={!canDrawCard} onClick={startDraw}>
                  จั่วการ์ด
                </Button>
              </div>
            </div>
            <EkDiscardPlayDropzone
              disabled={handDragMode !== 'play'}
              active={discardPlayZoneActive}
            >
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
                {handDragMode === 'play' && isMyTurn ? (
                  <p className="ek-pile-play-hint">ลาก Effect มาวางที่นี่เพื่อเล่น</p>
                ) : null}
                <Button
                  variant="secondary"
                  className="ek-pile-action"
                  disabled={gs.discardHistory.length === 0}
                  onClick={() => setShowDiscardModal(true)}
                >
                  ดูรายละเอียด
                </Button>
              </div>
            </EkDiscardPlayDropzone>
          </div>
        </div>

        {gs.myHand.length > 0 ? (
          <section className="card ek-hand-hint-card" style={{ marginBottom: 16 }}>
            <div className="ek-hand-zone__head">
              <h3>มือของคุณ ({gs.myHand.length} ใบ)</h3>
              <div className="ek-hand-hint-card__actions">
                {canReorderHand && !handSelectActive ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setHandOrganizeMode((v) => !v)}
                  >
                    {handOrganizeMode ? 'เสร็จจัดเรียง' : 'จัดเรียงมือ'}
                  </Button>
                ) : null}
                {handSelectActive ? (
                  <Button disabled={!canPlaySelected} onClick={confirmPlaySelected}>
                    เล่นการ์ด
                    {selectedPlayIds.length > 1 ? ` (${selectedPlayIds.length})` : ''}
                  </Button>
                ) : null}
              </div>
            </div>
            {handOrganizeMode ? (
              <p className="ek-hand-hint">
                ลากการ์ดบนมือเพื่อจัดเรียง — กด «เสร็จจัดเรียง» เมื่อเสร็จ
              </p>
            ) : handSelectActive ? (
              <>
                <p className="ek-hand-hint">
                  <strong>Effect</strong> ลากลงกองทิ้งเพื่อเล่นทันที · แตะสลับเลือก Effect ·{' '}
                  <strong>แมว</strong> แตะหลายใบ (คู่/สาม/ห้า) แล้วกด <strong>เล่นการ์ด</strong>
                </p>
                {illTakeBlocksBury && gs.myHand.some((c) => c.type === 'bury') ? (
                  <p className="ek-hand-hint ek-hand-hint--ill-take-bury">
                    I&apos;ll Take That ค้าง — เล่น <strong>Bury</strong>{' '}
                    ไม่ได้จนกว่าจะจั่วจบเทิร์นตามการ์ดนั้น
                  </p>
                ) : null}
              </>
            ) : (
              <p className="ek-hand-hint">
                ปัดขึ้นที่แถบมือด้านล่างเพื่อดูการ์ด · double-click เพื่อขยาย
              </p>
            )}
          </section>
        ) : null}

        {showHandDock ? (
          <PlayerHand
            cards={orderedHand}
            getCardId={(c) => c.id}
            dragMode={handDragMode}
            dockPeek={handDockPeek}
            draggableIdPrefix="hand"
            selectedIds={handSelectActive && !handOrganizeMode ? selectedPlayIds : []}
            onSelectToggle={handSelectActive && !handOrganizeMode ? toggleHandSelect : undefined}
            disabledCardIds={disabledHandCardIds}
            onReorder={handOrganizeMode ? onHandReorder : undefined}
            drawAnimation={{ newlyDrawnIds, drawFromRef: drawPileRef }}
            getPreview={(card) => ({
              src: CARD_IMAGE[card.type],
              alt: CARD_LABEL[card.type],
              caption: CARD_LABEL[card.type],
            })}
            renderCard={({ card }) => (
              <img
                src={CARD_IMAGE[card.type]}
                alt=""
                className="ek-player-hand-card-img"
                loading="lazy"
              />
            )}
            aria-label={`มือของคุณ (${orderedHand.length} ใบ)`}
            className="ek-player-hand-dock"
          />
        ) : null}

        <DragOverlay dropAnimation={null}>
          {handDragCard ? (
            <img src={CARD_IMAGE[handDragCard.type]} alt="" className="player-hand-drag-overlay" />
          ) : null}
        </DragOverlay>
      </DndContext>

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
    </GameShell>
  );
}
