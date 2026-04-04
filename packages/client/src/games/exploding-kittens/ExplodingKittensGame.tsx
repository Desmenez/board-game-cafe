import { useEffect, useId, useRef, useState } from 'react';
import type {
  ExplodingKittensAction,
  ExplodingKittensCardType,
  ExplodingKittensPlayerView,
} from 'shared';
import { Button, Input, Slider } from '../../components/ui';
import { imageMap } from '../../imageMap';
import { fireDefuseDrawConfetti, startWinCelebrationLoop } from '../../utils/winCelebration';
import { ExplodingKittensSingleCardModal } from './ExplodingKittensSingleCardModal';
import './exploding-kittens.css';

interface Props {
  gameState: ExplodingKittensPlayerView;
  myId: string;
  sendAction: (action: ExplodingKittensAction) => void;
  onLeave: () => void;
}

const CARD_LABEL: Record<ExplodingKittensCardType, string> = {
  exploding_kitten: 'Exploding Kitten',
  defuse: 'Defuse',
  attack: 'Attack',
  skip: 'Skip',
  shuffle: 'Shuffle',
  see_future: 'See the Future',
  favor: 'Favor',
  targeted_attack: 'Targeted Attack',
  draw_from_bottom: 'Draw from the Bottom',
  alter_future: 'Alter the Future',
  nope: 'Nope',
  feral_cat: 'Feral Cat',
  cat_taco: 'Taco Cat',
  cat_melon: 'Cattermelon',
  cat_beard: 'Beard Cat',
  cat_rainbow: 'Rainbow Cat',
  cat_potato: 'Hairy Potato Cat',
};

const CARD_IMAGE: Record<ExplodingKittensCardType, string> = imageMap.explodingKittens.cards;
const CARD_BACK_URL = imageMap.explodingKittens.cardBack;

const EK_PHASE_HINT: Partial<Record<ExplodingKittensPlayerView['phase'], string>> = {
  reaction: 'รอให้ทุกคนตอบ Nope / Pass',
  explosion_reveal: 'เปิดการ์ดระเบิด',
  defuse_prompt: 'ผู้จั่วระเบิดตัดสินใจ Defuse',
  defuse_reinsert: 'เลือกตำแหน่งใส่ระเบิดกลับกอง',
  favor_target: 'เลือกเป้าหมาย Favor',
  favor_give: 'เลือกการ์ดมอบให้ (Favor)',
  targeted_attack_target: 'เลือกเป้าหมาย Targeted Attack',
  five_cats_pick_discard: 'เลือกการ์ดจากกองทิ้ง (คอมโบ 5 แมว)',
  alter_future_reorder: 'จัดลำดับ 3 ใบบนสุดของกองจั่ว',
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
  ].includes(type);
}

function isCatCardType(type: ExplodingKittensCardType): boolean {
  return type.startsWith('cat_') || type === 'feral_cat';
}

function validateSameCatComboTypes(cards: { type: ExplodingKittensCardType }[]): boolean {
  if (cards.length < 2) return false;
  if (!cards.every((c) => isCatCardType(c.type))) return false;
  const nonFeral = cards.filter((c) => c.type !== 'feral_cat').map((c) => c.type);
  if (nonFeral.length === 0) return true;
  return new Set(nonFeral).size === 1;
}

function validateFiveDistinctCatComboTypes(cards: { type: ExplodingKittensCardType }[]): boolean {
  if (cards.length !== 5) return false;
  if (!cards.every((c) => isCatCardType(c.type))) return false;
  const nonFeral = cards.filter((c) => c.type !== 'feral_cat').map((c) => c.type);
  return new Set(nonFeral).size === nonFeral.length;
}

/** prefix 1–4 ใบ ระหว่างเลือกคอมโบ 5 แมวคนละชนิด (ห้ามชนิดแมว non-feral ซ้ำ) */
function fiveDistinctCatPrefix(cards: { type: ExplodingKittensCardType }[]): boolean {
  const n = cards.length;
  if (n < 1 || n > 4) return false;
  if (!cards.every((c) => isCatCardType(c.type))) return false;
  const nonFeral = cards.filter((c) => c.type !== 'feral_cat').map((c) => c.type);
  return new Set(nonFeral).size === nonFeral.length;
}

function selectionIsPlayable(cards: { type: ExplodingKittensCardType }[]): boolean {
  const n = cards.length;
  if (n === 0) return false;
  if (n === 1) {
    const t = cards[0].type;
    return canPlayAsSingle(t) || t === 'favor' || t === 'targeted_attack';
  }
  if (n === 2 || n === 3) return validateSameCatComboTypes(cards);
  if (n === 5) return validateFiveDistinctCatComboTypes(cards);
  return false;
}

function selectionIsValidPrefix(cards: { type: ExplodingKittensCardType }[]): boolean {
  const n = cards.length;
  if (n === 0) return true;
  if (n === 1) {
    const t = cards[0].type;
    if (t === 'nope' || t === 'defuse' || t === 'exploding_kitten') return false;
    if (canPlayAsSingle(t) || t === 'favor' || t === 'targeted_attack') return true;
    if (isCatCardType(t)) return true;
    return false;
  }
  if (n === 2 || n === 3) {
    if (!cards.every((c) => isCatCardType(c.type))) return false;
    return validateSameCatComboTypes(cards) || fiveDistinctCatPrefix(cards);
  }
  if (n === 4) {
    if (!cards.every((c) => isCatCardType(c.type))) return false;
    return fiveDistinctCatPrefix(cards);
  }
  if (n === 5) {
    if (!cards.every((c) => isCatCardType(c.type))) return false;
    return validateFiveDistinctCatComboTypes(cards);
  }
  return false;
}

type TurnSpotlightPlayer = ExplodingKittensPlayerView['players'][number];

function getTurnSpotlight(gs: ExplodingKittensPlayerView): {
  prev: TurnSpotlightPlayer | null;
  current: TurnSpotlightPlayer | null;
  next: TurnSpotlightPlayer | null;
} {
  const players = gs.players;
  const n = players.length;
  if (n === 0) return { prev: null, current: null, next: null };

  const curIdx = players.findIndex((p) => p.id === gs.currentPlayerId);
  if (curIdx < 0) return { prev: null, current: null, next: null };

  const findPrevAlive = (from: number): TurnSpotlightPlayer | null => {
    for (let k = 1; k < n; k += 1) {
      const j = (from - k + n) % n;
      if (j !== from && players[j].alive) return players[j];
    }
    return null;
  };
  const findNextAlive = (from: number): TurnSpotlightPlayer | null => {
    for (let k = 1; k < n; k += 1) {
      const j = (from + k) % n;
      if (j !== from && players[j].alive) return players[j];
    }
    return null;
  };

  return {
    prev: findPrevAlive(curIdx),
    current: players[curIdx],
    next: findNextAlive(curIdx),
  };
}

/** หนึ่งบรรทัด: ใคร · การ์ด · ใส่ใคร */
function getReactionOneLiner(gs: ExplodingKittensPlayerView): string {
  const pa = gs.pendingAction;
  if (!pa) return '';
  const tn = pa.targetId ? (gs.players.find((p) => p.id === pa.targetId)?.name ?? '') : '';
  if (pa.type === 'three_claim' && pa.requestedType && tn) {
    return `${pa.actorName} · ขอ ${CARD_LABEL[pa.requestedType]} · ใส่ ${tn}`;
  }
  const cards =
    pa.playedCardTypes && pa.playedCardTypes.length > 0
      ? pa.playedCardTypes.map((t) => CARD_LABEL[t]).join(' + ')
      : '';
  const mid = cards || pa.type;
  if (tn) return `${pa.actorName} · ${mid} · ใส่ ${tn}`;
  return `${pa.actorName} · ${mid}`;
}

type PlayTargetModalState =
  | { kind: 'pair'; cardIdA: string; cardIdB: string }
  | {
      kind: 'three';
      cardIdA: string;
      cardIdB: string;
      cardIdC: string;
      step: 'target' | 'type';
      targetId?: string;
    };

function ExplosionGif() {
  return (
    <img
      className="ek-explosion-gif-full"
      src={imageMap.explodingKittens.catExplode}
      alt="Exploding cat"
    />
  );
}

export function ExplodingKittensGame({ gameState: gs, myId, sendAction, onLeave }: Props) {
  const [hoveredFavorCard, setHoveredFavorCard] = useState<ExplodingKittensCardType | null>(null);
  const [defuseInsertIndex, setDefuseInsertIndex] = useState(0);
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
  const drawPileRef = useRef<HTMLDivElement>(null);
  const handZoneRef = useRef<HTMLDivElement>(null);
  const turnOrderPanelId = useId();
  const [turnOrderExpanded, setTurnOrderExpanded] = useState(false);
  const [seeFutureModalOpen, setSeeFutureModalOpen] = useState(false);
  const seeFuturePeekKey = gs.seenTopCards?.join('|') ?? '';
  const isMyTurn = gs.currentPlayerId === myId;
  const aliveCount = gs.players.filter((p) => p.alive).length;
  const phaseHint = gs.phase !== 'turn' ? EK_PHASE_HINT[gs.phase] : undefined;
  const aliveOpponents = gs.players.filter((p) => p.id !== myId && p.alive);
  const stealPairTargets = aliveOpponents.filter((p) => p.handCount > 0);
  const favorTargetOptions = aliveOpponents.filter((p) => p.handCount > 0);
  const me = gs.players.find((p) => p.id === myId);
  const turnSpotlight = getTurnSpotlight(gs);
  const pa = gs.pendingAction;
  const reactionOneLiner = pa ? getReactionOneLiner(gs) : '';
  const reactionNextLine = `เทิร์นถัดไป ${turnSpotlight.next?.name ?? '—'}`;
  const canDrawCard =
    gs.phase === 'turn' && isMyTurn && Boolean(me?.alive) && gs.drawPileCount > 0 && !drawFly;

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

  const selectedPlayCards = selectedPlayIds
    .map((id) => gs.myHand.find((c) => c.id === id))
    .filter((c): c is { id: string; type: ExplodingKittensCardType } => Boolean(c));
  const canPlaySelected =
    gs.phase === 'turn' && isMyTurn && Boolean(me?.alive) && selectionIsPlayable(selectedPlayCards);
  const handSelectActive = gs.phase === 'turn' && isMyTurn && Boolean(me?.alive);

  const toggleHandSelect = (cardId: string) => {
    if (!handSelectActive) return;
    const card = gs.myHand.find((c) => c.id === cardId);
    if (!card) return;
    if (card.type === 'nope' || card.type === 'defuse' || card.type === 'exploding_kitten') {
      return;
    }

    const clickedIsEffect = canPlayAsSingle(card.type);
    const clickedIsCat = isCatCardType(card.type);

    setSelectedPlayIds((prev) => {
      const prevCards = prev
        .map((id) => gs.myHand.find((c) => c.id === id))
        .filter((c): c is { id: string; type: ExplodingKittensCardType } => Boolean(c));
      const prevHadEffect = prevCards.some((c) => canPlayAsSingle(c.type));

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
      sendAction({ type: 'play_card', cardId: cards[0].id });
      setSelectedPlayIds([]);
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
      if (pm.kind === 'pair') {
        return handSet.has(pm.cardIdA) && handSet.has(pm.cardIdB) ? pm : null;
      }
      return handSet.has(pm.cardIdA) && handSet.has(pm.cardIdB) && handSet.has(pm.cardIdC)
        ? pm
        : null;
    });
  }, [gs.myHand]);

  useEffect(() => {
    if (gs.phase !== 'turn' || !isMyTurn) {
      setSelectedPlayIds([]);
      setPlayTargetModal(null);
    }
  }, [gs.phase, isMyTurn]);

  useEffect(() => {
    if (gs.phase !== 'game_over') return;
    return startWinCelebrationLoop();
  }, [gs.phase]);

  useEffect(() => {
    if (gs.phase !== 'defuse_reinsert') return;
    const max = gs.drawPileCount;
    setDefuseInsertIndex((prev) => Math.max(0, Math.min(prev, max)));
  }, [gs.phase, gs.drawPileCount]);

  useEffect(() => {
    if (gs.drawReveal?.type !== 'defuse') return;
    fireDefuseDrawConfetti();
  }, [gs.drawReveal?.type]);

  useEffect(() => {
    if (!seeFuturePeekKey) return;
    setSeeFutureModalOpen(true);
  }, [seeFuturePeekKey]);

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
              <strong>{gs.threeClaimNotice.actorName}</strong> เรียกการ์ด{' '}
              <strong>{CARD_LABEL[gs.threeClaimNotice.requestedType]}</strong> จาก{' '}
              <strong>{gs.threeClaimNotice.targetName}</strong>
            </p>
          }
          card={{
            imageSrc: CARD_IMAGE[gs.threeClaimNotice.requestedType],
            imageAlt: CARD_LABEL[gs.threeClaimNotice.requestedType],
            caption: gs.threeClaimNotice.success
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

      <ExplodingKittensSingleCardModal
        open={Boolean(gs.drawReveal)}
        title="คุณจั่วได้"
        titleClassName="text-center mx-auto"
        card={
          gs.drawReveal
            ? {
                imageSrc: CARD_IMAGE[gs.drawReveal.type],
                imageAlt: CARD_LABEL[gs.drawReveal.type],
                caption: CARD_LABEL[gs.drawReveal.type],
              }
            : undefined
        }
        primaryAction={{
          label: 'รับทราบ',
          onClick: () => sendAction({ type: 'acknowledge_draw_reveal' }),
        }}
      />

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
          <h1 className="ek-status-summary__title">Exploding Kittens</h1>
          <span className="ek-status-summary__mode">
            {gs.mode === 'party_pack' ? 'Party Pack' : 'Original'}
          </span>
        </div>

        <div className="ek-turn-spotlight" aria-label="ลำดับการเล่นรอบโต๊ะ">
          <div className="ek-turn-spotlight__col">
            <span className="ek-turn-spotlight__label">คนที่แล้ว</span>
            {turnSpotlight.prev ? (
              <>
                <span className="ek-turn-spotlight__name">{turnSpotlight.prev.name}</span>
                {turnSpotlight.prev.id === myId && (
                  <span className="ek-turn-spotlight__you">คุณ</span>
                )}
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
          <div className="ek-turn-spotlight__col ek-turn-spotlight__col--current">
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
                <span className="ek-turn-spotlight__meta">
                  เหลือ {gs.pendingTurnsForCurrent} เทิร์น
                </span>
              </>
            ) : (
              <span className="ek-turn-spotlight__empty">—</span>
            )}
          </div>
          <div className="ek-turn-spotlight__col">
            <span className="ek-turn-spotlight__label">คนต่อไป</span>
            {turnSpotlight.next ? (
              <>
                <span className="ek-turn-spotlight__name">{turnSpotlight.next.name}</span>
                {turnSpotlight.next.id === myId && (
                  <span className="ek-turn-spotlight__you">คุณ</span>
                )}
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
            <div className="ek-turn-grid" role="list">
              {gs.players.map((p) => (
                <div
                  key={p.id}
                  role="listitem"
                  className={`ek-turn-cell ${p.id === gs.currentPlayerId ? 'is-current' : ''} ${!p.alive ? 'is-dead' : ''}`}
                >
                  <div className="ek-turn-cell-name">{p.name}</div>
                  <div className="ek-turn-cell-hand">การ์ดในมือ: {p.handCount} ใบ</div>
                </div>
              ))}
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
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal" style={{ textAlign: 'center' }}>
            <h2>🏆 เกมจบแล้ว</h2>
            <p>
              ผู้ชนะ: <strong>{gs.winnerName ?? gs.winnerId}</strong>
            </p>
            <Button block onClick={onLeave}>
              กลับห้อง
            </Button>
          </div>
        </div>
      )}

      {gs.seenTopCards && gs.seenTopCards.length > 0 && seeFutureModalOpen && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal ek-multi-card-modal">
            <h2>See the Future</h2>
            <p className="ek-see-future-modal-hint">
              บนกองจั่ว {gs.seenTopCards.length} ใบล่างสุด (จากบน → ล่าง)
            </p>
            <div className="ek-modal-card-grid ek-modal-card-grid--dense ek-alter-future-modal-grid ek-see-future-modal-cards">
              {gs.seenTopCards.map((t, i) => (
                <div key={`${t}-${i}`} className="ek-modal-card-preview">
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
            <Button size="sm" block onClick={() => setSeeFutureModalOpen(false)}>
              รับทราบ
            </Button>
          </div>
        </div>
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

      {gs.phase === 'reaction' && pa && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal ek-reaction-modal">
            <p id="ek-reaction-title" className="ek-reaction-kicker">
              {pa.nopeCount > 0
                ? `Chain Nope · ${reactionNextLine}`
                : `Respond · ${reactionNextLine}`}
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
                  <strong>{pa.lastNopePlayerName ?? '?'}</strong> · Nope
                  <span className="ek-reaction-hero-sub"> ยก {reactionOneLiner}</span>
                </p>
              </div>
            ) : (
              pa.playedCardTypes &&
              pa.playedCardTypes.length > 0 && (
                <div className="ek-reaction-card-strip ek-reaction-card-strip--hero">
                  {pa.playedCardTypes.map((t, i) => (
                    <div
                      key={`${t}-${i}`}
                      className="ek-modal-card-preview ek-modal-card-preview--reaction-hero"
                    >
                      <img
                        src={CARD_IMAGE[t]}
                        alt=""
                        className="ek-card-img"
                        loading="lazy"
                        aria-hidden
                      />
                    </div>
                  ))}
                </div>
              )
            )}

            {pa.nopeCount === 0 && (
              <p className="ek-reaction-one-liner">
                <strong>{reactionOneLiner}</strong>
              </p>
            )}

            <p className="ek-reaction-progress">
              ตอบ {pa.passedBy.length}/{aliveCount}
            </p>

            {pa.actorId === myId && pa.nopeCount === 0 ? (
              <p className="ek-reaction-wait">รอผู้อื่น (คุณเล่นการ์ดแล้ว)</p>
            ) : (
              <>
                <div className="ek-reaction-actions">
                  <Button
                    className="w-1/2"
                    variant="danger"
                    disabled={!canReactNope}
                    onClick={reactNope}
                  >
                    Nope
                  </Button>
                  <Button
                    className="w-1/2"
                    variant="secondary"
                    disabled={hasPassedReaction}
                    onClick={() => sendAction({ type: 'react_pass' })}
                  >
                    {hasPassedReaction ? 'ผ่านแล้ว' : 'ผ่าน'}
                  </Button>
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
              <h2>เรียกการ์ดชนิดใด</h2>
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
          <div className="modal ek-multi-card-modal">
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
          </div>
        </div>
      )}

      {gs.phase === 'defuse_reinsert' && gs.defusePrompt?.playerId === myId && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Defuse สำเร็จ — ใส่ Exploding Kitten กลับกอง</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
              เลือกตำแหน่งเจาะจงได้ (0 = บนสุด, {gs.drawPileCount} = ล่างสุด)
            </p>
            <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
              <Slider
                label="ตำแหน่งในกอง"
                valueLabel={String(defuseInsertIndex)}
                min={0}
                max={gs.drawPileCount}
                value={defuseInsertIndex}
                onChange={(e) => setDefuseInsertIndex(Number(e.target.value))}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>ตำแหน่ง</span>
                <Input
                  id="defuse-index-input"
                  aria-label="ตำแหน่ง"
                  style={{ width: 90 }}
                  type="number"
                  min={0}
                  max={gs.drawPileCount}
                  value={defuseInsertIndex}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isNaN(next)) return;
                    setDefuseInsertIndex(Math.max(0, Math.min(next, gs.drawPileCount)));
                  }}
                />
                <Button
                  onClick={() => sendAction({ type: 'defuse_reinsert', index: defuseInsertIndex })}
                >
                  ยืนยันตำแหน่ง
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {gs.phase === 'alter_future_reorder' && gs.alterFuturePrompt?.playerId === myId && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal ek-multi-card-modal">
            <h2>Alter the Future</h2>
            <p className="ek-see-future-modal-hint">
              เรียง 3 ใบบนสุดของกองจั่ว (ซ้าย = บนสุดที่จะถูกจั่วก่อน) — หมุนหรือสลับแล้วกดยืนยัน
            </p>
            <div className="ek-modal-card-grid ek-modal-card-grid--dense ek-alter-future-modal-grid ek-see-future-modal-cards">
              {alterOrder.map((idx, pos) => {
                const t = gs.alterFuturePrompt?.top3[idx];
                if (!t) return null;
                return (
                  <div key={`alter-${pos}-${idx}`} className="ek-modal-card-preview">
                    <img
                      src={CARD_IMAGE[t]}
                      alt={CARD_LABEL[t]}
                      className="ek-card-img"
                      loading="lazy"
                    />
                    <div className="ek-card-caption">
                      {pos + 1}. {CARD_LABEL[t]}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="ek-alter-future-controls" role="group" aria-label="จัดลำดับการ์ด">
              <Button variant="secondary" onClick={() => setAlterOrder(([a, b, c]) => [b, c, a])}>
                หมุนซ้าย
              </Button>
              <Button variant="secondary" onClick={() => setAlterOrder(([a, b, c]) => [c, a, b])}>
                หมุนขวา
              </Button>
              <Button variant="secondary" onClick={() => setAlterOrder(([a, b, c]) => [b, a, c])}>
                สลับ 1↔2
              </Button>
              <Button variant="secondary" onClick={() => setAlterOrder(([a, b, c]) => [a, c, b])}>
                สลับ 2↔3
              </Button>
            </div>
            <Button
              block
              onClick={() => sendAction({ type: 'alter_future_reorder', order: alterOrder })}
            >
              ยืนยันลำดับ
            </Button>
          </div>
        </div>
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
              {[0, 1, 2, 3, 4].map((i) => (
                <img
                  key={i}
                  src={CARD_BACK_URL}
                  alt=""
                  className="ek-deck-layer"
                  style={{ left: i * 4, top: -i * 4, zIndex: 10 - i }}
                />
              ))}
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
        <div className="ek-card-grid ek-hand-grid">
          {gs.myHand.map((c) => {
            const selected = selectedPlayIds.includes(c.id);
            const blockedType =
              c.type === 'nope' || c.type === 'defuse' || c.type === 'exploding_kitten';
            const canClick = handSelectActive && !blockedType;
            return (
              <button
                key={c.id}
                type="button"
                className={`ek-hand-select-card${selected ? ' ek-hand-select-card--selected' : ''}${!canClick ? ' ek-hand-select-card--disabled' : ''}`}
                aria-pressed={selected}
                aria-label={`${selected ? 'ยกเลิกการเลือก' : 'เลือก'} ${CARD_LABEL[c.type]}`}
                disabled={!canClick}
                onClick={() => toggleHandSelect(c.id)}
              >
                <img
                  src={CARD_IMAGE[c.type]}
                  alt=""
                  className="ek-card-img"
                  loading="lazy"
                  aria-hidden
                />
                <div className="ek-hand-card-caption">{CARD_LABEL[c.type]}</div>
              </button>
            );
          })}
        </div>
      </div>

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

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="danger" onClick={onLeave}>
          ออกจากห้อง
        </Button>
      </div>
    </div>
  );
}
