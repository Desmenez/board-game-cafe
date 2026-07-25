import type { ApproachBase, SkyTeamDieColor } from 'shared';
import { X } from 'lucide-react';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { AirplaneToken } from './AirplaneToken';
import { DEFAULT_AIRPLANE_TOKEN_ANCHOR, type AirplaneTokenAnchor } from './airplaneTokenAnchor';
import { SkyTeamDieFace } from './SkyTeamDice';

/** Icons that sit in the printed top white well on approach art. */
export type ApproachTopMark = 'ban' | 'arrow-down' | 'arrow-right';

export type ApproachDie = {
  color: SkyTeamDieColor;
  value: number;
};

/** Bottom die well — up to 3 slots. */
export type ApproachDieWell =
  | false
  | {
      /** How many white slots to show (1–3). */
      slots: 1 | 2 | 3;
      /** Placed dice, left → right (extras ignored). */
      dice?: ApproachDie[];
    };

type Props = {
  base: ApproachBase;
  /**
   * Printed setup plane icons on the left (fixed).
   * Shows how many airplane tokens this card starts with — never grows/shrinks in play.
   */
  printedPlanes?: number;
  /**
   * Current airplane tokens on this space (game pieces in the center).
   * Can increase/decrease; badge when count > 1.
   */
  planes?: number;
  /** Tune center token placement (% of card) — layout lab. */
  airplaneTokenAnchor?: AirplaneTokenAnchor;
  /** Left → right marks in the top well. */
  topMarks?: ApproachTopMark[];
  /** Bottom die well (max 3 dice). */
  dieWell?: ApproachDieWell;
  compact?: boolean;
  /** Fill a board well — no chrome, art covers the bay. */
  bay?: boolean;
  /** Smaller card in vertical track modal. */
  strip?: boolean;
  label?: string;
  className?: string;
};

/** Fixed left-rail icons = printed starting traffic (not the movable token). */
function PrintedPlaneIcons({ count }: { count: number }) {
  const n = Math.max(0, Math.min(3, count));
  if (n <= 0) return null;
  return (
    <div
      className="pointer-events-none absolute top-1/2 left-[5%] flex w-[5%] -translate-y-1/2 flex-col items-center gap-[20%]"
      aria-label={`Starts with ${n} airplane token${n > 1 ? 's' : ''}`}
    >
      {Array.from({ length: n }, (_, i) => (
        <img
          key={i}
          src={imageMap.skyTeam.planeToken}
          alt=""
          className="w-full brightness-0 invert pt-2 rotate-45"
          draggable={false}
        />
      ))}
    </div>
  );
}

function TopMarkIcon({ mark }: { mark: ApproachTopMark }) {
  if (mark === 'ban') {
    return <X className="h-[1.35em] w-[1.35em] text-red-600" strokeWidth={2.75} aria-hidden />;
  }
  if (mark === 'arrow-down') {
    // Filled black triangle pointing down
    return (
      <svg viewBox="0 0 16 16" className="h-[1.25em] w-[1.25em]" aria-hidden>
        <path d="M8 13.5 2.25 3.75h11.5Z" fill="#1f2937" />
      </svg>
    );
  }
  // Green outline triangle pointing down
  return (
    <svg viewBox="0 0 16 16" className="h-[1.25em] w-[1.25em]" aria-hidden>
      <path
        d="M2.5 3.5 8 13 13.5 3.5Z"
        fill="none"
        stroke="#16a34a"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Isometric die slot — filled faces, light edges (matches printed card icon). */
function EmptyDieIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      {/* left face */}
      <path d="M16 16 5 9.5v13L16 29Z" fill="#1a2744" />
      {/* right face */}
      <path d="M16 16 27 9.5v13L16 29Z" fill="#152038" />
      {/* top face */}
      <path d="M16 3 27 9.5 16 16 5 9.5Z" fill="#243556" />
      {/* edge lines */}
      <path
        d="M16 3 27 9.5v13L16 29 5 22.5v-13Z"
        fill="none"
        stroke="#fff"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M16 16v13M5 9.5l11 6.5 11-6.5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Top turns well — always a 5-tick axis dial on an arc facing the pivot. */
function TopMarksWell({
  marks,
  textClassName,
}: {
  marks: ApproachTopMark[];
  textClassName: string;
}) {
  // Turns dial is always 5 positions (−2‥2). Pad/trim so layout stays fixed.
  const items: ApproachTopMark[] = [...marks.slice(0, 5)];
  while (items.length < 5) items.push('ban');

  const n = 5;
  /**
   * Shallow bank-scale arc (not a semicircle) so the dial reads with the
   * board axis below — similar to an attitude indicator roll scale.
   */
  const halfSpan = 62;
  const radiusEm = 2.5;

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-1/2 top-0 h-[26%] w-[34%] -translate-x-1/2 rounded-b-md bg-white',
        textClassName,
      )}
      aria-hidden
    >
      {/* Pivot sits lower so the arc hugs the top strip / board axis */}
      <div className="absolute left-1/2 top-full h-0 w-0">
        {items.map((mark, i) => {
          const t = i / (n - 1);
          const angle = -halfSpan + t * (2 * halfSpan);
          return (
            <div
              key={`${mark}-${i}`}
              className="absolute left-0 top-0"
              style={{
                // translate first, then rotate → icon rides the arc and faces the pivot
                transform: `rotate(${angle}deg) translateY(-${radiusEm}em)`,
              }}
            >
              <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 leading-none">
                <TopMarkIcon mark={mark} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DieWellBox({ slots, dice }: { slots: 1 | 2 | 3; dice: ApproachDie[] }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-0 left-1/2 flex h-[30%] -translate-x-1/2 items-start justify-center gap-[6%] rounded-t-md bg-white px-[2.5%] pt-[2.5%]',
        slots === 1 && 'w-[14%]',
        slots === 2 && 'w-[26%]',
        slots === 3 && 'w-[38%]',
      )}
      aria-label={
        dice.length > 0
          ? `${dice.length} die${dice.length > 1 ? 's' : ''} placed`
          : `${slots} empty die slot${slots > 1 ? 's' : ''}`
      }
    >
      {Array.from({ length: slots }, (_, i) => {
        const die = dice[i];
        return (
          <div key={i} className="flex aspect-square h-[55%] items-center justify-center">
            {die ? (
              <div className="h-full w-full">
                <SkyTeamDieFace value={die.value} color={die.color} size="sm" />
              </div>
            ) : (
              <EmptyDieIcon className="h-full w-full" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ApproachCard({
  base,
  printedPlanes = 0,
  planes = 0,
  airplaneTokenAnchor = DEFAULT_AIRPLANE_TOKEN_ANCHOR,
  topMarks = [],
  dieWell = false,
  compact = false,
  bay = false,
  strip = false,
  label,
  className,
}: Props) {
  const src =
    base === 'airport'
      ? imageMap.skyTeam.approachAirport
      : base === 'cloud'
        ? imageMap.skyTeam.approachCloud
        : imageMap.skyTeam.approachSky;

  const dieSlots = dieWell ? dieWell.slots : 0;
  const dice = dieWell ? (dieWell.dice ?? []).slice(0, dieSlots) : [];

  const art = (
    <div className={cn('relative', strip || !bay ? 'aspect-340/188' : 'h-full w-full')}>
      <img
        src={src}
        alt=""
        className={cn(
          'block h-full w-full',
          bay ? 'object-contain object-center' : 'object-cover object-center',
        )}
        draggable={false}
      />

      {topMarks.length > 0 && (
        <TopMarksWell
          marks={topMarks}
          textClassName={
            strip ? 'text-[0.85rem]' : bay ? 'text-[clamp(0.7rem,4.2cqw,1.05rem)]' : 'text-[1rem]'
          }
        />
      )}

      <PrintedPlaneIcons count={printedPlanes} />
      <AirplaneToken count={planes} anchor={airplaneTokenAnchor} />

      {dieWell && <DieWellBox slots={dieWell.slots} dice={dice} />}
    </div>
  );

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        !bay && 'rounded-xl border border-white/12',
        bay && 'h-full w-full overflow-visible rounded-none border-0 bg-transparent',
        strip && 'rounded-md',
        className,
      )}
    >
      {art}
      {label && !bay && (
        <span
          className={cn(
            'flex items-center justify-between bg-black/45 px-1.5 py-0.5 text-center text-white',
            strip ? 'text-[0.6rem]' : compact ? 'text-xs' : 'text-xs',
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
