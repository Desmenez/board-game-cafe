import { useCallback } from 'react';
import { Skull, Trophy } from 'lucide-react';
import type { OnuwPlayerView } from 'shared';
import { onuwTeamForRole } from 'shared';
import { GameOverModal } from '../../components/game-shell';
import { PlayerIdentity } from '../../components/player-avatar';
import { Badge } from '../../components/ui';
import { onuwRoleCardUrl } from '../../imageMap';
import { cn } from '../../utils/cn';
import { startAvalonWinCelebrationLoop } from '../../utils/winCelebration';
import { ROLE_LABEL_TH } from './onuwRoles';

type Props = {
  gameState: OnuwPlayerView;
  onLeave: () => void;
  onRestart?: () => void;
};

type WinSide = 'village' | 'werewolf' | 'none';

function resolveWinSide(gs: OnuwPlayerView): WinSide {
  const result = gs.gameResult;
  const roster = gs.morningRoster ?? [];
  if (result == null || result.winners.length === 0) return 'none';

  const teams = new Set(
    result.winners.map((id) => {
      const row = roster.find((r) => r.playerId === id);
      return row ? onuwTeamForRole(row.role) : null;
    }),
  );
  teams.delete(null);
  if (teams.size === 1 && teams.has('werewolf_team')) return 'werewolf';
  if (teams.size === 1 && teams.has('village_team')) return 'village';

  const first = roster.find((r) => r.playerId === result.winners[0]);
  if (first == null) return 'none';
  return onuwTeamForRole(first.role) === 'werewolf_team' ? 'werewolf' : 'village';
}

export function OnuwGameOverModal({ gameState, onLeave, onRestart }: Props) {
  const result = gameState.gameResult;
  const winSide = resolveWinSide(gameState);
  const villageWins = winSide === 'village';
  const werewolfWins = winSide === 'werewolf';
  const forfeit =
    result != null &&
    (result.reason.includes('ไม่ทำแอ็กชันกลางคืน') || result.reason.includes('หมดเวลาโหวต'));

  const rosterById = new Map((gameState.morningRoster ?? []).map((r) => [r.playerId, r] as const));
  const revealRows = gameState.players.map((p) => {
    const row = rosterById.get(p.id);
    return {
      playerId: p.id,
      name: p.name,
      role: row?.role ?? null,
      artKey: row?.artKey ?? null,
    };
  });

  const startCelebration = useCallback(() => {
    if (werewolfWins) return startAvalonWinCelebrationLoop('evil');
    if (villageWins) return startAvalonWinCelebrationLoop('good');
    return startAvalonWinCelebrationLoop('good');
  }, [villageWins, werewolfWins]);

  const title =
    forfeit || winSide === 'none'
      ? forfeit
        ? 'เกมจบก่อนกำหนด'
        : 'ไม่มีผู้ชนะ'
      : villageWins
        ? 'ฝ่ายหมู่บ้านชนะ'
        : 'ฝ่ายหมาป่าชนะ';

  return (
    <GameOverModal
      titleId="onuw-game-over-title"
      onLeave={onLeave}
      onRestart={onRestart}
      panelClassName={cn(
        'onuw-game-over-modal',
        villageWins && 'onuw-game-over-modal--village',
        werewolfWins && 'onuw-game-over-modal--werewolf',
      )}
      startCelebration={startCelebration}
    >
      <header
        className={cn(
          'onuw-game-over-hero',
          villageWins && 'onuw-game-over-hero--village',
          werewolfWins && 'onuw-game-over-hero--werewolf',
        )}
      >
        <div className="onuw-game-over-hero__icon" aria-hidden>
          {werewolfWins ? (
            <Skull size={28} strokeWidth={1.75} />
          ) : (
            <Trophy size={28} strokeWidth={1.75} />
          )}
        </div>
        <p className="onuw-game-over-hero__kicker">เกมจบแล้ว</p>
        <h2 id="onuw-game-over-title" className="onuw-game-over-hero__title">
          {title}
        </h2>
        {result?.reason ? <p className="onuw-game-over-hero__reason">{result.reason}</p> : null}
      </header>

      <section className="onuw-game-over-roles" aria-labelledby="onuw-roles-reveal-title">
        <h3 id="onuw-roles-reveal-title" className="onuw-game-over-roles__title">
          เปิดเผย Role ทั้งหมด
        </h3>
        <ul className="onuw-game-over-roles__grid my-2 md:my-4">
          {revealRows.map((row) => {
            const isWerewolf = row.role != null && onuwTeamForRole(row.role) === 'werewolf_team';
            const label = row.role != null ? ROLE_LABEL_TH[row.role] : '?';
            const art =
              row.artKey != null && row.artKey !== '' ? onuwRoleCardUrl(row.artKey) : null;

            return (
              <li
                key={row.playerId}
                className={cn(
                  'onuw-game-over-role',
                  isWerewolf ? 'onuw-game-over-role--werewolf' : 'onuw-game-over-role--village',
                )}
              >
                <div className="onuw-game-over-role__art">
                  {art ? <img src={art} alt="" loading="lazy" /> : null}
                  <Badge
                    size="sm"
                    variant={isWerewolf ? 'danger' : 'success'}
                    className="onuw-game-over-role__team"
                  >
                    {isWerewolf ? 'ฝ่ายหมาป่า' : 'ฝ่ายหมู่บ้าน'}
                  </Badge>
                </div>
                <PlayerIdentity
                  playerId={row.playerId}
                  name={row.name}
                  avatarSize={26}
                  className="onuw-game-over-role__identity"
                  nameClassName="onuw-game-over-role__name"
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
