import type { HeyThatsMyFishPenguin, HeyThatsMyFishPlayerView } from 'shared';
import { PlayerIdentity } from '../../../components/player-avatar';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { HTMF_COLOR_LABEL, htmfPenguinSrc } from '../art';

type Props = {
  view: HeyThatsMyFishPlayerView;
  myId: string;
  selectedPenguinId?: string | null;
  onSelectPenguin?: (penguinId: string) => void;
};

export function HeyThatsMyFishPlayerTray({
  view,
  myId,
  selectedPenguinId = null,
  onSelectPenguin,
}: Props) {
  const placing = view.phase === 'placement';

  return (
    <ul className="space-y-2">
      {view.playerOrder.flatMap((playerId) => {
        const player = view.players.find((item) => item.id === playerId);
        if (!player) return [];
        const penguins = view.penguins.filter((penguin) => penguin.playerId === player.id);
        const active = view.activePlayerId === player.id;
        const mine = player.id === myId;
        return (
          <li
            key={player.id}
            className={cn(
              'rounded-lg border px-2.5 py-2',
              active ? 'border-pear/50 bg-pear/10' : 'border-rule bg-paper-2',
              player.eliminated && 'opacity-50',
            )}
          >
            <PlayerIdentity
              playerId={player.id}
              name={player.name}
              avatarSize={32}
              secondary={
                mine ? 'คุณ' : player.eliminated ? 'ตกรอบ' : active ? 'กำลังเล่น' : undefined
              }
              className="mb-1.5"
            />
            <div className="flex flex-wrap items-end gap-1">
              {penguins.map((penguin, index) => (
                <PenguinToken
                  key={penguin.id}
                  penguin={penguin}
                  index={index}
                  placing={placing}
                  selected={penguin.id === selectedPenguinId}
                  canSelect={
                    Boolean(onSelectPenguin) &&
                    mine &&
                    !placing &&
                    penguin.hexId != null &&
                    Boolean(view.legalMoves[penguin.id]?.length)
                  }
                  onSelect={() => onSelectPenguin?.(penguin.id)}
                />
              ))}
              {!placing ? (
                <span className="ml-auto inline-flex items-center gap-2 pb-0.5">
                  <ScoreChip
                    src={imageMap.heyThatsMyFish.tiles['grey-1']}
                    value={player.fishScore}
                    label="ปลา"
                  />
                  <ScoreChip
                    src={imageMap.heyThatsMyFish.empty}
                    value={player.tileScore}
                    label="แผ่น"
                  />
                </span>
              ) : null}
            </div>
            {placing ? (
              <p className="mt-1 text-xs text-ink-2">
                {player.penguinsToPlace > 0
                  ? `ยังไม่วาง ${player.penguinsToPlace} ตัว`
                  : 'วางครบแล้ว'}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function PenguinToken({
  penguin,
  index,
  placing,
  selected,
  canSelect,
  onSelect,
}: {
  penguin: HeyThatsMyFishPenguin;
  index: number;
  placing: boolean;
  selected: boolean;
  canSelect: boolean;
  onSelect: () => void;
}) {
  const placed = penguin.hexId != null;
  const dimmed = placing ? placed : !placed;
  const label = `${HTMF_COLOR_LABEL[penguin.color]} ตัวที่ ${index + 1}${
    placing ? (placed ? ' วางแล้ว' : ' ยังไม่วาง') : placed ? ' บนน้ำแข็ง' : ' เก็บแล้ว'
  }`;
  const className = cn(
    'grid h-12 w-9 place-items-center rounded-md transition-opacity',
    dimmed && 'opacity-30',
    selected && 'bg-pear/25 ring-2 ring-pear',
    canSelect && 'cursor-pointer hover:bg-paper-3',
  );
  const image = (
    <img
      src={htmfPenguinSrc(penguin.color)}
      alt=""
      draggable={false}
      className="h-11 w-auto object-contain"
    />
  );

  if (canSelect) {
    return (
      <button
        type="button"
        className={className}
        aria-pressed={selected}
        aria-label={`เลือกเพนกวิน ${label}`}
        onClick={onSelect}
      >
        {image}
      </button>
    );
  }

  return (
    <span className={className} aria-label={`เพนกวิน ${label}`}>
      {image}
    </span>
  );
}

function ScoreChip({ src, value, label }: { src: string; value: number; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-ink-2"
      aria-label={`${value} ${label}`}
    >
      <img src={src} alt="" draggable={false} className="h-6 w-auto object-contain" />
      {value}
    </span>
  );
}
