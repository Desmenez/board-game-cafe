import { Footprints, Siren } from 'lucide-react';
import {
  FUGITIVE_MANHUNT_THRESHOLD,
  isManhuntArmed,
  maxRevealedHideoutValue,
  type FugitiveHideoutView,
} from 'shared';
import { cn } from '../../../utils/cn';

type Props = {
  hideouts: readonly FugitiveHideoutView[];
  className?: string;
};

export function FugitiveManhuntStatusChip({ hideouts, className }: Props) {
  const maxRevealed = maxRevealedHideoutValue(hideouts, true);
  const armed = isManhuntArmed(hideouts);
  const maxLabel =
    maxRevealed === null || maxRevealed <= 0 ? 'ยังไม่มี' : String(maxRevealed);

  return (
    <div
      className={cn(
        'fugitive-manhunt-status',
        armed ? 'fugitive-manhunt-status--armed' : 'fugitive-manhunt-status--escape',
        className,
      )}
      role="status"
    >
      <span
        className="fugitive-manhunt-status__chip"
        title={
          armed
            ? `เล่น 42 จะเข้า Manhunt — hideout ที่เปิดสูงสุด ${maxLabel} (ต่ำกว่า ${FUGITIVE_MANHUNT_THRESHOLD})`
            : `เล่น 42 จะหนีทันที — hideout ที่เปิดสูงสุด ${maxLabel} (ถึง ${FUGITIVE_MANHUNT_THRESHOLD} แล้ว)`
        }
      >
        {armed ? <Siren size={12} aria-hidden /> : <Footprints size={12} aria-hidden />}
        <span>{armed ? 'Manhunt พร้อม' : 'เล่น 42 แล้วหนี'}</span>
      </span>
      <p>
        {armed
          ? `เปิดสูงสุด ${maxLabel} · เล่น 42 แล้ว Marshal ได้ Manhunt`
          : `เปิดสูงสุด ${maxLabel} · เล่น 42 แล้ว Fugitive หนีทันที`}
      </p>
    </div>
  );
}
