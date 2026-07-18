import type { ExplodingKittensPlayerView } from 'shared';
import { GameHistoryDisclosure } from '../../../components/game-shell';
import { PlayerRosterStrip } from '../../../components/player-roster';
import { getTurnSpotlight } from '../lib/turnSpotlight';
import { spotlightColClass } from '../lib/playerBadges';
import { CARD_LABEL } from '../lib/cardMeta';
import { EkSpotlightFrontBadges } from './EkTurnOrderUi';
import { buildEkPlayerRosterSeats } from './ekPlayerRosterSeats';

type TurnSpotlight = ReturnType<typeof getTurnSpotlight>;
type Me = ExplodingKittensPlayerView['players'][number] | undefined;

type Props = {
  gs: ExplodingKittensPlayerView;
  myId: string;
  turnSpotlight: TurnSpotlight;
  phaseHint: string | undefined;
  aliveCount: number;
  me: Me;
};

export function EkStatusSummary({ gs, myId, turnSpotlight, phaseHint, aliveCount, me }: Props) {
  return (
    <div className="card ek-status-summary">
      <div className="ek-turn-spotlight" aria-label="ลำดับการเล่นรอบโต๊ะ">
        <div className={`ek-turn-spotlight__col${spotlightColClass(gs, turnSpotlight.prev)}`}>
          <span className="ek-turn-spotlight__label">คนที่แล้ว</span>
          {turnSpotlight.prev ? (
            <>
              <span className="ek-turn-spotlight__name">{turnSpotlight.prev.name}</span>
              {turnSpotlight.prev.id === myId && (
                <span className="ek-turn-spotlight__you">คุณ</span>
              )}
              <EkSpotlightFrontBadges gs={gs} player={turnSpotlight.prev} />
              {turnSpotlight.prev.pendingTurns > 1 && (
                <span className="ek-turn-spotlight__meta">
                  ค้าง {turnSpotlight.prev.pendingTurns} เทิร์น
                </span>
              )}
            </>
          ) : (
            <span className="ek-turn-spotlight__empty">—</span>
          )}
        </div>
        <div
          className={`ek-turn-spotlight__col ek-turn-spotlight__col--current${spotlightColClass(gs, turnSpotlight.current)}`}
        >
          <span className="ek-turn-spotlight__label">ตาปัจจุบัน</span>
          {turnSpotlight.current ? (
            <>
              <span className="ek-turn-spotlight__name">{turnSpotlight.current.name}</span>
              {turnSpotlight.current.id === myId && turnSpotlight.current.alive && (
                <span className="ek-turn-spotlight__you">คุณ</span>
              )}
              {!turnSpotlight.current.alive && (
                <span className="ek-turn-spotlight__dead">ตายแล้ว</span>
              )}
              <EkSpotlightFrontBadges gs={gs} player={turnSpotlight.current} />
              <span className="ek-turn-spotlight__meta">
                เหลือ {gs.pendingTurnsForCurrent} เทิร์น
              </span>
            </>
          ) : (
            <span className="ek-turn-spotlight__empty">—</span>
          )}
        </div>
        <div className={`ek-turn-spotlight__col${spotlightColClass(gs, turnSpotlight.next)}`}>
          <span className="ek-turn-spotlight__label">คนต่อไป</span>
          {turnSpotlight.next ? (
            <>
              <span className="ek-turn-spotlight__name">{turnSpotlight.next.name}</span>
              {turnSpotlight.next.id === myId && (
                <span className="ek-turn-spotlight__you">คุณ</span>
              )}
              <EkSpotlightFrontBadges gs={gs} player={turnSpotlight.next} />
              {turnSpotlight.next.pendingTurns > 1 && (
                <span className="ek-turn-spotlight__meta">
                  ค้าง {turnSpotlight.next.pendingTurns} เทิร์น
                </span>
              )}
            </>
          ) : (
            <span className="ek-turn-spotlight__empty">—</span>
          )}
        </div>
      </div>

      <GameHistoryDisclosure
        title={`ลำดับการเล่น · ${gs.players.length} คน`}
        note="ลำดับรอบโต๊ะและคนเริ่มก่อนถูกสุ่มตอนเริ่มเกม"
        className="ek-status-summary__roster"
      >
        <PlayerRosterStrip
          layout="grid"
          myId={myId}
          ariaLabel="ลำดับผู้เล่นรอบโต๊ะ"
          seats={buildEkPlayerRosterSeats(gs)}
        />
      </GameHistoryDisclosure>

      <ul className="ek-status-summary__tiles">
        <li className="ek-stat-tile">
          <span className="ek-stat-tile__label">คุณ</span>
          <span className="ek-stat-tile__value">
            <span className="ek-status-summary__strong">{me?.name ?? '-'}</span>
            {!me?.alive && <span className="ek-status-summary__dead"> · ตายแล้ว</span>}
          </span>
        </li>
        <li className="ek-stat-tile">
          <span className="ek-stat-tile__label">กองจั่ว / ทิ้ง</span>
          <span className="ek-stat-tile__value ek-status-summary__strong">
            {gs.drawPileCount} / {gs.discardCount}
          </span>
        </li>
        {gs.discardTop != null && (
          <li className="ek-stat-tile">
            <span className="ek-stat-tile__label">บนกองทิ้ง</span>
            <span className="ek-stat-tile__value">{CARD_LABEL[gs.discardTop]}</span>
          </li>
        )}
        <li className="ek-stat-tile">
          <span className="ek-stat-tile__label">ผู้รอด</span>
          <span className="ek-stat-tile__value ek-status-summary__strong">
            {aliveCount}/{gs.players.length}
          </span>
        </li>
        <li className="ek-stat-tile">
          <span className="ek-stat-tile__label">มือคุณ</span>
          <span className="ek-stat-tile__value ek-status-summary__strong">
            {gs.myHand.length} ใบ
          </span>
        </li>
        {phaseHint && (
          <li className="ek-stat-tile ek-stat-tile--wide">
            <span className="ek-stat-tile__label">สถานะเกม</span>
            <span className="ek-stat-tile__value">{phaseHint}</span>
          </li>
        )}
      </ul>
      {gs.lastEvent && (
        <p className="ek-status-summary__event">
          <span className="ek-status-summary__event-label">เหตุการณ์ล่าสุด</span>
          {gs.lastEvent}
        </p>
      )}
    </div>
  );
}
