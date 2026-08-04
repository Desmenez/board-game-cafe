import { useEffect, useState } from 'react';
import type { TtrDestinationTicket, TtrMapDefinition } from 'shared';
import { ttrCityName } from 'shared';
import { Button } from '../../../components/ui';
import { useResponsiveSize } from '../../../hooks/useResponsiveSize';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { TtrDestinationCard } from './TtrDestinationCard';

type Props = {
  map: TtrMapDefinition;
  tickets: TtrDestinationTicket[];
  /** Minimum tickets that must be kept in total, including mandatory ones. */
  minKeep: number;
  /** How many tickets are currently picked in total, including mandatory ones. */
  keepCount: number;
  isInitialChoice: boolean;
  /** Setup only: dealt Long tickets may never be discarded on this map. */
  longTicketsMandatory: boolean;
  keepIds: string[];
  /** Ticket ids that must stay selected (setup Long tickets). */
  lockedIds: string[];
  canConfirm: boolean;
  onToggleKeep: (ticketId: string) => void;
  onHoverTicket: (ticketId: string | null) => void;
  onConfirm: () => void;
};

export function TtrTicketChoiceDock({
  map,
  tickets,
  minKeep,
  keepCount,
  isInitialChoice,
  longTicketsMandatory,
  keepIds,
  lockedIds,
  canConfirm,
  onToggleKeep,
  onHoverTicket,
  onConfirm,
}: Props) {
  const actionButtonSize = useResponsiveSize({ base: 'xs', md: 'md' });
  const [revealed, setRevealed] = useState(0);
  const signature = tickets.map((t) => t.id).join('|');
  const lockedIdSet = new Set(lockedIds);

  useEffect(() => {
    setRevealed(0);
    const timers = tickets.map((_, i) =>
      setTimeout(() => setRevealed((prev) => Math.max(prev, i + 1)), 120 + i * 160),
    );
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
    // Ticket identity, not array identity, drives the reveal animation.
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside
      className="ttr-ticket-choice-dock"
      role="region"
      aria-label={isInitialChoice ? 'เลือกตั๋วเริ่มต้น' : 'เลือกตั๋วที่จั่ว'}
    >
      <div className="ttr-ticket-choice-dock__inner">
        <div className="ttr-ticket-choice-dock__header">
          <h2 className="ttr-ticket-choice-dock__title">
            {isInitialChoice
              ? longTicketsMandatory
                ? `ตั๋วเริ่มต้น · Long บังคับ · ≥${minKeep}`
                : `ตั๋วเริ่มต้น · ≥${minKeep}`
              : `ตั๋วที่จั่ว · ≥${minKeep}`}
          </h2>
          <div className="ttr-ticket-choice-dock__actions">
            <p className="ttr-ticket-choice-dock__progress">
              {keepCount}/{minKeep}
            </p>
            <Button
              type="button"
              size={actionButtonSize}
              disabled={!canConfirm}
              onClick={onConfirm}
            >
              ยืนยัน
            </Button>
          </div>
        </div>
        <div className="ttr-ticket-choice-dock__list">
          {tickets.map((t, i) => {
            const locked = lockedIdSet.has(t.id);
            const picked = keepIds.includes(t.id);
            const cityA = ttrCityName(map, t.a);
            const cityB = ttrCityName(map, t.b);
            return (
              <button
                type="button"
                key={t.id}
                className={cn(
                  'ttr-ticket-choice ttr-ticket-choice--dock',
                  picked && 'picked',
                  locked && 'ttr-ticket-choice--locked',
                )}
                title={
                  locked
                    ? `Long · บังคับเก็บ · ${cityA} → ${cityB} (${t.points} แต้ม)`
                    : `${cityA} → ${cityB} (${t.points} แต้ม)`
                }
                aria-pressed={picked}
                aria-disabled={locked || undefined}
                onMouseEnter={() => onHoverTicket(t.id)}
                onMouseLeave={() => onHoverTicket(null)}
                onFocus={() => onHoverTicket(t.id)}
                onBlur={() => onHoverTicket(null)}
                onClick={() => onToggleKeep(t.id)}
              >
                {locked ? (
                  <span className="ttr-ticket-choice__lock-badge">Long · บังคับเก็บ</span>
                ) : null}
                <div className={`ttr-ticket-flip${i < revealed ? ' is-revealed' : ''}`}>
                  <div className="ttr-ticket-flip-face ttr-ticket-flip-front">
                    <TtrDestinationCard map={map} a={t.a} b={t.b} points={t.points} />
                  </div>
                  <div className="ttr-ticket-flip-face ttr-ticket-flip-back" aria-hidden>
                    <img
                      className="ttr-ticket-choice-back-img"
                      src={imageMap.ticketToRide.destinationCardBack}
                      alt=""
                      loading="lazy"
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
