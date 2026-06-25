import { Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { CAMEL_UP_STARTING_EP, type CamelUpPlayerView } from 'shared';
import { GameOverModal } from '../../components/game-shell';
import { CAMEL_COLOR_LABEL } from './camelMeta';

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
        const overallWinnerPayout = score?.overallWinnerPayout ?? 0;
        const overallLoserPayout = score?.overallLoserPayout ?? 0;
        const totalEp = score?.totalEp ?? p.ep;
        const epBeforeOverall = totalEp - overallWinnerPayout - overallLoserPayout;
        const legAccumulated = epBeforeOverall - CAMEL_UP_STARTING_EP;

        return {
          id: p.id,
          name: nameById.get(p.id) ?? p.id,
          legAccumulated,
          overallWinnerPayout,
          overallLoserPayout,
          totalEp,
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
      onLeave={onLeave}
      onRestart={onRestart}
    >
      <div className="camel-up-game-over-hero">
        <Trophy
          className={[
            'camel-up-game-over-trophy',
            iWon ? 'camel-up-game-over-trophy--me' : '',
          ].join(' ')}
          size={48}
          strokeWidth={1.6}
          aria-hidden
        />
        <p className="camel-up-game-over-kicker">เกมจบแล้ว</p>
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
        {gameState.raceWinnerColor ? (
          <p className="camel-up-game-over-race">
            อูฐชนะ: <strong>{CAMEL_COLOR_LABEL[gameState.raceWinnerColor]}</strong>
            {gameState.raceLoserColor ? (
              <>
                {' '}
                · อูฐแพ้: <strong>{CAMEL_COLOR_LABEL[gameState.raceLoserColor]}</strong>
              </>
            ) : null}
          </p>
        ) : null}
        {gameState.result?.reason ? (
          <p className="camel-up-game-over-reason">{gameState.result.reason}</p>
        ) : null}
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
                เดิมพัน Leg สะสม
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
                  {row.name}
                  {row.isMe ? <span className="camel-up-leg-end-table__you">คุณ</span> : null}
                </td>
                <td className="camel-up-leg-end-table__gain">
                  {row.legAccumulated > 0 ? (
                    <strong>+{row.legAccumulated}</strong>
                  ) : (
                    <span className="camel-up-leg-end-table__zero">0</span>
                  )}
                </td>
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
    </GameOverModal>
  );
}
