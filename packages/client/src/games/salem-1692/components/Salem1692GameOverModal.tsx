import { useCallback } from 'react';
import { Moon, Skull, Trophy } from 'lucide-react';
import type { Salem1692PlayerView, Salem1692SecretRole } from 'shared';
import { Badge } from '../../../components/ui';
import { GameOverModal } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { startSalem1692WinCelebrationLoop } from '../../../utils/winCelebration';
import { salem1692TryalImage } from '../lib/cardMeta';

type Props = {
  gameState: Salem1692PlayerView;
  myId: string;
  onLeave: () => void;
  onRestart?: () => void;
};

const ROLE_LABEL: Record<Salem1692SecretRole, string> = {
  witch: 'Witch',
  constable: 'Constable',
  townsfolk: 'Townsfolk',
};

function roleArt(role: Salem1692SecretRole): string {
  if (role === 'witch') return salem1692TryalImage('witch');
  if (role === 'constable') return salem1692TryalImage('constable');
  return salem1692TryalImage('not_witch');
}

export function Salem1692GameOverModal({ gameState, myId, onLeave, onRestart }: Props) {
  const result = gameState.gameResult;
  const witchesWin = gameState.winningSide === 'witch';
  const winnerSet = new Set(result?.winners ?? []);

  const startCelebration = useCallback(
    () => startSalem1692WinCelebrationLoop(witchesWin ? 'witch' : 'town'),
    [witchesWin],
  );

  if (!result) return null;

  return (
    <GameOverModal
      titleId="s1692-game-over-title"
      onLeave={onLeave}
      onRestart={onRestart}
      panelClassName={[
        's1692-game-over-modal',
        witchesWin ? 's1692-game-over-modal--witch' : 's1692-game-over-modal--town',
      ].join(' ')}
      startCelebration={startCelebration}
    >
      <header
        className={[
          's1692-game-over-hero',
          witchesWin ? 's1692-game-over-hero--witch' : 's1692-game-over-hero--town',
        ].join(' ')}
      >
        <div className="s1692-game-over-hero__icon" aria-hidden>
          {witchesWin ? (
            <Moon size={28} strokeWidth={1.75} />
          ) : (
            <Trophy size={28} strokeWidth={1.75} />
          )}
        </div>
        <p className="s1692-game-over-hero__kicker">Salem 1692 — เกมจบแล้ว</p>
        <h2 id="s1692-game-over-title" className="s1692-game-over-hero__title">
          {witchesWin ? 'ฝ่ายแม่มดชนะ' : 'ชาวเมืองชนะ'}
        </h2>
        <p className="s1692-game-over-hero__reason">{result.reason}</p>
      </header>

      <section className="s1692-game-over-roles" aria-labelledby="s1692-roles-reveal-title">
        <h3 id="s1692-roles-reveal-title" className="s1692-game-over-roles__title">
          เปิดเผย Role ทั้งหมด
        </h3>
        <ul className="s1692-game-over-roles__grid">
          {gameState.players.map((p) => {
            const reveal = p.endReveal;
            const role: Salem1692SecretRole = reveal?.secretRole ?? 'townsfolk';
            const isWitch = reveal?.isWitchTeam === true;
            const won = winnerSet.has(p.id);
            const isMe = p.id === myId;
            const art = roleArt(role);
            const secondary = [
              ROLE_LABEL[role],
              reveal?.isConstable && role !== 'constable' ? 'ถือ Constable' : null,
              !p.alive ? 'ตาย' : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <li
                key={p.id}
                className={[
                  's1692-game-over-role',
                  isWitch ? 's1692-game-over-role--witch' : 's1692-game-over-role--town',
                  won ? 's1692-game-over-role--winner' : '',
                  !p.alive ? 's1692-game-over-role--dead' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="s1692-game-over-role__art">
                  <img src={art} alt="" loading="lazy" />
                  <Badge
                    size="sm"
                    variant={isWitch ? 'purple' : role === 'constable' ? 'accent' : 'success'}
                    className="s1692-game-over-role__team"
                  >
                    {isWitch ? 'แม่มด' : role === 'constable' ? 'Constable' : 'เมือง'}
                  </Badge>
                  {won ? (
                    <Badge size="sm" variant="warning" className="s1692-game-over-role__won">
                      ชนะ
                    </Badge>
                  ) : null}
                  {!p.alive ? (
                    <span className="s1692-game-over-role__dead-icon" aria-hidden>
                      <Skull size={14} strokeWidth={2.25} />
                    </span>
                  ) : null}
                </div>
                <PlayerIdentity
                  playerId={p.id}
                  name={`${p.name}${isMe ? ' (คุณ)' : ''}`}
                  avatarSize={26}
                  className="s1692-game-over-role__identity"
                  nameClassName="s1692-game-over-role__name"
                  secondary={secondary}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </GameOverModal>
  );
}
