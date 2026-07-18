import { Check, X } from 'lucide-react';
import type { AvalonPlayerView } from 'shared';
import { Badge } from '../../../components/ui';
import { GameHistoryDisclosure } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';

type Props = {
  quests: AvalonPlayerView['quests'];
  players: AvalonPlayerView['players'];
};

export function AvalonQuestHistoryDock({ quests, players }: Props) {
  if (!quests || quests.length === 0) return null;

  return (
    <GameHistoryDisclosure
      title={`ประวัติ Quest (${quests.length})`}
      note="แสดงเฉพาะข้อมูลสาธารณะ: ผู้เล่นที่ไป Quest และผลสำเร็จหรือล้มเหลว"
    >
      <div className="grid gap-2">
        {[...quests]
          .slice(-5)
          .reverse()
          .map((q) => {
            const result = q.result ?? 'pending';
            const resultLabel =
              result === 'success' ? 'สำเร็จ' : result === 'fail' ? 'ล้มเหลว' : 'รอผล';
            return (
              <article
                key={q.questNumber}
                className="flex flex-col gap-2 rounded-input border border-rule bg-paper-3 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <strong className="font-label text-sm text-ink">Quest {q.questNumber + 1}</strong>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {q.teamPlayerIds.map((id) => {
                      const player = players.find((candidate) => candidate.id === id);
                      return (
                        <PlayerIdentity
                          key={id}
                          playerId={id}
                          name={player?.name ?? '?'}
                          avatarSize={24}
                          className="rounded-pill border border-rule bg-paper-2 py-1 pr-2 pl-1"
                        />
                      );
                    })}
                  </div>
                </div>
                <Badge
                  variant={
                    result === 'success' ? 'success' : result === 'fail' ? 'danger' : 'outline'
                  }
                >
                  {result === 'success' ? (
                    <Check size={12} aria-hidden />
                  ) : result === 'fail' ? (
                    <X size={12} aria-hidden />
                  ) : null}
                  {resultLabel}
                </Badge>
              </article>
            );
          })}
      </div>
    </GameHistoryDisclosure>
  );
}
