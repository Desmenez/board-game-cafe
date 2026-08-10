import type { HuesAndCuesPlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';

export function buildHuesRosterSeats(gs: HuesAndCuesPlayerView): RosterSeat[] {
  const maxScore = Math.max(0, ...Object.values(gs.scores));

  return gs.playerOrder.map((id, index) => {
    const score = gs.scores[id] ?? 0;
    const isCue = id === gs.cueGiverId;
    const lead = score === maxScore && maxScore > 0;

    return {
      id,
      name: gs.playerNames[id] ?? id,
      active: isCue,
      leading: (
        <span className="hac-roster-seat-index" aria-label={`ลำดับที่ ${index + 1}`}>
          {index + 1}
        </span>
      ),
      badges: (
        <>
          {isCue ? (
            <Badge size="sm" variant="warning" title="ผู้ให้คำใบ้ในรอบนี้">
              ผู้ใบ้
            </Badge>
          ) : null}
          {lead ? (
            <Badge size="sm" variant="success" title="คะแนนสูงสุด (หรือเสมอกัน)">
              นำ
            </Badge>
          ) : null}
        </>
      ),
      status: (
        <Badge size="sm" variant="default" aria-label={`${score} คะแนน`}>
          {score} คะแนน
        </Badge>
      ),
    };
  });
}
