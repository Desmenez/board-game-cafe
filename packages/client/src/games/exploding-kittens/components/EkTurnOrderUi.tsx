import type { ExplodingKittensPlayerView } from 'shared';
import { PlayerRosterStrip } from '../../../components/player-roster';
import { buildEkPlayerRosterSeats } from './ekPlayerRosterSeats';

/** ลำดับผู้เล่น — dock = แถบแนวตั้งขวา; แนวนอนใน modal อื่น */
export function EkModalTurnOrderStrip({
  gs,
  myId,
  hint,
  dock = true,
}: {
  gs: ExplodingKittensPlayerView;
  myId: string;
  hint?: string;
  dock?: boolean;
}) {
  return (
    <div
      className={`ek-modal-turn-strip${dock ? ' ek-modal-turn-strip--dock' : ''}`}
      role="region"
      aria-label="ลำดับผู้เล่นรอบโต๊ะ"
    >
      <div className="ek-modal-turn-strip__head">
        <span className="ek-modal-turn-strip__title">ลำดับการเล่น</span>
        <span className="ek-modal-turn-strip__sub">เรียงตามที่นั่งโต๊ะ</span>
      </div>
      {hint ? <p className="ek-modal-turn-strip__hint">{hint}</p> : null}
      <PlayerRosterStrip
        className="ek-modal-turn-strip__roster"
        myId={myId}
        seats={buildEkPlayerRosterSeats(gs, { compact: true })}
      />
    </div>
  );
}
