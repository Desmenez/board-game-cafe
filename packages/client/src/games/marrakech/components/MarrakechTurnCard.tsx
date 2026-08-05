import type { ReactNode } from 'react';
import type { MarrakechColor, MarrakechPhase } from 'shared';
import { Badge } from '../../../components/ui';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { MARRAKECH_COLOR_LABEL } from '../labels';
import { DirhamPurse } from './DirhamPurse';

const TURN_STEPS = [
  { phase: 'choose_direction', label: 'ทิศทาง' },
  { phase: 'roll', label: 'ทอยเต๋า' },
  { phase: 'place_rug', label: 'วางพรม' },
] as const satisfies ReadonlyArray<{ phase: MarrakechPhase; label: string }>;

function statusLine(phase: MarrakechPhase, lastRoll: number | null): string {
  switch (phase) {
    case 'choose_direction':
      return 'เลือกทิศทาง Assam';
    case 'roll':
      return 'ทอยลูกเต๋า';
    case 'place_rug':
      return lastRoll == null ? 'วางพรม' : `ทอยได้ ${lastRoll} · วางพรม`;
    case 'game_over':
      return 'เกมจบแล้ว';
  }
}

type Props = {
  name: string;
  isMe: boolean;
  phase: MarrakechPhase;
  dirhams: number | null;
  lastRoll: number | null;
  paymentAmount?: number | null;
  /** Rug this seat holds next — shown to every player, not just the active one. */
  rugColor: MarrakechColor | null;
  rugsRemaining: number;
  /** previous-player mode: the seat whose facing is being set right now. */
  directionForName?: string | null;
  /** Die slot — one instance only, it owns the roll animation. */
  die: ReactNode;
  className?: string;
};

/** Die, whose turn it is, and which rug they hold — one card, same view for everyone. */
export function MarrakechTurnCard({
  name,
  isMe,
  phase,
  dirhams,
  lastRoll,
  paymentAmount = null,
  rugColor,
  rugsRemaining,
  directionForName = null,
  die,
  className,
}: Props) {
  const stepIndex = TURN_STEPS.findIndex((s) => s.phase === phase);

  return (
    <section className={cn('card space-y-3', className)}>
      <div className="flex items-center gap-3">
        <div className="mk-die-stage shrink-0">{die}</div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="mk-kicker">ตาปัจจุบัน</p>
          <p className="flex min-w-0 items-center gap-1.5 text-base leading-tight font-bold">
            <span className="truncate">{name}</span>
            {isMe ? (
              <Badge size="sm" variant="accent">
                คุณ
              </Badge>
            ) : null}
          </p>
          <div className="flex items-center gap-2 text-xs opacity-75">
            {dirhams != null ? <DirhamPurse dirhams={dirhams} /> : null}
            <span className="truncate">{statusLine(phase, lastRoll)}</span>
          </div>
        </div>

        {rugColor ? (
          <div className="flex shrink-0 flex-col items-center gap-1">
            <img
              src={imageMap.marrakech.rugs[rugColor]}
              alt={`พรมสี${MARRAKECH_COLOR_LABEL[rugColor]}`}
              title={`พรมสี${MARRAKECH_COLOR_LABEL[rugColor]}`}
              className="mk-rug-chip__art"
              draggable={false}
            />
            <span className="text-[0.65rem] whitespace-nowrap opacity-70">
              เหลือ {rugsRemaining}
            </span>
          </div>
        ) : null}
      </div>

      <ol className="hidden grid-cols-3 gap-1.5 md:grid" aria-label="ลำดับเทิร์น">
        {TURN_STEPS.map((step, i) => (
          <li
            key={step.phase}
            aria-current={i === stepIndex ? 'step' : undefined}
            className={cn(
              'mk-step',
              i === stepIndex && 'mk-step--now',
              i < stepIndex && 'mk-step--done',
            )}
          >
            {step.label}
          </li>
        ))}
      </ol>

      {paymentAmount != null ? (
        <p className="hidden text-xs opacity-70 md:block">
          จ่าย {paymentAmount} Dirham ให้เจ้าของพรม
        </p>
      ) : null}

      {directionForName ? (
        <p className="text-xs opacity-70">กำลังตั้งทิศทาง Assam ให้ {directionForName}</p>
      ) : null}
    </section>
  );
}
