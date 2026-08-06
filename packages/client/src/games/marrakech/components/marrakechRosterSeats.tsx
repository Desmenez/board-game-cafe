import type { MarrakechPlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { imageMap } from '../../../imageMap';
import { MARRAKECH_COLOR_LABEL } from '../labels';
import { DirhamPurse } from './DirhamPurse';

export function buildMarrakechRosterSeats(view: MarrakechPlayerView): RosterSeat[] {
  return view.players.map((p, i) => {
    const isActive = p.id === view.activePlayerId && !p.eliminated;

    return {
      id: p.id,
      name: p.name,
      active: isActive,
      muted: p.eliminated,
      mutedLabel: p.eliminated ? 'ตกรอบ' : undefined,
      leading: (
        <span className="mk-roster-seat-index" aria-hidden>
          {i + 1}
        </span>
      ),
      badges: <DirhamPurse dirhams={p.dirhams} />,
      status: (
        <span className="mk-roster-seat-status">
          <span className="mk-roster-seat-colors">
            {p.colors.map((c) => (
              <img
                key={c}
                src={imageMap.marrakech.rugs[c]}
                alt={MARRAKECH_COLOR_LABEL[c]}
                title={MARRAKECH_COLOR_LABEL[c]}
                className="mk-roster-seat-swatch"
              />
            ))}
          </span>
          <span>พรม {p.rugsRemaining}</span>
        </span>
      ),
    };
  });
}
