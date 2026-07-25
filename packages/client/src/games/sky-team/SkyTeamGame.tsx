import { useCallback, useMemo, useState } from 'react';
import type { SkyTeamAction, SkyTeamPlayerView, SkyTeamSlotId } from 'shared';
import { skyTeamHasModule } from 'shared';
import {
  GamePhasePanel,
  GamePlayHeader,
  GameShell,
  GameWaitingState,
} from '../../components/game-shell';
import { Button } from '../../components/ui';
import { useDeadlineCountdown } from '../../hooks/useDeadlineCountdown';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { SkyTeamAbilitiesBar } from './components/SkyTeamAbilitiesBar';
import { SkyTeamBoard } from './components/SkyTeamBoard';
import { SkyTeamGameOver, SkyTeamRerollDialog } from './components/SkyTeamDialogs';
import { SkyTeamHUD } from './components/SkyTeamHUD';
import { SkyTeamInternBoard } from './components/SkyTeamInternBoard';
import { SkyTeamKeroseneTrack } from './components/SkyTeamKeroseneTrack';
import { SkyTeamWindRing } from './components/SkyTeamWindRing';
import { DEFAULT_MODULES_ASSEMBLY_LAYOUT } from './modulesAssemblyLayout';
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

export function SkyTeamGame({ gameState: gs, myId, sendAction, onLeave, onRestart }: Props) {
  const send = useCallback((a: SkyTeamAction) => sendAction(a), [sendAction]);
  const finished = gs.phase === 'game_over';
  const [selectedDieId, setSelectedDieId] = useState<string | null>(null);
  const [coffeeDelta, setCoffeeDelta] = useState(0);
  const [approachOpen, setApproachOpen] = useState(false);
  const [altitudeOpen, setAltitudeOpen] = useState(false);
  const coffeeMods = useMemo(() => coffeeModsFromDelta(coffeeDelta), [coffeeDelta]);
  const realtimeDeadline =
    gs.phase === 'dice_placement' ? (gs.moduleState.realtime?.deadlineAt ?? null) : null;
  const realtimeCountdown = useDeadlineCountdown(realtimeDeadline);

  useYourTurnToast(gs.isMyTurn && !finished);

  const pendingIntern = gs.moduleState.intern?.pendingToken;
  const mustPlaceIntern = Boolean(pendingIntern && pendingIntern.ownerId === myId);
  const syncPending = gs.specialAbilityState.synchronisation?.pendingValue;
  const mustPlaceSync = syncPending != null && myId === gs.copilotId && gs.isMyTurn;
  const wtPending = gs.specialAbilityState['working-together']?.workingTogether;

  const subtitle = useMemo(() => {
    if (gs.phase === 'strategy') {
      return `Strategy · รอบ ${gs.round}`;
    }
    if (gs.silentPhase) {
      const rt = realtimeCountdown.label ? ` · ⏱ ${realtimeCountdown.label}` : '';
      return `SILENT PHASE · รอบ ${gs.round}${rt}`;
    }
    if (gs.phase === 'end_round') return `End of round · ${gs.round}`;
    return `รอบ ${gs.round}`;
  }, [gs.phase, gs.round, gs.silentPhase, realtimeCountdown.label]);

  const onSlotClick = (slotId: SkyTeamSlotId) => {
    if (!gs.isMyTurn) return;
    if (mustPlaceIntern) {
      send({ type: 'place-intern-token', slotId });
      return;
    }
    if (mustPlaceSync) {
      send({
        type: 'place-ability-die',
        slotId,
        coffeeMods: coffeeMods.length ? coffeeMods : undefined,
      });
      setCoffeeDelta(0);
      return;
    }
    if (!selectedDieId) return;
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
  const showKerosene =
    skyTeamHasModule(gs.enabledModules, 'kerosene') &&
    !skyTeamHasModule(gs.enabledModules, 'kerosene-leak') &&
    gs.moduleState.kerosene != null;
  const showLeak =
    skyTeamHasModule(gs.enabledModules, 'kerosene-leak') && gs.moduleState.keroseneLeak != null;
  const showIntern = skyTeamHasModule(gs.enabledModules, 'intern') && gs.moduleState.intern != null;
  const showWind = skyTeamHasModule(gs.enabledModules, 'wind') && gs.moduleState.wind != null;

  const keroseneSlot = gs.slots.find((s) => s.id === 'kerosene');
  const internPilotSlot = gs.slots.find((s) => s.id === 'intern_pilot');
  const internCopilotSlot = gs.slots.find((s) => s.id === 'intern_copilot');
  const assembly = DEFAULT_MODULES_ASSEMBLY_LAYOUT;

  return (
    <GameShell className="st-shell">
      <GamePlayHeader
        title="Sky Team"
        subtitle={subtitle}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      {gs.silentPhase && (
        <div className="st-silent-banner" role="status">
          SILENT PHASE — ห้ามคุยเรื่องลูกเต๋า (Honor Rule)
          {realtimeCountdown.label && (
            <span
              className={
                realtimeCountdown.remainMs <= 10_000
                  ? 'st-realtime-timer st-realtime-timer--urgent'
                  : 'st-realtime-timer'
              }
            >
              Real-Time {realtimeCountdown.label}
            </span>
          )}
        </div>
      )}

      {gs.phase === 'strategy' && (
        <GamePhasePanel title="Strategy Discussion" className="st-strategy">
          <p>
            คุยแผนได้ไม่จำกัดเวลา (advance 0/1/2, priority) — ห้ามคุยค่าลูกเต๋า เมื่อพร้อมทั้งคู่กด
            Finish
          </p>
          <div className="st-strategy__actions">
            <Button
              type="button"
              disabled={iAmReady}
              onClick={() => send({ type: 'finish-strategy' })}
            >
              {iAmReady ? 'รออีกฝ่าย…' : 'Finish Discussion'}
            </Button>
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
            if (mustPlaceIntern || mustPlaceSync) return;
            setSelectedDieId(id);
            setCoffeeDelta(0);
          }}
          coffeeDelta={mustPlaceIntern ? 0 : coffeeDelta}
          onCoffeeDelta={mustPlaceIntern ? () => undefined : setCoffeeDelta}
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
          <div className="st-board-row" style={{ gap: `${assembly.rowGapRem}rem` }}>
            {showKerosene && gs.moduleState.kerosene && (
              <SkyTeamKeroseneTrack
                remaining={gs.moduleState.kerosene.remaining}
                occupied={keroseneSlot?.occupied ?? null}
                canPlace={Boolean(keroseneSlot?.canPlace)}
                selectedDieId={selectedDieId}
                onSlotClick={() => onSlotClick('kerosene')}
                style={{
                  width: `${assembly.keroseneWidthRem}rem`,
                  marginTop: assembly.keroseneOffsetYPx,
                }}
              />
            )}
            {showLeak && gs.moduleState.keroseneLeak && (
              <SkyTeamKeroseneTrack
                mode="leak"
                remaining={gs.moduleState.keroseneLeak.remaining}
                occupied={null}
                canPlace={false}
                selectedDieId={null}
                onSlotClick={() => undefined}
                style={{
                  width: `${assembly.keroseneWidthRem}rem`,
                  marginTop: assembly.keroseneOffsetYPx,
                }}
              />
            )}
            <div
              className="st-board-stack"
              style={{
                gap: `${assembly.internGapRem}rem`,
                maxWidth: assembly.boardMaxWidthPx,
                flex: `1 1 ${assembly.boardMaxWidthPx}px`,
              }}
            >
              <div className="st-board-stack__main">
                <SkyTeamBoard
                  view={gs}
                  selectedDieId={mustPlaceIntern ? null : selectedDieId}
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
              </div>
              {showIntern && gs.moduleState.intern && (
                <SkyTeamInternBoard
                  wells={gs.moduleState.intern.wells}
                  pilotOccupied={internPilotSlot?.occupied ?? null}
                  copilotOccupied={internCopilotSlot?.occupied ?? null}
                  pilotCanPlace={Boolean(internPilotSlot?.canPlace)}
                  copilotCanPlace={Boolean(internCopilotSlot?.canPlace)}
                  selectedDieId={mustPlaceIntern ? null : selectedDieId}
                  onSlotClick={onSlotClick}
                  style={{ width: `${assembly.internWidthPercent}%` }}
                />
              )}
            </div>
            {showWind && gs.moduleState.wind && (
              <SkyTeamWindRing
                position={gs.moduleState.wind.position}
                modifier={gs.moduleState.wind.modifier}
                style={{
                  width: `${assembly.windWidthRem}rem`,
                  marginTop: assembly.windOffsetYPx,
                }}
              />
            )}
          </div>
        </SkyTeamHUD>
      </div>

      <SkyTeamAbilitiesBar
        view={gs}
        myId={myId}
        selectedDieId={mustPlaceIntern || mustPlaceSync ? null : selectedDieId}
        onSlotClick={onSlotClick}
        onAnticipationReroll={(dieId) => send({ type: 'anticipation-reroll', dieId })}
        onAdaptationFlip={(dieId) => {
          send({ type: 'adaptation-flip', dieId });
          setSelectedDieId(null);
        }}
      />

      {gs.phase === 'dice_placement' &&
        gs.rerollTokens > 0 &&
        !gs.rerollPending &&
        !mustPlaceIntern &&
        !mustPlaceSync &&
        !wtPending && (
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

      {mustPlaceIntern && gs.isMyTurn && (
        <p className="st-turn-hint">
          วาง Intern token ({pendingIntern?.value}) บนแผงควบคุม — ห้าม Concentration / Coffee
        </p>
      )}

      {gs.isMyTurn && !mustPlaceIntern && (
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
