import { useEffect, useState } from 'react';
import type { TtrDestinationTicket, TtrMapDefinition } from 'shared';
import { ttrCityName } from 'shared';
import { Button } from '../../../components/ui';
import { imageMap } from '../../../imageMap';
import type { TtrBoardLayout } from '../boardGeometry';
import { TtrTicketPreview } from './TtrTicketPreview';

type Props = {
  map: TtrMapDefinition;
  layout: TtrBoardLayout;
  tickets: TtrDestinationTicket[];
  minKeep: number;
  isInitialChoice: boolean;
  keepIds: string[];
  onToggleKeep: (ticketId: string) => void;
  onHoverTicket: (ticketId: string | null) => void;
  onConfirm: () => void;
};

export function TtrTicketChoiceDock({
  map,
  layout,
  tickets,
  minKeep,
  isInitialChoice,
  keepIds,
  onToggleKeep,
  onHoverTicket,
  onConfirm,
}: Props) {
  const [revealed, setRevealed] = useState(0);
  const signature = tickets.map((t) => t.id).join('|');

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
              ? `เลือกตั๋วเริ่มต้น (อย่างน้อย ${minKeep})`
              : `เลือกตั๋วที่จั่ว (อย่างน้อย ${minKeep})`}
          </h2>
          <div className="ttr-ticket-choice-dock__actions">
            <p className="ttr-ticket-choice-dock__progress">
              เลือกแล้ว {keepIds.length}/{minKeep} ใบขั้นต่ำ
            </p>
            <Button type="button" disabled={keepIds.length < minKeep} onClick={onConfirm}>
              ยืนยัน
            </Button>
          </div>
        </div>
        <p className="ttr-ticket-choice-dock__hint muted">
          ชี้ที่การ์ดเพื่อไฮไลต์เมืองบนแผนที่ · คลิกเพื่อเลือก/ยกเลิก
        </p>
        <div className="ttr-ticket-choice-dock__list">
          {tickets.map((t, i) => {
            const picked = keepIds.includes(t.id);
            const cityA = ttrCityName(map, t.a);
            const cityB = ttrCityName(map, t.b);
            return (
              <button
                type="button"
                key={t.id}
                className={`ttr-ticket-choice ttr-ticket-choice--dock${picked ? ' picked' : ''}`}
                title={`${cityA} → ${cityB} (${t.points} แต้ม)`}
                onMouseEnter={() => onHoverTicket(t.id)}
                onMouseLeave={() => onHoverTicket(null)}
                onFocus={() => onHoverTicket(t.id)}
                onBlur={() => onHoverTicket(null)}
                onClick={() => onToggleKeep(t.id)}
              >
                <div className={`ttr-ticket-flip${i < revealed ? ' is-revealed' : ''}`}>
                  <div className="ttr-ticket-flip-face ttr-ticket-flip-front">
                    <div className="ttr-ticket-preview-shell">
                      <TtrTicketPreview map={map} layout={layout} a={t.a} b={t.b} />
                    </div>
                    <div className="ttr-ticket-choice-meta">
                      <span className="ttr-ticket-choice-city">{cityA}</span>
                      <span className="ttr-ticket-choice-points">{t.points}</span>
                      <span className="ttr-ticket-choice-city">{cityB}</span>
                    </div>
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
