import type { WavelengthPlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';
import { WL_TEAM_LABEL } from '../art';

export function buildWavelengthRosterSeats(view: WavelengthPlayerView): RosterSeat[] {
  return view.players.map((player) => {
    const isPsychic = player.id === view.psychicId;
    const activeTeam = player.team === view.activeTeam;
    return {
      id: player.id,
      name: player.name,
      active: isPsychic,
      leading: (
        <span className={`wl-roster-team wl-roster-team--${player.team}`}>
          {WL_TEAM_LABEL[player.team]}
        </span>
      ),
      badges: (
        <>
          {isPsychic && view.phase !== 'game_over' ? (
            <Badge size="sm" variant="warning">
              Psychic
            </Badge>
          ) : null}
          {activeTeam && view.phase !== 'game_over' && !isPsychic ? (
            <Badge size="sm" variant="success">
              ทีมที่เล่น
            </Badge>
          ) : null}
        </>
      ),
      status: (
        <Badge size="sm" variant="default">
          {view.scores[player.team]} แต้ม
        </Badge>
      ),
    };
  });
}
