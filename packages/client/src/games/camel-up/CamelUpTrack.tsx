import type { CSSProperties } from 'react';
import { CAMEL_UP_TRACK_LENGTH, type CamelUpColor, type CamelUpPlayerView } from 'shared';
import { camelUpDesertTileUrl, camelUpMapUrl } from './assetMeta';
import { CAMEL_COLOR_LABEL, camelColorClass } from './camelMeta';

type Props = {
  track: CamelUpPlayerView['track'];
  desertTiles: CamelUpPlayerView['desertTiles'];
  players: CamelUpPlayerView['players'];
  lastRoll: CamelUpPlayerView['lastRoll'];
};

function CamelToken({ color, index }: { color: CamelUpColor; index: number }) {
  return (
    <span
      className={['camel-up-camel', camelColorClass(color)].join(' ')}
      style={{ '--stack-index': index } as CSSProperties}
      title={CAMEL_COLOR_LABEL[color]}
      aria-label={CAMEL_COLOR_LABEL[color]}
    />
  );
}

export function CamelUpTrack({ track, desertTiles, players, lastRoll }: Props) {
  const spaces = Array.from({ length: CAMEL_UP_TRACK_LENGTH }, (_, i) => i + 1);
  const mapUrl = camelUpMapUrl();

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  return (
    <section className="card camel-up-track" aria-label="สนามแข่ง">
      <div className="camel-up-track__header">
        <h3 className="camel-up-track__title">สนามแข่ง</h3>
        {lastRoll ? (
          <p className="camel-up-track__last-roll">
            ลูกเต๋าล่าสุด:{' '}
            <strong>
              {lastRoll.face === 'grey'
                ? 'เทา'
                : CAMEL_COLOR_LABEL[lastRoll.movedColor ?? (lastRoll.face as CamelUpColor)]}
            </strong>
            {lastRoll.legEnded ? ' — ข้ามเส้นชัย!' : ''}
          </p>
        ) : null}
      </div>

      <div
        className="camel-up-track__oval"
        style={{ backgroundImage: mapUrl ? `url(${mapUrl})` : undefined }}
      >
        <div className="camel-up-track__start" aria-label="จุดเริ่ม">
          <div className="camel-up-track__stack">
            {(track[0]?.colors ?? []).map((color, idx) => (
              <CamelToken key={`start-${color}-${idx}`} color={color} index={idx} />
            ))}
          </div>
        </div>

        {spaces.map((space) => {
          const stack = track[space]?.colors ?? [];
          const desert = desertTiles.find((d) => d.space === space);
          return (
            <div
              key={space}
              className={['camel-up-track__space', `camel-up-track__space--${space}`].join(' ')}
              data-space={space}
            >
              {desert ? (
                <img
                  src={camelUpDesertTileUrl(desert.effect)}
                  alt=""
                  className="camel-up-track__desert-img"
                  title={`${playerName(desert.playerId)}: ${desert.effect === 'oasis' ? 'Oasis' : 'Mirage'}`}
                  loading="lazy"
                />
              ) : null}
              <div className="camel-up-track__stack">
                {stack.map((color, idx) => (
                  <CamelToken key={`${space}-${color}-${idx}`} color={color} index={idx} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
