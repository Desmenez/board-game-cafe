import { useEffect, useState } from 'react';
import type { TtrDestinationTicket, TtrMapDefinition } from 'shared';
import { ttrCityName } from 'shared';
import { Button } from '../../../components/ui';
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
                ? `เลือกตั๋วเริ่มต้น: ตั๋ว Long บังคับเก็บ · เก็บรวมอย่างน้อย ${minKeep} ใบ`
                : `เลือกตั๋วเริ่มต้น: เก็บรวมอย่างน้อย ${minKeep} ใบ (ตั๋ว Long ไม่บังคับ)`
              : `เลือกตั๋วที่จั่ว (อย่างน้อย ${minKeep})`}
          </h2>
          <div className="ttr-ticket-choice-dock__actions">
            <p className="ttr-ticket-choice-dock__progress">
              เลือกแล้ว {keepCount}/{minKeep} ใบขั้นต่ำ
            </p>
            <Button type="button" disabled={!canConfirm} onClick={onConfirm}>
              ยืนยัน
            </Button>
          </div>
        </div>
        {isInitialChoice ? (
          <p className="ttr-ticket-choice-dock__hint muted">
            การ์ด Long มักเป็นภารกิจหลักของเกม เพราะคะแนนสูงมาก ถ้าทำสำเร็จจะได้เปรียบ
            แต่ถ้าทำไม่สำเร็จก็เสียคะแนนหนักเช่นกัน
            {longTicketsMandatory
              ? ' แผนที่นี้บังคับเก็บตั๋ว Long ที่ได้รับ จึงควรวางแผนสร้างเส้นทางของการ์ด Long ก่อน'
              : ' แผนที่นี้ทิ้งตั๋ว Long ได้ ถ้าเส้นทางไม่เข้ากับตั๋วใบอื่นก็ไม่ต้องฝืนเก็บ'}{' '}
            แล้วค่อยหาเส้นที่สามารถทำ Short Tickets ไปพร้อมกันเพื่อเก็บคะแนนเพิ่ม
          </p>
        ) : (
          <p className="ttr-ticket-choice-dock__hint muted">
            ชี้ที่การ์ดเพื่อไฮไลต์เมืองบนแผนที่ · คลิกเพื่อเลือก/ยกเลิก
          </p>
        )}
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
