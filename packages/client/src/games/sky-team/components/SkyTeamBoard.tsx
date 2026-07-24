import type { SkyTeamPlayerView, SkyTeamSlotId } from 'shared';
import { imageMap } from '../../../imageMap';
import {
  ALL_SWITCH_KEYS,
  aeroTrackPos,
  brakeTrackPos,
  DEFAULT_BOARD_LAYOUT,
  posStyle,
  type SkyTeamBoardLayout,
} from '../boardLayout';
import { ApproachCard } from './ApproachCard';
import { AltitudeCard } from './AltitudeCard';
import { SkyTeamDieFace } from './SkyTeamDice';
import { SkyTeamTrackMark } from './SkyTeamMarks';

type Props = {
  view: SkyTeamPlayerView;
  selectedDieId: string | null;
  onSlotClick: (slotId: SkyTeamSlotId) => void;
  layout?: SkyTeamBoardLayout;
  onOpenApproach?: () => void;
  onOpenAltitude?: () => void;
  /** Show slot id labels (demo). */
  showSlotLabels?: boolean;
  /** Always show dashed slot outlines (demo). */
  forceShowSlots?: boolean;
  /** Always show token anchor outlines even when empty (demo). */
  forceShowTokens?: boolean;
};

export function SkyTeamBoard({
  view,
  selectedDieId,
  onSlotClick,
  layout = DEFAULT_BOARD_LAYOUT,
  onOpenApproach,
  onOpenAltitude,
  showSlotLabels = false,
  forceShowSlots = false,
  forceShowTokens = false,
}: Props) {
  const axisDeg =
    layout.axis.baseRotation + view.axisPosition * layout.axis.stepDegrees;
  const bluePos = aeroTrackPos(layout.aeroTrack, view.blueAerodynamic);
  const orangePos = aeroTrackPos(layout.aeroTrack, view.orangeAerodynamic);
  const brakePos = brakeTrackPos(layout.brakeTrack, view.brakeLevel);
  const coffeeCount = Math.max(0, Math.min(3, view.coffeeTokens));
  const currentApproach = view.approach[view.approachPosition];

  return (
    <div className="st-board">
      {/* Cards sit under the board art; printed wells act as the frame. */}
      {currentApproach && (
        <button
          type="button"
          className="st-board__bay st-board__bay--approach"
          style={{
            left: `${layout.approachBay.left}%`,
            top: `${layout.approachBay.top}%`,
            width: `${layout.approachBay.width}%`,
          }}
          onClick={onOpenApproach}
          title="Approach — คลิกดู track เต็ม"
        >
          <ApproachCard
            base={currentApproach.base}
            planes={currentApproach.planes}
            bay
          />
        </button>
      )}
      <button
        type="button"
        className="st-board__bay st-board__bay--altitude"
        style={{
          left: `${layout.altitudeBay.left}%`,
          top: `${layout.altitudeBay.top}%`,
          width: `${layout.altitudeBay.width}%`,
        }}
        onClick={onOpenAltitude}
        title="Altitude — คลิกดู track เต็ม"
      >
        <AltitudeCard
          feet={view.altitudeFeet}
          isAirplane={view.isAirplaneAltitude}
          bay
        />
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

      {/* Brake mark on brake arc */}
      <SkyTeamTrackMark
        tone="red"
        className="st-board__brake-mark"
        title={`Brake ${view.brakeLevel}`}
        style={{
          ...posStyle(brakePos),
          width: `${layout.markSize}%`,
        }}
      />

      {/* Coffee ±1 parking */}
      {layout.tokens.coffee.map((pos, i) => {
        const filled = coffeeCount > i;
        if (!filled && !forceShowTokens) return null;
        return (
          <div
            key={`coffee-${i}`}
            className={[
              'st-board-token',
              'st-board-token--coffee',
              filled ? 'st-board-token--filled' : 'st-board-token--ghost',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              ...posStyle(pos),
              width: `${layout.tokenSize}%`,
            }}
            title={`Coffee ${i + 1}`}
          >
            {filled && (
              <img src={imageMap.skyTeam.coffeeToken} alt="" draggable={false} />
            )}
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
                <span className="st-board-token__badge" aria-label={`${view.rerollTokens} reroll tokens`}>
                  ×{view.rerollTokens}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Gear / flaps / brake switches — always visible; slide right→left when ON */}
      {ALL_SWITCH_KEYS.map((key) => {
        const on = view.switches[key];
        const well = layout.tokens.switches[key];
        const pos = on ? well.on : well.off;
        return (
          <div
            key={`switch-${key}`}
            className={[
              'st-board-switch',
              on ? 'st-board-switch--on' : 'st-board-switch--off',
            ]
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
        const pos = layout.slots[slot.id];
        const canClick = Boolean(selectedDieId && !slot.occupied);
        return (
          <button
            key={slot.id}
            type="button"
            className={[
              'st-slot',
              slot.canPlace ? 'st-slot--legal' : '',
              slot.occupied ? 'st-slot--filled' : '',
              canClick ? 'st-slot--active' : '',
              forceShowSlots ? 'st-slot--demo' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              width: `${layout.slotSize}%`,
            }}
            disabled={!canClick && !forceShowSlots}
            onClick={() => onSlotClick(slot.id)}
            title={slot.id}
          >
            {slot.occupied && (
              <SkyTeamDieFace
                value={slot.occupied.value}
                color={slot.occupied.color}
                size="sm"
              />
            )}
            {showSlotLabels && !slot.occupied && (
              <span className="st-slot__label">{slot.id.replace(/_/g, '\n')}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
