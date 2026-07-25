import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  ALTITUDE_TRACK,
  SKY_TEAM_SLOT_DEFS,
  type SkyTeamApproachSpaceState,
  type SkyTeamPlayerView,
  type SkyTeamSlotId,
} from 'shared';
import { skyTeamHasModule } from 'shared';
import { TriangleAlert } from 'lucide-react';
import { imageMap } from '../../../imageMap';
import { approachCardOverlays } from '../approachMarks';
import {
  ALL_SWITCH_KEYS,
  aeroTrackPos,
  brakeTrackPos,
  DEFAULT_BOARD_LAYOUT,
  posStyle,
  type SkyTeamBoardLayout,
  type SkyTeamSwitchKey,
} from '../boardLayout';
import type { SkyTeamIceBrakesLayout } from '../iceBrakesLayout';
import {
  APPROACH_BAY_PRE_PUSH_DELAY_MS,
  APPROACH_BAY_PUSH_SECONDS,
  APPROACH_BAY_SCROLL_SETTLE_FALLBACK_MS,
  scrollElementTowardViewportCenter,
  waitForScrollSettle,
  type ApproachBayPush,
} from '../useApproachBayAnimation';
import {
  showSkyTeamBoardCueToast,
  type SkyTeamAltitudeDescend,
  type SkyTeamBoardSpotlight,
} from '../useSkyTeamBoardCues';
import { clientCanPlaceSlot, clientExplainCannotPlace } from '../clientCanPlace';
import { ALTITUDE_REROLL_GRANT_MS, AltitudeCard } from './AltitudeCard';
import { ApproachCard, type ApproachTrafficSpin } from './ApproachCard';
import { SkyTeamDieFace } from './SkyTeamDice';
import { SkyTeamIceBrakesBoard } from './SkyTeamIceBrakesBoard';
import { SkyTeamTrackMark } from './SkyTeamMarks';
import toast from 'react-hot-toast';

const BRAKE_SWITCH_KEYS: SkyTeamSwitchKey[] = ['brake2', 'brake4', 'brake6'];

const PUSH_EASE = [0.22, 1, 0.36, 1] as const;
const COFFEE_EASE = [0.22, 1, 0.36, 1] as const;
const REROLL_POP_MS = ALTITUDE_REROLL_GRANT_MS + 120;
/** Spotlight while altitude bay scroll + push play. */
const ALTITUDE_BAY_CUE_MS = 2200;

type ApproachBayAnimProps = {
  displayIndex: number;
  push: ApproachBayPush | null;
  spaceAt: (index: number) => SkyTeamApproachSpaceState | undefined;
  onPushComplete: () => void;
  /** Anchor for scroll-into-view before the bay push. */
  bayAnchorRef?: RefObject<HTMLButtonElement | null>;
};

type AltitudeBayPush = {
  fromIndex: number;
  toIndex: number;
  grantsReroll: boolean;
  nonce: number;
};

type Props = {
  view: SkyTeamPlayerView;
  selectedDieId: string | null;
  /** Coffee adjustment applied to the selected die face. */
  coffeeDelta?: number;
  onSlotClick: (slotId: SkyTeamSlotId) => void;
  layout?: SkyTeamBoardLayout;
  /** Ice Brakes overlay layout (lab / default). */
  iceBrakesLayout?: SkyTeamIceBrakesLayout;
  onOpenApproach?: () => void;
  onOpenAltitude?: () => void;
  /** Driven by `useApproachBayAnimation` in the game shell (delays lose modal). */
  approachBayAnim?: ApproachBayAnimProps;
  /** Released new-round descend — Board runs toast → scroll → delay → push. */
  altitudeDescend?: SkyTeamAltitudeDescend | null;
  /** While Game waits on prior anims, keep showing this altitude index. */
  holdAltitudeFromIndex?: number | null;
  /** Fired after push (+ optional reroll pop) finishes. */
  onAltitudeDescendComplete?: () => void;
  /** Short spotlight after board changes (Approach / Axis / Altitude). */
  spotlight?: SkyTeamBoardSpotlight | null;
  /** Traffic Die spin / reveal on the Approach bay die well. */
  trafficSpin?: ApproachTrafficSpin | null;
  /**
   * While Traffic Die choreography runs, hold pre-roll plane counts on the bay
   * (server already applied all adds).
   */
  holdApproachPlanes?: number[] | null;
  /** Show slot id labels (demo). */
  showSlotLabels?: boolean;
  /** Always show dashed slot outlines (demo). */
  forceShowSlots?: boolean;
  /** Always show token anchor outlines even when empty (demo). */
  forceShowTokens?: boolean;
};

function BayApproachCard({
  space,
  trafficSpin = null,
  heldPlanes,
}: {
  space: SkyTeamApproachSpaceState;
  trafficSpin?: ApproachTrafficSpin | null;
  heldPlanes?: number | null;
}) {
  const overlays = approachCardOverlays(space);
  return (
    <ApproachCard
      base={space.base}
      // Faint left-rail setup icons — fixed from scenario; Radio only clears center tokens.
      printedPlanes={space.printedPlanes}
      planes={heldPlanes ?? space.planes}
      topMarks={overlays.topMarks}
      dieWell={overlays.dieWell}
      trafficSpin={trafficSpin}
      bay
    />
  );
}

function altitudeToastMessage(toIndex: number, grantsReroll: boolean): string {
  const feet = ALTITUDE_TRACK[toIndex]?.feet;
  const toastLabel = feet === 0 ? 'ลงจอด' : feet != null ? `${feet} ft` : 'Altitude';
  return grantsReroll ? `รอบใหม่ — ${toastLabel} · ได้ Reroll` : `รอบใหม่ — ${toastLabel}`;
}

export function SkyTeamBoard({
  view,
  selectedDieId,
  coffeeDelta = 0,
  onSlotClick,
  layout = DEFAULT_BOARD_LAYOUT,
  iceBrakesLayout,
  onOpenApproach,
  onOpenAltitude,
  approachBayAnim,
  altitudeDescend = null,
  holdAltitudeFromIndex = null,
  onAltitudeDescendComplete,
  spotlight = null,
  trafficSpin = null,
  holdApproachPlanes = null,
  showSlotLabels = false,
  forceShowSlots = false,
  forceShowTokens = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const axisDeg = layout.axis.baseRotation + view.axisPosition * layout.axis.stepDegrees;
  const bluePos = aeroTrackPos(layout.aeroTrack, view.blueAerodynamic);
  const orangePos = aeroTrackPos(layout.aeroTrack, view.orangeAerodynamic);
  const brakePos = brakeTrackPos(layout.brakeTrack, view.brakeLevel);
  const coffeeCount = Math.max(0, Math.min(3, view.coffeeTokens));

  const fallbackIndex = view.approachPosition;
  const displayIndex = approachBayAnim?.displayIndex ?? fallbackIndex;
  const push = approachBayAnim?.push ?? null;
  const spaceAt = approachBayAnim?.spaceAt ?? ((i: number) => view.approach[i]);
  const onPushComplete = approachBayAnim?.onPushComplete ?? (() => undefined);
  const bayAnchorRef = approachBayAnim?.bayAnchorRef;

  const displaySpace = spaceAt(displayIndex);
  const pushFrom = push ? spaceAt(push.fromIndex) : undefined;
  const pushTo = push ? spaceAt(push.toIndex) : undefined;
  const iceBrakesOn = skyTeamHasModule(view.enabledModules, 'ice-brakes');

  const altitudeBayRef = useRef<HTMLButtonElement | null>(null);
  const onAltitudeCompleteRef = useRef(onAltitudeDescendComplete);
  onAltitudeCompleteRef.current = onAltitudeDescendComplete;

  const [altPush, setAltPush] = useState<AltitudeBayPush | null>(null);
  /** Hold from-index while toast/scroll/delay run (before push). */
  const [stagingFromIndex, setStagingFromIndex] = useState<number | null>(null);
  const [altitudeBayCue, setAltitudeBayCue] = useState(false);
  const [playRerollGrant, setPlayRerollGrant] = useState(false);
  const pendingRerollGrantRef = useRef(false);

  useEffect(() => {
    if (!altitudeDescend) return;
    let cancelled = false;
    const { fromIndex, toIndex, grantsReroll, nonce } = altitudeDescend;
    const reduced = Boolean(reduceMotion);

    setPlayRerollGrant(false);
    pendingRerollGrantRef.current = grantsReroll;
    setStagingFromIndex(fromIndex);
    setAltPush(null);
    setAltitudeBayCue(!reduced);
    showSkyTeamBoardCueToast(altitudeToastMessage(toIndex, grantsReroll));

    const run = async () => {
      if (reduced) {
        setStagingFromIndex(null);
        setAltPush(null);
        if (grantsReroll) setPlayRerollGrant(true);
        else onAltitudeCompleteRef.current?.();
        return;
      }

      const bay = altitudeBayRef.current;
      if (bay) {
        const moved = scrollElementTowardViewportCenter(bay, 'smooth');
        if (moved.length > 0) {
          await waitForScrollSettle(moved, APPROACH_BAY_SCROLL_SETTLE_FALLBACK_MS);
        }
      }
      if (cancelled) return;

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, APPROACH_BAY_PRE_PUSH_DELAY_MS);
      });
      if (cancelled) return;

      setStagingFromIndex(null);
      setAltPush({ fromIndex, toIndex, grantsReroll, nonce });
    };

    void run();

    const cueTimer = window.setTimeout(() => {
      if (!cancelled) setAltitudeBayCue(false);
    }, ALTITUDE_BAY_CUE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(cueTimer);
    };
  }, [altitudeDescend, reduceMotion]);

  useEffect(() => {
    if (!playRerollGrant) return;
    const t = window.setTimeout(() => {
      setPlayRerollGrant(false);
      onAltitudeCompleteRef.current?.();
    }, REROLL_POP_MS);
    return () => window.clearTimeout(t);
  }, [playRerollGrant]);

  const onAltitudePushComplete = () => {
    setAltPush(null);
    if (pendingRerollGrantRef.current) {
      pendingRerollGrantRef.current = false;
      setPlayRerollGrant(true);
      return;
    }
    onAltitudeCompleteRef.current?.();
  };

  const holdIndex = stagingFromIndex ?? holdAltitudeFromIndex;
  const holdStep = holdIndex != null ? ALTITUDE_TRACK[holdIndex] : undefined;
  const settledFeet = holdStep?.feet ?? view.altitudeFeet;
  const settledAirplane = holdStep?.isAirplane ?? view.isAirplaneAltitude;

  const altFrom = altPush ? ALTITUDE_TRACK[altPush.fromIndex] : undefined;
  const altTo = altPush ? ALTITUDE_TRACK[altPush.toIndex] : undefined;

  const pushTransition = {
    duration: reduceMotion ? 0 : APPROACH_BAY_PUSH_SECONDS,
    ease: PUSH_EASE,
  };

  const altitudeSpotlight = altitudeBayCue || spotlight === 'altitudeBay';

  return (
    <div className="st-board">
      {/* Cards sit under the board art; printed wells act as the frame. */}
      {displaySpace && (
        <button
          ref={bayAnchorRef}
          type="button"
          className={[
            'st-board__bay',
            'st-board__bay--approach',
            spotlight === 'approachBay' && 'st-board-cue',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            left: `${layout.approachBay.left}%`,
            top: `${layout.approachBay.top}%`,
            width: `${layout.approachBay.width}%`,
          }}
          onClick={onOpenApproach}
          title="Approach — คลิกดู track เต็ม"
        >
          <div className="st-board__bay-clip">
            {push && pushFrom && pushTo ? (
              <div
                key={`${push.fromIndex}-${push.toIndex}`}
                className="st-board__bay-push"
                aria-hidden
              >
                <motion.div
                  className="st-board__bay-push-card"
                  initial={{ y: '0%' }}
                  animate={{ y: '105%' }}
                  transition={pushTransition}
                  onAnimationComplete={onPushComplete}
                >
                  <BayApproachCard
                    space={pushFrom}
                    heldPlanes={holdApproachPlanes?.[push.fromIndex] ?? null}
                  />
                </motion.div>
                <motion.div
                  className="st-board__bay-push-card"
                  initial={{ y: '-105%' }}
                  animate={{ y: '0%' }}
                  transition={pushTransition}
                >
                  <BayApproachCard
                    space={pushTo}
                    trafficSpin={trafficSpin}
                    heldPlanes={holdApproachPlanes?.[push.toIndex] ?? null}
                  />
                </motion.div>
              </div>
            ) : (
              <BayApproachCard
                space={displaySpace}
                trafficSpin={trafficSpin}
                heldPlanes={holdApproachPlanes?.[displayIndex] ?? null}
              />
            )}
          </div>
        </button>
      )}
      <button
        ref={altitudeBayRef}
        type="button"
        className={[
          'st-board__bay',
          'st-board__bay--altitude',
          altitudeSpotlight && 'st-board-cue',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          left: `${layout.altitudeBay.left}%`,
          top: `${layout.altitudeBay.top}%`,
          width: `${layout.altitudeBay.width}%`,
        }}
        onClick={onOpenAltitude}
        title="Altitude — คลิกดู track เต็ม"
      >
        <div className="st-board__bay-clip">
          {altPush && altFrom && altTo ? (
            <div key={`alt-${altPush.nonce}`} className="st-board__bay-push" aria-hidden>
              <motion.div
                className="st-board__bay-push-card"
                initial={{ y: '0%' }}
                animate={{ y: '105%' }}
                transition={pushTransition}
                onAnimationComplete={onAltitudePushComplete}
              >
                <AltitudeCard feet={altFrom.feet} isAirplane={altFrom.isAirplane} bay />
              </motion.div>
              <motion.div
                className="st-board__bay-push-card"
                initial={{ y: '-105%' }}
                animate={{ y: '0%' }}
                transition={pushTransition}
              >
                <AltitudeCard feet={altTo.feet} isAirplane={altTo.isAirplane} bay />
              </motion.div>
            </div>
          ) : (
            <AltitudeCard
              feet={settledFeet}
              isAirplane={settledAirplane}
              bay
              playRerollGrant={playRerollGrant}
            />
          )}
        </div>
      </button>

      <img
        src={imageMap.skyTeam.mainBoard}
        alt="Sky Team control panel"
        className="st-board__art"
        draggable={false}
      />

      <div
        className="st-board__axis"
        style={{
          left: `${layout.axis.left}%`,
          top: `${layout.axis.top}%`,
          width: `${layout.axis.width}%`,
          transform: `translate(-50%, -50%) rotate(${axisDeg}deg)`,
        }}
      >
        <img src={imageMap.skyTeam.axis} alt="" draggable={false} />
      </div>

      {/* Aerodynamics marks on curved track */}
      <SkyTeamTrackMark
        tone="blue"
        className="st-board__aero-mark"
        title={`Blue aero ${view.blueAerodynamic}`}
        style={{
          ...posStyle(bluePos),
          width: `${layout.markSize}%`,
        }}
      />
      <SkyTeamTrackMark
        tone="orange"
        className="st-board__aero-mark"
        title={`Orange aero ${view.orangeAerodynamic}`}
        style={{
          ...posStyle(orangePos),
          width: `${layout.markSize}%`,
        }}
      />

      {/* Brake mark on brake arc — hidden when Ice Brakes overlay replaces brakes */}
      {!iceBrakesOn && (
        <SkyTeamTrackMark
          tone="red"
          className="st-board__brake-mark"
          title={`Brake ${view.brakeLevel}`}
          style={{
            ...posStyle(brakePos),
            width: `${layout.markSize}%`,
          }}
        />
      )}

      {/* Coffee ±1 parking — fade in when Concentration awards a cup */}
      {layout.tokens.coffee.map((pos, i) => {
        const filled = coffeeCount > i;
        return (
          <div
            key={`coffee-${i}`}
            className={[
              'st-board-token',
              'st-board-token--coffee',
              filled && 'st-board-token--filled',
              forceShowTokens && !filled && 'st-board-token--ghost',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              ...posStyle(pos),
              width: `${layout.tokenSize}%`,
            }}
            title={filled || forceShowTokens ? `Coffee ${i + 1}` : undefined}
            aria-hidden={!filled && !forceShowTokens}
          >
            <AnimatePresence>
              {filled && (
                <motion.img
                  key="cup"
                  src={imageMap.skyTeam.coffeeToken}
                  alt=""
                  draggable={false}
                  className="st-board-token__cup"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.45, y: '18%' }}
                  animate={{ opacity: 1, scale: 1, y: '0%' }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: '10%' }}
                  transition={{ duration: reduceMotion ? 0 : 0.55, ease: COFFEE_EASE }}
                />
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Reroll parking — hidden at 0; badge when 2+ */}
      {(view.rerollTokens > 0 || forceShowTokens) && (
        <div
          className={[
            'st-board-token',
            'st-board-token--reroll',
            view.rerollTokens > 0 ? 'st-board-token--filled' : 'st-board-token--ghost',
            playRerollGrant && 'st-board-token--reroll-pop',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            ...posStyle(layout.tokens.reroll),
            width: `${layout.rerollTokenSize}%`,
          }}
          title={view.rerollTokens > 0 ? `Reroll × ${view.rerollTokens}` : 'Reroll'}
        >
          {view.rerollTokens > 0 && (
            <>
              <img src={imageMap.skyTeam.rerollToken} alt="" draggable={false} />
              {view.rerollTokens > 1 && (
                <span
                  className="st-board-token__badge"
                  aria-label={`${view.rerollTokens} reroll tokens`}
                >
                  ×{view.rerollTokens}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Gear / flaps / brake switches — always visible; slide right→left when ON */}
      {ALL_SWITCH_KEYS.map((key) => {
        if (iceBrakesOn && BRAKE_SWITCH_KEYS.includes(key)) return null;
        const on = view.switches[key];
        const well = layout.tokens.switches[key];
        const pos = on ? well.on : well.off;
        return (
          <div
            key={`switch-${key}`}
            className={['st-board-switch', on ? 'st-board-switch--on' : 'st-board-switch--off']
              .filter(Boolean)
              .join(' ')}
            style={{
              ...posStyle(pos),
              width: `${layout.switchSize}%`,
            }}
            title={`${key}: ${on ? 'ON' : 'OFF'}`}
          >
            <img src={imageMap.skyTeam.switchMarker} alt="" draggable={false} />
          </div>
        );
      })}

      {view.slots.map((slot) => {
        // Kerosene die lives on the dedicated track strip, not the main board.
        if (slot.id === 'kerosene') return null;
        if (slot.id === 'intern_pilot' || slot.id === 'intern_copilot') return null;
        if (slot.id === 'skill_wt_pilot' || slot.id === 'skill_wt_copilot') return null;
        if (slot.id.startsWith('ice_brake_')) return null;
        const pos = layout.slots[slot.id];
        if (!pos) return null;

        const selectedDie = selectedDieId
          ? view.myDice.find((d) => d.id === selectedDieId)
          : undefined;
        const effectiveValue =
          selectedDie != null ? selectedDie.value + coffeeDelta : null;
        const canPlace =
          forceShowSlots ||
          clientCanPlaceSlot(view, slot.id, effectiveValue);
        const canClick = Boolean(selectedDieId && !slot.occupied);
        const blockedReason =
          selectedDieId && !slot.occupied && !canPlace && effectiveValue != null
            ? clientExplainCannotPlace(view, slot.id, effectiveValue)
            : null;

        const showMandatoryAlert =
          !forceShowSlots &&
          view.phase === 'dice_placement' &&
          !slot.occupied &&
          Boolean(SKY_TEAM_SLOT_DEFS[slot.id]?.mandatory);

        return (
          <button
            key={slot.id}
            type="button"
            className={[
              'st-slot',
              canPlace ? 'st-slot--legal' : '',
              slot.occupied ? 'st-slot--filled' : '',
              canClick && canPlace ? 'st-slot--active' : '',
              forceShowSlots ? 'st-slot--demo' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              width: `${layout.slotSize}%`,
            }}
            disabled={(!canClick && !forceShowSlots) || Boolean(slot.occupied)}
            onClick={() => {
              if (slot.occupied && !forceShowSlots) return;
              if (!canPlace && !forceShowSlots) {
                if (blockedReason) toast.error(blockedReason);
                return;
              }
              onSlotClick(slot.id);
            }}
            title={
              canPlace
                ? slot.id
                : blockedReason
                  ? `${slot.id} — ${blockedReason}`
                  : slot.id
            }
          >
            {slot.occupied && (
              <SkyTeamDieFace value={slot.occupied.value} color={slot.occupied.color} size="sm" />
            )}
            {showSlotLabels && !slot.occupied && (
              <span className="st-slot__label">{slot.id.replace(/_/g, '\n')}</span>
            )}
            {showMandatoryAlert && (
              <span className="st-slot__mandatory-alert" aria-hidden>
                <TriangleAlert />
              </span>
            )}
          </button>
        );
      })}

      {iceBrakesOn && view.moduleState.iceBrakes && (
        <SkyTeamIceBrakesBoard
          markerPosition={view.moduleState.iceBrakes.markerPosition}
          occupiedBySlot={Object.fromEntries(
            view.slots.filter((s) => s.id.startsWith('ice_brake_')).map((s) => [s.id, s.occupied]),
          )}
          canPlaceBySlot={Object.fromEntries(
            view.slots.filter((s) => s.id.startsWith('ice_brake_')).map((s) => [s.id, s.canPlace]),
          )}
          selectedDieId={selectedDieId}
          onSlotClick={onSlotClick}
          layout={iceBrakesLayout}
          forceShowSlots={forceShowSlots}
        />
      )}
    </div>
  );
}
