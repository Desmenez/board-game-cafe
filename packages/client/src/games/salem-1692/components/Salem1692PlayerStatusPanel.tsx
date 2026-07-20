import { useState } from 'react';
import type { Salem1692PublicPlayer, Salem1692TryalCard } from 'shared';
import { Cat, Gavel, Moon, Skull } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { GameHistoryDisclosure } from '../../../components/game-shell';
import { PlayerRosterStrip } from '../../../components/player-roster';
// import { salem1692TownHallLabel } from '../lib/cardMeta'; // role abilities not supported yet
import { Salem1692PlayerInspectModal } from './Salem1692PlayerInspectModal';

type Props = {
  players: Salem1692PublicPlayer[];
  myId: string;
  currentPlayerId: string | null;
  /** Own tryal faces — used when inspecting yourself. */
  myTryals: Salem1692TryalCard[];
  /**
   * Private witch-team roster for this viewer only (`null` if not a witch).
   * Used so allies see each other's witch badge.
   */
  witchTeamIds: string[] | null;
};

export function Salem1692PlayerStatusPanel({
  players,
  myId,
  currentPlayerId,
  myTryals,
  witchTeamIds,
}: Props) {
  const [inspectId, setInspectId] = useState<string | null>(null);
  const inspectPlayer = inspectId ? (players.find((p) => p.id === inspectId) ?? null) : null;
  const witchIds = witchTeamIds ?? [];

  return (
    <>
      <GameHistoryDisclosure
        title="สถานะผู้เล่น"
        defaultOpen
        className="sticky top-4 z-20 shadow-card"
      >
        <PlayerRosterStrip
          layout="grid"
          myId={myId}
          className="s1692-player-status"
          seats={players.map((p) => {
            const isTurn = currentPlayerId === p.id;
            const frontCount = p.frontCards.length + (p.hasBlackCat ? 1 : 0);
            const showWitchBadge = witchIds.includes(p.id);
            const unrevealedTryalCount = (p.tryals ?? []).filter((t) => !t.revealed).length;

            return {
              id: p.id,
              name: p.name,
              active: isTurn,
              muted: !p.alive,
              skipped: p.alive && p.skippedNextTurn,
              onClick: () => setInspectId(p.id),
              badges: (
                <>
                  {!p.alive ? (
                    <Badge size="sm" variant="outline">
                      <Skull size={11} aria-hidden /> ตาย
                    </Badge>
                  ) : null}
                  {isTurn && p.alive ? (
                    <Badge size="sm" variant="warning">
                      เทิร์นนี้
                    </Badge>
                  ) : null}
                  {showWitchBadge ? (
                    <Badge size="sm" variant="purple">
                      <Moon size={11} aria-hidden /> แม่มด
                    </Badge>
                  ) : null}
                  {p.hasBlackCat ? (
                    <Badge size="sm" variant="info">
                      <Cat size={11} aria-hidden /> Black Cat
                    </Badge>
                  ) : null}
                  {p.hasGavel ? (
                    <Badge size="sm" variant="accent">
                      <Gavel size={11} aria-hidden /> Gavel
                    </Badge>
                  ) : null}
                </>
              ),
              status: (
                <div className="flex flex-col gap-0.5 text-xs! md:text-base!">
                  {/* <span>{salem1692TownHallLabel(p.townHallId)}</span> */}
                  {/* role abilities not supported yet */}
                  <span className="text-ink-2">มือ: {p.handCount}</span>
                  <span className="text-blue-400">ตรงหน้า: {frontCount}</span>
                  <span className="text-pink-400">Tryal คว่ำ: {unrevealedTryalCount}</span>
                  <span className="text-red-400 font-bold">Accusation: {p.accusationPoints}</span>
                  {p.stocksCount > 0 ? (
                    <span className="text-green-400 font-bold">Stocks: {p.stocksCount}</span>
                  ) : null}
                  {p.matchmakerPartnerName ? (
                    <span className="text-ink-2">Matchmaker → {p.matchmakerPartnerName}</span>
                  ) : null}
                </div>
              ),
            };
          })}
        />
      </GameHistoryDisclosure>

      {inspectPlayer ? (
        <Salem1692PlayerInspectModal
          player={inspectPlayer}
          isMe={inspectPlayer.id === myId}
          myTryals={myTryals}
          onClose={() => setInspectId(null)}
        />
      ) : null}
    </>
  );
}
