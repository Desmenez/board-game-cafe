import { Trophy } from 'lucide-react';
import { useMemo } from 'react';
import type { HuesAndCuesPlayerView } from 'shared';
import { GameOverModal } from '../../../components/game-shell';
import { Badge } from '../../../components/ui';
import type { MarkersMap } from '../lib/boardHelpers';
import { HuesBoardGrid } from './HuesBoardGrid';

type Props = {
  gs: HuesAndCuesPlayerView;
  myId: string;
  markersAtCell: MarkersMap;
  onLeave: () => void;
  onRestart?: () => void;
};

export function HuesGameOverModal({ gs, myId, markersAtCell, onLeave, onRestart }: Props) {
  const result = gs.gameResult;
  const winnerIds = useMemo(() => result?.winners ?? [], [result?.winners]);
  const iWon = winnerIds.includes(myId);

  const winnerNames = useMemo(
    () => winnerIds.map((id) => gs.playerNames[id] ?? id).join(' · '),
    [gs.playerNames, winnerIds],
  );

  const rows = useMemo(() => {
    const winners = new Set(winnerIds);
    const scores = result?.scores ?? gs.scores;
    return gs.playerOrder
      .map((id) => ({
        id,
        name: gs.playerNames[id] ?? id,
        score: scores[id] ?? 0,
        isWinner: winners.has(id),
        isMe: id === myId,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name, 'th');
      })
      .map((row, index) => ({ ...row, place: index + 1 }));
  }, [gs.playerNames, gs.playerOrder, gs.scores, myId, result?.scores, winnerIds]);

  if (!result) return null;

  return (
    <GameOverModal
      titleId="hac-game-over-title"
      panelClassName="hac-game-over-modal"
      onLeave={onLeave}
      onRestart={onRestart}
      tone={iWon ? 'win' : 'default'}
    >
      <div className="hac-game-over-hero">
        <Trophy
          className={['hac-game-over-trophy', iWon ? 'hac-game-over-trophy--me' : ''].join(' ')}
          size={40}
          strokeWidth={1.5}
          aria-hidden
        />
        <Badge size="sm" variant={iWon ? 'warning' : 'outline'}>
          เกมจบ
        </Badge>
        <h2
          id="hac-game-over-title"
          className={['hac-game-over-title', iWon ? 'hac-game-over-title--win' : ''].join(' ')}
        >
          {iWon ? 'ยินดีด้วย — คุณชนะ!' : 'สรุปผลการแข่งขัน'}
        </h2>
        {result.reason ? <p className="hac-game-over-reason">{result.reason}</p> : null}
        {winnerNames ? (
          <p className="hac-game-over-winners">
            ผู้ชนะ: <strong>{winnerNames}</strong>
          </p>
        ) : null}
      </div>

      <ol className="hac-game-over-list" aria-label="อันดับคะแนน">
        {rows.map((row) => (
          <li
            key={row.id}
            className={[
              'hac-game-over-row',
              row.isWinner ? 'hac-game-over-row--winner' : '',
              row.isMe ? 'hac-game-over-row--me' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="hac-game-over-place" aria-label={`อันดับ ${row.place}`}>
              {row.place}
            </span>
            <span className="hac-game-over-name">
              {row.name}
              {row.isMe ? (
                <Badge size="sm" variant="accent" className="ml-2">
                  คุณ
                </Badge>
              ) : null}
            </span>
            <span className="hac-game-over-score tabular-nums">{row.score}</span>
          </li>
        ))}
      </ol>

      {gs.target ? (
        <div className="hac-postgame-grid">
          <p className="hac-meta hac-postgame-board-hint">
            กระดานรอบสุดท้าย — กรอบขาวรอบพื้นที่ (5×5) = โซนคะแนนผู้ทาย · ตัวเลขกลางช่อง =
            คะแนนถ้าทายช่องนั้น · วงขาว = เป้าหมาย · ผู้ใบ้ได้แต้มจากมาร์กเกอร์ในกรอบ 3×3 เท่านั้น
          </p>
          <HuesBoardGrid
            gs={gs}
            myId={myId}
            markersAtCell={markersAtCell}
            canPlace1={false}
            canPlace2={false}
            onCellClick={() => {}}
            showChebyshevScores
            showTargetRing
            showCueGiverTargetRing={false}
            showScoreFootprint
          />
        </div>
      ) : null}
    </GameOverModal>
  );
}
