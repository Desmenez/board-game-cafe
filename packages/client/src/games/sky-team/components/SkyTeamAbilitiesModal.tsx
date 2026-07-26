import type {
  SkyTeamPlacedDie,
  SkyTeamPlayerView,
  SkyTeamSlotId,
  SkyTeamSpecialAbilityId,
} from 'shared';
import { SKY_TEAM_SPECIAL_ABILITY_DEFS } from 'shared';
import { Button, Dialog, DialogFooter, DialogTitle } from '../../../components/ui';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { SkyTeamDieFace } from './SkyTeamDice';

type Props = {
  open: boolean;
  focusedAbilityId: SkyTeamSpecialAbilityId | null;
  onClose: () => void;
  onFocusAbility: (id: SkyTeamSpecialAbilityId | null) => void;
  view: SkyTeamPlayerView;
  myId: string;
  selectedDieId: string | null;
  onSlotClick: (slotId: SkyTeamSlotId) => void;
  onAnticipationReroll: (dieId: string) => void;
  onAdaptationFlip: (dieId: string) => void;
};

export function SkyTeamAbilitiesModal({
  open,
  focusedAbilityId,
  onClose,
  onFocusAbility,
  view,
  myId,
  selectedDieId,
  onSlotClick,
  onAnticipationReroll,
  onAdaptationFlip,
}: Props) {
  if (!open || view.selectedSpecialAbilityIds.length === 0) return null;

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

  const focused = focusedAbilityId ? SKY_TEAM_SPECIAL_ABILITY_DEFS[focusedAbilityId] : null;
  const focusedSrc = focusedAbilityId ? imageMap.skyTeam.specialAbilities[focusedAbilityId] : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      overlayClassName="room-night-dialog-overlay"
      contentClassName="st-abilities-modal room-night-dialog"
    >
      <DialogTitle className="st-abilities-modal__title">
        {focused ? focused.name : 'Special Abilities'}
      </DialogTitle>

      {!focusedAbilityId ? (
        <>
          <p className="st-abilities-modal__lead m-0">เลือกการ์ดเพื่อดู / ใช้ความสามารถ</p>
          <ul className="st-abilities-modal__grid">
            {view.selectedSpecialAbilityIds.map((id) => {
              const def = SKY_TEAM_SPECIAL_ABILITY_DEFS[id];
              const src = imageMap.skyTeam.specialAbilities[id];
              const active =
                (id === 'working-together' && Boolean(wtPending)) ||
                (id === 'synchronisation' && syncPending != null) ||
                (id === 'anticipation' && anticipationOpen);
              const dimmed =
                (id === 'adaptation' && (adaptationRt?.usedByPlayerIds ?? []).includes(myId)) ||
                (id === 'working-together' &&
                  Boolean(view.specialAbilityState['working-together']?.usedThisRound) &&
                  !wtPending);
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={cn(
                      'st-abilities-modal__pick',
                      active && 'st-abilities-modal__pick--active',
                      dimmed && 'st-abilities-modal__pick--dim',
                    )}
                    onClick={() => onFocusAbility(id)}
                  >
                    {src ? (
                      <img src={src} alt={def.name} draggable={false} />
                    ) : (
                      <span>{def.name}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="st-abilities-modal__detail">
          <div
            className={cn(
              'st-ability-card st-abilities-modal__focus-card',
              focusedAbilityId === 'working-together' && wtPending && 'st-ability-card--active',
            )}
          >
            {focusedSrc ? (
              <img src={focusedSrc} alt={focused?.name ?? ''} draggable={false} />
            ) : null}
            {focusedAbilityId === 'working-together' && (
              <div className="st-ability-card__wells">
                {renderWtWell('skill_wt_pilot', wtPilot)}
                {renderWtWell('skill_wt_copilot', wtCopilot)}
              </div>
            )}
          </div>

          <p className="st-abilities-modal__desc m-0">{focused?.description}</p>

          <div className="st-abilities-modal__actions">
            {focusedAbilityId === 'working-together' && (
              <p className="st-abilities-modal__hint m-0">
                {wtPending && view.isMyTurn
                  ? 'วางลูกเต๋าบนช่องสกิลของการ์ด'
                  : view.specialAbilityState['working-together']?.usedThisRound
                    ? 'ใช้ไปแล้วในรอบนี้'
                    : 'เมื่อพร้อม — วางลูกเต๋าบนช่องสกิลของการ์ด (ทั้งสองฝ่าย)'}
              </p>
            )}

            {focusedAbilityId === 'synchronisation' && (
              <p className="st-abilities-modal__hint m-0">
                {syncPending != null && view.isMyTurn && myId === view.copilotId
                  ? `วาง Traffic die (${syncPending}) บนแผงควบคุม (ไม่สนสี${
                      view.coffeeTokens > 0 ? ' · ใช้ Coffee ได้' : ''
                    })`
                  : 'พาสซีฟหลังวาง Gear + Flaps — Traffic die จะขึ้นเมื่อเงื่อนไขครบ'}
              </p>
            )}

            {focusedAbilityId === 'anticipation' &&
              (anticipationOpen ? (
                <>
                  <p className="st-abilities-modal__hint m-0">
                    ทอยลูกเต๋าใบหนึ่งใหม่ก่อนวางลูกแรก:
                  </p>
                  <div className="st-abilities-modal__action-row">
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
                </>
              ) : (
                <p className="st-abilities-modal__hint m-0">
                  First Player ใช้ได้ก่อนวางลูกเต๋าใบแรกของรอบ
                </p>
              ))}

            {focusedAbilityId === 'adaptation' &&
              (canAdapt && selectedDieId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onAdaptationFlip(selectedDieId)}
                >
                  พลิกลูกที่เลือก (1↔6)
                </Button>
              ) : (
                <p className="st-abilities-modal__hint m-0">
                  {(adaptationRt?.usedByPlayerIds ?? []).includes(myId)
                    ? 'คุณใช้ Adaptation ไปแล้วในเกมนี้'
                    : 'เลือกลูกเต๋าที่ยังไม่วาง แล้วกลับมาพลิกด้านตรงข้าม (ครั้งเดียวต่อเกม)'}
                </p>
              ))}

            {(focusedAbilityId === 'mastery' || focusedAbilityId === 'control') && (
              <p className="st-abilities-modal__hint m-0">
                ความสามารถแบบพาสซีฟ — ทำงานอัตโนมัติเมื่อเงื่อนไขครบ
              </p>
            )}
          </div>
        </div>
      )}

      <DialogFooter className="st-abilities-modal__footer">
        {focusedAbilityId && view.selectedSpecialAbilityIds.length > 1 ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => onFocusAbility(null)}>
            กลับ
          </Button>
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          ปิด
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
