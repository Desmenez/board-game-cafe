import { useMemo } from 'react';
import type { CamelUpAction } from 'shared';
import { hasActionType, spacesForDesert } from '../lib/camelUpLegalActions';

type Props = {
  legalActions: CamelUpAction[];
  canAct: boolean;
  desertMode: boolean;
};

export function CamelUpActionPanel({ legalActions, canAct, desertMode }: Props) {
  const desertSpaces = useMemo(() => spacesForDesert(legalActions), [legalActions]);
  const canPyramid = hasActionType(legalActions, 'take-pyramid-tile');

  if (!canAct) {
    return (
      <section className="card camel-up-actions camel-up-actions--waiting" aria-label="การกระทำ">
        <p>รอผู้เล่นคนอื่น…</p>
      </section>
    );
  }

  return (
    <section className="card camel-up-actions" aria-label="การกระทำ">
      <h3 className="camel-up-actions__title">เลือก 1 action</h3>

      {desertMode ? (
        <p className="camel-up-actions__hint">ลาก Oasis หรือ Mirage จากมือด้านล่างไปวางบนสนาม</p>
      ) : null}

      {!desertMode && !canPyramid && desertSpaces.length === 0 ? (
        <p className="camel-up-actions__hint">เดิมพัน Leg / ทั้งเกม — ใช้กองเดิมพันด้านบน</p>
      ) : !desertMode && !canPyramid && desertSpaces.length > 0 ? (
        <p className="camel-up-actions__hint">เลือก action บนสนามแข่งด้านบน</p>
      ) : null}
    </section>
  );
}
