import type { ReactNode } from 'react';
import type { SkyTeamPlayerView, SkyTeamScenarioTier } from 'shared';
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
  selectedDieId: string | null;
  onSelectDie: (id: string) => void;
  coffeeDelta: number;
  onCoffeeDelta: (d: number) => void;
  approachOpen: boolean;
  altitudeOpen: boolean;
  onOpenApproach: () => void;
  onOpenAltitude: () => void;
  onCloseTracks: () => void;
  /** Center column — usually the control panel board. */
  children?: ReactNode;
};

function MyDicePanel({
  view,
  selectedDieId,
  onSelectDie,
  coffeeDelta,
  onCoffeeDelta,
}: Pick<Props, 'view' | 'selectedDieId' | 'onSelectDie' | 'coffeeDelta' | 'onCoffeeDelta'>) {
  return (
    <>
      <SkyTeamDiceTray
        dice={view.myDice}
        selectedId={selectedDieId}
        onSelect={onSelectDie}
        disabled={!view.isMyTurn}
      />
      {view.isMyTurn && selectedDieId && view.coffeeTokens > 0 && (
        <div className="st-coffee-mods">
          <span>Coffee แก้ค่า:</span>
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
    </>
  );
}

export function SkyTeamHUD({
  view,
  selectedDieId,
  onSelectDie,
  coffeeDelta,
  onCoffeeDelta,
  approachOpen,
  altitudeOpen,
  onOpenApproach,
  onOpenAltitude,
  onCloseTracks,
  children,
}: Props) {
  const isPilot = view.myRole === 'pilot';
  const showDiceDock =
    view.myDice.length > 0 || view.phase === 'dice_placement' || view.rerollPending != null;
  const diceProps = {
    view,
    selectedDieId,
    onSelectDie,
    coffeeDelta,
    onCoffeeDelta,
  };

  return (
    <div className={['st-hud', showDiceDock ? 'st-hud--dock' : ''].filter(Boolean).join(' ')}>
      <aside className={['st-seat', isPilot ? 'st-seat--me' : ''].join(' ')}>
        <img
          src={imageMap.skyTeam.rolePilot}
          alt="Pilot"
          className="st-seat__role"
          draggable={false}
        />
        <p className="st-seat__name">
          {view.players.find((p) => p.role === 'pilot')?.name ?? 'Pilot'}
        </p>
        {isPilot && (
          <div className="st-seat__dice">
            <MyDicePanel {...diceProps} />
          </div>
        )}
      </aside>

      <div className="st-hud__center">
        {children}

        <div className="st-hud__chrome">
          <SkyTeamModuleSummary view={view} />
          <div className="st-tokens">
            <div className="st-tokens__row">
              <img src={imageMap.skyTeam.coffeeToken} alt="" className="st-tokens__img" />
              <span>Coffee × {view.coffeeTokens}</span>
            </div>
            {view.lastSpeed != null && <p>Speed ล่าสุด: {view.lastSpeed}</p>}
            {view.isFinalRound && <p className="st-final">รอบสุดท้าย — เทียบเบรก</p>}
          </div>

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

      <aside className={['st-seat', !isPilot ? 'st-seat--me' : ''].join(' ')}>
        <img
          src={imageMap.skyTeam.roleCopilot}
          alt="Co-Pilot"
          className="st-seat__role"
          draggable={false}
        />
        <p className="st-seat__name">
          {view.players.find((p) => p.role === 'copilot')?.name ?? 'Co-Pilot'}
        </p>
        {!isPilot && (
          <div className="st-seat__dice">
            <MyDicePanel {...diceProps} />
          </div>
        )}
      </aside>

      {showDiceDock && (
        <footer className="st-dice-dock" aria-label="ลูกเต๋าของคุณ">
          <div className="st-dice-dock__inner pb-12">
            <p className="st-dice-dock__label">
              {view.isMyTurn
                ? selectedDieId
                  ? 'แตะช่องบนแผงเพื่อวาง'
                  : 'เลือกลูกเต๋า'
                : view.phase === 'dice_placement'
                  ? 'รออีกฝ่าย…'
                  : 'ลูกเต๋าของคุณ'}
            </p>
            <MyDicePanel {...diceProps} />
          </div>
        </footer>
      )}

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
