import { useMemo } from 'react';
import type { CamelUpColor, CamelUpPlayerView, CamelUpPyramidDie } from 'shared';
import { Badge } from '../../../components/ui';
import { CAMEL_COLOR_LABEL, camelColorClass } from '../lib/camelMeta';
import { buildCamelStandings, type CamelStanding } from '../lib/camelUpStandings';
import type { CamelTrackView } from '../lib/camelUpTrackMove';

type Props = {
  leg: number;
  phase: CamelUpPlayerView['phase'];
  rolledDice: CamelUpPyramidDie[];
  track: CamelTrackView;
};

const RANK_LABEL: Record<number, string> = {
  1: 'นำ',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
};

function LegBoardColumn({
  rows,
  rolledByColor,
}: {
  rows: CamelStanding[];
  rolledByColor: Map<CamelUpColor, CamelUpPyramidDie>;
}) {
  if (rows.length === 0) return null;

  return (
    <ol className="camel-up-leg-board">
      <li className="camel-up-leg-board__labels" aria-hidden="true">
        <span>อันดับ</span>
        <span>อูฐ</span>
        <span>ช่อง</span>
        <span>ลูกเต๋า</span>
      </li>
      {rows.map((row) => {
        const rolled = rolledByColor.get(row.color);
        const isRolled = rolled !== undefined;

        return (
          <li
            key={row.color}
            className={[
              'camel-up-leg-board__row',
              row.isLeader ? 'camel-up-leg-board__row--leader' : '',
              isRolled ? 'camel-up-leg-board__row--rolled' : 'camel-up-leg-board__row--pending',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={`${RANK_LABEL[row.rank] ?? row.rank} ${CAMEL_COLOR_LABEL[row.color]} ช่อง ${row.space}${isRolled ? ` ออกจาก Pyramid แล้ว ทอยได้ ${rolled.value}` : ' ยังไม่ออกจาก Pyramid'}`}
          >
            <span
              className={[
                'camel-up-leg-board__rank',
                row.isLeader ? 'camel-up-leg-board__rank--leader' : '',
                isRolled ? 'camel-up-leg-board__rank--out' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {RANK_LABEL[row.rank] ?? row.rank}
            </span>
            <span className="camel-up-leg-board__camel">
              <span
                className={[
                  'camel-up-leg-board__dot',
                  camelColorClass(row.color),
                  isRolled ? 'camel-up-leg-board__dot--out' : '',
                ].join(' ')}
                aria-hidden
              />
              <span
                className={[
                  'camel-up-leg-board__name',
                  isRolled ? 'camel-up-leg-board__name--out' : '',
                ].join(' ')}
              >
                {CAMEL_COLOR_LABEL[row.color]}
              </span>
              {isRolled ? <span className="camel-up-leg-board__out-badge">ออกแล้ว</span> : null}
            </span>
            <span
              className={[
                'camel-up-leg-board__space',
                isRolled ? 'camel-up-leg-board__space--out' : '',
              ].join(' ')}
            >
              {row.space}
            </span>
            {isRolled ? (
              <span className="camel-up-leg-board__die-result" title={`ทอยได้ ${rolled.value}`}>
                <span
                  className={['camel-up-leg-board__die-dot', camelColorClass(row.color)].join(' ')}
                  aria-hidden
                />
                <span className="camel-up-leg-board__die-value">{rolled.value}</span>
              </span>
            ) : (
              <span className="camel-up-leg-board__die camel-up-leg-board__die--pending">—</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function CamelUpLegPyramidStatus({ leg, phase, rolledDice, track }: Props) {
  const isGameOver = phase === 'game_over';
  const rolledByColor = useMemo(
    () => new Map(rolledDice.map((die) => [die.color, die])),
    [rolledDice],
  );
  const standings = useMemo(() => buildCamelStandings(track), [track]);
  const splitAt = Math.ceil(standings.length / 2);
  const columns = useMemo(
    () => [standings.slice(0, splitAt), standings.slice(splitAt)],
    [standings, splitAt],
  );

  return (
    <div className="camel-up-leg-status w-full!">
      <div className="camel-up-leg-status__head">
        <Badge variant="default">Leg {leg}</Badge>
        {isGameOver ? (
          <span className="camel-up-leg-status__phase">เกมจบแล้ว</span>
        ) : (
          <span className="camel-up-leg-status__phase">ตำแหน่ง &amp; ลูกเต๋า Pyramid</span>
        )}
      </div>

      <div className="camel-up-leg-board-grid w-full!" aria-label="ตำแหน่งอูฐและลูกเต๋า Pyramid">
        {columns.map((rows, index) => (
          <LegBoardColumn key={index} rows={rows} rolledByColor={rolledByColor} />
        ))}
      </div>
    </div>
  );
}
