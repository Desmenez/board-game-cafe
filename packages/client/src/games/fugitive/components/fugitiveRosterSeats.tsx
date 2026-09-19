import { Hand, Shield, UserRound } from 'lucide-react';
import type { FugitivePlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { cn } from '../../../utils/cn';

function handCountFor(gs: FugitivePlayerView, playerId: string): number {
  if (playerId === gs.myId) return gs.myHand?.length ?? 0;
  return gs.opponentHandCount;
}

export function buildFugitiveRosterSeats(gs: FugitivePlayerView): RosterSeat[] {
  const live = gs.phase !== 'game_over';
  return gs.players.map((player, index) => {
    const hand = handCountFor(gs, player.id);
    const isFugitive = player.role === 'fugitive';
    return {
      id: player.id,
      name: player.name,
      active: live && player.id === gs.activePlayerId,
      className: isFugitive ? 'fugitive-roster-seat--fugitive' : 'fugitive-roster-seat--marshal',
      leading: (
        <span className="text-xs tabular-nums" aria-label={`ลำดับที่ ${index + 1}`}>
          {index + 1}
        </span>
      ),
      badges: (
        <>
          <span
            className={cn(
              'fugitive-role-badge',
              isFugitive ? 'fugitive-role-badge--fugitive' : 'fugitive-role-badge--marshal',
            )}
          >
            {isFugitive ? <UserRound size={12} aria-hidden /> : <Shield size={12} aria-hidden />}
            {isFugitive ? 'Fugitive' : 'Marshal'}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full border border-rule bg-paper-3 px-2 py-0.5 text-[0.72rem] font-semibold tabular-nums text-ink-2"
            title="การ์ดในมือ"
            aria-label={`มือ ${hand} ใบ`}
          >
            <Hand size={12} strokeWidth={2.25} aria-hidden />
            <span>{hand}</span>
          </span>
        </>
      ),
    };
  });
}
