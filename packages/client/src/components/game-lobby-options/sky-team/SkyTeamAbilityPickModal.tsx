import {
  SKY_TEAM_SPECIAL_ABILITY_DEFS,
  SKY_TEAM_SPECIAL_ABILITY_IDS,
  getSkyTeamScenario,
  isSkyTeamLobbyOptionsValid,
  parseSkyTeamLobbyOptions,
  resolveSkyTeamAgreedAbilityIds,
  skyTeamAbilityPickKey,
  type SkyTeamLobbyOptions,
  type SkyTeamSpecialAbilityId,
} from 'shared';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { Button, Dialog, DialogFooter, DialogTitle } from '../../ui';
import './sky-team-lobby-options.css';

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
  return 'พร้อม — ทั้งสองเลือกชุดเดียวกัน';
}

type Props = {
  open: boolean;
  isHost: boolean;
  myId: string;
  players: Array<{ id: string; name: string }>;
  lobbyOptions: unknown;
  onAbilityPicks: (abilityIds: string[]) => void;
  onClose: () => void;
  onConfirmStart: () => void;
};

export function SkyTeamAbilityPickModal({
  open,
  isHost,
  myId,
  players,
  lobbyOptions,
  onAbilityPicks,
  onClose,
  onConfirmStart,
}: Props) {
  const opts = parseSkyTeamLobbyOptions(lobbyOptions);
  const scenario = getSkyTeamScenario(opts.scenarioId);
  const slots = scenario.specialAbilitySlots;
  const playerIds = players.map((p) => p.id);
  const myPick = opts.specialAbilityPicksByPlayerId[myId] ?? [];
  const peer = players.find((p) => p.id !== myId);
  const peerPick = peer ? opts.specialAbilityPicksByPlayerId[peer.id] : undefined;
  const status = agreementStatus(slots, myPick, peerPick, peer?.name);
  const agreed = resolveSkyTeamAgreedAbilityIds(opts, playerIds);
  const canStart = isHost && isSkyTeamLobbyOptionsValid(opts, playerIds) && agreed.length === slots;

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
      onOpenChange={(v) => {
        if (!v && isHost) onClose();
      }}
      contentClassName="!w-[min(42rem,94vw)] !max-w-[42rem] !max-h-[90dvh] !overflow-y-auto"
    >
      <DialogTitle>Special Abilities — เลือกก่อนเริ่ม</DialogTitle>
      <p className="m-0 text-sm text-ink-2">
        {scenario.code} {scenario.shortName}: เลือกให้ครบ {slots} ใบ ทั้งสองคนต้องเลือกชุดเดียวกัน
      </p>
      <p
        className={cn(
          'st-ability-pick__status mt-2!',
          status.startsWith('พร้อม') && 'st-ability-pick__status--ready',
          status.startsWith('ไม่ตรงกัน') && 'st-ability-pick__status--mismatch',
        )}
      >
        {status}
      </p>

      <ul className="st-ability-pick__grid mt-3">
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
                  'st-ability-pick__card',
                  selected && 'st-ability-pick__card--selected',
                  peerSelected && 'st-ability-pick__card--peer',
                  atCap && 'st-ability-pick__card--disabled',
                )}
                disabled={atCap}
                aria-pressed={selected}
                title={def.description}
                onClick={() => toggleAbility(id)}
              >
                <span className="st-ability-pick__art">
                  {src ? <img src={src} alt="" draggable={false} /> : null}
                </span>
                <span className="st-ability-pick__name">{def.name}</span>
                <span className="st-ability-pick__desc">{def.description}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <DialogFooter className="mt-4 gap-2">
        {isHost && (
          <Button type="button" variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
        )}
        {isHost ? (
          <Button type="button" disabled={!canStart} onClick={onConfirmStart}>
            เริ่มเกม
          </Button>
        ) : (
          <p className="m-0 text-sm text-ink-2">รอหัวห้องเริ่มเมื่อเลือกตรงกัน</p>
        )}
      </DialogFooter>
    </Dialog>
  );
}

/** Re-export type for RoomPage convenience. */
export type { SkyTeamLobbyOptions };
