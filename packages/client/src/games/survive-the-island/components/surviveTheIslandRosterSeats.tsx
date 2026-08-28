import { Gem, Users } from 'lucide-react';
import type { SurviveTheIslandPlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';

export function buildSurviveTheIslandRosterSeats(view: SurviveTheIslandPlayerView): RosterSeat[] {
  return view.playerOrder.flatMap((playerId, index) => {
    const player = view.players.find((item) => item.id === playerId);
    if (!player) return [];
    const adventurers = view.adventurers.filter((item) => item.playerId === player.id);
    const remaining = adventurers.filter((item) => !item.eliminated && !item.rescued).length;
    const rescued = adventurers.filter((item) => item.rescued).length;
    return {
      id: player.id,
      name: player.name,
      active: view.phase !== 'game_over' && player.id === view.activePlayerId,
      leading: <span className="text-xs tabular-nums text-[var(--text-secondary)]">{index + 1}</span>,
      badges: (
        <span className="inline-flex flex-wrap items-center gap-1">
          <Badge size="sm" variant="outline" title="Adventurer ที่ยังอยู่ในเกม">
            <Users size={12} aria-hidden /> {remaining} อยู่
          </Badge>
          <Badge size="sm" variant={player.rescuedTreasure > 0 ? 'accent' : 'outline'} title="คะแนน treasure ที่ช่วยสำเร็จ">
            <Gem size={12} aria-hidden /> {player.rescuedTreasure}
          </Badge>
          {rescued > 0 ? <Badge size="sm" variant="success">ช่วย {rescued}</Badge> : null}
        </span>
      ),
    };
  });
}
