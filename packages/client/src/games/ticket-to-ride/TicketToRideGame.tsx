import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchContentRef,
} from 'react-zoom-pan-pinch';
import type { TtrAction, TtrPlayerView, TtrTrainColor } from 'shared';
import { TTR_ROUTES, TTR_TRAIN_COLORS, type TtrRouteDef } from 'shared';
import { GameOverActions, GamePlayHeader, GameShell } from '../../components/game-shell';
import { DeckStack } from '../../components/deck-stack';
import { Button } from '../../components/ui';
import { TTR_RENDER_BY_ID, ttrRenderDefForRouteId } from './ttrRenderRoutes';
import { imageMap } from '../../imageMap';
import {
  fireTtrDestinationCompletedConfetti,
  startWinCelebrationLoop,
} from '../../utils/winCelebration';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import './ticket-to-ride.css';

type Props = {
  gameState: TtrPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

const trainColorLabel: Record<TtrTrainColor, string> = {
  red: 'แดง',
  blue: 'น้ำเงิน',
  green: 'เขียว',
  yellow: 'เหลือง',
  black: 'ดำ',
  white: 'ขาว',
  orange: 'ส้ม',
  purple: 'ม่วง',
  locomotive: 'หัวรถจักร',
};
const TTR_DESTINATION_BACK_CARD_URL = imageMap.ticketToRide.destinationCardBack;
const TTR_DROP_TRAIN_HAND = 'ttr-drop-train-hand';
const TTR_DROP_TRAIN_HAND_QUICK = 'ttr-drop-train-hand-quick';
const TTR_TRAIN_HAND_DROP_IDS = new Set<string>([TTR_DROP_TRAIN_HAND, TTR_DROP_TRAIN_HAND_QUICK]);
const TTR_MAP_BASE_W = 114;
const TTR_MAP_VIEWBOX_W = 200;
const TTR_MAP_VIEWBOX_H = 140;
const TTR_MAP_PAD_X = 8;
const TTR_MAP_PAD_Y = 8;
const TTR_MAP_SCALE = TTR_MAP_VIEWBOX_W / TTR_MAP_BASE_W;

type ClaimOption = {
  color: Exclude<TtrTrainColor, 'locomotive'>;
  locomotivesUsed: number;
};

function pairKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

const TTR_CITY_LABEL_OFFSET: Record<string, { dx: number; dy: number }> = {
  Vancouver: { dx: -3.6, dy: -2.6 },
  Seattle: { dx: -3.6, dy: 2.2 },
  Portland: { dx: -2.8, dy: 3.8 },
  Calgary: { dx: -4.2, dy: -2.4 },
  Helena: { dx: -3.2, dy: -2.5 },
  Winnipeg: { dx: -2.8, dy: -2.2 },
  Duluth: { dx: -2.4, dy: -2.3 },
  Sault_Ste_Marie: { dx: -1.4, dy: -1.6 },
  Toronto: { dx: -1, dy: 2.8 },
  Montreal: { dx: 0.8, dy: -2.1 },
  Boston: { dx: 1.2, dy: -0.6 },
  New_York: { dx: 1.8, dy: 0.6 },
  Washington: { dx: 2.2, dy: 2.6 },
  Pittsburgh: { dx: -1.6, dy: 1.8 },
  Chicago: { dx: -2.2, dy: 2.4 },
  Omaha: { dx: -2.4, dy: -1.8 },
  Denver: { dx: -3.4, dy: -2.5 },
  Kansas_City: { dx: -2.4, dy: 3.2 },
  Oklahoma_City: { dx: -2.9, dy: 3.6 },
  Santa_Fe: { dx: -2.5, dy: 2.7 },
  El_Paso: { dx: -3.1, dy: 3.4 },
  Phoenix: { dx: -2.4, dy: 3.2 },
  Los_Angeles: { dx: -3.9, dy: 2.4 },
  Las_Vegas: { dx: -2.7, dy: 2.3 },
  Salt_Lake_City: { dx: -3.2, dy: 2.6 },
  San_Francisco: { dx: -4.4, dy: 2.4 },
  Dallas: { dx: -2.4, dy: 2.8 },
  Houston: { dx: -2.1, dy: 3.1 },
  New_Orleans: { dx: -1.3, dy: 3.6 },
  Little_Rock: { dx: -2, dy: 2.8 },
  Saint_Louis: { dx: -2.2, dy: 3.1 },
  Nashville: { dx: -2.2, dy: 3.2 },
  Atlanta: { dx: -1.6, dy: 3.3 },
  Miami: { dx: 0.8, dy: 3.6 },
  Charleston: { dx: 1, dy: 2.8 },
  Raleigh: { dx: 1.6, dy: 2.8 },
};

/** Average board coordinates per city from all route endpoints (0–100 space, after parallel offset). */
function buildTtrCityCentroids(): Record<string, { x: number; y: number }> {
  const acc = new Map<string, { sx: number; sy: number; n: number }>();
  for (const r of TTR_ROUTES) {
    const rd = TTR_RENDER_BY_ID.get(r.id) ?? r;
    const pairs: [string, number, number][] = [
      [rd.a, rd.ax, rd.ay],
      [rd.b, rd.bx, rd.by],
    ];
    for (const [name, x, y] of pairs) {
      const cur = acc.get(name) ?? { sx: 0, sy: 0, n: 0 };
      cur.sx += x;
      cur.sy += y;
      cur.n += 1;
      acc.set(name, cur);
    }
  }
  return Object.fromEntries([...acc].map(([k, v]) => [k, { x: v.sx / v.n, y: v.sy / v.n }]));
}

const TTR_CITY_CENTROID = buildTtrCityCentroids();

/** Mini route preview in ticket modal: line between two cities in board space. */
function TtrTicketRoutePreview({ a, b }: { a: string; b: string }) {
  const pa = TTR_CITY_CENTROID[a];
  const pb = TTR_CITY_CENTROID[b];
  const vw = 150;
  const vh = 100;

  if (!pa || !pb) {
    return (
      <div className="ttr-ticket-preview-fallback" aria-hidden>
        <span className="ttr-ticket-preview-fallback-city">{a}</span>
        <span className="ttr-ticket-preview-fallback-gap">· · ·</span>
        <span className="ttr-ticket-preview-fallback-city">{b}</span>
      </div>
    );
  }

  const mapPad = 6;
  const mapW = vw - mapPad * 2;
  const mapH = vh - mapPad * 2;
  const mx = (x: number) => mapPad + (x / 100) * mapW;
  const my = (y: number) => mapPad + (y / 100) * mapH;
  const x1 = mx(pa.x);
  const y1 = my(pa.y);
  const x2 = mx(pb.x);
  const y2 = my(pb.y);

  return (
    <svg className="ttr-ticket-preview-svg" viewBox={`0 0 ${vw} ${vh}`} aria-hidden>
      <rect className="ttr-ticket-preview-bg" x="0" y="0" width={vw} height={vh} rx="5" />
      <g className="ttr-ticket-preview-guide">
        {TTR_ROUTES.map((r) => {
          const rd = TTR_RENDER_BY_ID.get(r.id) ?? r;
          return (
            <line
              key={r.id}
              className="ttr-ticket-preview-guide-line"
              x1={mx(rd.ax)}
              y1={my(rd.ay)}
              x2={mx(rd.bx)}
              y2={my(rd.by)}
            />
          );
        })}
      </g>
      <line className="ttr-ticket-preview-line" x1={x1} y1={y1} x2={x2} y2={y2} />
      <circle
        className="ttr-ticket-preview-dot ttr-ticket-preview-dot--halo"
        cx={x1}
        cy={y1}
        r="3.1"
      />
      <circle
        className="ttr-ticket-preview-dot ttr-ticket-preview-dot--halo"
        cx={x2}
        cy={y2}
        r="3.1"
      />
      <circle className="ttr-ticket-preview-dot" cx={x1} cy={y1} r="2.25" />
      <circle className="ttr-ticket-preview-dot" cx={x2} cy={y2} r="2.25" />
    </svg>
  );
}

function TtrDrawTrainDraggable({
  dragId,
  children,
  className,
  disabled = false,
}: {
  dragId: string;
  children: ReactNode;
  className: string;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    disabled,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
  };
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={className}
      style={style}
      {...attributes}
      {...listeners}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function TtrTrainHandDropZone({
  dropId,
  canDrop,
  hasCards,
  compact,
  cardsClassName,
  children,
}: {
  dropId: string;
  canDrop: boolean;
  hasCards: boolean;
  compact?: boolean;
  cardsClassName?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    disabled: !canDrop,
  });
  return (
    <div
      ref={setNodeRef}
      className={`ttr-train-hand-drop${compact ? ' ttr-train-hand-drop--compact' : ''}${isOver ? ' is-over' : ''}${canDrop ? '' : ' is-disabled'}`}
      aria-label="วางการ์ดรถไฟที่นี่เพื่อจั่ว"
    >
      {!hasCards ? (
        <p className="ttr-train-hand-drop__hint">ลากการ์ดรถไฟมาวางที่นี่เพื่อจั่วเข้ามือ</p>
      ) : null}
      <div className={`ttr-train-hand-drop__cards${cardsClassName ? ` ${cardsClassName}` : ''}`}>
        {children}
      </div>
    </div>
  );
}

function listClaimOptions(gameState: TtrPlayerView, myId: string, routeId: string): ClaimOption[] {
  const rr = gameState.routes.find((r) => r.id === routeId);
  if (!rr) return [];
  if (rr.ownerId != null) return [];
  const len = rr.def.length;
  const myPublic = gameState.players.find((p) => p.id === myId);
  if (!myPublic || myPublic.trainsLeft < len) return [];

  const k = pairKey(rr.def.a, rr.def.b);
  const pairRoutes = gameState.routes.filter((r) => pairKey(r.def.a, r.def.b) === k);
  if (pairRoutes.some((r) => r.id !== routeId && r.ownerId === myId)) return [];
  if (
    gameState.players.length <= 3 &&
    pairRoutes.some((r) => r.id !== routeId && r.ownerId != null)
  )
    return [];

  const loco = gameState.myHand.locomotive;
  const out: ClaimOption[] = [];
  const colors =
    rr.def.color === 'gray'
      ? (TTR_TRAIN_COLORS.filter((c) => c !== 'locomotive') as Exclude<
          TtrTrainColor,
          'locomotive'
        >[])
      : [rr.def.color];

  for (const c of colors) {
    const have = gameState.myHand[c];
    if (have + loco < len) continue;
    const minLoco = Math.max(0, len - have);
    for (let l = minLoco; l <= Math.min(len, loco); l += 1) {
      out.push({ color: c, locomotivesUsed: l });
    }
  }
  return out;
}

type RouteSlotLayout = {
  x: number;
  y: number;
  angleDeg: number;
  width: number;
  height: number;
};

function mapX(x: number): number {
  const inner = TTR_MAP_VIEWBOX_W - TTR_MAP_PAD_X * 2;
  return TTR_MAP_PAD_X + (x / 100) * inner;
}

function mapY(y: number): number {
  const inner = TTR_MAP_VIEWBOX_H - TTR_MAP_PAD_Y * 2;
  return TTR_MAP_PAD_Y + (y / 100) * inner;
}

/**
 * Build slot positions from real city distance.
 * This keeps spacing proportional per route so short routes with many slots don't overlap,
 * while long routes with few slots don't look too sparse.
 */
function routeSlotLayout(def: TtrRouteDef): RouteSlotLayout[] {
  const ax = mapX(def.ax);
  const ay = mapY(def.ay);
  const bx = mapX(def.bx);
  const by = mapY(def.by);
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const n = Math.max(1, def.length);
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  if (dist <= 1e-6) {
    return [
      {
        x: ax,
        y: ay,
        angleDeg,
        width: 1.4 * TTR_MAP_SCALE,
        height: 0.86 * TTR_MAP_SCALE,
      },
    ];
  }

  // Distance-driven gap/padding with sane bounds for all route lengths.
  let edgePad = Math.min(2.2 * TTR_MAP_SCALE, Math.max(0.5 * TTR_MAP_SCALE, dist * 0.06));
  let gap = Math.min(1.4 * TTR_MAP_SCALE, Math.max(0.28 * TTR_MAP_SCALE, dist * 0.025));
  let slotLen = (dist - edgePad * 2 - gap * (n - 1)) / n;

  // If route is very short for its slot count, collapse padding/gap to avoid overlap.
  if (slotLen < 0.8) {
    edgePad = Math.min(0.4 * TTR_MAP_SCALE, dist * 0.03);
    gap = Math.min(0.18 * TTR_MAP_SCALE, dist * 0.01);
    slotLen = (dist - edgePad * 2 - gap * (n - 1)) / n;
  }
  slotLen = Math.max(0.72 * TTR_MAP_SCALE, slotLen);
  const slotHeight = Math.max(0.82 * TTR_MAP_SCALE, Math.min(1.34 * TTR_MAP_SCALE, slotLen * 0.35));

  const start = edgePad + slotLen / 2;
  const step = slotLen + gap;
  const out: RouteSlotLayout[] = [];
  for (let i = 0; i < n; i += 1) {
    const d = Math.min(dist, start + step * i);
    const t = d / dist;
    out.push({
      x: ax + dx * t,
      y: ay + dy * t,
      angleDeg,
      width: slotLen,
      height: slotHeight,
    });
  }
  return out;
}

export function TicketToRideGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const [claimColor, setClaimColor] = useState<Exclude<TtrTrainColor, 'locomotive'> | null>(null);
  const [claimColorCount, setClaimColorCount] = useState(0);
  const [claimLocoCount, setClaimLocoCount] = useState(0);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [keepTicketIds, setKeepTicketIds] = useState<string[]>([]);
  const [pendingChoiceHoverTicketId, setPendingChoiceHoverTicketId] = useState<string | null>(null);
  const [revealedTicketChoices, setRevealedTicketChoices] = useState(0);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showFaceUpResetNotice, setShowFaceUpResetNotice] = useState(false);
  const [showDestinationCompletedNotice, setShowDestinationCompletedNotice] = useState(false);
  const prevFaceUpResetNoticeSeqRef = useRef(gameState.faceUpResetNoticeSeq);
  const prevDestinationCompleteNoticeSeqRef = useRef(gameState.destinationCompleteNoticeSeq);

  const mapTransformRef = useRef<ReactZoomPanPinchContentRef>(null);

  const canAct = gameState.phase === 'playing' && gameState.canAct && gameState.myId === myId;
  useYourTurnToast(canAct, gameState.phase === 'playing');
  const mustDrawSecondTrainCard = gameState.mustDrawSecondTrainCard;
  const myCards = TTR_TRAIN_COLORS.filter((c) => gameState.myHand[c] > 0);
  const myTrainCardTotal = useMemo(
    () => TTR_TRAIN_COLORS.reduce((sum, c) => sum + gameState.myHand[c], 0),
    [gameState.myHand],
  );
  const pendingChoice = gameState.pendingTicketChoice;
  const pendingChoiceSig = pendingChoice?.map((t) => t.id).join('|') ?? '';
  const isInitialChoice = gameState.phase === 'initial_tickets' && pendingChoice != null;
  const minKeepCount = isInitialChoice ? 2 : 1;
  const canSubmitKeepTickets = pendingChoice != null && keepTicketIds.length >= minKeepCount;
  const isWaitingInitialTicketConfirm =
    gameState.phase === 'initial_tickets' && pendingChoice == null;
  const claimOptionsByRoute = useMemo(
    () =>
      Object.fromEntries(
        gameState.routes.map((r) => [r.id, listClaimOptions(gameState, myId, r.id)]),
      ) as Record<string, ClaimOption[]>,
    [gameState, myId],
  );
  const claimableRouteIds = useMemo(() => {
    if (claimColor == null) return new Set<string>();
    if (claimColorCount <= 0) return new Set<string>();
    const total = claimColorCount + claimLocoCount;
    if (total <= 0) return new Set<string>();
    const out = new Set<string>();
    for (const r of gameState.routes) {
      if (r.ownerId != null) continue;
      if (r.def.length !== total) continue;
      const opts = claimOptionsByRoute[r.id] ?? [];
      const ok = opts.some((o) => o.color === claimColor && o.locomotivesUsed === claimLocoCount);
      if (ok) out.add(r.id);
    }
    return out;
  }, [claimColor, claimColorCount, claimLocoCount, claimOptionsByRoute, gameState.routes]);
  const highlightedTicketCities = useMemo(() => {
    if (pendingChoiceHoverTicketId && pendingChoice) {
      const hovered = pendingChoice.find((x) => x.id === pendingChoiceHoverTicketId);
      if (hovered) return new Set([hovered.a, hovered.b]);
    }
    if (!selectedTicketId) return new Set<string>();
    const t = gameState.myTickets.find((x) => x.id === selectedTicketId);
    if (!t) return new Set<string>();
    return new Set([t.a, t.b]);
  }, [gameState.myTickets, pendingChoice, pendingChoiceHoverTicketId, selectedTicketId]);
  const completedTicketIdSet = useMemo(
    () => new Set(gameState.myCompletedTicketIds),
    [gameState.myCompletedTicketIds],
  );
  /** Stable seat index per player for this game (used for route owner tint). */
  const playerSeatById = useMemo(
    () => Object.fromEntries(gameState.players.map((p, i) => [p.id, i])) as Record<string, number>,
    [gameState.players],
  );
  const playerNameById = useMemo(
    () =>
      Object.fromEntries(gameState.players.map((p) => [p.id, p.name])) as Record<string, string>,
    [gameState.players],
  );
  const selectedColorCardCountMax = claimColor ? gameState.myHand[claimColor] : 0;
  const selectedLocoCountMax = claimColor
    ? Math.min(gameState.myHand.locomotive, Math.max(0, 6 - claimColorCount))
    : 0;
  const finalScoreRows = gameState.finalScoreSummary ?? [];
  const myTrainsLeft = useMemo(
    () => gameState.players.find((p) => p.id === myId)?.trainsLeft ?? 0,
    [gameState.players, myId],
  );
  useEffect(() => {
    setKeepTicketIds([]);
    setPendingChoiceHoverTicketId(null);
    if (!pendingChoice) {
      setRevealedTicketChoices(0);
      return;
    }
    setRevealedTicketChoices(0);
    const timers = pendingChoice.map((_, i) =>
      setTimeout(
        () => {
          setRevealedTicketChoices((prev) => Math.max(prev, i + 1));
        },
        120 + i * 160,
      ),
    );
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [pendingChoice, pendingChoiceSig]);

  useEffect(() => {
    if (gameState.faceUpResetNoticeSeq === prevFaceUpResetNoticeSeqRef.current) return;
    prevFaceUpResetNoticeSeqRef.current = gameState.faceUpResetNoticeSeq;
    setShowFaceUpResetNotice(true);
    const timer = setTimeout(() => setShowFaceUpResetNotice(false), 1800);
    return () => clearTimeout(timer);
  }, [gameState.faceUpResetNoticeSeq]);

  useEffect(() => {
    if (gameState.destinationCompleteNoticeSeq === prevDestinationCompleteNoticeSeqRef.current)
      return;
    prevDestinationCompleteNoticeSeqRef.current = gameState.destinationCompleteNoticeSeq;
    if (!gameState.destinationCompleteNotice) return;
    setShowDestinationCompletedNotice(true);
    fireTtrDestinationCompletedConfetti();
    const timer = setTimeout(() => setShowDestinationCompletedNotice(false), 2200);
    return () => clearTimeout(timer);
  }, [gameState.destinationCompleteNotice, gameState.destinationCompleteNoticeSeq]);

  useEffect(() => {
    if (gameState.phase !== 'game_over') return;
    return startWinCelebrationLoop();
  }, [gameState.phase]);

  useEffect(() => {
    if (!claimColor) {
      if (claimColorCount !== 0) setClaimColorCount(0);
      if (claimLocoCount !== 0) setClaimLocoCount(0);
      return;
    }
    const nextColor = Math.max(1, Math.min(claimColorCount || 1, gameState.myHand[claimColor]));
    if (nextColor !== claimColorCount) setClaimColorCount(nextColor);
    const nextLoco = Math.min(
      claimLocoCount,
      gameState.myHand.locomotive,
      Math.max(0, 6 - nextColor),
    );
    if (nextLoco !== claimLocoCount) setClaimLocoCount(nextLoco);
  }, [claimColor, claimColorCount, claimLocoCount, gameState.myHand]);

  useEffect(() => {
    if (!selectedTicketId) return;
    if (!completedTicketIdSet.has(selectedTicketId)) return;
    setSelectedTicketId(null);
  }, [selectedTicketId, completedTicketIdSet]);

  const tryClaimRoute = (routeId: string) => {
    if (!canAct) return;
    if (mustDrawSecondTrainCard) return;
    if (claimColor == null) return;
    if (!claimableRouteIds.has(routeId)) return;
    sendAction({
      type: 'claim_route',
      routeId,
      color: claimColor,
      locomotivesUsed: claimLocoCount,
    } satisfies TtrAction);
    setClaimColorCount(0);
    setClaimLocoCount(0);
  };

  const parseDrawDragId = (
    id: string,
  ): { source: 'deck' } | { source: 'face_up'; index: number } | null => {
    if (id === 'draw:deck') return { source: 'deck' };
    if (id.startsWith('draw:faceup:')) {
      const idx = Number(id.replace('draw:faceup:', ''));
      if (Number.isInteger(idx) && idx >= 0) return { source: 'face_up', index: idx };
    }
    return null;
  };

  const commitDrawByPick = (pick: { source: 'deck' } | { source: 'face_up'; index: number }) => {
    if (!canAct) return;
    sendAction({
      type: 'draw_train_cards',
      first: pick,
    } satisfies TtrAction);
  };

  const onDrawDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    if (!event.over || !TTR_TRAIN_HAND_DROP_IDS.has(String(event.over.id))) return;
    const parsed = parseDrawDragId(String(event.active.id));
    if (!parsed) return;
    commitDrawByPick(parsed);
  };

  const submitDrawTickets = () => {
    if (!canAct) return;
    if (mustDrawSecondTrainCard) return;
    sendAction({ type: 'draw_destination_tickets' } satisfies TtrAction);
  };

  const submitKeepTickets = () => {
    if (!pendingChoice) return;
    if (isInitialChoice && keepTicketIds.length < 2) return;
    if (!isInitialChoice && keepTicketIds.length < 1) return;
    sendAction({
      type: isInitialChoice ? 'keep_initial_tickets' : 'keep_drawn_tickets',
      keepIds: keepTicketIds,
    } satisfies TtrAction);
  };

  return (
    <GameShell className={`ttr-page${pendingChoice ? ' ttr-page--ticket-dock-open' : ''}`}>
      <GamePlayHeader
        title="Ticket to Ride"
        onLeave={onLeave}
        onRestart={onRestart}
        leaveLabel="full"
      />
      <div className="ttr-body">
        <aside className="ttr-turn-rail" role="complementary" aria-label="ลำดับผู้เล่น">
          <section className="card ttr-turn-strip">
            <p className="ttr-turn-strip__title">ลำดับผู้เล่น</p>
            <div className="ttr-turn-strip__row">
              {gameState.players.map((p, i) => {
                const isCurrent = p.id === gameState.currentPlayerId;
                const showFinalTurnTag =
                  gameState.phase === 'playing' && gameState.finalTurnsRemaining === 1;
                return (
                  <div
                    key={p.id}
                    className={`ttr-turn-chip${isCurrent ? ' is-current' : ''}`}
                    title={`ลำดับที่ ${i + 1} · คะแนน ${p.score}`}
                  >
                    <div className="flex flex-col gap-2">
                      {isCurrent || showFinalTurnTag ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {isCurrent ? (
                            <span className="ttr-turn-chip__badge ttr-turn-chip__badge--current w-fit">
                              ตาปัจจุบัน
                            </span>
                          ) : null}
                          {showFinalTurnTag ? (
                            <span className="ttr-turn-chip__badge ttr-turn-chip__badge--final w-fit">
                              ตาสุดท้าย
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <span className="ttr-turn-chip__seat">{i + 1}</span>
                        <span
                          className={`ttr-player-swatch ttr-owner-seat-${(playerSeatById[p.id] ?? 0) % 6}`}
                          aria-hidden
                        />
                        <span className="ttr-turn-chip__name">
                          {p.name} {p.id === myId ? '(คุณ)' : ''}
                        </span>
                      </div>
                    </div>
                    <span className="ttr-turn-chip__meta">
                      {p.score} แต้ม · 🚂 {p.trainsLeft} · 🃏 {p.handCount}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="ttr-last-event">{gameState.lastEvent}</p>
          </section>
        </aside>

        <div className="ttr-main-column">
          <DndContext
            onDragStart={(e) => setActiveDragId(String(e.active.id))}
            onDragCancel={() => setActiveDragId(null)}
            onDragEnd={onDrawDragEnd}
          >
            <div className="card ttr-board">
              <div className="ttr-map-toolbar">
                <p className="ttr-map-hint">
                  เลือกสี+จำนวนการ์ดบนมือ แล้วเส้นที่ลงได้จะไฮไลต์ · คลิกเส้นเพื่อวางรถไฟ
                </p>
                <div className="ttr-map-zoom-btns">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => mapTransformRef.current?.zoomOut(0.15)}
                    aria-label="ซูมออก"
                  >
                    −
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => mapTransformRef.current?.resetTransform()}
                  >
                    รีเซ็ตมุมมอง
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => mapTransformRef.current?.zoomIn(0.15)}
                    aria-label="ซูมเข้า"
                  >
                    +
                  </Button>
                </div>
              </div>
              <div
                className="ttr-map-viewport"
                style={
                  {
                    '--ttr-map-bg': `url("${imageMap.ticketToRide.mapBackground}")`,
                  } as CSSProperties
                }
              >
                <TransformWrapper
                  ref={mapTransformRef}
                  minScale={0.75}
                  maxScale={3}
                  initialScale={1}
                  limitToBounds={false}
                  centerOnInit
                  doubleClick={{ disabled: true }}
                  wheel={{
                    step: 0.12,
                    activationKeys: ['Control'],
                  }}
                  panning={{
                    allowLeftClickPan: true,
                    excluded: [
                      'ttr-route-hit',
                      'ttr-route-owner',
                      'ttr-city-dot',
                      'ttr-city-label',
                    ],
                  }}
                >
                  <TransformComponent
                    wrapperClass="ttr-map-rz-wrapper"
                    contentClass="ttr-map-rz-content"
                  >
                    <svg
                      viewBox={`0 0 ${TTR_MAP_VIEWBOX_W} ${TTR_MAP_VIEWBOX_H}`}
                      className="ttr-map"
                      aria-label="เส้นทางรถไฟ"
                    >
                      <rect
                        className="ttr-map-pan-hit"
                        x="0"
                        y="0"
                        width={TTR_MAP_VIEWBOX_W}
                        height={TTR_MAP_VIEWBOX_H}
                        fill="transparent"
                      />
                      {gameState.routes.map(({ id, def, ownerId }) => {
                        const d = ttrRenderDefForRouteId(id, def);
                        return (
                          <g key={id}>
                            {(() => {
                              const ownerSeatClass =
                                ownerId != null
                                  ? ` ttr-owner-seat-${(playerSeatById[ownerId] ?? 0) % 6}`
                                  : '';
                              return routeSlotLayout(d).map((slot, idx) => {
                                return (
                                  <rect
                                    key={`${id}-${idx}`}
                                    x={slot.x - slot.width / 2}
                                    y={slot.y - slot.height / 2}
                                    width={slot.width}
                                    height={slot.height}
                                    rx="0.3"
                                    className={`ttr-route-slot slot-color-${def.color}${ownerId ? ' is-claimed' : ''}${claimableRouteIds.has(id) ? ' is-claimable' : ''}${ownerSeatClass}`}
                                    transform={`rotate(${slot.angleDeg} ${slot.x} ${slot.y})`}
                                  />
                                );
                              });
                            })()}
                            <line
                              x1={mapX(d.ax)}
                              y1={mapY(d.ay)}
                              x2={mapX(d.bx)}
                              y2={mapY(d.by)}
                              className={`ttr-route-hit${claimableRouteIds.has(id) ? ' is-claimable' : ''}`}
                              style={{ strokeWidth: 2.8 * TTR_MAP_SCALE }}
                              onClick={() => tryClaimRoute(id)}
                            />
                            {ownerId != null ? (
                              <foreignObject
                                x={mapX((d.ax + d.bx) / 2) - 5.2 * TTR_MAP_SCALE}
                                y={mapY((d.ay + d.by) / 2) - 1.35 * TTR_MAP_SCALE}
                                width={10.4 * TTR_MAP_SCALE}
                                height={2.7 * TTR_MAP_SCALE}
                                className="ttr-route-owner-fo"
                              >
                                <div
                                  className={`ttr-route-owner-label ttr-owner-seat-${(playerSeatById[ownerId] ?? 0) % 6}`}
                                  title={playerNameById[ownerId] ?? ownerId}
                                >
                                  {playerNameById[ownerId] ?? ownerId}
                                </div>
                              </foreignObject>
                            ) : null}
                          </g>
                        );
                      })}
                      {Object.entries(TTR_CITY_CENTROID).map(([name, pos]) => {
                        const off = TTR_CITY_LABEL_OFFSET[name.replaceAll(' ', '_')] ?? {
                          dx: 0.9,
                          dy: -1.3,
                        };
                        return (
                          <g key={name}>
                            <circle
                              cx={mapX(pos.x)}
                              cy={mapY(pos.y)}
                              r={1.08 * TTR_MAP_SCALE}
                              className={`ttr-city-dot${highlightedTicketCities.has(name) ? ' is-ticket-highlight' : ''}`}
                            />
                            <text
                              x={mapX(pos.x + off.dx)}
                              y={mapY(pos.y + off.dy)}
                              className={`ttr-city-label${highlightedTicketCities.has(name) ? ' is-ticket-highlight' : ''}`}
                            >
                              {name}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </TransformComponent>
                </TransformWrapper>
              </div>
              <div className="ttr-quick-hand-under-map">
                <div className="ttr-quick-hand-under-map__split">
                  <div className="ttr-quick-hand-under-map__pane">
                    <p className="ttr-quick-hand-under-map__title">การ์ดโบกี้บนมือ</p>
                    <TtrTrainHandDropZone
                      dropId={TTR_DROP_TRAIN_HAND_QUICK}
                      canDrop={canAct}
                      hasCards={myCards.length > 0}
                      compact
                      cardsClassName="ttr-quick-hand-under-map__row"
                    >
                      {myCards.length === 0 ? (
                        <span className="muted">ไม่มีการ์ด</span>
                      ) : (
                        myCards.map((c) => (
                          <button
                            key={`quick-${c}`}
                            type="button"
                            className={`ttr-train-hand-card ttr-train-hand-card--mini ttr-quick-inline-card${claimColor === c || (c === 'locomotive' && claimLocoCount > 0) ? ' is-selected' : ''}`}
                            onClick={() => {
                              if (c === 'locomotive') {
                                if (!claimColor) return;
                                const maxLoco = Math.min(
                                  gameState.myHand.locomotive,
                                  Math.max(0, 6 - claimColorCount),
                                );
                                if (maxLoco <= 0) return;
                                setClaimLocoCount((prev) => (prev + 1) % (maxLoco + 1));
                                return;
                              }
                              if (claimColor === c) {
                                setClaimColor(null);
                                setClaimColorCount(0);
                                setClaimLocoCount(0);
                                return;
                              }
                              setClaimColor(c);
                              setClaimColorCount(1);
                              setClaimLocoCount(0);
                            }}
                          >
                            <img
                              src={imageMap.ticketToRide.trainCards[c]}
                              alt={trainColorLabel[c]}
                              loading="lazy"
                            />
                            <span className="ttr-train-hand-card__count">
                              x{gameState.myHand[c]}
                            </span>
                          </button>
                        ))
                      )}
                    </TtrTrainHandDropZone>
                  </div>

                  <div className="ttr-quick-hand-under-map__pane ttr-quick-hand-under-map__pane--right">
                    <p className="ttr-quick-hand-under-map__title">การ์ดเส้นทางบนมือ</p>
                    <div className="ttr-quick-hand-under-map__row">
                      {gameState.myTickets.map((t) => (
                        <button
                          key={`quick-ticket-${t.id}`}
                          type="button"
                          className={`ttr-my-ticket-card ttr-my-ticket-card--quick ttr-quick-inline-card${selectedTicketId === t.id ? ' is-selected' : ''}${completedTicketIdSet.has(t.id) ? ' is-completed' : ''}`}
                          disabled={completedTicketIdSet.has(t.id)}
                          onClick={() =>
                            setSelectedTicketId((prev) => (prev === t.id ? null : t.id))
                          }
                          title={`${t.a} - ${t.b} (${t.points})`}
                        >
                          {completedTicketIdSet.has(t.id) ? (
                            <span
                              className="ttr-my-ticket-card__done-badge"
                              aria-label="ทำสำเร็จแล้ว"
                            >
                              ✓
                            </span>
                          ) : null}
                          <div className="ttr-ticket-preview-shell">
                            <TtrTicketRoutePreview a={t.a} b={t.b} />
                          </div>
                          <div className="flex justify-center">
                            {/* <span className="text-xs">{t.a}</span> */}
                            <span className="text-lg font-bold">{t.points}</span>
                            {/* <span className="text-xs">{t.b}</span> */}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {claimColor ? (
                  <div className="ttr-claim-count-controls">
                    <div className="ttr-claim-stepper">
                      <span className="ttr-claim-stepper__label">
                        สีหลัก {trainColorLabel[claimColor]}
                      </span>
                      <div className="ttr-claim-stepper__buttons">
                        <button
                          type="button"
                          className="ttr-claim-stepper__btn"
                          onClick={() => setClaimColorCount((prev) => Math.max(1, prev - 1))}
                          disabled={claimColorCount <= 1}
                        >
                          -
                        </button>
                        <span className="ttr-claim-stepper__value">
                          {claimColorCount}/{selectedColorCardCountMax}
                        </span>
                        <button
                          type="button"
                          className="ttr-claim-stepper__btn"
                          onClick={() =>
                            setClaimColorCount((prev) =>
                              Math.min(selectedColorCardCountMax, prev + 1),
                            )
                          }
                          disabled={claimColorCount >= selectedColorCardCountMax}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="ttr-claim-stepper">
                      <span className="ttr-claim-stepper__label">Rainbow (ตัวแทนสี)</span>
                      <div className="ttr-claim-stepper__buttons">
                        <button
                          type="button"
                          className="ttr-claim-stepper__btn"
                          onClick={() => setClaimLocoCount((prev) => Math.max(0, prev - 1))}
                          disabled={claimLocoCount <= 0}
                        >
                          -
                        </button>
                        <span className="ttr-claim-stepper__value">
                          {claimLocoCount}/{selectedLocoCountMax}
                        </span>
                        <button
                          type="button"
                          className="ttr-claim-stepper__btn"
                          onClick={() =>
                            setClaimLocoCount((prev) => Math.min(selectedLocoCountMax, prev + 1))
                          }
                          disabled={claimLocoCount >= selectedLocoCountMax}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ttr-sections">
              <section className="card ttr-panel ttr-draw-row">
                <h3>โซนจั่วการ์ด</h3>
                <div className="ttr-draw-grid">
                  <div className="ttr-draw-block ttr-draw-block--destination">
                    <h4>จั่วการ์ดรถไฟ</h4>
                    {mustDrawSecondTrainCard ? (
                      <p className="muted">
                        จั่วใบแรกแล้ว: ใบที่สองห้ามเลือก locomotive จากไพ่หงาย
                      </p>
                    ) : null}
                    <div className="ttr-train-draw-area">
                      <TtrDrawTrainDraggable
                        dragId="draw:deck"
                        className="ttr-train-back-deck"
                        disabled={!canAct}
                      >
                        <DeckStack
                          backSrc={imageMap.ticketToRide.trainCardBack}
                          className="ttr-deck-stack"
                          layerClassName="ttr-deck-stack__layer"
                          offset={{ x: 7, y: 5 }}
                        />
                      </TtrDrawTrainDraggable>
                      <div className="ttr-faceup-row">
                        {gameState.faceUpTrainCards.map((c, i) => (
                          <TtrDrawTrainDraggable
                            key={`${c}-${i}`}
                            dragId={`draw:faceup:${i}`}
                            className={`ttr-faceup-card ${c}`}
                            disabled={!canAct || (mustDrawSecondTrainCard && c === 'locomotive')}
                          >
                            <img
                              src={imageMap.ticketToRide.trainCards[c]}
                              alt={trainColorLabel[c]}
                              loading="lazy"
                            />
                          </TtrDrawTrainDraggable>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="ttr-draw-block">
                    <h4>จั่วการ์ดเส้นทาง</h4>
                    <div className="flex flex-col items-center">
                      <div className="ttr-destination-draw-deck" aria-hidden>
                        <DeckStack
                          backSrc={TTR_DESTINATION_BACK_CARD_URL}
                          className="ttr-deck-stack"
                          layerClassName="ttr-deck-stack__layer"
                          offset={{ x: 7, y: 5 }}
                        />
                      </div>
                      <Button
                        type="button"
                        className="ttr-destination-draw-action"
                        disabled={!canAct || mustDrawSecondTrainCard}
                        onClick={submitDrawTickets}
                      >
                        จั่วการ์ดเส้นทาง
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="card ttr-panel ttr-hand-row">
                <div className="w-full flex items-center justify-between">
                  <h3>การ์ดบนมือคุณ</h3>
                  <p className="ttr-hand-summary">
                    รถไฟคงเหลือ {myTrainsLeft} ขบวน · การ์ดรถไฟรวม {myTrainCardTotal} ใบ ·
                    locomotive {gameState.myHand.locomotive} ใบ
                  </p>
                </div>
                <div className="ttr-hand-grid">
                  <div className="ttr-hand-block">
                    <h4>การ์ดรถไฟบนมือ</h4>
                    <TtrTrainHandDropZone
                      dropId={TTR_DROP_TRAIN_HAND}
                      canDrop={canAct}
                      hasCards={myCards.length > 0}
                    >
                      {myCards.length === 0 ? (
                        <span className="muted">ไม่มีการ์ด</span>
                      ) : (
                        myCards.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`ttr-train-hand-card${claimColor === c || (c === 'locomotive' && claimLocoCount > 0) ? ' is-selected' : ''}`}
                            onClick={() => {
                              if (c === 'locomotive') {
                                if (!claimColor) return;
                                const maxLoco = Math.min(
                                  gameState.myHand.locomotive,
                                  Math.max(0, 6 - claimColorCount),
                                );
                                if (maxLoco <= 0) return;
                                setClaimLocoCount((prev) => (prev + 1) % (maxLoco + 1));
                                return;
                              }
                              if (claimColor === c) {
                                setClaimColor(null);
                                setClaimColorCount(0);
                                setClaimLocoCount(0);
                                return;
                              }
                              setClaimColor(c);
                              setClaimColorCount(1);
                              setClaimLocoCount(0);
                            }}
                          >
                            <img
                              src={imageMap.ticketToRide.trainCards[c]}
                              alt={trainColorLabel[c]}
                              loading="lazy"
                            />
                            <span className="ttr-train-hand-card__label">{trainColorLabel[c]}</span>
                            <span className="ttr-train-hand-card__count">
                              x{gameState.myHand[c]}
                            </span>
                          </button>
                        ))
                      )}
                    </TtrTrainHandDropZone>
                  </div>

                  <div className="ttr-hand-block">
                    <h4>การ์ดเส้นทางบนมือ</h4>
                    <div className="ttr-my-ticket-grid">
                      {gameState.myTickets.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`ttr-my-ticket-card${selectedTicketId === t.id ? ' is-selected' : ''}${completedTicketIdSet.has(t.id) ? ' is-completed' : ''}`}
                          disabled={completedTicketIdSet.has(t.id)}
                          onClick={() =>
                            setSelectedTicketId((prev) => (prev === t.id ? null : t.id))
                          }
                        >
                          {completedTicketIdSet.has(t.id) ? (
                            <span
                              className="ttr-my-ticket-card__done-badge"
                              aria-label="ทำสำเร็จแล้ว"
                            >
                              ✓
                            </span>
                          ) : null}
                          <div className="ttr-ticket-preview-shell">
                            <TtrTicketRoutePreview a={t.a} b={t.b} />
                          </div>
                          <div className="ttr-ticket-choice-meta">
                            <span className="ttr-ticket-choice-city">{t.a}</span>
                            <span className="ttr-ticket-choice-points">{t.points}</span>
                            <span className="ttr-ticket-choice-city">{t.b}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="muted">คลิกเส้นไฮไลต์บนแผนที่เพื่อยึดเส้นทางทันที</p>
              </section>

              <DragOverlay>
                {activeDragId ? (
                  <div className="ttr-drag-overlay">
                    {activeDragId === 'draw:deck' ? (
                      <img src={imageMap.ticketToRide.trainCardBack} alt="" />
                    ) : activeDragId.startsWith('draw:faceup:') ? (
                      <img
                        src={
                          imageMap.ticketToRide.trainCards[
                            gameState.faceUpTrainCards[
                              Number(activeDragId.replace('draw:faceup:', ''))
                            ] ?? 'locomotive'
                          ]
                        }
                        alt=""
                      />
                    ) : null}
                  </div>
                ) : null}
              </DragOverlay>
            </div>
          </DndContext>

          {pendingChoice ? (
            <aside
              className="ttr-ticket-choice-dock"
              role="region"
              aria-label={isInitialChoice ? 'เลือกตั๋วเริ่มต้น' : 'เลือกตั๋วที่จั่ว'}
            >
              <div className="ttr-ticket-choice-dock__inner">
                <div className="ttr-ticket-choice-dock__header">
                  <h2 className="ttr-ticket-choice-dock__title">
                    {isInitialChoice
                      ? 'เลือกตั๋วเริ่มต้น (อย่างน้อย 2)'
                      : 'เลือกตั๋วที่จั่ว (อย่างน้อย 1)'}
                  </h2>
                  <div className="ttr-ticket-choice-dock__actions">
                    <p className="ttr-ticket-choice-dock__progress">
                      เลือกแล้ว {keepTicketIds.length}/{minKeepCount} ใบขั้นต่ำ
                    </p>
                    <Button
                      type="button"
                      disabled={!canSubmitKeepTickets}
                      onClick={submitKeepTickets}
                    >
                      ยืนยัน
                    </Button>
                  </div>
                </div>
                <p className="ttr-ticket-choice-dock__hint muted">
                  ชี้ที่การ์ดเพื่อไฮไลต์เมืองบนแผนที่ · คลิกเพื่อเลือก/ยกเลิก
                </p>
                <div className="ttr-ticket-choice-dock__list">
                  {pendingChoice.map((t: TtrPlayerView['myTickets'][number], i: number) => {
                    const picked = keepTicketIds.includes(t.id);
                    const revealed = i < revealedTicketChoices;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        className={`ttr-ticket-choice ttr-ticket-choice--dock${picked ? ' picked' : ''}`}
                        title={`${t.a} → ${t.b} (${t.points} แต้ม)`}
                        onMouseEnter={() => setPendingChoiceHoverTicketId(t.id)}
                        onMouseLeave={() =>
                          setPendingChoiceHoverTicketId((cur) => (cur === t.id ? null : cur))
                        }
                        onFocus={() => setPendingChoiceHoverTicketId(t.id)}
                        onBlur={() =>
                          setPendingChoiceHoverTicketId((cur) => (cur === t.id ? null : cur))
                        }
                        onClick={() =>
                          setKeepTicketIds((prev) =>
                            prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id],
                          )
                        }
                      >
                        <div className={`ttr-ticket-flip${revealed ? ' is-revealed' : ''}`}>
                          <div className="ttr-ticket-flip-face ttr-ticket-flip-front">
                            <div className="ttr-ticket-preview-shell">
                              <TtrTicketRoutePreview a={t.a} b={t.b} />
                            </div>
                            <div className="ttr-ticket-choice-meta">
                              <span className="ttr-ticket-choice-city">{t.a}</span>
                              <span className="ttr-ticket-choice-points">{t.points}</span>
                              <span className="ttr-ticket-choice-city">{t.b}</span>
                            </div>
                          </div>
                          <div className="ttr-ticket-flip-face ttr-ticket-flip-back" aria-hidden>
                            <img
                              className="ttr-ticket-choice-back-img"
                              src={TTR_DESTINATION_BACK_CARD_URL}
                              alt=""
                              loading="lazy"
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          ) : null}

          {isWaitingInitialTicketConfirm && (
            <div className="modal-overlay" role="dialog" aria-modal>
              <div className="modal ttr-ticket-modal ttr-ticket-modal--waiting">
                <h2>รอผู้เล่นเลือกตั๋วเริ่มต้น</h2>
                <p className="ttr-ticket-waiting-copy">
                  ยืนยันแล้ว {gameState.initialTicketConfirmProgress.done}/
                  {gameState.initialTicketConfirmProgress.total} คน
                </p>
                <p className="muted">เมื่อครบทุกคน เกมจะเริ่มอัตโนมัติ</p>
              </div>
            </div>
          )}

          {gameState.phase === 'game_over' && gameState.gameResult && (
            <div className="modal-overlay" role="dialog" aria-modal>
              <div className="modal ttr-ticket-modal ttr-end-modal">
                <h2>เกมจบ</h2>
                <p className="ttr-end-reason">{gameState.gameResult.reason}</p>
                {finalScoreRows.length > 0 ? (
                  <div className="ttr-end-table-wrap">
                    <table className="ttr-end-table">
                      <thead>
                        <tr>
                          <th>ผู้เล่น</th>
                          <th>เส้นทาง</th>
                          <th>ตั๋วสำเร็จ</th>
                          <th>ตั๋วไม่สำเร็จ</th>
                          <th>Longest</th>
                          <th>รวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finalScoreRows.map((row) => (
                          <tr
                            key={row.playerId}
                            className={
                              gameState.gameResult?.winners.includes(row.playerId)
                                ? 'is-winner'
                                : ''
                            }
                          >
                            <td>{row.playerName}</td>
                            <td>+{row.routePoints}</td>
                            <td>+{row.completedTicketPoints}</td>
                            <td>{row.failedTicketPenalty}</td>
                            <td>{row.longestPathBonus > 0 ? `+${row.longestPathBonus}` : '0'}</td>
                            <td className="ttr-end-total">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                <GameOverActions onLeave={onLeave} onRestart={onRestart} layout="inline" />
              </div>
            </div>
          )}

          {showFaceUpResetNotice ? (
            <div className="modal-overlay" role="dialog" aria-modal>
              <div className="modal ttr-ticket-modal ttr-ticket-modal--waiting ttr-faceup-reset-modal">
                <h2>สับไพ่หงายใหม่</h2>
                <div
                  className="ttr-faceup-reset-loco-visual"
                  role="img"
                  aria-label={`ไพ่หงายมี${trainColorLabel.locomotive} 3 ใบ`}
                >
                  <div className="ttr-faceup-reset-loco-visual__row" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="ttr-faceup-reset-loco-visual__card">
                        <img
                          src={imageMap.ticketToRide.trainCards.locomotive}
                          alt=""
                          loading="eager"
                          decoding="async"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="ttr-faceup-reset-loco-visual__tag">
                    {trainColorLabel.locomotive}
                    <span className="ttr-faceup-reset-loco-visual__times">×3</span>
                  </p>
                </div>
                <p className="ttr-ticket-waiting-copy ttr-faceup-reset-copy">
                  ไพ่หงายมีหัวรถจักร 3 ใบ ระบบจึงทิ้งและเปิดไพ่หงายใหม่อัตโนมัติ
                </p>
              </div>
            </div>
          ) : null}

          {showDestinationCompletedNotice && gameState.destinationCompleteNotice ? (
            <div className="modal-overlay" role="dialog" aria-modal>
              <div className="modal ttr-ticket-modal ttr-ticket-modal--waiting">
                <h2>เชื่อมตั๋วปลายทางสำเร็จ!</h2>
                <div className="ttr-ticket-choice" aria-hidden>
                  <div className="ttr-ticket-preview-shell">
                    <TtrTicketRoutePreview
                      a={gameState.destinationCompleteNotice.a}
                      b={gameState.destinationCompleteNotice.b}
                    />
                  </div>
                  <div className="ttr-ticket-choice-meta">
                    <span className="ttr-ticket-choice-city">
                      {gameState.destinationCompleteNotice.a}
                    </span>
                    <span className="ttr-ticket-choice-points">
                      {gameState.destinationCompleteNotice.points}
                    </span>
                    <span className="ttr-ticket-choice-city">
                      {gameState.destinationCompleteNotice.b}
                    </span>
                  </div>
                </div>
                <p className="ttr-ticket-waiting-copy">
                  {gameState.destinationCompleteNotice.playerName} เชื่อม{' '}
                  {gameState.destinationCompleteNotice.a} - {gameState.destinationCompleteNotice.b}{' '}
                  สำเร็จ
                </p>
                <p className="muted">
                  ตั๋วนี้มูลค่า {gameState.destinationCompleteNotice.points} แต้ม
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </GameShell>
  );
}
