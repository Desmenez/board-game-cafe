import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, RotateCcw, RotateCw } from 'lucide-react';
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
import { ASSAM_FACING_DEG, assamMoveMatches } from './assamMotion';
import { MARRAKECH_COLOR_LABEL, MARRAKECH_FACING_LABEL } from './labels';
import { MarrakechBoard } from './components/MarrakechBoard';
import { MarrakechGameOverBody } from './components/MarrakechGameOverBody';
import { MarrakechTurnCard } from './components/MarrakechTurnCard';
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

/** Seat that plays after the active one — the one a 'previous-player' direction is set for. */
function nextSeatName(view: MarrakechPlayerView): string | null {
  const order = view.playerOrder;
  const idx = order.indexOf(view.activePlayerId);
  if (idx < 0) return null;
  for (let i = 1; i <= order.length; i++) {
    const id = order[(idx + i) % order.length];
    const seat = view.players.find((p) => p.id === id);
    if (seat && !seat.eliminated) return seat.name;
  }
  return null;
}

export function MarrakechGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const view = gameState;
  const isMe = view.activePlayerId === myId && view.canAct;
  useYourTurnToast(isMe, view.phase !== 'game_over');

  const [selectedCell, setSelectedCell] = useState<MarrakechCell | null>(null);
  const [assamWalk, setAssamWalk] = useState<AssamWalk | null>(null);
  /** Walk held back until the die animation settles. */
  const [pendingWalk, setPendingWalk] = useState<AssamWalk | null>(null);
  const [dieRollToken, setDieRollToken] = useState(0);
  /**
   * Roll + pose we have already reacted to. Kept in state, not a ref, so a fresh
   * roll is caught during render: an effect would let one frame paint with Assam
   * already teleported to his landing square and the placement cells lit up.
   */
  const [seenRoll, setSeenRoll] = useState<{ roll: number | null; assam: MarrakechAssam }>(() => ({
    roll: view.lastRoll,
    assam: view.assam,
  }));

  if (view.lastRoll !== seenRoll.roll || view.assam !== seenRoll.assam) {
    const prev = seenRoll;
    setSeenRoll({ roll: view.lastRoll, assam: view.assam });
    if (view.lastRoll != null && view.lastRoll !== prev.roll) {
      const token = dieRollToken + 1;
      setDieRollToken(token);
      setPendingWalk(
        assamMoveMatches(prev.assam, view.lastRoll, view.assam)
          ? { from: prev.assam, steps: view.lastRoll, token }
          : null,
      );
    }
  }

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

  const onDieSettled = () => {
    setPendingWalk(null);
    if (pendingWalk) {
      setAssamWalk(pendingWalk);
      return;
    }
    flushPaymentToast();
  };

  const onAssamWalkComplete = (token: number) => {
    // A walk cut short by a newer one still reports back; don't clear the newer walk.
    setAssamWalk((cur) => (cur && cur.token !== token ? cur : null));
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

  const activePlayer = view.players.find((p) => p.id === view.activePlayerId) ?? null;

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
    const colorsByPlayerId = Object.fromEntries(view.players.map((p) => [p.id, p.colors]));
    return (
      <GameShell className="mk-page">
        <GamePlayHeader title="Marrakech" onLeave={onLeave} onRestart={onRestart} />
        <GameOverModal
          titleId="mk-game-over-title"
          onLeave={onLeave}
          onRestart={onRestart}
          tone={iWon ? 'win' : 'default'}
          panelClassName="mk-game-over-modal"
        >
          <MarrakechGameOverBody
            titleId="mk-game-over-title"
            iWon={iWon}
            reason={view.result?.reason}
            scores={view.scores ?? []}
            winners={winners}
            myId={myId}
            colorsByPlayerId={colorsByPlayerId}
          />
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
        trailing={<p className="text-xs opacity-70 mt-1 line-clamp-2">{view.lastEvent}</p>}
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

      <div className="mk-layout flex flex-col gap-3 md:flex-row md:items-center">
        <div className="mk-main flex-1 min-w-0">
          <MarrakechBoard
            rugs={view.rugs}
            assam={displayAssam}
            assamWalk={assamWalk}
            onAssamWalkComplete={onAssamWalkComplete}
            highlightCells={highlightCells}
            partnerCells={partnerCells}
            selectedCell={selectedCell}
            onCellClick={isMe && view.phase === 'place_rug' && !assamBusy ? onCellClick : undefined}
            ghostPlacement={ghostPlacement}
            ghostColor={view.nextPlaceColor}
          />
        </div>

        <aside className="mk-side flex w-full shrink-0 flex-col gap-3 md:w-72 lg:w-80">
          <MarrakechTurnCard
            name={activePlayer?.name ?? '…'}
            isMe={activePlayer?.id === myId}
            phase={view.phase}
            dirhams={activePlayer?.dirhams ?? null}
            lastRoll={view.lastRoll}
            paymentAmount={view.lastPayment?.amount ?? null}
            rugColor={activePlayer?.nextColor ?? view.nextPlaceColor}
            rugsRemaining={activePlayer?.rugsRemaining ?? 0}
            directionForName={
              view.phase === 'choose_direction' && view.pendingAdvanceAfterDirection
                ? nextSeatName(view)
                : null
            }
            die={
              <SlipperDie value={view.lastRoll} rollToken={dieRollToken} onRollEnd={onDieSettled} />
            }
          />

          {showAdvanceControls ? (
            <section className="card space-y-3">
              {showDirectionControls ? (
                <>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold">ทิศทาง Assam</h3>
                    <span className="text-[0.7rem] opacity-60">ห้ามหันหลัง</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full flex-col gap-1 px-2 py-1 text-xs!"
                      aria-label="หมุนทวนเข็มนาฬิกา"
                      disabled={turnOffset <= -1 || pendingAutoRoll}
                      onClick={() => onRotate(-1)}
                    >
                      <RotateCcw size={20} aria-hidden />
                      ทวนเข็ม
                    </Button>
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="mk-compass"
                        role="img"
                        aria-label={`Assam หัน${MARRAKECH_FACING_LABEL[previewFacing]}`}
                      >
                        <ArrowUp
                          size={22}
                          className="mk-compass__arrow"
                          style={{ transform: `rotate(${ASSAM_FACING_DEG[previewFacing]}deg)` }}
                          aria-hidden
                        />
                      </span>
                      <span className="text-[0.7rem] opacity-70">
                        หัน{MARRAKECH_FACING_LABEL[previewFacing]}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full flex-col gap-1 px-2 py-1 text-xs!"
                      aria-label="หมุนตามเข็มนาฬิกา"
                      disabled={turnOffset >= 1 || pendingAutoRoll}
                      onClick={() => onRotate(1)}
                    >
                      <RotateCw size={20} aria-hidden />
                      ตามเข็ม
                    </Button>
                  </div>
                </>
              ) : null}
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={pendingAutoRoll}
                onClick={onAdvance}
              >
                {advanceLabel}
              </Button>
            </section>
          ) : null}

          {isMe && view.phase === 'place_rug' ? (
            <section className="card space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">วางพรม</h3>
                {view.nextPlaceColor ? (
                  <img
                    src={imageMap.marrakech.rugs[view.nextPlaceColor]}
                    alt={`พรมสี${MARRAKECH_COLOR_LABEL[view.nextPlaceColor]}`}
                    className="mk-rug-chip__art"
                    draggable={false}
                  />
                ) : null}
              </div>
              <p className="text-xs opacity-70">
                {assamBusy
                  ? 'Assam กำลังเดิน…'
                  : selectedCell == null
                    ? 'เลือกช่องที่ติดกับ Assam'
                    : partnerCells.length === 1
                      ? 'แตะช่องคู่เพื่อยืนยัน หรือแตะช่องเดิมเพื่อยกเลิก'
                      : 'เลือกช่องคู่ของพรม หรือแตะช่องเดิมเพื่อยกเลิก'}
              </p>
              {selectedCell != null ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setSelectedCell(null)}
                >
                  ยกเลิก
                </Button>
              ) : null}
            </section>
          ) : null}

          {!isMe ? (
            <section className="card flex items-center gap-2.5">
              <span className="mk-wait-dot" aria-hidden />
              <p className="text-sm opacity-75">รอ {activePlayer?.name ?? 'ผู้เล่นอื่น'} …</p>
            </section>
          ) : null}
        </aside>
      </div>
    </GameShell>
  );
}
