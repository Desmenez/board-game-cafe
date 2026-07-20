import { useCallback, useMemo } from 'react';
import { Moon, Shield, Skull, Trophy, Users } from 'lucide-react';
import type { Salem1692PlayerView, Salem1692PublicPlayer, Salem1692SecretRole } from 'shared';
import { Badge } from '../../../components/ui';
import { GameOverModal } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { startSalem1692WinCelebrationLoop } from '../../../utils/winCelebration';

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

type RoleGroupId = 'witch' | 'constable' | 'townsfolk';

const ROLE_GROUPS: {
  id: RoleGroupId;
  title: string;
  icon: typeof Moon;
}[] = [
  { id: 'witch', title: 'แม่มด', icon: Moon },
  { id: 'constable', title: 'Constable', icon: Shield },
  { id: 'townsfolk', title: 'ชาวเมือง', icon: Users },
];

function groupIdFor(p: Salem1692PublicPlayer): RoleGroupId {
  const reveal = p.endReveal;
  if (reveal?.isWitchTeam) return 'witch';
  if (reveal?.secretRole === 'constable') return 'constable';
  return 'townsfolk';
}

export function Salem1692GameOverModal({ gameState, myId, onLeave, onRestart }: Props) {
  const result = gameState.gameResult;
  const witchesWin = gameState.winningSide === 'witch';
  const winnerSet = new Set(result?.winners ?? []);

  const startCelebration = useCallback(
    () => startSalem1692WinCelebrationLoop(witchesWin ? 'witch' : 'town'),
    [witchesWin],
  );

  const grouped = useMemo(() => {
    const buckets: Record<RoleGroupId, Salem1692PublicPlayer[]> = {
      witch: [],
      constable: [],
      townsfolk: [],
    };
    for (const p of gameState.players) {
      buckets[groupIdFor(p)].push(p);
    }
    return buckets;
  }, [gameState.players]);

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
        <div className="s1692-game-over-roles__groups">
          {ROLE_GROUPS.map((group) => {
            const members = grouped[group.id];
            if (members.length === 0) return null;
            const Icon = group.icon;
            return (
              <div
                key={group.id}
                className={`s1692-game-over-group s1692-game-over-group--${group.id}`}
              >
                <h4 className="s1692-game-over-group__heading">
                  <span className="s1692-game-over-group__icon" aria-hidden>
                    <Icon size={16} strokeWidth={2.25} />
                  </span>
                  <span>{group.title}</span>
                  <span className="s1692-game-over-group__count">{members.length}</span>
                </h4>
                <ul className="s1692-game-over-group__list">
                  {members.map((p) => {
                    const reveal = p.endReveal;
                    const role: Salem1692SecretRole = reveal?.secretRole ?? 'townsfolk';
                    const won = winnerSet.has(p.id);
                    const isMe = p.id === myId;
                    const secondary = [
                      ROLE_LABEL[role],
                      reveal?.isConstable && role !== 'constable' ? 'เคยถือ Constable' : null,
                      !p.alive ? 'ตาย' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ');

                    return (
                      <li
                        key={p.id}
                        className={[
                          's1692-game-over-seat',
                          won ? 's1692-game-over-seat--winner' : '',
                          !p.alive ? 's1692-game-over-seat--dead' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <PlayerIdentity
                          playerId={p.id}
                          name={`${p.name}${isMe ? ' (คุณ)' : ''}`}
                          avatarSize={32}
                          className="s1692-game-over-seat__identity"
                          nameClassName="s1692-game-over-seat__name"
                          secondary={secondary}
                          trailing={
                            <span className="s1692-game-over-seat__trailing">
                              {won ? (
                                <Badge size="sm" variant="warning">
                                  ชนะ
                                </Badge>
                              ) : null}
                              {!p.alive ? (
                                <span className="s1692-game-over-seat__dead" aria-hidden>
                                  <Skull size={14} strokeWidth={2.25} />
                                </span>
                              ) : null}
                            </span>
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </GameOverModal>
  );
}
