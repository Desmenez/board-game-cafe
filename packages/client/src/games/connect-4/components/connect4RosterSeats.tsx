import type { Connect4PlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';

const COLOR_LABEL = { red: 'แดง', yellow: 'เหลือง' } as const;

export function buildConnect4RosterSeats(view: Connect4PlayerView): RosterSeat[] {
  const live = view.phase !== 'game_over';
  return view.players.map((player) => {
    const onTurn = live && player.id === view.currentPlayerId;
    return {
      id: player.id,
      name: player.name,
      active: onTurn,
      leading: (
        <span className={`c4-roster-swatch c4-roster-swatch--${player.color}`} aria-hidden />
      ),
      badges: onTurn ? (
        <Badge size="sm" variant="success">
          เทิร์นนี้
        </Badge>
      ) : null,
      status: (
        <Badge size="sm" variant={player.color === 'red' ? 'danger' : 'warning'}>
          {COLOR_LABEL[player.color]}
        </Badge>
      ),
    };
  });
}
