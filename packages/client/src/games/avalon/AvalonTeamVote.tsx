import { Check, Crown, Swords, Vote, X } from 'lucide-react';
import { Badge } from '../../components/ui';
import {
  GameDecisionActions,
  GamePhasePanel,
  GameWaitingState,
  type GameProgressValue,
} from '../../components/game-shell';

type Props = {
  players: { id: string; name: string }[];
  selectedTeam: string[];
  teamVotes: Record<string, boolean>;
  teamVoteProgress?: GameProgressValue;
  awaitingTeamVoteFrom?: { id: string; name: string }[];
  leaderId: string;
  myId: string;
  onVote: (approve: boolean) => void;
};

export function AvalonTeamVote({
  players,
  selectedTeam,
  teamVotes,
  teamVoteProgress,
  awaitingTeamVoteFrom,
  leaderId,
  myId,
  onVote,
}: Props) {
  const hasVoted = teamVotes[myId] !== undefined;
  const allVoted =
    teamVoteProgress !== undefined
      ? teamVoteProgress.current >= teamVoteProgress.total
      : Object.keys(teamVotes).length === players.length;

  const teamNames = selectedTeam
    .map((id) => players.find((p) => p.id === id)?.name || '?')
    .join(', ');

  const proposedPlayers = selectedTeam
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is { id: string; name: string } => Boolean(p));

  const approvesCount = Object.values(teamVotes).filter(Boolean).length;
  const approved = approvesCount > players.length / 2;

  return (
    <GamePhasePanel
      title={
        <span className="inline-flex items-center gap-2">
          <Vote size={21} aria-hidden />
          โหวตทีม
        </span>
      }
      description="อนุมัติหรือปฏิเสธทีมที่ Leader เลือกให้ออกทำ Quest"
      meta={
        !allVoted && teamVoteProgress
          ? `โหวตแล้ว ${teamVoteProgress.current}/${teamVoteProgress.total} คน`
          : undefined
      }
    >
      <section
        className="rounded-input border border-rule bg-paper-3 p-3 sm:p-4"
        aria-labelledby="team-vote-quest-title"
      >
        <h3
          id="team-vote-quest-title"
          className="flex items-center gap-2 font-display text-base font-bold text-ink"
        >
          <Swords size={18} className="text-pear" aria-hidden />
          ทีมที่ไปทำภารกิจ
        </h3>
        {proposedPlayers.length > 0 ? (
          <div
            className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2"
            aria-label="ผู้เล่นที่ถูกเลือกให้ไปทำภารกิจ"
          >
            {proposedPlayers.map((p) => (
              <div
                key={p.id}
                className="flex min-w-0 items-center gap-2 rounded-input border border-rule bg-paper-2 p-2.5"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-pear font-label text-sm font-bold text-accent-ink"
                  aria-hidden
                >
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm text-ink">{p.name}</strong>
                  <span className="font-label text-xs text-ink-2">ไป Quest</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-2">
            <strong>{teamNames}</strong>
          </p>
        )}
      </section>

      {!allVoted && awaitingTeamVoteFrom && awaitingTeamVoteFrom.length > 0 && (
        <section
          className="mt-3 rounded-input border border-rule bg-paper-3 p-3 sm:p-4"
          aria-labelledby="team-vote-pending-title"
        >
          <h3
            id="team-vote-pending-title"
            className="flex items-center gap-2 font-display text-base font-bold text-ink"
          >
            <Vote size={18} className="text-pear" aria-hidden />
            ยังไม่โหวต
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="ผู้เล่นที่ยังไม่โหวต">
            {awaitingTeamVoteFrom.map((p) => (
              <li key={p.id}>
                <Badge variant="outline">{p.name}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasVoted ? (
        <GameDecisionActions
          className="mt-5"
          primary={{
            label: (
              <>
                <Check size={18} aria-hidden /> เห็นด้วย
              </>
            ),
            onSelect: () => onVote(true),
          }}
          secondary={{
            label: (
              <>
                <X size={18} aria-hidden /> ไม่เห็นด้วย
              </>
            ),
            onSelect: () => onVote(false),
          }}
        />
      ) : !allVoted ? (
        <GameWaitingState className="mt-5" progress={teamVoteProgress}>
          คุณโหวตแล้ว — รอผู้เล่นคนอื่น
        </GameWaitingState>
      ) : (
        <section
          className="mt-4 rounded-input border border-rule bg-paper-3 p-3 sm:p-4"
          aria-label="ผลโหวตทีมทั้งหมด"
        >
          <p
            className={`flex items-center gap-2 font-display text-base font-bold ${
              approved ? 'text-success' : 'text-error'
            }`}
          >
            {approved ? <Check size={19} aria-hidden /> : <X size={19} aria-hidden />}
            {approved ? 'โหวตผ่าน — ทีมเข้าสู่ Quest' : 'โหวตไม่ผ่าน — ทีมถูกปฏิเสธ'}
          </p>
          <p className="mt-1 text-sm text-ink-2">
            โหวตเห็นด้วย {approvesCount} / {players.length} คน (ต้องมากกว่าครึ่งเพื่อผ่าน)
          </p>
          <h4 className="mt-4 font-display text-sm font-bold text-ink">ผลโหวตรายคน</h4>
          <div
            className="mt-2 overflow-hidden rounded-input border border-rule bg-paper-2"
            role="list"
          >
            <div
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-rule bg-paper-4 px-3 py-2 font-label text-xs text-ink-2"
              aria-hidden
            >
              <span>ผู้เล่น</span>
              <span>การโหวต</span>
            </div>
            {players.map((p) => {
              const v = teamVotes[p.id];
              const isApprove = v === true;
              return (
                <div
                  key={p.id}
                  role="listitem"
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-rule px-3 py-2.5 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{p.name}</span>
                    {p.id === leaderId ? (
                      <Crown size={14} className="shrink-0 text-pear" aria-label="Leader" />
                    ) : null}
                  </div>
                  <Badge
                    variant={isApprove ? 'success' : 'danger'}
                    aria-label={isApprove ? 'เห็นด้วย' : 'ไม่เห็นด้วย'}
                  >
                    {isApprove ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
                    <span>{isApprove ? 'เห็นด้วย' : 'ไม่เห็นด้วย'}</span>
                  </Badge>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </GamePhasePanel>
  );
}
