import { CAMEL_UP_COLORS, type CamelUpPlayerView, type CamelUpPyramidDie } from 'shared';
import { Badge } from '../../components/ui';
import { CAMEL_COLOR_LABEL, camelColorClass } from './camelMeta';

type Props = {
  leg: number;
  phase: CamelUpPlayerView['phase'];
  rolledDice: CamelUpPyramidDie[];
};

export function CamelUpLegPyramidStatus({ leg, phase, rolledDice }: Props) {
  const isGameOver = phase === 'game_over';
  const rolledByColor = new Map(rolledDice.map((die) => [die.color, die]));

  return (
    <div className="camel-up-leg-status">
      <div className="camel-up-leg-status__head">
        <Badge variant="default">Leg {leg}</Badge>
        {isGameOver ? (
          <span className="camel-up-leg-status__phase">เกมจบแล้ว</span>
        ) : (
          <span className="camel-up-leg-status__phase">ลูกเต๋า Pyramid</span>
        )}
      </div>

      <ul className="camel-up-leg-dice" aria-label="ลูกเต๋า Pyramid Leg นี้">
        {CAMEL_UP_COLORS.map((color) => {
          const rolled = rolledByColor.get(color);
          const isRolled = rolled !== undefined;

          return (
            <li
              key={color}
              className={[
                'camel-up-leg-dice__cell',
                isRolled ? 'camel-up-leg-dice__cell--rolled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={
                isRolled
                  ? `${CAMEL_COLOR_LABEL[color]} ทอยแล้ว ได้ ${rolled.value}`
                  : CAMEL_COLOR_LABEL[color]
              }
            >
              <span
                className={['camel-up-leg-dice__color', camelColorClass(color)].join(' ')}
                aria-hidden
              />
              {isRolled ? <span className="camel-up-leg-dice__value">{rolled.value}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
