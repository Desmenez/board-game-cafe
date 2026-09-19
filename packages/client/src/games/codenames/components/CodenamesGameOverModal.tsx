import { useCallback, useMemo } from 'react';
import type { CodenamesPlayerView, CodenamesTeam } from 'shared';
import { GameOverModal } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { Badge } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { startCodenamesWinCelebrationLoop } from '../../../utils/winCelebration';
import { CN_ROLE_LABEL, cnTeamName, cnTeamRoleCardSrc } from '../art';

type Props = {
  view: CodenamesPlayerView;
  myId: string;
  onLeave: () => void;
  onRestart?: () => void;
};

function TeamBlock({
  team,
  view,
  myId,
  winner,
}: {
  team: CodenamesTeam;
  view: CodenamesPlayerView;
  myId: string;
  winner: boolean;
}) {
  const members = view.players.filter((player) => player.team === team);
  const remaining = team === 'red' ? view.redRemaining : view.blueRemaining;

  return (
    <li
      className={cn(
        'rounded-lg border bg-paper-2 px-3 py-3',
        winner ? 'border-pear/50' : 'border-rule',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src={cnTeamRoleCardSrc(team)}
            alt=""
            className="h-auto w-9 rounded-md border border-white/20 object-cover"
            style={{ aspectRatio: '856 / 573' }}
          />
          <p className="font-display font-bold">{cnTeamName(team)}</p>
        </div>
        <p className="text-sm tabular-nums text-ink-2">เหลือ {remaining}</p>
      </div>
      <ul className="space-y-2">
        {members.map((player) => (
          <li key={player.id}>
            <PlayerIdentity
              playerId={player.id}
              name={player.name}
              avatarSize={32}
              secondary={player.id === myId ? 'คุณ' : undefined}
              trailing={
                <Badge size="sm" variant={player.role === 'spymaster' ? 'warning' : 'default'}>
                  {CN_ROLE_LABEL[player.role]}
                </Badge>
              }
            />
          </li>
        ))}
      </ul>
    </li>
  );
}

export function CodenamesGameOverModal({ view, myId, onLeave, onRestart }: Props) {
  const result = view.gameResult;
  const winnerTeam = useMemo((): CodenamesTeam | null => {
    if (!result?.winners.length) return null;
    const pid = result.winners[0];
    return view.players.find((player) => player.id === pid)?.team ?? null;
  }, [result, view.players]);

  const iWon = Boolean(result?.winners.includes(myId));
  const startCelebration = useCallback(() => {
    if (!winnerTeam) return () => undefined;
    return startCodenamesWinCelebrationLoop(winnerTeam);
  }, [winnerTeam]);

  return (
    <GameOverModal
      titleId="cn-game-over-title"
      gameId="codenames"
      onLeave={onLeave}
      onRestart={onRestart}
      tone={iWon ? 'win' : 'default'}
      startCelebration={winnerTeam ? startCelebration : undefined}
    >
      <div className="space-y-4">
        <header className="text-center">
          {winnerTeam ? (
            <img
              src={cnTeamRoleCardSrc(winnerTeam)}
              alt=""
              className="mx-auto mb-2 w-[min(118px,32vw)] rounded-xl border-2 border-white/25 object-cover"
              style={{ aspectRatio: '856 / 573' }}
            />
          ) : null}
          <p className="text-xs tracking-wide text-ink-3 uppercase">
            {winnerTeam ? 'ผู้ชนะ' : 'เกมจบแล้ว'}
          </p>
          <h2 id="cn-game-over-title" className="font-display text-2xl font-bold text-ink">
            {winnerTeam
              ? iWon
                ? `ยินดีด้วย — ${cnTeamName(winnerTeam)} ชนะ!`
                : `${cnTeamName(winnerTeam)} ชนะ`
              : 'จบเกม'}
          </h2>
          {result?.reason ? <p className="mt-1 text-sm text-ink-2">{result.reason}</p> : null}
        </header>
        <ol className="grid gap-3 sm:grid-cols-2">
          <TeamBlock team="red" view={view} myId={myId} winner={winnerTeam === 'red'} />
          <TeamBlock team="blue" view={view} myId={myId} winner={winnerTeam === 'blue'} />
        </ol>
      </div>
    </GameOverModal>
  );
}
