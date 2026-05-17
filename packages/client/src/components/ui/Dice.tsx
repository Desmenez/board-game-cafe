import { useEffect, useState } from 'react';
import './dice.css';

export type DiceSize = 'sm' | 'md' | 'lg';

export type DiceProps = {
  /** Face 1–6 to show toward the camera when not rolling */
  value: 1 | 2 | 3 | 4 | 5 | 6 | null;
  /** Play tumble animation */
  rolling?: boolean;
  size?: DiceSize;
  className?: string;
  /** Accessible label e.g. "ทอยได้ 4" */
  'aria-label'?: string;
};

/** Rotation of the whole cube so the face with that many pips faces the user (+Z). */
const ROT: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateY(-90deg)',
  3: 'rotateX(90deg)',
  4: 'rotateX(-90deg)',
  5: 'rotateY(90deg)',
  6: 'rotateY(180deg)',
};

function Pips({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="dice-pip" />
      ))}
    </>
  );
}

export function Dice({ value, rolling = false, size = 'md', className = '', ...rest }: DiceProps) {
  const [display, setDisplay] = useState<1 | 2 | 3 | 4 | 5 | 6>(value ?? 1);

  useEffect(() => {
    if (!rolling && value != null) setDisplay(value);
  }, [value, rolling]);

  const transform = rolling || value == null ? undefined : ROT[value ?? display];

  return (
    <div className={`dice-scene dice-scene--${size}${className ? ` ${className}` : ''}`} {...rest}>
      <div className="dice-cube-wrap">
        <div
          className={`dice-cube${rolling ? ' dice-cube--rolling' : ''}`}
          style={transform ? { transform } : undefined}
        >
          <div className="dice-face dice-face--1">
            <Pips n={1} />
          </div>
          <div className="dice-face dice-face--2">
            <Pips n={2} />
          </div>
          <div className="dice-face dice-face--3">
            <Pips n={3} />
          </div>
          <div className="dice-face dice-face--4">
            <Pips n={4} />
          </div>
          <div className="dice-face dice-face--5">
            <Pips n={5} />
          </div>
          <div className="dice-face dice-face--6">
            <Pips n={6} />
          </div>
        </div>
      </div>
    </div>
  );
}
