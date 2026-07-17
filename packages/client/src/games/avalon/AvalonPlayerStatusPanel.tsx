import { Crown, Swords } from 'lucide-react';
import type { AvalonPhase, AvalonRole, AvalonTeam } from 'shared';
import { Badge } from '../../components/ui';
import { GamePhasePanel } from '../../components/game-shell';
import { PlayerRosterStrip } from '../../components/player-roster';

type Props = {
  players: { id: string; name: string; role?: AvalonRole; team?: AvalonTeam }[];
  myId: string;
  leaderId: string;
  selectedTeam: string[];
  phase: AvalonPhase;
  teamVotes: Record<string, boolean>;
  awaitingTeamVoteFrom?: { id: string; name: string }[];
};

export function AvalonPlayerStatusPanel({
  players,
  myId,
  leaderId,
  selectedTeam,
  phase,
  teamVotes,
  awaitingTeamVoteFrom,
}: Props) {
  const waitingVoteSet = new Set((awaitingTeamVoteFrom ?? []).map((p) => p.id));

  return (
    <GamePhasePanel title="สถานะผู้เล่น" as="section">
      <PlayerRosterStrip
        layout="grid"
        myId={myId}
        seats={players.map((p) => {
          const isMe = p.id === myId;
          const isInQuestTeam = selectedTeam.includes(p.id);
          const voted = teamVotes[p.id] !== undefined;
          const voteStatus =
            phase !== 'team_vote'
              ? null
              : voted
                ? 'โหวตแล้ว'
                : waitingVoteSet.has(p.id)
                  ? 'ยังไม่โหวต'
                  : 'รอผล';

          return {
            id: p.id,
            name: p.name,
            active: p.id === leaderId,
            badges: (
              <>
                {p.id === leaderId ? (
                  <Badge size="sm" variant="warning">
                    <Crown size={11} aria-hidden /> Leader
                  </Badge>
                ) : null}
                {isInQuestTeam ? (
                  <Badge size="sm" variant="accent">
                    <Swords size={11} aria-hidden /> Quest
                  </Badge>
                ) : null}
              </>
            ),
            status: voteStatus ? (
              <span className={voted ? 'text-success' : 'text-ink-2'}>{voteStatus}</span>
            ) : (
              <span className="text-ink-2">{isMe ? 'มุมมองของคุณ' : 'พร้อมเล่น'}</span>
            ),
          };
        })}
      />
    </GamePhasePanel>
  );
}
