import { useCallback } from 'react';
import { Skull, Trophy } from 'lucide-react';
import type { AvalonPlayerView } from 'shared';
import { getTeamForRole } from 'shared';
import { Badge } from '../../components/ui';
import { GameOverModal } from '../../components/game-shell';
import { PlayerIdentity } from '../../components/player-avatar';
import { getAvalonRolePortraitUrl, imageMap } from '../../imageMap';
import { cn } from '../../utils/cn';
import { startAvalonWinCelebrationLoop } from '../../utils/winCelebration';
import { ROLE_LABEL } from './avalonRoles';

type Props = {
  gameState: AvalonPlayerView;
  onLeave: () => void;
  onRestart?: () => void;
};

export function AvalonGameOverModal({ gameState, onLeave, onRestart }: Props) {
  const winner = gameState.winner;
  const goodWins = winner === 'good';

  const startCelebration = useCallback(
    () => startAvalonWinCelebrationLoop(goodWins ? 'good' : 'evil'),
    [goodWins],
  );

  return (
    <GameOverModal
      titleId="avalon-game-over-title"
      onLeave={onLeave}
      onRestart={onRestart}
      panelClassName={cn(
        'avalon-game-over-modal',
        goodWins ? 'avalon-game-over-modal--good' : 'avalon-game-over-modal--evil',
      )}
      startCelebration={startCelebration}
    >
      <header
        className={cn(
          'avalon-game-over-hero',
          goodWins ? 'avalon-game-over-hero--good' : 'avalon-game-over-hero--evil',
        )}
      >
        <div className="avalon-game-over-hero__icon" aria-hidden>
          {goodWins ? (
            <Trophy size={28} strokeWidth={1.75} />
          ) : (
            <Skull size={28} strokeWidth={1.75} />
          )}
        </div>
        <p className="avalon-game-over-hero__kicker">เกมจบแล้ว</p>
        <h2 id="avalon-game-over-title" className="avalon-game-over-hero__title">
          {goodWins ? 'ฝ่ายดีชนะ' : 'ฝ่ายชั่วชนะ'}
        </h2>
        {gameState.winReason ? (
          <p className="avalon-game-over-hero__reason">{gameState.winReason}</p>
        ) : null}
      </header>

      <section className="avalon-game-over-roles" aria-labelledby="avalon-roles-reveal-title">
        <h3 id="avalon-roles-reveal-title" className="avalon-game-over-roles__title">
          เปิดเผย Role ทั้งหมด
        </h3>
        <ul className="avalon-game-over-roles__grid my-2 md:my-4">
          {gameState.players.map((p) => {
            const label = p.role ? ROLE_LABEL[p.role] : '?';
            const art = p.role
              ? getAvalonRolePortraitUrl(p.role, p.portraitVariant)
              : imageMap.avalon.cover;
            const rTeam = p.role ? getTeamForRole(p.role) : (p.team ?? 'good');
            const isGood = rTeam === 'good';

            return (
              <li
                key={p.id}
                className={cn(
                  'avalon-game-over-role',
                  isGood ? 'avalon-game-over-role--good' : 'avalon-game-over-role--evil',
                )}
              >
                <div className="avalon-game-over-role__art">
                  <img src={art} alt="" loading="lazy" />
                  <Badge
                    size="sm"
                    variant={isGood ? 'success' : 'danger'}
                    className="avalon-game-over-role__team"
                  >
                    {isGood ? 'ฝ่ายดี' : 'ฝ่ายชั่ว'}
                  </Badge>
                </div>
                <PlayerIdentity
                  playerId={p.id}
                  name={p.name}
                  avatarSize={26}
                  className="avalon-game-over-role__identity"
                  nameClassName="avalon-game-over-role__name"
                  secondary={label}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </GameOverModal>
  );
}
