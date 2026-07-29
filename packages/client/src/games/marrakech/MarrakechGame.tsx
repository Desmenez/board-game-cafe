import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rotateFacing,
  type MarrakechAction,
  type MarrakechAssam,
  type MarrakechCell,
  type MarrakechFacing,
  type MarrakechPaymentEvent,
  type MarrakechPlayerView,
  type MarrakechRugCells,
  type MarrakechTurn,
} from 'shared';
import {
  GameHistoryDisclosure,
  GameOverModal,
  GamePlayHeader,
  GameShell,
} from '../../components/game-shell';
import { PlayerRosterStrip } from '../../components/player-roster';
import { Button } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { imageMap } from '../../imageMap';
import { cn } from '../../utils/cn';
import { assamMoveMatches } from './assamMotion';
import { MARRAKECH_COLOR_LABEL } from './labels';
import { MarrakechBoard } from './components/MarrakechBoard';
import { SlipperDie } from './components/SlipperDie';
import { buildMarrakechRosterSeats } from './components/marrakechRosterSeats';
import './marrakech.css';

type Props = {
  gameState: MarrakechPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

/** Local preview offset from baseline facing: −1 left, 0 straight, +1 right (no 180°). */
type TurnOffset = -1 | 0 | 1;

type AssamWalk = { from: MarrakechAssam; steps: number; token: number };

function offsetToTurn(offset: TurnOffset): MarrakechTurn {
  if (offset < 0) return 'left';
  if (offset > 0) return 'right';
  return 'straight';
}

function paymentKey(p: MarrakechPaymentEvent): string {
  return `${p.fromId}|${p.toId}|${p.amount}|${p.areaSize}|${p.color}`;
}

function phaseSubtitle(view: MarrakechPlayerView): string {
  const active = view.players.find((p) => p.id === view.activePlayerId);
  const name = active?.name ?? '…';
  switch (view.phase) {
    case 'choose_direction':
      return view.pendingAdvanceAfterDirection
        ? `${name} ตั้งทิศทางให้คนถัดไป`
        : `${name} เลือกทิศทาง Assam`;
    case 'roll':
      return `${name} ทอยลูกเต๋า`;
    case 'place_rug':
      return `${name} วางพรม`;
    case 'game_over':
      return 'เกมจบแล้ว';
  }
}

export function MarrakechGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const view = gameState;
  const isMe = view.activePlayerId === myId && view.canAct;
  useYourTurnToast(isMe, view.phase !== 'game_over');

  const [selectedCell, setSelectedCell] = useState<MarrakechCell | null>(null);
  const prevAssamRef = useRef<MarrakechAssam>(view.assam);
  const prevRollRef = useRef<number | null>(view.lastRoll);
  const [assamWalk, setAssamWalk] = useState<AssamWalk | null>(null);
  /** Walk held back until the die animation settles. */
  const [pendingWalk, setPendingWalk] = useState<AssamWalk | null>(null);
  const pendingWalkRef = useRef<AssamWalk | null>(null);
  const [dieRollToken, setDieRollToken] = useState(0);

  const [turnOffset, setTurnOffset] = useState<TurnOffset>(0);
  const [baselineFacing, setBaselineFacing] = useState<MarrakechFacing>(view.assam.facing);
  const [pendingAutoRoll, setPendingAutoRoll] = useState(false);
  const paymentSeenRef = useRef(false);
  const paymentKeyRef = useRef('');
  const pendingPaymentToastRef = useRef<MarrakechPaymentEvent | null>(null);

  // Reset rotate preview when entering choose_direction (or Assam facing updates from server).
  useEffect(() => {
    if (view.phase !== 'choose_direction') {
      setTurnOffset(0);
      return;
    }
    setTurnOffset(0);
    setBaselineFacing(view.assam.facing);
  }, [view.phase, view.assam.facing, view.activePlayerId]);

  // Queue a payment toast when Assam lands on another player's rug.
  useEffect(() => {
    const payment = view.lastPayment;
    if (!paymentSeenRef.current) {
      paymentSeenRef.current = true;
      paymentKeyRef.current = payment ? paymentKey(payment) : '';
      return;
    }
    if (!payment) return;
    const key = paymentKey(payment);
    if (key === paymentKeyRef.current) return;
    paymentKeyRef.current = key;
    pendingPaymentToastRef.current = payment;
  }, [view.lastPayment]);

  const flushPaymentToast = () => {
    const payment = pendingPaymentToastRef.current;
    if (!payment) return;
    pendingPaymentToastRef.current = null;
    const from = view.players.find((p) => p.id === payment.fromId);
    const to = view.players.find((p) => p.id === payment.toId);
    const fromName = payment.fromId === myId ? 'คุณ' : (from?.name ?? 'ผู้เล่น');
    const toName = payment.toId === myId ? 'คุณ' : (to?.name ?? 'เจ้าของพรม');
    toast(`${fromName} จ่าย ${payment.amount} Dirham ให้ ${toName}`, {
      id: 'mk-payment',
      duration: 4200,
      position: 'top-center',
    });
  };

  // A fresh roll starts the die animation; the walk waits for it to settle.
  useEffect(() => {
    const prevRoll = prevRollRef.current;
    const prevAssam = prevAssamRef.current;
    prevRollRef.current = view.lastRoll;
    prevAssamRef.current = view.assam;

    if (view.lastRoll == null || view.lastRoll === prevRoll) return;

    const token = Date.now();
    setDieRollToken(token);
    const walk = assamMoveMatches(prevAssam, view.lastRoll, view.assam)
      ? { from: prevAssam, steps: view.lastRoll, token }
      : null;
    pendingWalkRef.current = walk;
    setPendingWalk(walk);
  }, [view.assam, view.lastRoll]);

  const onDieSettled = () => {
    const walk = pendingWalkRef.current;
    pendingWalkRef.current = null;
    setPendingWalk(null);
    if (walk) {
      setAssamWalk(walk);
      return;
    }
    flushPaymentToast();
  };

  const onAssamWalkComplete = () => {
    setAssamWalk(null);
    flushPaymentToast();
  };

  // After set-direction in self mode, auto-fire roll once the view reaches roll + canAct.
  useEffect(() => {
    if (!pendingAutoRoll) return;
    if (view.phase === 'roll' && view.activePlayerId === myId && view.canAct) {
      setPendingAutoRoll(false);
      sendAction({ type: 'roll-die' });
      return;
    }
    if (view.phase !== 'choose_direction' && view.phase !== 'roll') {
      setPendingAutoRoll(false);
    }
  }, [pendingAutoRoll, view.phase, view.activePlayerId, view.canAct, myId, sendAction]);

  const send = (action: MarrakechAction) => sendAction(action);

  const previewFacing = useMemo(
    () => rotateFacing(baselineFacing, offsetToTurn(turnOffset)),
    [baselineFacing, turnOffset],
  );

  // Hold Assam at the pre-roll pose while the die tumbles, so he only walks after it lands.
  const displayAssam: MarrakechAssam = pendingWalk
    ? pendingWalk.from
    : isMe && view.phase === 'choose_direction'
      ? { ...view.assam, facing: previewFacing }
      : view.assam;

  /** Die tumbling or Assam mid-walk — don't offer placements at a square he hasn't reached. */
  const assamBusy = pendingWalk != null || assamWalk != null;

  const highlightCells = useMemo(() => {
    if (!isMe || view.phase !== 'place_rug' || assamBusy) return [];
    if (selectedCell != null) return [];
    const set = new Set<MarrakechCell>();
    for (const [a, b] of view.legalPlacements) {
      // Prefer cells adjacent to Assam as first-click targets
      if (a !== view.assam.cell) set.add(a);
      if (b !== view.assam.cell) set.add(b);
    }
    // Narrow to cells that share an edge with Assam
    const ar = Math.floor(view.assam.cell / 7);
    const ac = view.assam.cell % 7;
    return [...set].filter((c) => {
      const r = Math.floor(c / 7);
      const col = c % 7;
      return Math.abs(r - ar) + Math.abs(col - ac) === 1;
    });
  }, [isMe, view.phase, view.legalPlacements, view.assam.cell, selectedCell, assamBusy]);

  const partnerCells = useMemo(() => {
    if (selectedCell == null || view.phase !== 'place_rug') return [];
    const partners = new Set<MarrakechCell>();
    for (const [a, b] of view.legalPlacements) {
      if (a === selectedCell) partners.add(b);
      if (b === selectedCell) partners.add(a);
    }
    return [...partners];
  }, [selectedCell, view.legalPlacements, view.phase]);

  const rosterSeats = useMemo(() => buildMarrakechRosterSeats(view), [view]);

  const ghostPlacement: MarrakechRugCells | null =
    selectedCell != null && partnerCells.length === 1
      ? ([selectedCell, partnerCells[0]!] as MarrakechRugCells)
      : null;

  const onCellClick = (cell: MarrakechCell) => {
    if (!isMe || view.phase !== 'place_rug' || assamBusy) return;
    if (selectedCell == null) {
      if (!highlightCells.includes(cell)) return;
      setSelectedCell(cell);
      return;
    }
    if (cell === selectedCell) {
      setSelectedCell(null);
      return;
    }
    if (!partnerCells.includes(cell)) return;
    const cells: MarrakechRugCells = [selectedCell, cell];
    setSelectedCell(null);
    send({ type: 'place-rug', cells });
  };

  const onRotate = (delta: -1 | 1) => {
    setTurnOffset((prev) => {
      const next = prev + delta;
      if (next < -1 || next > 1) return prev;
      return next as TurnOffset;
    });
  };

  const onAdvance = () => {
    if (!isMe) return;
    if (view.phase === 'roll') {
      send({ type: 'roll-die' });
      return;
    }
    if (view.phase !== 'choose_direction') return;
    const turn = offsetToTurn(turnOffset);
    if (!view.pendingAdvanceAfterDirection) {
      setPendingAutoRoll(true);
    }
    send({ type: 'set-direction', turn });
  };

  // Reset selection when phase changes
  useEffect(() => {
    if (view.phase !== 'place_rug') setSelectedCell(null);
  }, [view.phase]);

  if (view.phase === 'game_over') {
    const winners = new Set(view.result?.winners ?? []);
    const iWon = winners.has(myId);
    return (
      <GameShell className="mk-page">
        <GamePlayHeader title="Marrakech" onLeave={onLeave} onRestart={onRestart} />
        <GameOverModal
          titleId="mk-game-over-title"
          onLeave={onLeave}
          onRestart={onRestart}
          tone={iWon ? 'win' : 'default'}
        >
          <p className="text-sm opacity-70 mb-1">เกมจบแล้ว</p>
          <h2 id="mk-game-over-title" className="text-xl font-bold mb-2">
            {iWon ? 'ยินดีด้วย — คุณชนะ!' : 'สรุปผล'}
          </h2>
          <p className="text-sm mb-3 opacity-80">{view.result?.reason}</p>
          <ul className="space-y-2 mb-2">
            {(view.scores ?? []).map((s, i) => (
              <li
                key={s.playerId}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                  winners.has(s.playerId)
                    ? 'bg-[var(--bg-elevated)] font-semibold'
                    : 'bg-[var(--bg-muted)]',
                )}
              >
                <span>
                  {i + 1}. {s.name}
                  {s.playerId === myId ? ' (คุณ)' : ''}
                </span>
                <span className="tabular-nums">
                  {s.total}{' '}
                  <span className="opacity-60 text-xs">
                    ({s.dirhams}฿ + {s.visibleSquares} พรม)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </GameOverModal>
      </GameShell>
    );
  }

  const showDirectionControls = isMe && view.phase === 'choose_direction';
  const showAdvanceControls = isMe && (view.phase === 'choose_direction' || view.phase === 'roll');
  const advanceLabel =
    view.phase === 'choose_direction' && view.pendingAdvanceAfterDirection
      ? 'ยืนยันทิศทาง'
      : 'เดินหน้า';

  return (
    <GameShell className="mk-page">
      <GamePlayHeader
        title="Marrakech"
        subtitle={phaseSubtitle(view)}
        onLeave={onLeave}
        onRestart={onRestart}
        trailing={
          <p className="text-xs opacity-70 mt-1 line-clamp-2">{view.lastEvent}</p>
        }
      />

      <GameHistoryDisclosure
        title={`ผู้เล่น · ${view.players.length} คน`}
        defaultOpen
        className="mk-roster sticky top-4 z-20"
      >
        <PlayerRosterStrip
          layout="grid"
          myId={myId}
          ariaLabel="สถานะผู้เล่น Marrakech"
          seats={rosterSeats}
        />
      </GameHistoryDisclosure>

      <div className="mk-layout flex flex-col gap-3 md:flex-row md:items-start">
        <div className="mk-main flex-1 min-w-0">
          <MarrakechBoard
            rugs={view.rugs}
            assam={displayAssam}
            assamWalk={assamWalk}
            onAssamWalkComplete={onAssamWalkComplete}
            highlightCells={highlightCells}
            partnerCells={partnerCells}
            selectedCell={selectedCell}
            onCellClick={
              isMe && view.phase === 'place_rug' && !assamBusy ? onCellClick : undefined
            }
            ghostPlacement={ghostPlacement}
            ghostColor={view.nextPlaceColor}
          />
        </div>

        <aside className="mk-side flex flex-col gap-3 w-full md:w-72 lg:w-80 shrink-0">
          <section className="card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">ลูกเต๋า</span>
              <SlipperDie
                value={view.lastRoll}
                rollToken={dieRollToken}
                onRollEnd={onDieSettled}
              />
            </div>
            {view.lastPayment ? (
              <p className="text-xs opacity-80">
                จ่าย {view.lastPayment.amount} Dirham ให้เจ้าของพรม
              </p>
            ) : null}
          </section>

          {showAdvanceControls ? (
            <section className="card p-3 space-y-2">
              {showDirectionControls ? (
                <>
                  <h3 className="text-sm font-semibold">ทิศทาง Assam</h3>
                  <p className="text-xs opacity-70">หมุนได้ซ้ายหรือขวา — ห้ามหันหลัง</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      disabled={turnOffset <= -1 || pendingAutoRoll}
                      onClick={() => onRotate(-1)}
                    >
                      <RotateCcw size={14} aria-hidden />
                      ทวนเข็ม
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      disabled={turnOffset >= 1 || pendingAutoRoll}
                      onClick={() => onRotate(1)}
                    >
                      ตามเข็ม
                      <RotateCw size={14} aria-hidden />
                    </Button>
                  </div>
                </>
              ) : null}
              <Button
                type="button"
                className="w-full"
                disabled={pendingAutoRoll}
                onClick={onAdvance}
              >
                {advanceLabel}
              </Button>
            </section>
          ) : null}

          {isMe && view.phase === 'place_rug' ? (
            <section className="card p-3 space-y-2">
              <h3 className="text-sm font-semibold">วางพรม</h3>
              <p className="text-xs opacity-70">
                {assamBusy
                  ? 'Assam กำลังเดิน…'
                  : selectedCell == null
                    ? 'เลือกช่องที่ติดกับ Assam'
                    : partnerCells.length === 1
                      ? 'แตะช่องคู่เพื่อยืนยัน หรือแตะช่องเดิมเพื่อยกเลิก'
                      : 'เลือกช่องคู่ของพรม หรือแตะช่องเดิมเพื่อยกเลิก'}
              </p>
              {view.nextPlaceColor ? (
                <div className="flex items-center gap-2">
                  <img
                    src={imageMap.marrakech.rugs[view.nextPlaceColor]}
                    alt=""
                    className="h-6 w-12 object-cover rounded"
                  />
                  <span className="text-xs">{MARRAKECH_COLOR_LABEL[view.nextPlaceColor]}</span>
                </div>
              ) : null}
              {selectedCell != null ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedCell(null)}>
                  ยกเลิก
                </Button>
              ) : null}
            </section>
          ) : null}

          {!isMe ? (
            <p className="text-sm opacity-60 text-center py-2">รอผู้เล่นอื่น…</p>
          ) : null}
        </aside>
      </div>
    </GameShell>
  );
}
