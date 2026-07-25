import type { ReactNode } from 'react';
import type {
  SkyTeamPlacedDie,
  SkyTeamPlayerView,
  SkyTeamSlotId,
  SkyTeamSpecialAbilityId,
} from 'shared';
import { SKY_TEAM_SPECIAL_ABILITY_DEFS } from 'shared';
import { Button } from '../../../components/ui';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { SkyTeamDieFace } from './SkyTeamDice';

type Props = {
  view: SkyTeamPlayerView;
  myId: string;
  selectedDieId: string | null;
  onSlotClick: (slotId: SkyTeamSlotId) => void;
  onAnticipationReroll: (dieId: string) => void;
  onAdaptationFlip: (dieId: string) => void;
};

function AbilityCard({
  id,
  active,
  dimmed,
  children,
}: {
  id: SkyTeamSpecialAbilityId;
  active?: boolean;
  dimmed?: boolean;
  children?: ReactNode;
}) {
  const def = SKY_TEAM_SPECIAL_ABILITY_DEFS[id];
  const src = imageMap.skyTeam.specialAbilities[id];
  return (
    <div
      className={cn(
        'st-ability-card',
        active && 'st-ability-card--active',
        dimmed && 'st-ability-card--dim',
      )}
      title={`${def.name}: ${def.description}`}
    >
      <img src={src} alt={def.name} draggable={false} />
      {children}
    </div>
  );
}

export function SkyTeamAbilitiesBar({
  view,
  myId,
  selectedDieId,
  onSlotClick,
  onAnticipationReroll,
  onAdaptationFlip,
}: Props) {
  if (view.selectedSpecialAbilityIds.length === 0) return null;

  const syncPending = view.specialAbilityState.synchronisation?.pendingValue;
  const wtPending = view.specialAbilityState['working-together']?.workingTogether;
  const anticipationOpen =
    Boolean(view.specialAbilityState.anticipation?.anticipationOpen) &&
    view.isMyTurn &&
    view.currentPlayerId === myId;
  const adaptationRt = view.specialAbilityState.adaptation;
  const canAdapt =
    view.selectedSpecialAbilityIds.includes('adaptation') &&
    view.phase === 'dice_placement' &&
    !(adaptationRt?.usedByPlayerIds ?? []).includes(myId) &&
    syncPending == null &&
    !wtPending;

  const wtPilot = view.slots.find((s) => s.id === 'skill_wt_pilot');
  const wtCopilot = view.slots.find((s) => s.id === 'skill_wt_copilot');

  const renderWtWell = (
    slotId: SkyTeamSlotId,
    slot: { occupied: SkyTeamPlacedDie | null; canPlace: boolean } | undefined,
  ) => {
    const canClick = Boolean(selectedDieId && slot?.canPlace && view.isMyTurn);
    return (
      <button
        type="button"
        className={cn(
          'st-ability-well',
          slot?.canPlace && !slot.occupied ? 'st-slot--legal' : '',
          slot?.occupied ? 'st-slot--filled' : '',
          canClick ? 'st-slot--active' : '',
        )}
        disabled={!canClick}
        onClick={() => onSlotClick(slotId)}
        title={slotId}
      >
        {slot?.occupied && (
          <SkyTeamDieFace value={slot.occupied.value} color={slot.occupied.color} size="sm" />
        )}
      </button>
    );
  };

  return (
    <div className="st-abilities">
      <div className="st-abilities__row">
        {view.selectedSpecialAbilityIds.map((id) => {
          if (id === 'working-together') {
            return (
              <AbilityCard key={id} id={id} active={Boolean(wtPending)}>
                <div className="st-ability-card__wells">
                  {renderWtWell('skill_wt_pilot', wtPilot)}
                  {renderWtWell('skill_wt_copilot', wtCopilot)}
                </div>
              </AbilityCard>
            );
          }
          return (
            <AbilityCard
              key={id}
              id={id}
              active={
                (id === 'synchronisation' && syncPending != null) ||
                (id === 'anticipation' && anticipationOpen)
              }
              dimmed={
                (id === 'adaptation' && (adaptationRt?.usedByPlayerIds ?? []).includes(myId)) ||
                (id === 'working-together' &&
                  Boolean(
                    view.specialAbilityState['working-together']?.usedThisRound && !wtPending,
                  ))
              }
            />
          );
        })}
      </div>

      {syncPending != null && view.isMyTurn && myId === view.copilotId && (
        <p className="st-turn-hint">
          Synchronisation — วาง Traffic die ({syncPending}) บนแผงควบคุม (ไม่สนสี
          {view.coffeeTokens > 0 ? ' · ใช้ Coffee ได้' : ''})
        </p>
      )}

      {wtPending && view.isMyTurn && (
        <p className="st-turn-hint">Working Together — วางลูกเต๋าบนการ์ดสกิล</p>
      )}

      {anticipationOpen && (
        <div className="st-abilities__actions">
          <span className="text-xs opacity-80">Anticipation — ทอยลูกเต๋าใบหนึ่งใหม่ก่อนวาง:</span>
          {view.myDice.map((d) => (
            <Button
              key={d.id}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onAnticipationReroll(d.id)}
            >
              ทอย {d.value} ใหม่
            </Button>
          ))}
        </div>
      )}

      {canAdapt && selectedDieId && (
        <div className="st-abilities__actions">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onAdaptationFlip(selectedDieId)}
          >
            Adaptation — พลิกลูกที่เลือก (1↔6)
          </Button>
        </div>
      )}
    </div>
  );
}
