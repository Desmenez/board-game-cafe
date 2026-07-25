import type { ReactNode } from 'react';
import { SKY_TEAM_TRAFFIC_DIE_AIRPLANE_SUPPLY, type SkyTeamPlayerView } from 'shared';
import { GamePhasePanel } from '../../../components/game-shell';
import { PlayerAvatar } from '../../../components/player-avatar';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { imageMap } from '../../../imageMap';
import type { SkyTeamBoardSpotlight } from '../useSkyTeamBoardCues';
import { SkyTeamDiceTray } from './SkyTeamDice';
import { SkyTeamModuleSummary } from './SkyTeamModuleSummary';
import { SkyTeamScenarioDrawerHeader } from './SkyTeamScenarioDrawerHeader';
import { SkyTeamTrackDrawer } from './SkyTeamTrackDrawer';
import { SkyTeamAltitudeTrackPanel, SkyTeamApproachTrackPanel } from './SkyTeamTracksPanel';

type Props = {
  view: SkyTeamPlayerView;
  myId: string;
  selectedDieId: string | null;
  onSelectDie: (id: string) => void;
  coffeeDelta: number;
  onCoffeeDelta: (d: number) => void;
  canUseReroll?: boolean;
  onUseReroll?: () => void;
  approachOpen: boolean;
  altitudeOpen: boolean;
  onOpenApproach: () => void;
  onOpenAltitude: () => void;
  onCloseTracks: () => void;
  onFinishStrategy?: () => void;
  /** Spotlight target from `useSkyTeamBoardCues` (Approach track btn). */
  spotlight?: SkyTeamBoardSpotlight | null;
  /** True while a board cue / approach push is playing. */
  boardBusy?: boolean;
  /** Approach space index to scroll/highlight after Radio. */
  radioFocusIndex?: number | null;
  /** Bumps on each Radio clear so scroll/anim re-run. */
  radioRevealNonce?: number;
  /** Close Approach drawer after Radio reveal choreography. */
  onRadioRevealComplete?: () => void;
  /** Traffic Die placement targets (nearest-first). */
  trafficTargets?: number[];
  /** Plane counts before Traffic Die placements. */
  trafficPlanesBefore?: number[] | null;
  /** Bumps when Traffic Die drawer sequence should run. */
  trafficRevealNonce?: number;
  /** Close Approach drawer after Traffic Die choreography. */
  onTrafficRevealComplete?: () => void;
  /** Center column — usually the control panel board. */
  children?: ReactNode;
};

function dockLabel(
  view: SkyTeamPlayerView,
  selectedDieId: string | null,
  iAmReady: boolean,
  boardBusy: boolean,
): string {
  if (boardBusy) return 'กำลังอัปเดตแผง…';
  if (view.phase === 'strategy') {
    return iAmReady ? 'รออีกฝ่ายกด Finish' : 'คุยแผนแล้วกด Finish';
  }
  if (view.phase === 'end_round') return 'จบรอบ…';
  if (view.isMyTurn) {
    return selectedDieId ? 'แตะช่องบนแผงเพื่อวาง' : 'เลือกลูกเต๋า';
  }
  if (view.phase === 'dice_placement') return 'รออีกฝ่าย…';
  return 'ลูกเต๋าของคุณ';
}

function DockSeat({
  role,
  playerId,
  name,
  isMe,
  isTurn,
}: {
  role: 'pilot' | 'copilot';
  playerId: string;
  name: string;
  isMe: boolean;
  isTurn: boolean;
}) {
  const roleLabel = role === 'pilot' ? 'Pilot' : 'Co-Pilot';
  const roleArt = role === 'pilot' ? imageMap.skyTeam.rolePilot : imageMap.skyTeam.roleCopilot;

  return (
    <div
      className={cn(
        'st-dock-seat',
        role === 'pilot' ? 'st-dock-seat--pilot' : 'st-dock-seat--copilot',
        isMe && 'st-dock-seat--me',
        isTurn && 'st-dock-seat--turn',
      )}
    >
      <div className="st-dock-seat__faces">
        <img src={roleArt} alt={roleLabel} className="st-dock-seat__role-art" draggable={false} />
        <PlayerAvatar playerId={playerId} name={name} size={36} className="st-dock-seat__avatar" />
      </div>
      <div className="st-dock-seat__meta">
        <span className="st-dock-seat__role">{roleLabel}</span>
        <span className="st-dock-seat__name">{name}</span>
        {isMe && <span className="st-dock-seat__you">คุณ</span>}
      </div>
    </div>
  );
}

export function SkyTeamHUD({
  view,
  myId,
  selectedDieId,
  onSelectDie,
  coffeeDelta,
  onCoffeeDelta,
  canUseReroll = false,
  onUseReroll,
  approachOpen,
  altitudeOpen,
  onOpenApproach,
  onOpenAltitude,
  onCloseTracks,
  onFinishStrategy,
  spotlight = null,
  boardBusy = false,
  radioFocusIndex = null,
  radioRevealNonce = 0,
  onRadioRevealComplete,
  trafficTargets = [],
  trafficPlanesBefore = null,
  trafficRevealNonce = 0,
  onTrafficRevealComplete,
  children,
}: Props) {
  const isPilot = view.myRole === 'pilot';
  const showDice =
    view.myDice.length > 0 || view.phase === 'dice_placement' || view.rerollPending != null;
  const showCoffeeMods = view.isMyTurn && selectedDieId != null && view.coffeeTokens > 0;
  const selectedDie = selectedDieId ? view.myDice.find((d) => d.id === selectedDieId) : undefined;
  const canCoffeeMinus =
    showCoffeeMods &&
    selectedDie != null &&
    coffeeDelta > -view.coffeeTokens &&
    selectedDie.value + coffeeDelta > 1;
  const canCoffeePlus =
    showCoffeeMods &&
    selectedDie != null &&
    coffeeDelta < view.coffeeTokens &&
    selectedDie.value + coffeeDelta < 6;
  const pilot = view.players.find((p) => p.role === 'pilot');
  const copilot = view.players.find((p) => p.role === 'copilot');
  const pilotName = pilot?.name ?? 'Pilot';
  const copilotName = copilot?.name ?? 'Co-Pilot';
  const pilotTurn = view.phase === 'dice_placement' && view.currentPlayerId === view.pilotId;
  const copilotTurn = view.phase === 'dice_placement' && view.currentPlayerId === view.copilotId;
  const iAmReady = Boolean(view.strategyReady[myId]);
  const inStrategy = view.phase === 'strategy';
  const planesOnTrack = view.approach.reduce((sum, s) => sum + s.planes, 0);
  /** Airplane tokens left in the 12-token supply (not currently on the approach track). */
  const airplanesLeft = Math.max(0, SKY_TEAM_TRAFFIC_DIE_AIRPLANE_SUPPLY - planesOnTrack);
  const coffeeRemaining = Math.max(0, view.coffeeTokens - Math.abs(coffeeDelta));

  return (
    <div className="st-hud">
      <div className="st-hud__center">
        {inStrategy && (
          <GamePhasePanel
            title="Strategy Discussion"
            description="คุยแผนได้ไม่จำกัดเวลา (advance 0/1/2, priority) — ห้ามคุยค่าลูกเต๋า"
            meta={`Pilot: ${view.strategyReady[view.pilotId] ? 'พร้อม' : 'ยัง'} · Co-Pilot: ${
              view.strategyReady[view.copilotId] ? 'พร้อม' : 'ยัง'
            }`}
            density="compact"
            className="st-strategy"
          />
        )}

        {children}

        <div className="st-hud__chrome">
          <SkyTeamModuleSummary view={view} />

          <div className="st-hud__track-btns">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={cn(spotlight === 'approachTrackBtn' && 'st-board-cue')}
              onClick={onOpenApproach}
            >
              Approach{planesOnTrack > 0 ? ` · ${planesOnTrack}` : ''}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onOpenAltitude}>
              Altitude
            </Button>
          </div>
        </div>
      </div>

      <footer className="st-dice-dock" aria-label="ผู้เล่น ลูกเต๋า และการกระทำ">
        <div className="st-dice-dock__inner">
          <DockSeat
            role="pilot"
            playerId={view.pilotId}
            name={pilotName}
            isMe={isPilot}
            isTurn={pilotTurn}
          />

          <div className="st-dice-dock__center">
            <p className="st-dice-dock__label">
              {dockLabel(view, selectedDieId, iAmReady, boardBusy)}
            </p>

            {inStrategy ? (
              <div className="st-dice-dock__phase-action">
                <Button type="button" disabled={iAmReady} onClick={onFinishStrategy}>
                  {iAmReady ? 'รออีกฝ่าย…' : 'Finish Discussion'}
                </Button>
              </div>
            ) : showDice ? (
              <div className="st-dice-dock__dice">
                {showCoffeeMods && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="st-coffee-mods__btn"
                    disabled={!canCoffeeMinus}
                    onClick={() => onCoffeeDelta(coffeeDelta - 1)}
                    aria-label="ลดค่าลูกเต๋า 1"
                  >
                    −
                  </Button>
                )}
                <SkyTeamDiceTray
                  dice={view.myDice}
                  selectedId={selectedDieId}
                  onSelect={onSelectDie}
                  disabled={!view.isMyTurn}
                  selectedValueDelta={showCoffeeMods ? coffeeDelta : 0}
                />
                {showCoffeeMods && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="st-coffee-mods__btn"
                    disabled={!canCoffeePlus}
                    onClick={() => onCoffeeDelta(coffeeDelta + 1)}
                    aria-label="เพิ่มค่าลูกเต๋า 1"
                  >
                    +
                  </Button>
                )}
              </div>
            ) : null}

            <div className="st-dice-dock__tokens" role="group" aria-label="โทเคนในเกม">
              <div
                className={cn(
                  'st-dice-dock__token',
                  airplanesLeft === 0 && 'st-dice-dock__token--ok',
                )}
                title={`Airplane token ที่เหลือใน supply (${SKY_TEAM_TRAFFIC_DIE_AIRPLANE_SUPPLY} − บน track ${planesOnTrack})`}
              >
                <img src={imageMap.skyTeam.planeToken} alt="" draggable={false} />
                <span>×{airplanesLeft}</span>
              </div>

              <div
                className={cn(
                  'st-dice-dock__token',
                  coffeeRemaining <= 0 && 'st-dice-dock__token--empty',
                )}
                title={`Coffee × ${coffeeRemaining}${
                  coffeeDelta !== 0 ? ` (ใช้ ${Math.abs(coffeeDelta)})` : ''
                }`}
              >
                <img src={imageMap.skyTeam.coffeeToken} alt="" draggable={false} />
                <span>×{coffeeRemaining}</span>
              </div>

              {canUseReroll && onUseReroll ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="st-dice-dock__reroll"
                  onClick={onUseReroll}
                >
                  <img src={imageMap.skyTeam.rerollToken} alt="" draggable={false} />
                  Reroll ×{view.rerollTokens}
                </Button>
              ) : (
                <div
                  className={cn(
                    'st-dice-dock__token',
                    'st-dice-dock__token--reroll',
                    view.rerollTokens <= 0 && 'st-dice-dock__token--empty',
                  )}
                  title={`Reroll × ${view.rerollTokens}`}
                >
                  <img src={imageMap.skyTeam.rerollToken} alt="" draggable={false} />
                  <span>×{view.rerollTokens}</span>
                </div>
              )}

              {view.lastSpeed != null && (
                <span className="st-dice-dock__stat" title="ความเร็วรอบล่าสุด">
                  Speed {view.lastSpeed}
                </span>
              )}
              {view.isFinalRound && (
                <span className="st-dice-dock__stat st-dice-dock__stat--warn">
                  รอบสุดท้าย — เทียบเบรก
                </span>
              )}
            </div>
          </div>

          <DockSeat
            role="copilot"
            playerId={view.copilotId}
            name={copilotName}
            isMe={!isPilot}
            isTurn={copilotTurn}
          />
        </div>
      </footer>

      <SkyTeamTrackDrawer
        open={approachOpen}
        onClose={onCloseTracks}
        side="left"
        label="Approach"
        header={
          <SkyTeamScenarioDrawerHeader
            scenarioId={view.scenarioId}
            scenarioName={view.scenarioName}
            tierLabel={view.scenarioTierLabel}
          />
        }
      >
        <SkyTeamApproachTrackPanel
          approach={view.approach}
          approachPosition={view.approachPosition}
          variant="drawer"
          scrollCurrentIntoView={approachOpen}
          focusIndex={radioFocusIndex}
          radioRevealNonce={radioRevealNonce}
          onRadioRevealComplete={onRadioRevealComplete}
          trafficTargets={trafficTargets}
          trafficPlanesBefore={trafficPlanesBefore}
          trafficRevealNonce={trafficRevealNonce}
          onTrafficRevealComplete={onTrafficRevealComplete}
        />
      </SkyTeamTrackDrawer>

      <SkyTeamTrackDrawer open={altitudeOpen} onClose={onCloseTracks} side="right" label="Altitude">
        <SkyTeamAltitudeTrackPanel
          view={view}
          variant="drawer"
          scrollCurrentIntoView={altitudeOpen}
        />
      </SkyTeamTrackDrawer>
    </div>
  );
}
