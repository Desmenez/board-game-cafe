import { Crown, Swords } from 'lucide-react';
import type { AvalonPhase, AvalonRole, AvalonTeam } from 'shared';
import { Badge } from '../../components/ui';
import { GameHistoryDisclosure } from '../../components/game-shell';
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
    <GameHistoryDisclosure
      title="สถานะผู้เล่น"
      defaultOpen
      className="sticky top-4 z-20 shadow-card"
    >
      <PlayerRosterStrip
        layout="grid"
        myId={myId}
        seats={players.map((p) => {
          const isMe = p.id === myId;
          const isLeader = p.id === leaderId;
          const isInQuestTeam = selectedTeam.includes(p.id);
          const voted = teamVotes[p.id] !== undefined;
          const voteStatus =
            phase !== 'team_vote'
              ? null
              : voted || (awaitingTeamVoteFrom != null && !waitingVoteSet.has(p.id))
                ? 'โหวตแล้ว'
                : 'ยังไม่โหวต';

          return {
            id: p.id,
            name: p.name,
            // Focus ring = current actor only. Leader badge stays for identity;
            // vote waiting stays in status (never steals --active).
            active: phase === 'team_building' && isLeader,
            badges: (
              <>
                {isLeader ? (
                  <Badge size="sm" variant="warning">
                    <Crown size={11} aria-hidden /> Leader
                  </Badge>
                ) : null}
                {isInQuestTeam ? (
                  <Badge size="sm" variant="success">
                    <Swords size={11} aria-hidden /> Quest
                  </Badge>
                ) : null}
              </>
            ),
            status: voteStatus ? (
              <span className={voteStatus === 'โหวตแล้ว' ? 'text-success' : 'text-ink-2'}>
                {voteStatus}
              </span>
            ) : (
              <span className="text-ink-2">{isMe ? 'มุมมองของคุณ' : 'พร้อมเล่น'}</span>
            ),
          };
        })}
      />
    </GameHistoryDisclosure>
  );
}
