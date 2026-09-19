import type { CodenamesPlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';
import { CN_ROLE_LABEL, CN_TEAM_LABEL } from '../art';

export function buildCodenamesRosterSeats(view: CodenamesPlayerView): RosterSeat[] {
  const live = view.phase !== 'game_over';
  const remaining: Record<'red' | 'blue', number> = {
    red: view.redRemaining,
    blue: view.blueRemaining,
  };

  return view.players.map((player) => {
    const onTurnTeam = player.team === view.turnTeam;
    const isActingSpymaster =
      live && view.turnStage === 'clue' && onTurnTeam && player.role === 'spymaster';
    const hasPendingGuess =
      live && view.turnStage === 'guess' && view.pendingGuessByPlayer[player.id] !== undefined;

    return {
      id: player.id,
      name: player.name,
      active: isActingSpymaster,
      leading: (
        <span className={`cn-roster-team cn-roster-team--${player.team}`}>
          {CN_TEAM_LABEL[player.team]}
        </span>
      ),
      badges: (
        <>
          <Badge size="sm" variant={player.role === 'spymaster' ? 'warning' : 'default'}>
            {CN_ROLE_LABEL[player.role]}
          </Badge>
          {live && onTurnTeam ? (
            <Badge size="sm" variant="success">
              เทิร์นนี้
            </Badge>
          ) : null}
          {hasPendingGuess ? (
            <Badge size="sm" variant="accent">
              เลือกคำแล้ว
            </Badge>
          ) : null}
        </>
      ),
      status: (
        <Badge size="sm" variant={player.team === 'red' ? 'danger' : 'info'}>
          เหลือ {remaining[player.team]}
        </Badge>
      ),
    };
  });
}
