import { Coins } from 'lucide-react';
import type { CamelUpPlayerView } from 'shared';
import { Badge } from '../../../components/ui';
import { GameHistoryDisclosure } from '../../../components/game-shell';
import { PlayerRosterStrip } from '../../../components/player-roster';

type Props = {
  players: CamelUpPlayerView['players'];
  myId: string;
  activePlayerId: string | null;
};

export function CamelUpPlayerBar({ players, myId, activePlayerId }: Props) {
  return (
    <GameHistoryDisclosure
      title="ลำดับ & คะแนน"
      note="เรียงตามที่นั่ง · EP ปัจจุบัน"
      defaultOpen
      className="sticky top-4 z-20 shadow-card"
    >
      <PlayerRosterStrip
        layout="grid"
        myId={myId}
        ariaLabel="ลำดับผู้เล่น"
        seats={players.map((p, index) => {
          const isTurn = p.id === activePlayerId;
          const isMe = p.id === myId;

          return {
            id: p.id,
            name: p.name,
            active: isTurn,
            leading: (
              <span
                className="text-xs font-semibold text-ink-2"
                aria-label={`ลำดับที่ ${index + 1}`}
              >
                {index + 1}
              </span>
            ),
            badges: isTurn ? (
              <Badge size="sm" variant="warning">
                ตา
              </Badge>
            ) : null,
            status: (
              <Badge size="sm" variant={isMe ? 'accent' : 'outline'} aria-label={`${p.ep} EP`}>
                <Coins size={11} aria-hidden />
                {p.ep} EP
              </Badge>
            ),
          };
        })}
      />
    </GameHistoryDisclosure>
  );
}
