import { Gem } from 'lucide-react';
import type { SurviveTheIslandPlayerView } from 'shared';
import { PlayerIdentity } from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';
import { stiAdventurerSrc, stiArt } from '../art';
import { StiHexArt, StiStatChip } from './SurviveTheIslandTokens';

type Props = {
  view: SurviveTheIslandPlayerView;
  myId: string;
  titleId: string;
};

export function SurviveTheIslandGameOverBody({ view, myId, titleId }: Props) {
  const ranked = [...view.players].sort((a, b) => b.rescuedTreasure - a.rescuedTreasure);
  const winners = new Set(view.result?.winners ?? []);

  return (
    <div className="space-y-4">
      <header className="text-center">
        <StiHexArt src={stiArt.effects.volcano} alt="" size="lg" className="mx-auto w-16" />
        <p className="mt-2 text-xs tracking-wide text-ink-3 uppercase">เกมจบแล้ว</p>
        <h2 id={titleId} className="font-display text-2xl font-bold text-ink">
          เกาะจมแล้ว
        </h2>
        {view.result?.reason ? (
          <p className="mt-1 text-sm text-ink-2">{view.result.reason}</p>
        ) : null}
      </header>
      <ol className="space-y-2 text-left">
        {ranked.map((player, index) => {
          const adventurers = view.adventurers.filter((item) => item.playerId === player.id);
          const rescued = adventurers.filter((item) => item.rescued).length;
          const eliminated = adventurers.filter((item) => item.eliminated).length;
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
                  <span className="ml-2 inline-flex flex-wrap items-center justify-end gap-1">
                    <StiStatChip
                      src={stiAdventurerSrc(player.color)}
                      value={rescued}
                      label="ช่วยสำเร็จ"
                      emphasize={rescued > 0}
                    />
                    <StiStatChip
                      src={stiAdventurerSrc(player.color)}
                      value={eliminated}
                      label="สูญหาย"
                      dimmed
                    />
                    <StiStatChip
                      icon={<Gem size={12} aria-hidden />}
                      value={player.rescuedTreasure}
                      label="แต้มสมบัติ"
                      emphasize={player.rescuedTreasure > 0}
                    />
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
