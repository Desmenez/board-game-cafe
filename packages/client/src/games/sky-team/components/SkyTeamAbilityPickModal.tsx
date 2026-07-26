import {
  SKY_TEAM_SPECIAL_ABILITY_DEFS,
  SKY_TEAM_SPECIAL_ABILITY_IDS,
  skyTeamAbilityPickKey,
  type SkyTeamSpecialAbilityId,
} from 'shared';
import { Check } from 'lucide-react';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { Button, Dialog, DialogFooter, DialogTitle } from '../../../components/ui';
import '../../../components/game-lobby-options/sky-team/sky-team-lobby-options.css';

function agreementStatus(
  slots: number,
  myPick: SkyTeamSpecialAbilityId[],
  peerPick: SkyTeamSpecialAbilityId[] | undefined,
  peerName: string | undefined,
): string {
  if (slots <= 0) return '';
  const mineReady = myPick.length === slots;
  const peerReady = peerPick != null && peerPick.length === slots;
  if (!mineReady) return `เลือกให้ครบ ${slots} ใบ`;
  if (!peerReady) return peerName ? `รอ ${peerName} เลือก…` : 'รออีกฝ่ายเลือก…';
  if (skyTeamAbilityPickKey(myPick) !== skyTeamAbilityPickKey(peerPick)) {
    return 'ไม่ตรงกัน — คุยกันแล้วเลือกชุดเดียวกัน';
  }
  return 'ตรงกันแล้ว — กดยอมรับเพื่อเข้า Strategy';
}

type Props = {
  open: boolean;
  slots: number;
  scenarioLabel: string;
  myId: string;
  players: Array<{ id: string; name: string }>;
  picksByPlayerId: Record<string, SkyTeamSpecialAbilityId[]>;
  onAbilityPicks: (abilityIds: SkyTeamSpecialAbilityId[]) => void;
  onConfirm: () => void;
};

/** In-match dual-pick before Strategy — both must select the same set, then confirm. */
export function SkyTeamAbilityPickModal({
  open,
  slots,
  scenarioLabel,
  myId,
  players,
  picksByPlayerId,
  onAbilityPicks,
  onConfirm,
}: Props) {
  const myPick = picksByPlayerId[myId] ?? [];
  const peer = players.find((p) => p.id !== myId);
  const peerPick = peer ? picksByPlayerId[peer.id] : undefined;
  const status = agreementStatus(slots, myPick, peerPick, peer?.name);
  const canConfirm =
    slots > 0 &&
    myPick.length === slots &&
    peerPick != null &&
    peerPick.length === slots &&
    skyTeamAbilityPickKey(myPick) === skyTeamAbilityPickKey(peerPick);

  const toggleAbility = (id: SkyTeamSpecialAbilityId) => {
    if (slots <= 0) return;
    const selected = new Set(myPick);
    if (selected.has(id)) selected.delete(id);
    else if (selected.size < slots) selected.add(id);
    else return;
    onAbilityPicks([...selected]);
  };

  return (
    <Dialog
      open={open}
      dismissible={false}
      onOpenChange={() => undefined}
      overlayClassName="room-night-dialog-overlay"
      contentClassName="st-ability-pick-modal room-night-dialog"
    >
      <DialogTitle className="st-ability-pick-modal__title">
        Special Abilities — เลือกก่อนคุยแผน
      </DialogTitle>
      <p className="st-ability-pick-modal__lead m-0">
        {scenarioLabel}: เลือกให้ครบ {slots} ใบ ทั้งสองคนต้องเลือกชุดเดียวกัน แล้วกดยอมรับ
      </p>
      <p
        className={cn(
          'st-ability-pick-modal__status',
          status.startsWith('ตรงกัน') && 'st-ability-pick-modal__status--ready',
          status.startsWith('ไม่ตรงกัน') && 'st-ability-pick-modal__status--mismatch',
        )}
      >
        {status}
      </p>

      <ul className="st-ability-pick-modal__grid">
        {SKY_TEAM_SPECIAL_ABILITY_IDS.map((id) => {
          const def = SKY_TEAM_SPECIAL_ABILITY_DEFS[id];
          const src = imageMap.skyTeam.specialAbilities[id];
          const selected = myPick.includes(id);
          const peerSelected = peerPick?.includes(id) ?? false;
          const atCap = myPick.length >= slots && !selected;
          return (
            <li key={id}>
              <button
                type="button"
                className={cn(
                  'st-ability-pick-modal__card',
                  selected && 'st-ability-pick-modal__card--selected',
                  peerSelected && !selected && 'st-ability-pick-modal__card--peer',
                  atCap && 'st-ability-pick-modal__card--disabled',
                )}
                disabled={atCap}
                aria-pressed={selected}
                aria-label={def.name}
                title={`${def.name}: ${def.description}`}
                onClick={() => toggleAbility(id)}
              >
                {src ? (
                  <img src={src} alt={def.name} draggable={false} />
                ) : (
                  <span className="st-ability-pick-modal__fallback">{def.name}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <DialogFooter className="st-ability-pick-modal__footer">
        <Button type="button" size="lg" disabled={!canConfirm} onClick={onConfirm}>
          <Check size={18} strokeWidth={2.25} aria-hidden />
          ยอมรับ
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
