import type { TtrDestinationTicket, TtrMapDefinition, TtrMapId } from 'shared';
import { ttrCityName } from 'shared';
import { cn } from '../../../utils/cn';
import { ttrMapPresentation } from '../maps';
import { TtrDestinationCard } from './TtrDestinationCard';

type Props = {
  map: TtrMapDefinition;
  tickets: TtrDestinationTicket[];
  completedIds: ReadonlySet<string>;
  selectedTicketId: string | null;
  onSelect: (ticketId: string) => void;
  /** `dock` is the compact strip in the fixed hand dock. */
  variant?: 'panel' | 'dock';
};

export function TtrTicketHand({
  map,
  tickets,
  completedIds,
  selectedTicketId,
  onSelect,
  variant = 'panel',
}: Props) {
  const presentation = ttrMapPresentation(map.id as TtrMapId);
  const aspectRatio = presentation.destinationCard.layout.aspectRatio;
  const portrait = aspectRatio < 1;

  if (tickets.length === 0) {
    return <p className="muted">ยังไม่มีตั๋วปลายทาง</p>;
  }
  const compact = variant === 'dock';
  return (
    <div className={compact ? 'ttr-hand-dock__card-row' : 'ttr-my-ticket-grid'}>
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
              compact && 'ttr-my-ticket-card--quick ttr-quick-inline-card',
              portrait && 'ttr-my-ticket-card--portrait',
              selectedTicketId === t.id && 'is-selected',
              done && 'is-completed',
            )}
            style={{ aspectRatio: String(aspectRatio) }}
            disabled={done}
            title={`${cityA} - ${cityB} (${t.points})`}
            onClick={() => onSelect(t.id)}
          >
            {done ? (
              <span className="ttr-my-ticket-card__done-badge" aria-label="ทำสำเร็จแล้ว">
                ✓
              </span>
            ) : null}
            <TtrDestinationCard map={map} a={t.a} b={t.b} points={t.points} />
          </button>
        );
      })}
    </div>
  );
}
