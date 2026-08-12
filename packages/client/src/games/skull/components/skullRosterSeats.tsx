import type { SkullPlayerView } from 'shared';
import { skullColorLabelTh } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';

export function buildSkullRosterSeats(view: SkullPlayerView): RosterSeat[] {
  return view.seats.map((s, i) => {
    const isActive = s.id === view.activePlayerId && !s.eliminated;
    const isChallenger = s.id === view.challengerId && !s.eliminated;
    const isFirst = s.id === view.firstPlayerId && !s.eliminated;

    const badges = (
      <>
        {isFirst ? (
          <Badge size="sm" variant="outline" title="ผู้เริ่มรอบนี้">
            เริ่ม
          </Badge>
        ) : null}
        {isChallenger ? (
          <Badge
            size="sm"
            variant="danger"
            title={view.phase === 'bidding' ? 'บิดสูงสุด' : 'Challenger'}
          >
            {view.phase === 'bidding' ? 'บิดสูงสุด' : 'Challenger'}
          </Badge>
        ) : null}
        {s.passed ? (
          <Badge size="sm" variant="outline" title="ผ่านการบิดรอบนี้">
            ผ่าน
          </Badge>
        ) : null}
        {s.hasLastChance ? (
          <Badge size="sm" variant="warning" title="Last Chance">
            LC
          </Badge>
        ) : null}
      </>
    );

    const hasBadges = isFirst || isChallenger || s.passed || s.hasLastChance;

    return {
      id: s.id,
      name: s.name,
      active: isActive,
      muted: s.eliminated,
      mutedLabel: s.eliminated ? 'คัดออก' : undefined,
      leading: (
        <span className="skull-roster-seat-index" aria-hidden>
          {i + 1}
        </span>
      ),
      badges: hasBadges ? badges : undefined,
      status: s.eliminated ? undefined : (
        <span className="skull-roster-seat-status p-1" title={`สี${skullColorLabelTh(s.color)}`}>
          <span className={['skull-roster-swatch', `skull-roster-swatch--${s.color}`].join(' ')} />
          กอง {s.stack.length} · มือ {s.handCount} · ★ {s.wins}/2
        </span>
      ),
    };
  });
}
