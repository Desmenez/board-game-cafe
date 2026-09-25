import type { WavelengthPlayerView, WavelengthTeam } from 'shared';
import { PlayerIdentity } from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';
import { WL_TEAM_LABEL } from '../art';

type Props = {
  view: WavelengthPlayerView;
  myId: string;
  titleId: string;
};

function TeamBlock({
  team,
  view,
  myId,
  winner,
}: {
  team: WavelengthTeam;
  view: WavelengthPlayerView;
  myId: string;
  winner: boolean;
}) {
  const members = view.players.filter((player) => player.team === team);
  return (
    <li
      className={cn(
        'rounded-lg border bg-paper-2 px-3 py-3',
        winner ? 'border-pear/50' : 'border-rule',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-display font-bold">{WL_TEAM_LABEL[team]}</p>
        <p className="tabular-nums text-lg font-semibold">{view.scores[team]}</p>
      </div>
      <ul className="space-y-2">
        {members.map((player) => (
          <li key={player.id}>
            <PlayerIdentity
              playerId={player.id}
              name={player.name}
              avatarSize={32}
              secondary={player.id === myId ? 'คุณ' : undefined}
            />
          </li>
        ))}
      </ul>
    </li>
  );
}

export function WavelengthGameOverBody({ view, myId, titleId }: Props) {
  const winners = new Set(view.gameResult?.winners ?? []);
  const iWon = winners.has(myId);
  if (view.mode === 'pairs') {
    const ranked = [...view.players].sort(
      (a, b) => (view.playerScores[b.id] ?? 0) - (view.playerScores[a.id] ?? 0),
    );
    return (
      <div className="space-y-4">
        <header className="text-center">
          <p className="mt-2 text-xs tracking-wide text-ink-3 uppercase">เกมจบแล้ว</p>
          <h2 id={titleId} className="font-display text-2xl font-bold text-ink">
            {iWon ? 'ยินดีด้วย — คุณชนะ!' : 'สรุปผล'}
          </h2>
          {view.gameResult?.reason ? (
            <p className="mt-1 text-sm text-ink-2">{view.gameResult.reason}</p>
          ) : null}
        </header>
        <ol className="space-y-2">
          {ranked.map((player, index) => (
            <li
              key={player.id}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border bg-paper-2 px-3 py-2',
                winners.has(player.id) ? 'border-pear/50' : 'border-rule',
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-5 tabular-nums text-sm text-ink-3">{index + 1}</span>
                <PlayerIdentity
                  playerId={player.id}
                  name={player.name}
                  avatarSize={32}
                  secondary={player.id === myId ? 'คุณ' : undefined}
                />
              </div>
              <p className="tabular-nums text-lg font-semibold">
                {view.playerScores[player.id] ?? 0}
              </p>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  const orangeWins = view.players.some(
    (player) => player.team === 'orange' && winners.has(player.id),
  );
  const purpleWins = view.players.some(
    (player) => player.team === 'purple' && winners.has(player.id),
  );

  return (
    <div className="space-y-4">
      <header className="text-center">
        <p className="mt-2 text-xs tracking-wide text-ink-3 uppercase">เกมจบแล้ว</p>
        <h2 id={titleId} className="font-display text-2xl font-bold text-ink">
          {iWon ? 'ยินดีด้วย — ทีมคุณชนะ!' : 'สรุปผล'}
        </h2>
        {view.gameResult?.reason ? (
          <p className="mt-1 text-sm text-ink-2">{view.gameResult.reason}</p>
        ) : null}
      </header>
      <ol className="grid gap-3 sm:grid-cols-2">
        <TeamBlock team="orange" view={view} myId={myId} winner={orangeWins} />
        <TeamBlock team="purple" view={view} myId={myId} winner={purpleWins} />
      </ol>
    </div>
  );
}
