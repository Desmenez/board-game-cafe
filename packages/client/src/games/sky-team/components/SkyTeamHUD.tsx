import type { ReactNode } from 'react';
import type { SkyTeamPlayerView, SkyTeamScenarioTier } from 'shared';
import { GamePhasePanel } from '../../../components/game-shell';
import { PlayerAvatar } from '../../../components/player-avatar';
import { Button, Dialog, DialogTitle } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { imageMap } from '../../../imageMap';
import { SkyTeamDiceTray } from './SkyTeamDice';
import { SkyTeamModuleSummary } from './SkyTeamModuleSummary';
import { SkyTeamAltitudeTrackPanel, SkyTeamApproachTrackPanel } from './SkyTeamTracksPanel';

const APPROACH_TIER_HEADER: Record<SkyTeamScenarioTier, string> = {
  green: 'bg-gradient-to-b from-[#a8c86a] to-[#7a9c3f] text-white',
  yellow: 'bg-gradient-to-b from-[#efc65a] to-[#c9951f] text-amber-950',
  red: 'bg-gradient-to-b from-[#d86a6a] to-[#a83a3a] text-white',
};

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
  /** Center column — usually the control panel board. */
  children?: ReactNode;
};

function dockLabel(
  view: SkyTeamPlayerView,
  selectedDieId: string | null,
  iAmReady: boolean,
): string {
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
  const roleArt =
    role === 'pilot' ? imageMap.skyTeam.rolePilot : imageMap.skyTeam.roleCopilot;

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
        <img
          src={roleArt}
          alt={roleLabel}
          className="st-dock-seat__role-art"
          draggable={false}
        />
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
  children,
}: Props) {
  const isPilot = view.myRole === 'pilot';
  const showDice =
    view.myDice.length > 0 || view.phase === 'dice_placement' || view.rerollPending != null;
  const showCoffeeMods = view.isMyTurn && selectedDieId != null && view.coffeeTokens > 0;
  const pilot = view.players.find((p) => p.role === 'pilot');
  const copilot = view.players.find((p) => p.role === 'copilot');
  const pilotName = pilot?.name ?? 'Pilot';
  const copilotName = copilot?.name ?? 'Co-Pilot';
  const pilotTurn = view.phase === 'dice_placement' && view.currentPlayerId === view.pilotId;
  const copilotTurn = view.phase === 'dice_placement' && view.currentPlayerId === view.copilotId;
  const iAmReady = Boolean(view.strategyReady[myId]);
  const inStrategy = view.phase === 'strategy';

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
          {(view.lastSpeed != null || view.isFinalRound) && (
            <div className="st-tokens">
              {view.lastSpeed != null && <p>Speed ล่าสุด: {view.lastSpeed}</p>}
              {view.isFinalRound && <p className="st-final">รอบสุดท้าย — เทียบเบรก</p>}
            </div>
          )}

          <div className="st-hud__track-btns">
            <Button type="button" size="sm" variant="secondary" onClick={onOpenApproach}>
              Approach track
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onOpenAltitude}>
              Altitude track
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
              {dockLabel(view, selectedDieId, iAmReady)}
            </p>

            {inStrategy ? (
              <div className="st-dice-dock__phase-action">
                <Button
                  type="button"
                  disabled={iAmReady}
                  onClick={onFinishStrategy}
                >
                  {iAmReady ? 'รออีกฝ่าย…' : 'Finish Discussion'}
                </Button>
              </div>
            ) : showDice ? (
              <div className="st-dice-dock__row">
                <SkyTeamDiceTray
                  dice={view.myDice}
                  selectedId={selectedDieId}
                  onSelect={onSelectDie}
                  disabled={!view.isMyTurn}
                />

                <div className="st-dice-dock__actions" role="group" aria-label="โทเคนและการกระทำ">
                  <div
                    className={cn(
                      'st-dice-dock__token',
                      view.coffeeTokens <= 0 && 'st-dice-dock__token--empty',
                    )}
                    title={`Coffee × ${view.coffeeTokens}`}
                  >
                    <img src={imageMap.skyTeam.coffeeToken} alt="" draggable={false} />
                    <span>×{view.coffeeTokens}</span>
                  </div>

                  {showCoffeeMods && (
                    <div className="st-coffee-mods">
                      <span className="st-coffee-mods__hint">แก้ค่า</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={coffeeDelta <= -view.coffeeTokens}
                        onClick={() => onCoffeeDelta(coffeeDelta - 1)}
                      >
                        −1
                      </Button>
                      <strong>{coffeeDelta >= 0 ? `+${coffeeDelta}` : coffeeDelta}</strong>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={coffeeDelta >= view.coffeeTokens}
                        onClick={() => onCoffeeDelta(coffeeDelta + 1)}
                      >
                        +1
                      </Button>
                    </div>
                  )}

                  {canUseReroll && onUseReroll && (
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
                  )}
                </div>
              </div>
            ) : null}
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

      <Dialog
        open={approachOpen}
        onOpenChange={(o) => !o && onCloseTracks()}
        contentClassName="!w-[min(36rem,92vw)] !max-w-[36rem] !overflow-hidden !p-0"
      >
        <header
          className={cn(
            'px-5 pt-4 pb-3',
            APPROACH_TIER_HEADER[view.scenarioTier] ?? APPROACH_TIER_HEADER.green,
          )}
        >
          <DialogTitle className="mb-0! text-sm! md:text-base! !text-inherit">
            Approach — {view.scenarioName}
          </DialogTitle>
          <p className="mt-1 mb-0 text-xs opacity-90 md:text-sm !text-inherit">
            {view.scenarioTierLabel}
          </p>
        </header>
        <div className="px-5 pb-5 pt-1">
          <SkyTeamApproachTrackPanel
            approach={view.approach}
            enabledModules={view.enabledModules}
            approachPosition={view.approachPosition}
          />
        </div>
      </Dialog>

      <Dialog
        open={altitudeOpen}
        onOpenChange={(o) => !o && onCloseTracks()}
        contentClassName="!w-[min(36rem,92vw)] !max-w-[36rem] !p-5"
      >
        <DialogTitle className="mb-0! text-sm! md:text-base!">Altitude</DialogTitle>
        <SkyTeamAltitudeTrackPanel view={view} />
      </Dialog>
    </div>
  );
}
