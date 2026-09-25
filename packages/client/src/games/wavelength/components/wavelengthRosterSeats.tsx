import type { WavelengthPlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';
import { WL_TEAM_LABEL } from '../art';

export function buildWavelengthRosterSeats(view: WavelengthPlayerView): RosterSeat[] {
  return view.players.map((player) => {
    const isPsychic = player.id === view.psychicId;
    const isGuesser = view.mode === 'pairs' && player.id === view.guesserId;
    const activeTeam = view.mode === 'teams' && player.team === view.activeTeam;
    const score =
      view.mode === 'pairs'
        ? (view.playerScores[player.id] ?? 0)
        : view.scores[player.team ?? 'orange'];
    return {
      id: player.id,
      name: player.name,
      active: isPsychic,
      leading:
        view.mode === 'pairs' || player.team == null ? undefined : (
          <span className={`wl-roster-team wl-roster-team--${player.team}`}>
            {WL_TEAM_LABEL[player.team]}
          </span>
        ),
      badges: (
        <>
          {isPsychic && view.phase !== 'game_over' ? (
            <Badge size="sm" variant="warning">
              {view.mode === 'pairs' ? 'คนใบ้' : 'Psychic'}
            </Badge>
          ) : null}
          {isGuesser && view.phase !== 'game_over' && !isPsychic ? (
            <Badge size="sm" variant="success">
              คนทาย
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
          {score} แต้ม
        </Badge>
      ),
    };
  });
}
