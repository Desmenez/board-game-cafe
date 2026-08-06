import { PlayerIdentity } from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';

export type EkActorSlot = {
  id: string;
  name: string;
  /** Omit when the modal title already names the role */
  role?: string;
  secondary?: string;
};

type Props = {
  from: EkActorSlot;
  to?: EkActorSlot;
  ariaLabel?: string;
  className?: string;
};

/** Salem-style who → whom row for EK action modals. */
export function EkActorsRow({ from, to, ariaLabel = 'ใครเล่นการ์ดใส่ใคร', className }: Props) {
  return (
    <div className={cn('ek-modal-actors', className)} aria-label={ariaLabel}>
      <div className="ek-modal-actors__actor">
        {from.role ? <span className="ek-modal-actors__role">{from.role}</span> : null}
        <PlayerIdentity
          playerId={from.id}
          name={from.name}
          avatarSize={44}
          secondary={from.secondary}
        />
      </div>
      {to ? (
        <>
          <span className="ek-modal-actors__arrow" aria-hidden>
            →
          </span>
          <div className="ek-modal-actors__actor">
            {to.role ? <span className="ek-modal-actors__role">{to.role}</span> : null}
            <PlayerIdentity
              playerId={to.id}
              name={to.name}
              avatarSize={44}
              secondary={to.secondary}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
