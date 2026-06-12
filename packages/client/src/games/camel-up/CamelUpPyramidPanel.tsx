import type { CamelUpDieFace } from 'shared';
import { CAMEL_COLOR_LABEL } from './camelMeta';

type Props = {
  pyramidDiceRemaining: number;
  rolledDice: CamelUpDieFace[];
};

function dieLabel(face: CamelUpDieFace): string {
  if (face === 'grey') return 'เทา';
  return CAMEL_COLOR_LABEL[face];
}

export function CamelUpPyramidPanel({ pyramidDiceRemaining, rolledDice }: Props) {
  const recent = rolledDice.slice(-6).reverse();

  return (
    <section className="card camel-up-pyramid" aria-label="Pyramid">
      <h3 className="camel-up-pyramid__title">Pyramid</h3>
      <p className="camel-up-pyramid__remaining">
        ลูกเต๋าเหลือ: <strong>{pyramidDiceRemaining}</strong>
      </p>
      <div className="camel-up-pyramid__rolled">
        <span className="camel-up-pyramid__rolled-label">ออกแล้ว (ล่าสุด)</span>
        <ul className="camel-up-pyramid__dice-list">
          {recent.length === 0 ? (
            <li className="camel-up-pyramid__dice-empty">ยังไม่มี</li>
          ) : (
            recent.map((face, idx) => (
              <li
                key={`${face}-${idx}`}
                className={['camel-up-pyramid__die', face === 'grey' ? 'camel-up-pyramid__die--grey' : ''].join(' ')}
              >
                {dieLabel(face)}
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
