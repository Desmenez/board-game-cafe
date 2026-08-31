import { Gem } from 'lucide-react';
import { SURVIVE_THE_ISLAND_COLORS, type SurviveTheIslandPlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { stiAdventurerSrc } from '../art';
import { StiStatChip } from './SurviveTheIslandTokens';

function playerAdventurerColors(adventurers: SurviveTheIslandPlayerView['adventurers']) {
  const owned = new Set(adventurers.map((item) => item.color));
  return SURVIVE_THE_ISLAND_COLORS.filter((color) => owned.has(color));
}

export function buildSurviveTheIslandRosterSeats(view: SurviveTheIslandPlayerView): RosterSeat[] {
  return view.playerOrder.flatMap((playerId, index) => {
    const player = view.players.find((item) => item.id === playerId);
    if (!player) return [];
    const adventurers = view.adventurers.filter((item) => item.playerId === player.id);
    const colors = playerAdventurerColors(adventurers);
    return {
      id: player.id,
      name: player.name,
      active: view.phase !== 'game_over' && player.id === view.activePlayerId,
      leading: <span className="text-xs tabular-nums text-[var(--text-secondary)]">{index + 1}</span>,
      badges: (
        <span className="inline-flex flex-wrap items-center gap-1">
          {colors.map((color) => {
            const remaining = adventurers.filter(
              (item) => item.color === color && !item.eliminated && !item.rescued,
            ).length;
            return (
              <StiStatChip
                key={`remaining-${color}`}
                src={stiAdventurerSrc(color)}
                value={remaining}
                label="ผจญภัยที่ยังอยู่ในเกม"
              />
            );
          })}
          {colors.map((color) => {
            const rescued = adventurers.filter((item) => item.color === color && item.rescued).length;
            if (rescued === 0) return null;
            return (
              <StiStatChip
                key={`rescued-${color}`}
                src={stiAdventurerSrc(color)}
                value={rescued}
                label="ช่วยสำเร็จ"
                emphasize
              />
            );
          })}
          <StiStatChip
            icon={<Gem size={12} aria-hidden />}
            value={player.rescuedTreasure}
            label="แต้มสมบัติ"
            emphasize={player.rescuedTreasure > 0}
          />
        </span>
      ),
    };
  });
}
