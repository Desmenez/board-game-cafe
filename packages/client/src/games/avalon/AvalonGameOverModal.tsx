import { Skull, Trophy } from 'lucide-react';
import type { AvalonPlayerView } from 'shared';
import { getTeamForRole } from 'shared';
import { GameOverModal } from '../../components/game-shell';
import { PlayerIdentity } from '../../components/player-avatar';
import { getAvalonRolePortraitUrl, imageMap } from '../../imageMap';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import { ROLE_LABEL } from './avalonRoles';

type Props = {
  gameState: AvalonPlayerView;
  onLeave: () => void;
  onRestart?: () => void;
};

export function AvalonGameOverModal({ gameState, onLeave, onRestart }: Props) {
  const winner = gameState.winner;

  return (
    <GameOverModal
      titleId="avalon-game-over-title"
      onLeave={onLeave}
      onRestart={onRestart}
      panelClassName="max-w-2xl"
      startCelebration={startWinCelebrationLoop}
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-pill border border-rule bg-paper-3 text-pear">
          {winner === 'good' ? <Trophy size={32} aria-hidden /> : <Skull size={32} aria-hidden />}
        </div>
        <h2
          id="avalon-game-over-title"
          className={`font-display text-xl font-extrabold ${
            winner === 'good' ? 'text-success' : 'text-error'
          }`}
        >
          {winner === 'good' ? 'ฝ่ายดีชนะ' : 'ฝ่ายชั่วชนะ'}
        </h2>
        <p className="mt-2 text-ink-2">{gameState.winReason}</p>

        <h3 className="mt-6 font-display text-lg font-bold text-ink">เปิดเผย Role ทั้งหมด</h3>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2">
          {gameState.players.map((p) => {
            const label = p.role ? ROLE_LABEL[p.role] : '?';
            const art = p.role
              ? getAvalonRolePortraitUrl(p.role, p.portraitVariant)
              : imageMap.avalon.cover;
            const rTeam = p.role ? getTeamForRole(p.role) : (p.team ?? 'good');
            return (
              <div
                key={p.id}
                className={`rounded-input border bg-paper-3 p-2 ${
                  rTeam === 'good' ? 'border-success/60' : 'border-error/60'
                }`}
              >
                <img
                  src={art}
                  alt={label}
                  className="aspect-square w-full rounded-input border border-rule object-cover"
                  loading="lazy"
                />
                <PlayerIdentity
                  playerId={p.id}
                  name={p.name}
                  avatarSize={28}
                  className="mt-2"
                  nameClassName="font-bold"
                />
                <div className="truncate text-xs text-ink-2">{label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </GameOverModal>
  );
}
