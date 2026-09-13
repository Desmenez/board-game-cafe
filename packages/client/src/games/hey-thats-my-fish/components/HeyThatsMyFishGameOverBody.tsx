import type { HeyThatsMyFishPlayerView } from 'shared';
import { rankHeyThatsMyFishPlayers } from 'shared';
import { PlayerIdentity } from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';
import { htmfPenguinSrc } from '../art';

type Props = {
  view: HeyThatsMyFishPlayerView;
  myId: string;
  titleId: string;
};

export function HeyThatsMyFishGameOverBody({ view, myId, titleId }: Props) {
  const ranked = rankHeyThatsMyFishPlayers(view.players);
  const winners = new Set(view.result?.winners ?? []);
  const iWon = winners.has(myId);

  return (
    <div className="space-y-4">
      <header className="text-center">
        <p className="mt-2 text-xs tracking-wide text-ink-3 uppercase">เกมจบแล้ว</p>
        <h2 id={titleId} className="font-display text-2xl font-bold text-ink">
          {iWon ? 'ยินดีด้วย — คุณชนะ!' : 'สรุปผล'}
        </h2>
        {view.result?.reason ? (
          <p className="mt-1 text-sm text-ink-2">{view.result.reason}</p>
        ) : null}
      </header>
      <ol className="space-y-2 text-left">
        {ranked.map((player, index) => {
          const isWinner = winners.has(player.id);
          return (
            <li
              key={player.id}
              className={cn(
                'flex flex-wrap items-center gap-3 rounded-lg border bg-paper-2 px-3 py-2',
                isWinner ? 'border-pear/50' : 'border-rule',
              )}
            >
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums',
                  index === 0 && 'bg-pear/20 text-pear',
                  index !== 0 && 'bg-paper-3 text-ink-2',
                )}
                aria-label={`อันดับ ${index + 1}`}
              >
                {index + 1}
              </span>
              <PlayerIdentity
                playerId={player.id}
                name={player.name}
                avatarSize={36}
                secondary={player.id === myId ? 'คุณ' : isWinner ? 'ชนะ' : undefined}
                className="min-w-0 flex-1"
                trailing={
                  <span className="ml-2 inline-flex items-center gap-2 text-sm">
                    <img src={htmfPenguinSrc(player.color)} alt="" className="h-7 w-auto" />
                    <span className="tabular-nums font-semibold">{player.fishScore} ปลา</span>
                    <span className="text-ink-3 tabular-nums">{player.tileScore} แผ่น</span>
                  </span>
                }
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
