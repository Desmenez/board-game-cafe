import type { ReactNode } from 'react';
import type { SkyTeamPlayerView } from 'shared';
import { Button, Dialog, DialogTitle } from '../../../components/ui';
import { imageMap } from '../../../imageMap';
import { SkyTeamDiceTray } from './SkyTeamDice';
import {
  SkyTeamAltitudeTrackPanel,
  SkyTeamApproachTrackPanel,
} from './SkyTeamTracksPanel';

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

  return (
    <div className="st-hud">
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
          <SkyTeamDiceTray
            dice={view.myDice}
            selectedId={selectedDieId}
            onSelect={onSelectDie}
            disabled={!view.isMyTurn}
          />
        )}
      </aside>

      <div className="st-hud__center">
        {children}

        <div className="st-hud__chrome">
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
          <SkyTeamDiceTray
            dice={view.myDice}
            selectedId={selectedDieId}
            onSelect={onSelectDie}
            disabled={!view.isMyTurn}
          />
        )}
      </aside>

      <Dialog
        open={approachOpen}
        onOpenChange={(o) => !o && onCloseTracks()}
        contentClassName="!w-[min(36rem,92vw)] !max-w-[36rem] !p-5"
      >
        <DialogTitle className="mb-0! text-sm! md:text-base!">Approach — {view.scenarioName}</DialogTitle>
        <SkyTeamApproachTrackPanel view={view} />
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
