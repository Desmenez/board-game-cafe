import { Landmark, Layers, Ticket, TrainFront, Trophy, Zap } from 'lucide-react';
import type { TtrPublicPlayer } from 'shared';
import { GameHistoryDisclosure } from '../../../components/game-shell';
import { PlayerRosterStrip } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';
import { ttrSeatClass } from '../ttrLabels';

type Props = {
  players: TtrPublicPlayer[];
  currentPlayerId: string;
  myId: string;
  seatByPlayerId: Record<string, number>;
  /** The countdown has reached the last action round for everyone. */
  isFinalRound: boolean;
  lastEvent: string;
  /** Europe maps start each player with stations; USA does not. */
  showStations?: boolean;
  /** Japan Bullet Train miniature supply remaining. */
  bulletTrainSupply?: number | null;
};

export function TtrPlayerBar({
  players,
  currentPlayerId,
  myId,
  seatByPlayerId,
  isFinalRound,
  lastEvent,
  showStations = false,
  bulletTrainSupply = null,
}: Props) {
  const showBulletTrain = bulletTrainSupply != null;
  return (
    <GameHistoryDisclosure
      title={`ผู้เล่น · ${players.length} คน`}
      defaultOpen
      className="ttr-player-bar sticky top-4 z-20"
      meta={
        <span className="ttr-player-bar__meta">
          {isFinalRound ? (
            <Badge size="sm" variant="danger">
              ตาสุดท้าย
            </Badge>
          ) : null}
          {showBulletTrain ? (
            <Badge size="sm" variant="info">
              BT {bulletTrainSupply}
            </Badge>
          ) : null}
          {lastEvent ? <span className="ttr-player-bar__event">{lastEvent}</span> : null}
        </span>
      }
    >
      <PlayerRosterStrip
        layout="grid"
        myId={myId}
        ariaLabel="สถานะผู้เล่น"
        seats={players.map((p, i) => {
          const isCurrent = p.id === currentPlayerId;
          return {
            id: p.id,
            name: p.name,
            active: isCurrent,
            leading: (
              <span
                className={`ttr-roster-seat-index ${ttrSeatClass(seatByPlayerId[p.id] ?? i)}`}
                aria-label={`ลำดับที่ ${i + 1}`}
              >
                {i + 1}
              </span>
            ),
            status: (
              <span className="ttr-roster-stats">
                <span className="ttr-roster-stat" aria-label={`${p.score} แต้ม`}>
                  <Trophy size={12} aria-hidden />
                  {p.score}
                </span>
                <span className="ttr-roster-stat" aria-label={`รถไฟคงเหลือ ${p.trainsLeft} ขบวน`}>
                  <TrainFront size={12} aria-hidden />
                  {p.trainsLeft}
                </span>
                {showBulletTrain ? (
                  <span
                    className="ttr-roster-stat"
                    aria-label={`Bullet Train progression ${p.bulletTrainProgression}`}
                  >
                    <Zap size={12} aria-hidden />
                    {p.bulletTrainProgression}
                  </span>
                ) : null}
                <span className="ttr-roster-stat" aria-label={`การ์ดรถไฟบนมือ ${p.handCount} ใบ`}>
                  <Layers size={12} aria-hidden />
                  {p.handCount}
                </span>
                <span className="ttr-roster-stat" aria-label={`ตั๋วปลายทาง ${p.ticketCount} ใบ`}>
                  <Ticket size={12} aria-hidden />
                  {p.ticketCount}
                </span>
                {showStations ? (
                  <span
                    className="ttr-roster-stat"
                    aria-label={`สถานีคงเหลือ ${p.stationsLeft ?? 0} หลัง`}
                  >
                    <Landmark size={12} aria-hidden />
                    {p.stationsLeft ?? 0}
                  </span>
                ) : null}
              </span>
            ),
          };
        })}
      />
    </GameHistoryDisclosure>
  );
}
