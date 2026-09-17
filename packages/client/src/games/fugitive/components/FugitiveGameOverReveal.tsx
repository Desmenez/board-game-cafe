import type { FugitiveHideoutView } from 'shared';
import { cn } from '../../../utils/cn';
import { FugitiveCardFace } from './FugitiveCardFace';

function hideoutStatus(slot: FugitiveHideoutView): string | null {
  if (slot.value === 0) return 'จุดเริ่ม';
  if (slot.value === 42) return 'หนี!';
  if (slot.revealed) return 'ทายถูก';
  return 'เฉลย';
}

function hideoutAriaLabel(slot: FugitiveHideoutView): string {
  const number = slot.value === 0 ? 'จุดเริ่ม 0' : `Hideout ${slot.value ?? '?'}`;
  const status = hideoutStatus(slot);
  const sprints =
    slot.sprintValues && slot.sprintValues.length > 0
      ? ` · Sprint ${slot.sprintValues.join(', ')}`
      : '';
  return status ? `${number} · ${status}${sprints}` : `${number}${sprints}`;
}

export function FugitiveGameOverReveal({ hideouts }: { hideouts: FugitiveHideoutView[] }) {
  if (hideouts.length === 0) return null;

  const hasCaught = hideouts.some((h) => h.revealed && h.value !== 0 && h.value !== 42);
  const hasEndReveal = hideouts.some((h) => !h.revealed);

  return (
    <section className="fugitive-game-over-reveal mt-4" aria-label="เส้นทาง Hideout">
      <h3
        className={cn(
          'text-center text-[0.78rem] font-bold tracking-wide text-(--text-secondary)',
          hasCaught && hasEndReveal ? 'mb-0.5' : 'mb-3',
        )}
      >
        เส้นทาง Hideout
      </h3>
      {hasCaught && hasEndReveal ? (
        <p className="mb-3 text-center text-[0.68rem] leading-snug text-(--text-secondary)">
          ทายถูกระหว่างเกม · เฉลยตอนจบ
        </p>
      ) : null}
      <ol className="flex flex-wrap items-end justify-center gap-x-2 gap-y-3">
        {hideouts.map((slot) => {
          const status = hideoutStatus(slot);
          const sprints = slot.sprintValues ?? [];
          const isStart = slot.value === 0;
          const isCaught = slot.revealed && slot.value !== 0 && slot.value !== 42;
          const isEscape = slot.value === 42;
          const isEndReveal = !slot.revealed && slot.value !== undefined;

          return (
            <li
              key={slot.instanceId}
              className="flex min-w-0 flex-col items-center"
              aria-label={hideoutAriaLabel(slot)}
            >
              {sprints.length > 0 ? (
                <div className="fugitive-hideout-slot__sprint-stack fugitive-sprint-stack--cards">
                  {sprints.map((v, i) => (
                    <FugitiveCardFace
                      key={`${slot.instanceId}-s-${i}`}
                      value={v}
                      className="fugitive-card--staging"
                    />
                  ))}
                </div>
              ) : null}
              <FugitiveCardFace
                value={slot.value}
                faceDown={slot.value === undefined}
                escape={isEscape}
                className={cn(
                  isCaught && 'fugitive-game-over-reveal__card--caught',
                  isEscape && 'fugitive-game-over-reveal__card--escape',
                )}
              />
              <p className="mt-1 text-center text-[0.68rem] leading-tight">
                <span className="font-bold tabular-nums text-(--text-primary)">
                  {isStart ? '0' : (slot.value ?? '—')}
                </span>
                {status ? (
                  <span
                    className={cn(
                      'mt-0.5 block text-[0.58rem] font-semibold',
                      isCaught && 'text-[#7dcea0]',
                      isEscape && 'text-[#e8c547]',
                      isStart && 'text-(--text-secondary)',
                      isEndReveal && 'text-(--text-secondary)',
                    )}
                  >
                    {status}
                  </span>
                ) : null}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
