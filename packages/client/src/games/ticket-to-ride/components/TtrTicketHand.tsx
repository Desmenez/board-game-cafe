import type { TtrDestinationTicket, TtrMapDefinition } from 'shared';
import { ttrCityName } from 'shared';
import { cn } from '../../../utils/cn';
import type { TtrBoardLayout } from '../boardGeometry';
import { TtrTicketPreview } from './TtrTicketPreview';

type Props = {
  map: TtrMapDefinition;
  layout: TtrBoardLayout;
  tickets: TtrDestinationTicket[];
  completedIds: ReadonlySet<string>;
  selectedTicketId: string | null;
  onSelect: (ticketId: string) => void;
  /** `quick` is the compact strip under the board. */
  variant?: 'panel' | 'quick';
};

export function TtrTicketHand({
  map,
  layout,
  tickets,
  completedIds,
  selectedTicketId,
  onSelect,
  variant = 'panel',
}: Props) {
  if (tickets.length === 0) {
    return <p className="muted">ยังไม่มีตั๋วปลายทาง</p>;
  }
  return (
    <div className={variant === 'quick' ? 'ttr-quick-hand-under-map__row' : 'ttr-my-ticket-grid'}>
      {tickets.map((t) => {
        const done = completedIds.has(t.id);
        const cityA = ttrCityName(map, t.a);
        const cityB = ttrCityName(map, t.b);
        return (
          <button
            key={t.id}
            type="button"
            className={cn(
              'ttr-my-ticket-card',
              variant === 'quick' && 'ttr-my-ticket-card--quick ttr-quick-inline-card',
              selectedTicketId === t.id && 'is-selected',
              done && 'is-completed',
            )}
            disabled={done}
            title={`${cityA} - ${cityB} (${t.points})`}
            onClick={() => onSelect(t.id)}
          >
            {done ? (
              <span className="ttr-my-ticket-card__done-badge" aria-label="ทำสำเร็จแล้ว">
                ✓
              </span>
            ) : null}
            <div className="ttr-ticket-preview-shell">
              <TtrTicketPreview map={map} layout={layout} a={t.a} b={t.b} />
            </div>
            {variant === 'quick' ? (
              <div className="flex justify-center">
                <span className="text-lg font-bold">{t.points}</span>
              </div>
            ) : (
              <div className="ttr-ticket-choice-meta">
                <span className="ttr-ticket-choice-city">{cityA}</span>
                <span className="ttr-ticket-choice-points">{t.points}</span>
                <span className="ttr-ticket-choice-city">{cityB}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
