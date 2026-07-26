import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SkyTeamAction, SkyTeamPlayerView, SkyTeamSlotId } from 'shared';
import { skyTeamHasModule } from 'shared';
import { GamePlayHeader, GameShell } from '../../components/game-shell';
import { useDeadlineCountdown } from '../../hooks/useDeadlineCountdown';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { SkyTeamAbilityPickModal } from './components/SkyTeamAbilityPickModal';
import { SkyTeamBoard } from './components/SkyTeamBoard';
import { SkyTeamGameOver, SkyTeamRerollDialog } from './components/SkyTeamDialogs';
import { SkyTeamHUD } from './components/SkyTeamHUD';
import { SkyTeamInternBoard } from './components/SkyTeamInternBoard';
import { SkyTeamKeroseneTrack } from './components/SkyTeamKeroseneTrack';
import { SkyTeamWindRing } from './components/SkyTeamWindRing';
import {
  DEFAULT_MODULES_ASSEMBLY_LAYOUT,
  useModulesAssemblyStripWidths,
} from './modulesAssemblyLayout';
import { useApproachBayAnimation, useSkyTeamGameOverHold } from './useApproachBayAnimation';
import {
  type SkyTeamAltitudeDescend,
  type SkyTeamTrafficReveal,
  useSkyTeamBoardCues,
} from './useSkyTeamBoardCues';
import { TRAFFIC_DIE_SPIN_MS } from './components/ApproachCard';
import './sky-team.css';

/** After Radio / Approach finish, pause before new-round altitude. */
const POST_PRIOR_ANIM_DELAY_MS = 500;

type TrafficAnim = SkyTeamTrafficReveal & { stage: 'spin' | 'drawer' };

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
  const [radioFocus, setRadioFocus] = useState<{ index: number; nonce: number } | null>(null);
  const [queuedTraffic, setQueuedTraffic] = useState<SkyTeamTrafficReveal | null>(null);
  const [trafficAnim, setTrafficAnim] = useState<TrafficAnim | null>(null);
  const [pendingAltitude, setPendingAltitude] = useState<SkyTeamAltitudeDescend | null>(null);
  const [releasedAltitude, setReleasedAltitude] = useState<SkyTeamAltitudeDescend | null>(null);
  const [rerollOpen, setRerollOpen] = useState(false);
  const needsPostDelayRef = useRef(false);
  const seenAltitudeNonceRef = useRef(0);
  const approachBayAnim = useApproachBayAnimation(gs);
  const boardCues = useSkyTeamBoardCues(gs, approachBayAnim.isAnimating);
  const holdGameOverModal = useSkyTeamGameOverHold(gs, approachBayAnim.isAnimating);
  const coffeeMods = useMemo(() => coffeeModsFromDelta(coffeeDelta), [coffeeDelta]);
  const realtimeDeadline =
    gs.phase === 'dice_placement' ? (gs.moduleState.realtime?.deadlineAt ?? null) : null;
  const realtimeCountdown = useDeadlineCountdown(realtimeDeadline);

  useEffect(() => {
    const reveal = boardCues.radioReveal;
    if (!reveal) return;
    setAltitudeOpen(false);
    setApproachOpen(true);
    setRadioFocus(reveal);
  }, [boardCues.radioReveal?.nonce]);

  // Traffic Die: wait for altitude / Radio / Approach push, then bay spin → drawer.
  useEffect(() => {
    const reveal = boardCues.trafficReveal;
    if (!reveal) return;
    setQueuedTraffic(reveal);
  }, [boardCues.trafficReveal?.nonce]);

  useEffect(() => {
    if (!queuedTraffic) return;
    if (
      radioFocus != null ||
      approachBayAnim.isAnimating ||
      pendingAltitude != null ||
      releasedAltitude != null
    ) {
      return;
    }
    setAltitudeOpen(false);
    setApproachOpen(false);
    setTrafficAnim({ ...queuedTraffic, stage: 'spin' });
    setQueuedTraffic(null);
  }, [queuedTraffic, radioFocus, approachBayAnim.isAnimating, pendingAltitude, releasedAltitude]);

  useEffect(() => {
    if (!trafficAnim || trafficAnim.stage !== 'spin') return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      () => {
        setTrafficAnim((prev) => (prev ? { ...prev, stage: 'drawer' } : null));
        setApproachOpen(true);
      },
      reduced ? 0 : TRAFFIC_DIE_SPIN_MS,
    );
    return () => window.clearTimeout(timer);
  }, [trafficAnim?.nonce, trafficAnim?.stage]);

  useEffect(() => {
    if (gs.rerollPending) setRerollOpen(true);
  }, [gs.rerollPending]);

  const closeRerollDialog = useCallback(() => setRerollOpen(false), []);

  const onRadioRevealComplete = useCallback(() => {
    setApproachOpen(false);
    setRadioFocus(null);
  }, []);

  const onTrafficRevealComplete = useCallback(() => {
    setApproachOpen(false);
    setTrafficAnim(null);
  }, []);

  // Stash new-round altitude until Radio / Approach animations finish.
  // Traffic Die waits on altitude (not the reverse) — rolls happen after descend.
  useEffect(() => {
    const next = boardCues.altitudeDescend;
    if (!next || seenAltitudeNonceRef.current === next.nonce) return;
    seenAltitudeNonceRef.current = next.nonce;
    needsPostDelayRef.current = radioFocus != null || approachBayAnim.isAnimating;
    setPendingAltitude(next);
  }, [boardCues.altitudeDescend?.nonce, radioFocus, approachBayAnim.isAnimating]);

  useEffect(() => {
    if (!pendingAltitude) return;
    if (radioFocus != null || approachBayAnim.isAnimating) {
      needsPostDelayRef.current = true;
      return;
    }
    let cancelled = false;
    const delay = needsPostDelayRef.current ? POST_PRIOR_ANIM_DELAY_MS : 0;
    needsPostDelayRef.current = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setReleasedAltitude(pendingAltitude);
      setPendingAltitude(null);
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pendingAltitude, radioFocus, approachBayAnim.isAnimating]);

  const onAltitudeDescendComplete = useCallback(() => {
    setReleasedAltitude(null);
  }, []);

  const altitudeBusy = pendingAltitude != null || releasedAltitude != null;
  const trafficBusy = queuedTraffic != null || trafficAnim != null;
  const holdTrafficPlanes = trafficAnim?.planesBefore ?? queuedTraffic?.planesBefore ?? null;

  useYourTurnToast(gs.isMyTurn && !finished);

  const pendingIntern = gs.moduleState.intern?.pendingToken;
  const mustPlaceIntern = Boolean(pendingIntern && pendingIntern.ownerId === myId);
  const syncPending = gs.specialAbilityState.synchronisation?.pendingValue;
  const mustPlaceSync = syncPending != null && myId === gs.copilotId && gs.isMyTurn;
  const wtPending = gs.specialAbilityState['working-together']?.workingTogether;

  const subtitle = useMemo(() => {
    if (gs.phase === 'ability_pick') {
      return `เลือก Special Ability · ${gs.specialAbilitySlots} ใบ`;
    }
    if (gs.phase === 'strategy') {
      return `Strategy · รอบ ${gs.round}`;
    }
    if (gs.silentPhase) {
      const rt = realtimeCountdown.label ? ` · ⏱ ${realtimeCountdown.label}` : '';
      return `SILENT PHASE · รอบ ${gs.round}${rt}`;
    }
    if (gs.phase === 'end_round') return `End of round · ${gs.round}`;
    return `รอบ ${gs.round}`;
  }, [gs.phase, gs.round, gs.silentPhase, gs.specialAbilitySlots, realtimeCountdown.label]);

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
  const { boardStackRef, keroseneWidthPx, windWidthPx } = useModulesAssemblyStripWidths(assembly);

  return (
    <GameShell className="st-shell st-shell--dock">
      <GamePlayHeader
        title="Sky Team"
        subtitle={subtitle}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      {gs.phase === 'ability_pick' && gs.specialAbilitySlots > 0 && (
        <SkyTeamAbilityPickModal
          open
          slots={gs.specialAbilitySlots}
          scenarioLabel={gs.scenarioName}
          myId={myId}
          players={gs.players.map((p) => ({ id: p.id, name: p.name }))}
          picksByPlayerId={gs.abilityPicksByPlayerId}
          onAbilityPicks={(abilityIds) => send({ type: 'set-ability-picks', abilityIds })}
          onConfirm={() => send({ type: 'confirm-ability-picks' })}
        />
      )}

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

      <div className="st-layout pb-40! md:pb-12!">
        <SkyTeamHUD
          view={gs}
          myId={myId}
          selectedDieId={selectedDieId}
          onSelectDie={(id) => {
            if (mustPlaceIntern || mustPlaceSync) return;
            setSelectedDieId(id);
            setCoffeeDelta(0);
          }}
          coffeeDelta={mustPlaceIntern ? 0 : coffeeDelta}
          onCoffeeDelta={mustPlaceIntern ? () => undefined : setCoffeeDelta}
          canUseReroll={
            gs.phase === 'dice_placement' &&
            gs.rerollTokens > 0 &&
            !gs.rerollPending &&
            !mustPlaceIntern &&
            !mustPlaceSync &&
            !wtPending
          }
          onUseReroll={() => send({ type: 'use-reroll' })}
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
            setRadioFocus(null);
            setQueuedTraffic(null);
            setTrafficAnim(null);
          }}
          onFinishStrategy={() => send({ type: 'finish-strategy' })}
          abilitySelectedDieId={mustPlaceIntern || mustPlaceSync ? null : selectedDieId}
          onAbilitySlotClick={onSlotClick}
          onAnticipationReroll={(dieId) => send({ type: 'anticipation-reroll', dieId })}
          onAdaptationFlip={(dieId) => {
            send({ type: 'adaptation-flip', dieId });
            setSelectedDieId(null);
          }}
          onOpenAbilitiesModal={() =>
            send({ type: 'set-abilities-modal', open: true, focusedAbilityId: null })
          }
          onCloseAbilitiesModal={() => send({ type: 'set-abilities-modal', open: false })}
          onFocusAbility={(id) =>
            send({ type: 'set-abilities-modal', open: true, focusedAbilityId: id })
          }
          spotlight={boardCues.spotlight}
          boardBusy={boardCues.boardBusy || radioFocus != null || trafficBusy || altitudeBusy}
          radioFocusIndex={radioFocus?.index ?? null}
          radioRevealNonce={radioFocus?.nonce ?? 0}
          onRadioRevealComplete={onRadioRevealComplete}
          trafficTargets={trafficAnim?.targets ?? []}
          trafficPlanesBefore={trafficAnim?.planesBefore ?? null}
          trafficRevealNonce={trafficAnim?.stage === 'drawer' ? trafficAnim.nonce : 0}
          onTrafficRevealComplete={onTrafficRevealComplete}
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
                  width: keroseneWidthPx,
                  marginTop: assembly.keroseneOffsetYPx,
                  flexShrink: 0,
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
                  width: keroseneWidthPx,
                  marginTop: assembly.keroseneOffsetYPx,
                  flexShrink: 0,
                }}
              />
            )}
            <div
              ref={boardStackRef}
              className="st-board-stack"
              style={{
                gap: `${assembly.internGapRem}rem`,
                maxWidth: assembly.boardMaxWidthPx,
                minWidth: assembly.boardMinWidthPx,
                flex: `1 1 ${assembly.boardMaxWidthPx}px`,
              }}
            >
              <div className="st-board-stack__main">
                <SkyTeamBoard
                  view={gs}
                  selectedDieId={mustPlaceIntern ? null : selectedDieId}
                  coffeeDelta={mustPlaceIntern ? 0 : coffeeDelta}
                  onSlotClick={onSlotClick}
                  approachBayAnim={approachBayAnim}
                  altitudeDescend={releasedAltitude}
                  holdAltitudeFromIndex={pendingAltitude?.fromIndex ?? null}
                  onAltitudeDescendComplete={onAltitudeDescendComplete}
                  spotlight={boardCues.spotlight}
                  trafficSpin={
                    trafficAnim
                      ? {
                          faces: trafficAnim.rolls,
                          spinning: trafficAnim.stage === 'spin',
                        }
                      : null
                  }
                  holdApproachPlanes={holdTrafficPlanes}
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
                  width: windWidthPx,
                  marginTop: assembly.windOffsetYPx,
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        </SkyTeamHUD>
      </div>

      {rerollOpen && (
        <SkyTeamRerollDialog
          view={gs}
          onConfirm={(dieIds) => send({ type: 'confirm-reroll', dieIds })}
          onCancel={() => send({ type: 'cancel-reroll' })}
          onClose={closeRerollDialog}
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

      {finished && !holdGameOverModal && (
        <SkyTeamGameOver view={gs} onLeave={onLeave} onRestart={onRestart} />
      )}
    </GameShell>
  );
}
