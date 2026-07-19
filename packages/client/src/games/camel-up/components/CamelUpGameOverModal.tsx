import { Trophy } from 'lucide-react';
import { useMemo } from 'react';
import type { CamelUpPlayerView } from 'shared';
import { GameOverModal } from '../../../components/game-shell';
import { PlayerAvatar } from '../../../components/player-avatar';
import { Badge } from '../../../components/ui';
import { CAMEL_COLOR_LABEL } from '../lib/camelMeta';

type Props = {
  gameState: CamelUpPlayerView;
  myId: string;
  onLeave: () => void;
  onRestart?: () => void;
};

const PLACE_MEDAL: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

function formatGain(value: number) {
  if (value > 0) return <strong>+{value}</strong>;
  if (value < 0) return <strong className="text-danger">{value}</strong>;
  return <span className="camel-up-leg-end-table__zero">0</span>;
}

export function CamelUpGameOverModal({ gameState, myId, onLeave, onRestart }: Props) {
  const winnerIds = useMemo(() => gameState.result?.winners ?? [], [gameState.result?.winners]);
  const iWon = winnerIds.includes(myId);

  const rows = useMemo(() => {
    const winners = new Set(winnerIds);
    const breakdown = gameState.scoringBreakdown ?? [];
    const byId = new Map(breakdown.map((b) => [b.playerId, b]));
    const nameById = new Map(gameState.players.map((p) => [p.id, p.name]));

    return gameState.players
      .map((p) => {
        const score = byId.get(p.id);
        return {
          id: p.id,
          name: nameById.get(p.id) ?? p.id,
          startingEp: score?.startingEp ?? 0,
          legEp: score?.legEp ?? 0,
          pyramidEp: score?.pyramidEp ?? 0,
          desertEp: score?.desertEp ?? 0,
          overallWinnerPayout: score?.overallWinnerPayout ?? 0,
          overallLoserPayout: score?.overallLoserPayout ?? 0,
          totalEp: score?.totalEp ?? p.ep,
          isWinner: winners.has(p.id),
          isMe: p.id === myId,
        };
      })
      .sort((a, b) => {
        if (b.totalEp !== a.totalEp) return b.totalEp - a.totalEp;
        return a.name.localeCompare(b.name, 'th');
      })
      .map((row, index) => ({ ...row, place: index + 1 }));
  }, [gameState.players, gameState.scoringBreakdown, myId, winnerIds]);

  const winnerNames = useMemo(
    () => winnerIds.map((id) => gameState.players.find((p) => p.id === id)?.name ?? id).join(' · '),
    [gameState.players, winnerIds],
  );

  return (
    <GameOverModal
      titleId="camel-up-game-over-title"
      panelClassName="camel-up-game-over-modal"
      overlayClassName="camel-up-game-over-overlay"
      onLeave={onLeave}
      onRestart={onRestart}
    >
      <div className="camel-up-game-over-hero">
        <Trophy
          className={[
            'camel-up-game-over-trophy',
            iWon ? 'camel-up-game-over-trophy--me' : '',
          ].join(' ')}
          size={40}
          strokeWidth={1.5}
          aria-hidden
        />
        <Badge size="sm" variant={iWon ? 'warning' : 'outline'}>
          เกมจบ
        </Badge>
        <h2
          id="camel-up-game-over-title"
          className={['camel-up-game-over-title', iWon ? 'camel-up-game-over-title--win' : ''].join(
            ' ',
          )}
        >
          {iWon ? 'ยินดีด้วย — คุณชนะ!' : 'สรุปผลการแข่งขัน'}
        </h2>
        {winnerNames ? (
          <p className="camel-up-game-over-winners">
            ผู้ชนะ: <strong>{winnerNames}</strong>
          </p>
        ) : null}
        {(gameState.raceWinnerColor || gameState.raceLoserColor) && (
          <p className="camel-up-game-over-race">
            {gameState.raceWinnerColor ? (
              <>
                อูฐชนะ:{' '}
                <span
                  className={`camel-up-leg-end-camel-chip camel-up-camel--${gameState.raceWinnerColor}`}
                >
                  {CAMEL_COLOR_LABEL[gameState.raceWinnerColor]}
                </span>
              </>
            ) : null}
            {gameState.raceLoserColor ? (
              <>
                {gameState.raceWinnerColor ? ' · ' : null}
                อูฐแพ้:{' '}
                <span
                  className={`camel-up-leg-end-camel-chip camel-up-camel--${gameState.raceLoserColor}`}
                >
                  {CAMEL_COLOR_LABEL[gameState.raceLoserColor]}
                </span>
              </>
            ) : null}
          </p>
        )}
      </div>

      <div className="camel-up-game-over-table-wrap">
        <table className="camel-up-leg-end-table camel-up-game-over-table" aria-label="สรุปคะแนน">
          <thead>
            <tr>
              <th scope="col" className="camel-up-game-over-table__th-rank">
                #
              </th>
              <th scope="col">ผู้เล่น</th>
              <th scope="col" className="camel-up-leg-end-table__th-num">
                เริ่ม
              </th>
              <th scope="col" className="camel-up-leg-end-table__th-num">
                จาก Leg
              </th>
              <th scope="col" className="camel-up-leg-end-table__th-num">
                Pyramid
              </th>
              <th scope="col" className="camel-up-leg-end-table__th-num">
                Oasis/Mirage
              </th>
              <th scope="col" className="camel-up-leg-end-table__th-num">
                ชนะทั้งเกม
              </th>
              <th scope="col" className="camel-up-leg-end-table__th-num">
                แพ้ทั้งเกม
              </th>
              <th scope="col" className="camel-up-leg-end-table__th-num">
                EP รวม
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={[
                  'camel-up-leg-end-table__row',
                  row.isMe ? 'camel-up-leg-end-table__row--me' : '',
                  row.isWinner ? 'camel-up-game-over-table__row--winner' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <td className="camel-up-game-over-table__rank" aria-label={`อันดับ ${row.place}`}>
                  {PLACE_MEDAL[row.place] ?? row.place}
                </td>
                <td className="camel-up-leg-end-table__name">
                  <span className="camel-up-leg-end-who">
                    <PlayerAvatar
                      playerId={row.id}
                      name={row.name}
                      size={28}
                      decorative
                      className="camel-up-leg-end-avatar"
                    />
                    <span className="camel-up-leg-end-who__text">
                      <span className="camel-up-leg-end-who__name">{row.name}</span>
                      {row.isMe ? (
                        <Badge size="sm" variant="accent">
                          คุณ
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                </td>
                <td className="camel-up-leg-end-table__num">{row.startingEp}</td>
                <td className="camel-up-leg-end-table__gain">{formatGain(row.legEp)}</td>
                <td className="camel-up-leg-end-table__gain">{formatGain(row.pyramidEp)}</td>
                <td className="camel-up-leg-end-table__gain">{formatGain(row.desertEp)}</td>
                <td className="camel-up-leg-end-table__gain">
                  {formatGain(row.overallWinnerPayout)}
                </td>
                <td className="camel-up-leg-end-table__gain">
                  {formatGain(row.overallLoserPayout)}
                </td>
                <td className="camel-up-leg-end-table__total">
                  <strong>{row.totalEp}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="camel-up-game-over-legend">
        Pyramid = ทอยพีระมิดใบละ 1 · Oasis/Mirage = แผ่นผู้ชมใบละ 1 · เดิมพันทั้งเกมถูกได้ 8/5/3/2/1
        · ผิดเสีย 1
      </p>
    </GameOverModal>
  );
}
