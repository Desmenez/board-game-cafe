import { useCallback, useMemo, useState } from 'react';
import type { SkyTeamAction, SkyTeamPlayerView, SkyTeamSlotId } from 'shared';
import {
  GamePhasePanel,
  GamePlayHeader,
  GameShell,
  GameWaitingState,
} from '../../components/game-shell';
import { Button } from '../../components/ui';
import { useDeadlineCountdown } from '../../hooks/useDeadlineCountdown';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { SkyTeamBoard } from './components/SkyTeamBoard';
import { SkyTeamGameOver, SkyTeamRerollDialog } from './components/SkyTeamDialogs';
import { SkyTeamHUD } from './components/SkyTeamHUD';
import './sky-team.css';

type Props = {
  gameState: SkyTeamPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

function coffeeModsFromDelta(delta: number): Array<1 | -1> {
  const mods: Array<1 | -1> = [];
  const sign: 1 | -1 = delta >= 0 ? 1 : -1;
  for (let i = 0; i < Math.abs(delta); i++) mods.push(sign);
  return mods;
}

export function SkyTeamGame({
  gameState: gs,
  myId,
  sendAction,
  onLeave,
  onRestart,
}: Props) {
  const send = useCallback((a: SkyTeamAction) => sendAction(a), [sendAction]);
  const finished = gs.phase === 'game_over';
  const [selectedDieId, setSelectedDieId] = useState<string | null>(null);
  const [coffeeDelta, setCoffeeDelta] = useState(0);
  const [approachOpen, setApproachOpen] = useState(false);
  const [altitudeOpen, setAltitudeOpen] = useState(false);
  const coffeeMods = useMemo(() => coffeeModsFromDelta(coffeeDelta), [coffeeDelta]);
  const countdown = useDeadlineCountdown(gs.strategyEndsAtMs);

  useYourTurnToast(gs.isMyTurn && !finished);

  const subtitle = useMemo(() => {
    if (gs.phase === 'strategy') {
      return `Strategy · รอบ ${gs.round}${countdown.label ? ` · ${countdown.label}` : ''}`;
    }
    if (gs.silentPhase) return `SILENT PHASE · รอบ ${gs.round}`;
    if (gs.phase === 'end_round') return `End of round · ${gs.round}`;
    return `รอบ ${gs.round}`;
  }, [countdown.label, gs.phase, gs.round, gs.silentPhase]);

  const onSlotClick = (slotId: SkyTeamSlotId) => {
    if (!selectedDieId || !gs.isMyTurn) return;
    const die = gs.myDice.find((d) => d.id === selectedDieId);
    if (!die) return;
    const finalValue = die.value + coffeeDelta;
    if (finalValue < 1 || finalValue > 6) return;
    send({
      type: 'place-die',
      dieId: selectedDieId,
      slotId,
      coffeeMods: coffeeMods.length ? coffeeMods : undefined,
    });
    setSelectedDieId(null);
    setCoffeeDelta(0);
  };

  const iAmReady = Boolean(gs.strategyReady[myId]);

  return (
    <GameShell className="st-shell">
      <GamePlayHeader title="Sky Team" subtitle={subtitle} onLeave={onLeave} onRestart={onRestart} />

      {gs.silentPhase && (
        <div className="st-silent-banner" role="status">
          SILENT PHASE — ห้ามคุยเรื่องลูกเต๋า (Honor Rule)
        </div>
      )}

      {gs.phase === 'strategy' && (
        <GamePhasePanel title="Strategy Discussion" className="st-strategy">
          <p>
            คุยแผนได้ (advance 0/1/2, priority) — ห้ามคุยค่าลูกเต๋า เมื่อพร้อมทั้งคู่กด Finish
            หรือรอหมดเวลา
          </p>
          <div className="st-strategy__actions">
            <Button
              type="button"
              disabled={iAmReady}
              onClick={() => send({ type: 'finish-strategy' })}
            >
              {iAmReady ? 'รออีกฝ่าย…' : 'Finish Discussion'}
            </Button>
            {countdown.label && <span className="st-strategy__timer">{countdown.label}</span>}
          </div>
          <GameWaitingState>
            {`Pilot: ${gs.strategyReady[gs.pilotId] ? 'พร้อม' : 'ยัง'} · Co-Pilot: ${
              gs.strategyReady[gs.copilotId] ? 'พร้อม' : 'ยัง'
            }`}
          </GameWaitingState>
        </GamePhasePanel>
      )}

      <div className="st-layout">
        <SkyTeamHUD
          view={gs}
          selectedDieId={selectedDieId}
          onSelectDie={(id) => {
            setSelectedDieId(id);
            setCoffeeDelta(0);
          }}
          coffeeDelta={coffeeDelta}
          onCoffeeDelta={setCoffeeDelta}
          approachOpen={approachOpen}
          altitudeOpen={altitudeOpen}
          onOpenApproach={() => {
            setAltitudeOpen(false);
            setApproachOpen(true);
          }}
          onOpenAltitude={() => {
            setApproachOpen(false);
            setAltitudeOpen(true);
          }}
          onCloseTracks={() => {
            setApproachOpen(false);
            setAltitudeOpen(false);
          }}
        >
          <SkyTeamBoard
            view={gs}
            selectedDieId={selectedDieId}
            onSlotClick={onSlotClick}
            onOpenApproach={() => {
              setAltitudeOpen(false);
              setApproachOpen(true);
            }}
            onOpenAltitude={() => {
              setApproachOpen(false);
              setAltitudeOpen(true);
            }}
          />
        </SkyTeamHUD>
      </div>

      {gs.phase === 'dice_placement' && gs.rerollTokens > 0 && !gs.rerollPending && (
        <div className="st-reroll-bar">
          <Button type="button" variant="secondary" onClick={() => send({ type: 'use-reroll' })}>
            ใช้ Reroll token
          </Button>
        </div>
      )}

      {gs.rerollPending && (
        <SkyTeamRerollDialog
          view={gs}
          onConfirm={(dieIds) => send({ type: 'confirm-reroll', dieIds })}
        />
      )}

      {gs.isMyTurn && (
        <p className="st-turn-hint">เทิร์นคุณ — เลือกลูกเต๋าแล้วคลิกช่องบนแผงควบคุม</p>
      )}

      {!gs.isMyTurn && gs.phase === 'dice_placement' && !gs.rerollPending && (
        <p className="st-turn-hint">รออีกฝ่ายวางลูกเต๋า…</p>
      )}

      <details className="st-log card">
        <summary>Event log</summary>
        <ul>
          {[...gs.eventLog].reverse().map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ul>
      </details>

      {finished && <SkyTeamGameOver view={gs} onLeave={onLeave} onRestart={onRestart} />}
    </GameShell>
  );
}
