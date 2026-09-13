import { Fish, Hexagon } from 'lucide-react';
import type { HeyThatsMyFishPlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { htmfPenguinSrc } from '../art';

export function buildHeyThatsMyFishRosterSeats(view: HeyThatsMyFishPlayerView): RosterSeat[] {
  return view.playerOrder.flatMap((playerId, index) => {
    const player = view.players.find((item) => item.id === playerId);
    if (!player) return [];
    return {
      id: player.id,
      name: player.name,
      active: view.phase !== 'game_over' && player.id === view.activePlayerId,
      muted: player.eliminated,
      mutedLabel: player.eliminated ? 'ตกรอบ' : undefined,
      leading: <span className="text-xs tabular-nums text-(--text-secondary)">{index + 1}</span>,
      badges: (
        <span className="inline-flex flex-wrap items-center gap-2 text-xs">
          {view.phase === 'placement' ? (
            <span
              className="inline-flex items-center gap-0.5"
              aria-label={`วางอีก ${player.penguinsToPlace}`}
            >
              {Array.from({ length: player.penguinsToPlace }, (_, tokenIndex) => (
                <img
                  key={tokenIndex}
                  src={htmfPenguinSrc(player.color)}
                  alt=""
                  className="h-8 w-auto"
                />
              ))}
            </span>
          ) : (
            <>
              <span
                className="inline-flex items-center gap-0.5 font-semibold tabular-nums"
                title="ปลา"
                aria-label={`${player.fishScore} ปลา`}
              >
                <Fish size={12} strokeWidth={2.25} aria-hidden />
                {player.fishScore}
              </span>
              <span
                className="inline-flex items-center gap-0.5 text-ink-3 tabular-nums"
                title="แผ่นน้ำแข็ง"
                aria-label={`${player.tileScore} แผ่น`}
              >
                <Hexagon size={12} strokeWidth={2.25} aria-hidden />
                {player.tileScore}
              </span>
            </>
          )}
        </span>
      ),
    };
  });
}
