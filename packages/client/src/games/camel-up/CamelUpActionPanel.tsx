import { useMemo, useState } from 'react';
import type { CamelUpAction, CamelUpColor, CamelUpDesertEffect } from 'shared';
import { Button } from '../../components/ui';
import { camelUpDesertTileUrl, camelUpRaceCardUrl } from './assetMeta';
import { CAMEL_COLOR_LABEL } from './camelMeta';

type Props = {
  legalActions: CamelUpAction[];
  canAct: boolean;
  sendAction: (action: unknown) => void;
};

function hasActionType(actions: CamelUpAction[], type: CamelUpAction['type']): boolean {
  return actions.some((a) => a.type === type);
}

function colorsForType(
  actions: CamelUpAction[],
  type: 'take-leg-bet-tile' | 'bet-overall-winner' | 'bet-overall-loser',
): CamelUpColor[] {
  return actions
    .filter((a) => a.type === type)
    .map((a) => (a as { color: CamelUpColor }).color);
}

function spacesForDesert(actions: CamelUpAction[]): number[] {
  const spaces = new Set<number>();
  for (const a of actions) {
    if (a.type === 'place-desert-tile') spaces.add(a.space);
  }
  return [...spaces].sort((a, b) => a - b);
}

export function CamelUpActionPanel({ legalActions, canAct, sendAction }: Props) {
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [mode, setMode] = useState<'leg' | 'desert' | 'overall-winner' | 'overall-loser' | null>(null);

  const legColors = useMemo(
    () => colorsForType(legalActions, 'take-leg-bet-tile'),
    [legalActions],
  );
  const winnerColors = useMemo(
    () => colorsForType(legalActions, 'bet-overall-winner'),
    [legalActions],
  );
  const loserColors = useMemo(
    () => colorsForType(legalActions, 'bet-overall-loser'),
    [legalActions],
  );
  const desertSpaces = useMemo(() => spacesForDesert(legalActions), [legalActions]);
  const canPyramid = hasActionType(legalActions, 'take-pyramid-tile');

  if (!canAct) {
    return (
      <section className="card camel-up-actions camel-up-actions--waiting" aria-label="การกระทำ">
        <p>รอผู้เล่นคนอื่น…</p>
      </section>
    );
  }

  const desertEffectsForSpace = (space: number): CamelUpDesertEffect[] =>
    legalActions
      .filter((a): a is Extract<CamelUpAction, { type: 'place-desert-tile' }> =>
        a.type === 'place-desert-tile' && a.space === space,
      )
      .map((a) => a.effect);

  return (
    <section className="card camel-up-actions" aria-label="การกระทำ">
      <h3 className="camel-up-actions__title">เลือก 1 action</h3>

      <div className="camel-up-actions__modes">
        {legColors.length > 0 ? (
          <Button
            type="button"
            variant={mode === 'leg' ? 'primary' : 'secondary'}
            onClick={() => setMode(mode === 'leg' ? null : 'leg')}
          >
            เดิมพัน Leg
          </Button>
        ) : null}
        {desertSpaces.length > 0 ? (
          <Button
            type="button"
            variant={mode === 'desert' ? 'primary' : 'secondary'}
            onClick={() => setMode(mode === 'desert' ? null : 'desert')}
          >
            วาง Desert Tile
          </Button>
        ) : null}
        {canPyramid ? (
          <Button type="button" variant="primary" onClick={() => sendAction({ type: 'take-pyramid-tile' })}>
            หยิบ Pyramid Tile
          </Button>
        ) : null}
        {winnerColors.length > 0 ? (
          <Button
            type="button"
            variant={mode === 'overall-winner' ? 'primary' : 'secondary'}
            onClick={() => setMode(mode === 'overall-winner' ? null : 'overall-winner')}
          >
            เดิมพันผู้ชนะ
          </Button>
        ) : null}
        {loserColors.length > 0 ? (
          <Button
            type="button"
            variant={mode === 'overall-loser' ? 'primary' : 'secondary'}
            onClick={() => setMode(mode === 'overall-loser' ? null : 'overall-loser')}
          >
            เดิมพันผู้แพ้
          </Button>
        ) : null}
      </div>

      {mode === 'leg' ? (
        <div className="camel-up-actions__picker">
          <p>เลือกสีอูฐสำหรับ Leg bet:</p>
          <div className="camel-up-actions__colors">
            {legColors.map((color) => (
              <Button
                key={color}
                type="button"
                variant="secondary"
                className="camel-up-actions__color-btn"
                onClick={() => sendAction({ type: 'take-leg-bet-tile', color })}
              >
                <img
                  src={camelUpRaceCardUrl(color)}
                  alt=""
                  className="camel-up-actions__card-thumb"
                  loading="lazy"
                />
                {CAMEL_COLOR_LABEL[color]}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {mode === 'desert' ? (
        <div className="camel-up-actions__picker">
          <p>เลือกช่องบนสนาม (1–16):</p>
          <div className="camel-up-actions__spaces">
            {desertSpaces.map((space) => (
              <Button
                key={space}
                type="button"
                variant={selectedSpace === space ? 'primary' : 'secondary'}
                onClick={() => setSelectedSpace(space)}
              >
                {space}
              </Button>
            ))}
          </div>
          {selectedSpace !== null ? (
            <div className="camel-up-actions__desert-effects">
              {desertEffectsForSpace(selectedSpace).map((effect) => (
                <Button
                  key={effect}
                  type="button"
                  variant="primary"
                  className="camel-up-actions__color-btn"
                  onClick={() =>
                    sendAction({ type: 'place-desert-tile', space: selectedSpace, effect })
                  }
                >
                  <img
                    src={camelUpDesertTileUrl(effect)}
                    alt=""
                    className="camel-up-actions__card-thumb"
                    loading="lazy"
                  />
                  {effect === 'oasis' ? 'Oasis (+1)' : 'Mirage (-1)'}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'overall-winner' ? (
        <div className="camel-up-actions__picker">
          <p>เลือกการ์ดวางเดิมพันผู้ชนะ:</p>
          <div className="camel-up-actions__colors">
            {winnerColors.map((color) => (
              <Button
                key={color}
                type="button"
                variant="secondary"
                className="camel-up-actions__color-btn"
                onClick={() => sendAction({ type: 'bet-overall-winner', color })}
              >
                <img
                  src={camelUpRaceCardUrl(color)}
                  alt=""
                  className="camel-up-actions__card-thumb"
                  loading="lazy"
                />
                {CAMEL_COLOR_LABEL[color]}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {mode === 'overall-loser' ? (
        <div className="camel-up-actions__picker">
          <p>เลือกการ์ดวางเดิมพันผู้แพ้:</p>
          <div className="camel-up-actions__colors">
            {loserColors.map((color) => (
              <Button
                key={color}
                type="button"
                variant="secondary"
                className="camel-up-actions__color-btn"
                onClick={() => sendAction({ type: 'bet-overall-loser', color })}
              >
                <img
                  src={camelUpRaceCardUrl(color)}
                  alt=""
                  className="camel-up-actions__card-thumb"
                  loading="lazy"
                />
                {CAMEL_COLOR_LABEL[color]}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {mode === null && !canPyramid ? (
        <p className="camel-up-actions__hint">เลือกประเภท action ด้านบน</p>
      ) : null}
    </section>
  );
}
