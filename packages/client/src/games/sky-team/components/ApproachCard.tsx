import { useEffect, useState } from 'react';
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
  color: SkyTeamDieColor | 'traffic';
  value: number;
};

/** Bottom die well — up to 4 slots (ATL start prints 4 Traffic Dice). */
export type ApproachDieWell =
  | false
  | {
      /** How many white slots to show (1–4). */
      slots: 1 | 2 | 3 | 4;
      /** Placed dice, left → right (extras ignored). */
      dice?: ApproachDie[];
    };

/** Traffic Die spin on the bay card die well. */
export type ApproachTrafficSpin = {
  /** Final faces from server `lastRolls`. */
  faces: number[];
  /** True while faces are still flickering. */
  spinning: boolean;
};

export const TRAFFIC_DIE_SPIN_MS = 900;
const TRAFFIC_SPIN_TICK_MS = 70;

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
  /** Trigger Radio remove-token animation (strip drawer). */
  playRemove?: boolean;
  /** Trigger Traffic Die arrive-token animation. */
  playAdd?: boolean;
  /** Tune center token placement (% of card) — layout lab. */
  airplaneTokenAnchor?: AirplaneTokenAnchor;
  /** Left → right marks in the top well. */
  topMarks?: ApproachTopMark[];
  /** Bottom die well (max 3 dice). */
  dieWell?: ApproachDieWell;
  /** Overlay Traffic Die faces / spin on the printed die well. */
  trafficSpin?: ApproachTrafficSpin | null;
  compact?: boolean;
  /** Fill a board well — no chrome, art covers the bay. */
  bay?: boolean;
  /** Smaller card in vertical track modal. */
  strip?: boolean;
  label?: string;
  className?: string;
};

/** Fixed left-rail marks = printed starting traffic on the card (never removed by Radio). */
function PrintedPlaneIcons({ count }: { count: number }) {
  const n = Math.max(0, Math.min(3, count));
  if (n <= 0) return null;
  return (
    <div
      className="pointer-events-none absolute top-1/2 left-[4%] flex w-[4.5%] -translate-y-1/2 flex-col items-center gap-[18%] opacity-35"
      aria-label={`พิมพ์บนการ์ดตั้งต้น ${n} ลำ (ไม่ถูกลบด้วย Radio)`}
      title="ไอคอนพิมพ์บนการ์ด — Radio ลบเฉพาะ token ตรงกลาง"
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
    return <X className="h-full w-full text-red-600" strokeWidth={2.75} aria-hidden />;
  }
  if (mark === 'arrow-down') {
    return (
      <svg viewBox="0 0 16 16" className="h-full w-full" aria-hidden>
        <path d="M8 13.5 2.25 3.75h11.5Z" fill="#1f2937" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="h-full w-full" aria-hidden>
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

/**
 * Printed Turns dial — sized entirely in % of the card so bay / strip / default
 * stay aligned (no em radius that breaks when the card shrinks).
 */
function TopMarksWell({ marks }: { marks: ApproachTopMark[] }) {
  const items: ApproachTopMark[] = [...marks.slice(0, 5)];
  while (items.length < 5) items.push('ban');

  const n = 5;
  /** Half of the fan (degrees from center). */
  const halfSpanDeg = 58;
  /**
   * Arc radius as a fraction of the well’s height, measured up from the bottom
   * center. Keep under 1 so icons stay inside the white tab.
   */
  const radiusFrac = 0.72;

  return (
    <div
      className="pointer-events-none absolute top-[1%] left-1/2 h-[24%] w-[38%] -translate-x-1/2 rounded-b-[18%] bg-white"
      aria-hidden
    >
      {items.map((mark, i) => {
        const t = i / (n - 1);
        const angleDeg = -halfSpanDeg + t * (2 * halfSpanDeg);
        const angleRad = (angleDeg * Math.PI) / 180;
        // Bottom-center origin → fan upward into the tab.
        const left = 50 + Math.sin(angleRad) * radiusFrac * 50;
        const top = 100 - Math.cos(angleRad) * radiusFrac * 100;
        return (
          <div
            key={`${mark}-${i}`}
            className="absolute aspect-square w-[16%] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <TopMarkIcon mark={mark} />
          </div>
        );
      })}
    </div>
  );
}

/** Isometric die slot — filled faces, light edges (matches printed card icon). */
function EmptyDieIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 16 5 9.5v13L16 29Z" fill="#1a2744" />
      <path d="M16 16 27 9.5v13L16 29Z" fill="#152038" />
      <path d="M16 3 27 9.5 16 16 5 9.5Z" fill="#243556" />
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

function DieWellBox({
  slots,
  dice,
  spinning,
}: {
  slots: 1 | 2 | 3 | 4;
  dice: ApproachDie[];
  spinning?: boolean;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-0 left-1/2 flex h-[30%] -translate-x-1/2 items-start justify-center gap-[4%] rounded-t-md bg-white px-[2%] pt-[2.5%]',
        slots === 1 && 'w-[14%]',
        slots === 2 && 'w-[26%]',
        slots === 3 && 'w-[38%]',
        slots === 4 && 'w-[48%]',
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
                <SkyTeamDieFace
                  value={die.value}
                  color={die.color}
                  size="sm"
                  rerolling={spinning}
                />
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

function useTrafficSpinFaces(
  trafficSpin: ApproachTrafficSpin | null | undefined,
): { faces: number[]; spinning: boolean } {
  const spinning = Boolean(trafficSpin?.spinning);
  const finalFaces = trafficSpin?.faces ?? [];
  const [tickFaces, setTickFaces] = useState<number[]>(finalFaces);

  useEffect(() => {
    if (!trafficSpin) {
      setTickFaces([]);
      return;
    }
    if (!trafficSpin.spinning) {
      setTickFaces(trafficSpin.faces);
      return;
    }
    const n = Math.max(1, Math.min(4, trafficSpin.faces.length));
    setTickFaces(
      Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6)),
    );
    const id = window.setInterval(() => {
      setTickFaces(
        Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6)),
      );
    }, TRAFFIC_SPIN_TICK_MS);
    return () => window.clearInterval(id);
  }, [trafficSpin?.spinning, trafficSpin?.faces.join(',')]);

  return {
    faces: spinning ? tickFaces : finalFaces,
    spinning,
  };
}

export function ApproachCard({
  base,
  printedPlanes = 0,
  planes = 0,
  playRemove = false,
  playAdd = false,
  airplaneTokenAnchor = DEFAULT_AIRPLANE_TOKEN_ANCHOR,
  topMarks = [],
  dieWell = false,
  trafficSpin = null,
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
  const baseDice = dieWell ? (dieWell.dice ?? []).slice(0, dieSlots) : [];
  const spin = useTrafficSpinFaces(trafficSpin);

  const displaySlots = (trafficSpin
    ? (Math.min(4, Math.max(1, trafficSpin.faces.length)) as 1 | 2 | 3 | 4)
    : dieSlots) as 1 | 2 | 3 | 4 | 0;

  const displayDice: ApproachDie[] =
    trafficSpin && displaySlots > 0
      ? spin.faces.slice(0, displaySlots).map((value) => ({ color: 'traffic' as const, value }))
      : baseDice;

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

      {topMarks.length > 0 && <TopMarksWell marks={topMarks} />}

      <PrintedPlaneIcons count={printedPlanes} />
      <AirplaneToken
        count={planes}
        playRemove={playRemove}
        playAdd={playAdd}
        anchor={airplaneTokenAnchor}
      />

      {(dieWell || trafficSpin) && displaySlots > 0 && (
        <DieWellBox
          slots={displaySlots as 1 | 2 | 3 | 4}
          dice={displayDice}
          spinning={spin.spinning}
        />
      )}
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
