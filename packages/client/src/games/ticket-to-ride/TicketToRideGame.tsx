import { useEffect, useMemo, useRef, useState } from 'react';
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchContentRef,
} from 'react-zoom-pan-pinch';
import type { TtrAction, TtrPlayerView, TtrRouteColor, TtrTrainColor } from 'shared';
import { TTR_ROUTE_POINTS, TTR_ROUTES, TTR_TRAIN_COLORS } from 'shared';
import { Button } from '../../components/ui';
import './ticket-to-ride.css';

type Props = {
  gameState: TtrPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

const routeColorClass: Record<TtrRouteColor, string> = {
  gray: 'route-gray',
  red: 'route-red',
  blue: 'route-blue',
  green: 'route-green',
  yellow: 'route-yellow',
  black: 'route-black',
  white: 'route-white',
  orange: 'route-orange',
  purple: 'route-purple',
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

type ClaimOption = {
  color: Exclude<TtrTrainColor, 'locomotive'>;
  locomotivesUsed: number;
};

function claimOptionKeyOf(o: ClaimOption): string {
  return `${o.color}:${o.locomotivesUsed}`;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

/** Average board coordinates per city from all route endpoints (0–100 space). */
function buildTtrCityCentroids(): Record<string, { x: number; y: number }> {
  const acc = new Map<string, { sx: number; sy: number; n: number }>();
  for (const r of TTR_ROUTES) {
    const pairs: [string, number, number][] = [
      [r.a, r.ax, r.ay],
      [r.b, r.bx, r.by],
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
  const vw = 100;
  const vh = 40;

  if (!pa || !pb) {
    return (
      <div className="ttr-ticket-preview-fallback" aria-hidden>
        <span className="ttr-ticket-preview-fallback-city">{a}</span>
        <span className="ttr-ticket-preview-fallback-gap">· · ·</span>
        <span className="ttr-ticket-preview-fallback-city">{b}</span>
      </div>
    );
  }

  const pad = 5;
  const minX = Math.min(pa.x, pb.x) - pad;
  const maxX = Math.max(pa.x, pb.x) + pad;
  const minY = Math.min(pa.y, pb.y) - pad;
  const maxY = Math.max(pa.y, pb.y) + pad;
  const bw = Math.max(maxX - minX, 1e-6);
  const bh = Math.max(maxY - minY, 1e-6);
  const innerW = vw - 10;
  const innerH = vh - 8;
  const mx = (x: number) => 5 + ((x - minX) / bw) * innerW;
  const my = (y: number) => 4 + ((y - minY) / bh) * innerH;
  const x1 = mx(pa.x);
  const y1 = my(pa.y);
  const x2 = mx(pb.x);
  const y2 = my(pb.y);

  return (
    <svg className="ttr-ticket-preview-svg" viewBox={`0 0 ${vw} ${vh}`} aria-hidden>
      <rect className="ttr-ticket-preview-bg" x="0" y="0" width={vw} height={vh} rx="4" />
      <line className="ttr-ticket-preview-line" x1={x1} y1={y1} x2={x2} y2={y2} />
      <circle className="ttr-ticket-preview-dot" cx={x1} cy={y1} r="2.4" />
      <circle className="ttr-ticket-preview-dot" cx={x2} cy={y2} r="2.4" />
    </svg>
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

export function TicketToRideGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const [claimRouteId, setClaimRouteId] = useState<string>('');
  const [claimOptionKey, setClaimOptionKey] = useState<string>('');
  const [keepTicketIds, setKeepTicketIds] = useState<string[]>([]);
  const [firstPick, setFirstPick] = useState<
    { source: 'deck' } | { source: 'face_up'; index: number } | null
  >(null);
  const [secondPick, setSecondPick] = useState<
    { source: 'deck' } | { source: 'face_up'; index: number } | null
  >(null);

  const mapTransformRef = useRef<ReactZoomPanPinchContentRef>(null);

  const canAct = gameState.phase === 'playing' && gameState.canAct && gameState.myId === myId;
  const myCards = TTR_TRAIN_COLORS.filter((c) => gameState.myHand[c] > 0);
  const selectedRoute = useMemo(
    () => gameState.routes.find((r) => r.id === claimRouteId) ?? null,
    [claimRouteId, gameState.routes],
  );
  const pendingChoice = gameState.pendingTicketChoice;
  const pendingChoiceSig = pendingChoice?.map((t) => t.id).join('|') ?? '';
  const isInitialChoice = gameState.phase === 'initial_tickets' && pendingChoice != null;
  const curName =
    gameState.players.find((p) => p.id === gameState.currentPlayerId)?.name ??
    gameState.currentPlayerId;

  const claimOptionsByRoute = useMemo(
    () =>
      Object.fromEntries(
        gameState.routes.map((r) => [r.id, listClaimOptions(gameState, myId, r.id)]),
      ) as Record<string, ClaimOption[]>,
    [gameState, myId],
  );
  const selectedClaimOptions = selectedRoute ? (claimOptionsByRoute[selectedRoute.id] ?? []) : [];
  const selectedClaimOption =
    selectedClaimOptions.find((o) => claimOptionKeyOf(o) === claimOptionKey) ??
    selectedClaimOptions[0] ??
    null;
  const claimableRouteIds = useMemo(
    () =>
      new Set(
        Object.entries(claimOptionsByRoute)
          .filter(([, v]) => v.length > 0)
          .map(([k]) => k),
      ),
    [claimOptionsByRoute],
  );
  /** Stable seat index per player for this game (used for route owner tint). */
  const playerSeatById = useMemo(
    () => Object.fromEntries(gameState.players.map((p, i) => [p.id, i])) as Record<string, number>,
    [gameState.players],
  );
  const firstFaceUpCard =
    firstPick?.source === 'face_up' ? (gameState.faceUpTrainCards[firstPick.index] ?? null) : null;
  const firstIsFaceUpLoco = firstFaceUpCard === 'locomotive';
  const drawPlanText = useMemo(() => {
    const firstTxt =
      firstPick == null
        ? 'กองคว่ำ'
        : firstPick.source === 'deck'
          ? 'กองคว่ำ'
          : `กองหงาย (${trainColorLabel[gameState.faceUpTrainCards[firstPick.index] ?? 'locomotive']})`;
    const secondTxt = firstIsFaceUpLoco
      ? 'ไม่มีใบที่ 2 (หยิบ loco เปิดหน้า)'
      : secondPick == null
        ? 'กองคว่ำ'
        : secondPick.source === 'deck'
          ? 'กองคว่ำ'
          : `กองหงาย (${trainColorLabel[gameState.faceUpTrainCards[secondPick.index] ?? 'locomotive']})`;
    return `ใบที่ 1: ${firstTxt} · ใบที่ 2: ${secondTxt}`;
  }, [firstIsFaceUpLoco, firstPick, secondPick, gameState.faceUpTrainCards]);

  useEffect(() => {
    setKeepTicketIds([]);
  }, [pendingChoiceSig]);

  useEffect(() => {
    if (!selectedRoute) return;
    const opts = claimOptionsByRoute[selectedRoute.id] ?? [];
    if (opts.length === 0) return;
    if (opts.some((o) => claimOptionKeyOf(o) === claimOptionKey)) return;
    setClaimOptionKey(claimOptionKeyOf(opts[0]!));
  }, [claimOptionKey, claimOptionsByRoute, selectedRoute]);

  const submitClaim = () => {
    if (!selectedRoute || !selectedClaimOption || !canAct) return;
    sendAction({
      type: 'claim_route',
      routeId: selectedRoute.id,
      color: selectedClaimOption.color,
      locomotivesUsed: selectedClaimOption.locomotivesUsed,
    } satisfies TtrAction);
  };

  const submitDrawTrains = () => {
    if (!canAct) return;
    const first = firstPick ?? { source: 'deck' };
    const second = firstIsFaceUpLoco ? undefined : (secondPick ?? { source: 'deck' });
    sendAction({ type: 'draw_train_cards', first, second } satisfies TtrAction);
    setFirstPick(null);
    setSecondPick(null);
  };

  const submitDrawTickets = () => {
    if (!canAct) return;
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
    <div className="page container ttr-page">
      <div className="ttr-topbar">
        <h1>Ticket to Ride (MVP)</h1>
        <p>ตาปัจจุบัน: {curName}</p>
      </div>

      <div className="card ttr-board">
        <div className="ttr-route-legend">
          <span className="ok">เส้นลงได้</span>
          <span className="bad">เส้นลงไม่ได้</span>
          <span className="sel">เส้นที่เลือก</span>
        </div>
        <div className="ttr-map-toolbar">
          <p className="ttr-map-hint">
            ซูม: กด Ctrl ค้างแล้วหมุนล้อ · หรือปุ่ม +/− · เลื่อน: คลิกซ้ายค้างบนพื้นหลังแผนที่
            (ไม่ใช่บนเส้นทาง)
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
        <div className="ttr-map-viewport">
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
              excluded: ['ttr-route', 'ttr-route-owner', 'ttr-route-label', 'ttr-city-dot'],
            }}
          >
            <TransformComponent wrapperClass="ttr-map-rz-wrapper" contentClass="ttr-map-rz-content">
              <svg viewBox="0 0 100 100" className="ttr-map" aria-label="เส้นทางรถไฟ">
                <rect
                  className="ttr-map-pan-hit"
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  fill="transparent"
                />
                {gameState.routes.map(({ id, def, ownerId }) => (
                  <g key={id}>
                    {ownerId != null ? (
                      <line
                        x1={def.ax}
                        y1={def.ay}
                        x2={def.bx}
                        y2={def.by}
                        className={`ttr-route-owner ttr-owner-seat-${(playerSeatById[ownerId] ?? 0) % 6}`}
                        pointerEvents="none"
                        aria-hidden
                      />
                    ) : null}
                    <line
                      x1={def.ax}
                      y1={def.ay}
                      x2={def.bx}
                      y2={def.by}
                      className={`ttr-route ${routeColorClass[def.color]}${ownerId ? ' claimed' : ''}${ownerId === myId ? ' mine' : ''}${
                        claimRouteId === id ? ' selected' : ''
                      }${claimableRouteIds.has(id) ? ' claimable' : ' blocked'}`}
                      onClick={() => {
                        setClaimRouteId(id);
                        const opts = claimOptionsByRoute[id] ?? [];
                        if (opts.length > 0) {
                          setClaimOptionKey(claimOptionKeyOf(opts[0]!));
                        }
                      }}
                    />
                    <text
                      x={(def.ax + def.bx) / 2}
                      y={(def.ay + def.by) / 2}
                      className="ttr-route-label"
                    >
                      {def.length}
                    </text>
                    <circle cx={def.ax} cy={def.ay} r="1.1" className="ttr-city-dot" />
                    <circle cx={def.bx} cy={def.by} r="1.1" className="ttr-city-dot" />
                  </g>
                ))}
              </svg>
            </TransformComponent>
          </TransformWrapper>
        </div>
      </div>

      <div className="ttr-grid">
        <section className="card ttr-panel">
          <h3>ผู้เล่น</h3>
          {gameState.players.map((p) => (
            <div
              key={p.id}
              className={`ttr-player-row${p.id === gameState.currentPlayerId ? ' active' : ''}`}
            >
              <div className="ttr-player-name-block">
                <span
                  className={`ttr-player-swatch ttr-owner-seat-${(playerSeatById[p.id] ?? 0) % 6}`}
                  title="สีบนแผนที่สำหรับเส้นที่ยึดแล้ว"
                />
                <span>
                  {p.name} {p.id === myId ? '(คุณ)' : ''}
                </span>
              </div>
              <span>
                {p.score} แต้ม · รถไฟ {p.trainsLeft} · มือ {p.handCount}
              </span>
            </div>
          ))}
          <p className="ttr-last-event">{gameState.lastEvent}</p>
        </section>

        <section className="card ttr-panel">
          <h3>การ์ดบนมือคุณ</h3>
          <div className="ttr-chip-wrap">
            {myCards.length === 0 ? (
              <span className="muted">ไม่มีการ์ด</span>
            ) : (
              myCards.map((c) => (
                <span key={c} className={`ttr-chip ${c}`}>
                  {trainColorLabel[c]} x{gameState.myHand[c]}
                </span>
              ))
            )}
          </div>
          <h4>การ์ดเปิดหน้า</h4>
          <div className="ttr-chip-wrap">
            {gameState.faceUpTrainCards.map((c, i) => (
              <button
                type="button"
                key={`${c}-${i}`}
                className={`ttr-chip ${c}${
                  firstPick?.source === 'face_up' && firstPick.index === i
                    ? ' ttr-chip-picked-1'
                    : secondPick?.source === 'face_up' && secondPick.index === i
                      ? ' ttr-chip-picked-2'
                      : ''
                }`}
                onClick={() => {
                  if (!canAct) return;
                  if (!firstPick) {
                    setFirstPick({ source: 'face_up', index: i });
                    if (c === 'locomotive') setSecondPick(null);
                    return;
                  }
                  if (
                    !secondPick &&
                    !(
                      firstPick.source === 'face_up' &&
                      gameState.faceUpTrainCards[firstPick.index] === 'locomotive'
                    )
                  ) {
                    setSecondPick({ source: 'face_up', index: i });
                  }
                }}
              >
                {trainColorLabel[c]}
              </button>
            ))}
          </div>
        </section>

        <section className="card ttr-panel">
          <h3>แอคชัน</h3>
          <div className="ttr-actions">
            <div className="ttr-draw-quick">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (firstPick == null) setFirstPick({ source: 'deck' });
                  else if (!firstIsFaceUpLoco && secondPick == null)
                    setSecondPick({ source: 'deck' });
                }}
                disabled={
                  !canAct || (firstPick != null && (firstIsFaceUpLoco || secondPick != null))
                }
              >
                เลือกกองคว่ำ
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFirstPick(null);
                  setSecondPick(null);
                }}
                disabled={!canAct || (firstPick == null && secondPick == null)}
              >
                ล้างแผนจั่ว
              </Button>
            </div>
            <p className="ttr-draw-plan">{drawPlanText}</p>
            <Button type="button" disabled={!canAct} onClick={submitDrawTrains}>
              จั่วการ์ดรถไฟ
            </Button>
            <Button type="button" disabled={!canAct} onClick={submitDrawTickets}>
              จั่วตั๋วปลายทาง
            </Button>
            {selectedRoute ? (
              <div className="ttr-claim-box">
                <p className="ttr-claim-title">
                  เส้นที่เลือก: {selectedRoute.def.a} - {selectedRoute.def.b} · ยาว{' '}
                  {selectedRoute.def.length} · ได้ {TTR_ROUTE_POINTS[selectedRoute.def.length]} แต้ม
                </p>
                {selectedClaimOptions.length > 0 ? (
                  <div className="ttr-claim-options">
                    {selectedClaimOptions.map((o) => {
                      const key = claimOptionKeyOf(o);
                      const normalNeed = selectedRoute.def.length - o.locomotivesUsed;
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`ttr-claim-option${key === claimOptionKey ? ' selected' : ''}`}
                          onClick={() => setClaimOptionKey(key)}
                        >
                          {trainColorLabel[o.color]} x{normalNeed}
                          {o.locomotivesUsed > 0 ? ` + locomotive x${o.locomotivesUsed}` : ''}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="muted">คลิกเส้นบนแผนที่เพื่อเตรียมยึดเส้นทาง</p>
            )}
            <Button
              type="button"
              disabled={!canAct || !selectedRoute || !selectedClaimOption}
              onClick={submitClaim}
            >
              ยึดเส้นทาง
            </Button>
            {selectedRoute ? (
              selectedClaimOptions.length > 0 ? (
                <p className="ttr-hint-ok">ลงได้ ✓ ตัวเลือก {selectedClaimOptions.length} แบบ</p>
              ) : (
                <p className="ttr-hint-bad">ลงไม่ได้จากการ์ดบนมือ/กติกา double-route</p>
              )
            ) : null}
          </div>
        </section>
      </div>

      <div className="card ttr-panel">
        <h3>ตั๋วของคุณ</h3>
        <ul className="ttr-ticket-list">
          {gameState.myTickets.map((t) => (
            <li key={t.id}>
              {t.a} - {t.b} ({t.points})
            </li>
          ))}
        </ul>
      </div>

      {pendingChoice && (
        <div className="modal-overlay" role="dialog" aria-modal>
          <div className="modal ttr-ticket-modal">
            <h2>
              {isInitialChoice
                ? 'เลือกตั๋วเริ่มต้น (อย่างน้อย 2)'
                : 'เลือกตั๋วที่จั่ว (อย่างน้อย 1)'}
            </h2>
            <div className="ttr-ticket-choice-list">
              {pendingChoice.map((t: TtrPlayerView['myTickets'][number]) => {
                const picked = keepTicketIds.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    className={`ttr-ticket-choice${picked ? ' picked' : ''}`}
                    title={`${t.a} → ${t.b} (${t.points} แต้ม)`}
                    onClick={() =>
                      setKeepTicketIds((prev) =>
                        prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id],
                      )
                    }
                  >
                    <TtrTicketRoutePreview a={t.a} b={t.b} />
                    <div className="ttr-ticket-choice-meta">
                      <span className="ttr-ticket-choice-city">{t.a}</span>
                      <span className="ttr-ticket-choice-points">{t.points}</span>
                      <span className="ttr-ticket-choice-city">{t.b}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <Button type="button" onClick={submitKeepTickets}>
              ยืนยัน
            </Button>
          </div>
        </div>
      )}

      {gameState.phase === 'game_over' && gameState.gameResult && (
        <div className="modal-overlay" role="dialog" aria-modal>
          <div className="modal ttr-ticket-modal">
            <h2>เกมจบ</h2>
            <p>{gameState.gameResult.reason}</p>
            <div className="ttr-end-actions">
              {onRestart ? (
                <Button type="button" variant="secondary" onClick={onRestart}>
                  เล่นใหม่
                </Button>
              ) : null}
              <Button type="button" onClick={onLeave}>
                กลับห้อง
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="ttr-leave">
        <Button type="button" variant="danger" onClick={onLeave}>
          ออกจากห้อง
        </Button>
      </div>
    </div>
  );
}
