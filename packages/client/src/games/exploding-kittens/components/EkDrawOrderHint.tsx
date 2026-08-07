import { useEffect, useRef } from 'react';
import { PlayerAvatar } from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';
import type { ExplodingKittensPlayerView } from 'shared';
import { getAliveDrawOrderAfterReinsert, whoDrawsAtInsertSlot } from '../lib/drawOrderHint';

type Player = ExplodingKittensPlayerView['players'][number];

type Props = {
  players: readonly Player[];
  fromPlayerId: string;
  myId: string;
  /** 1-based insert slot in the draw pile */
  insertSlot?: number;
  className?: string;
};

/**
 * Compact draw-order strip for defuse/bury reinsert —
 * highlights who would draw the card at the chosen pile position.
 */
export function EkDrawOrderHint({ players, fromPlayerId, myId, insertSlot, className }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const order = getAliveDrawOrderAfterReinsert(players, fromPlayerId);
  const hitId = insertSlot != null ? whoDrawsAtInsertSlot(players, fromPlayerId, insertSlot) : null;

  useEffect(() => {
    if (!hitId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-player-id="${hitId}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [hitId, insertSlot]);

  if (order.length === 0) return null;

  return (
    <div className={cn('ek-draw-order-hint', className)} aria-label="ลำดับจั่ว">
      <p className="ek-draw-order-hint__label">ลำดับจั่ว</p>
      <ol ref={listRef} className="ek-draw-order-hint__list">
        {order.map((p, i) => {
          const isNext = i === 0;
          const isHit = hitId != null && p.id === hitId;
          return (
            <li
              key={p.id}
              data-player-id={p.id}
              className={cn('ek-draw-order-hint__seat', isHit && 'ek-draw-order-hint__seat--slot')}
            >
              <span className="ek-draw-order-hint__idx" aria-hidden>
                {i + 1}
              </span>
              <PlayerAvatar playerId={p.id} name={p.name} size={32} decorative />
              <div className="ek-draw-order-hint__meta">
                <span className="ek-draw-order-hint__name">
                  {p.name}
                  {p.id === myId ? ' (คุณ)' : ''}
                </span>
                {isHit ? (
                  <span className="ek-draw-order-hint__tag ek-draw-order-hint__tag--slot">
                    โดนใบนี้
                  </span>
                ) : isNext ? (
                  <span className="ek-draw-order-hint__tag">จั่วถัดไป</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
