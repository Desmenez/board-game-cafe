import type { CamelUpPyramidDie } from 'shared';
import { CAMEL_COLOR_LABEL } from '../lib/camelMeta';

type Props = {
  pyramidDiceRemaining: number;
  pyramidDiceInBag: CamelUpPyramidDie[];
  rolledDice: CamelUpPyramidDie[];
};

function dieLabel(die: CamelUpPyramidDie): string {
  return `${CAMEL_COLOR_LABEL[die.color]} ${die.value}`;
}

export function CamelUpPyramidPanel({ pyramidDiceRemaining, pyramidDiceInBag, rolledDice }: Props) {
  const recent = rolledDice.slice(-6).reverse();

  return (
    <section className="card camel-up-pyramid" aria-label="Pyramid">
      <h3 className="camel-up-pyramid__title">Pyramid</h3>
      <p className="camel-up-pyramid__remaining">
        ลูกเต๋าเหลือ: <strong>{pyramidDiceRemaining}</strong>/5
      </p>
      <div className="camel-up-pyramid__rolled">
        <span className="camel-up-pyramid__rolled-label">ออกแล้ว (ล่าสุด)</span>
        <ul className="camel-up-pyramid__dice-list">
          {recent.length === 0 ? (
            <li className="camel-up-pyramid__dice-empty">ยังไม่มี</li>
          ) : (
            recent.map((die, idx) => (
              <li key={`${die.color}-${idx}`} className="camel-up-pyramid__die">
                {dieLabel(die)}
              </li>
            ))
          )}
        </ul>
      </div>
      {pyramidDiceInBag.length > 0 ? (
        <p className="camel-up-pyramid__in-bag">
          ในถุง: {pyramidDiceInBag.map((die) => dieLabel(die)).join(' · ')}
        </p>
      ) : null}
    </section>
  );
}
