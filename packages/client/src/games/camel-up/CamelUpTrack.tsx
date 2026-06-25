import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { CamelUpAction, CamelUpColor, CamelUpDesertEffect } from 'shared';
import { CAMEL_UP_TRACK_LENGTH, type CamelUpPlayerView } from 'shared';
import { Button } from '../../components/ui';
import { camelUpDesertTileUrl, camelUpMapUrl } from './assetMeta';
import { desertDropZoneId } from './camelUpDesertDnd';
import { CAMEL_COLOR_LABEL, camelColorClass } from './camelMeta';
import { CamelUpLegPyramidStatus } from './CamelUpLegPyramidStatus';
import { hasActionType, spacesForDesert } from './camelUpLegalActions';
import { trackSpaceStyle } from './trackPositions';
import type { MovingStackState } from './useCamelTrackAnimation';
import type { CamelTrackView } from './camelUpTrackMove';

const ALL_TRACK_SPACES = Array.from({ length: CAMEL_UP_TRACK_LENGTH }, (_, i) => i + 1);

type Props = {
  displayTrack: CamelTrackView;
  movingStack: MovingStackState | null;
  desertTiles: CamelUpPlayerView['desertTiles'];
  players: CamelUpPlayerView['players'];
  lastRoll: CamelUpPlayerView['lastRoll'];
  leg: number;
  phase: CamelUpPlayerView['phase'];
  rolledDice: CamelUpPlayerView['rolledDice'];
  canAct?: boolean;
  legalActions?: CamelUpAction[];
  sendAction?: (action: unknown) => void;
  desertMode?: boolean;
  onDesertModeChange?: (active: boolean) => void;
  draggingDesertEffect?: CamelUpDesertEffect | null;
  desertDropSpaces?: number[];
  myId?: string;
};

function CamelToken({ color }: { color: CamelUpColor }) {
  return (
    <span
      className={['camel-up-camel', camelColorClass(color)].join(' ')}
      title={CAMEL_COLOR_LABEL[color]}
      aria-label={CAMEL_COLOR_LABEL[color]}
    />
  );
}

function CamelStack({ colors }: { colors: CamelUpColor[] }) {
  return (
    <div className="camel-up-track__stack">
      {colors.map((color, idx) => (
        <CamelToken key={`${color}-${idx}`} color={color} />
      ))}
    </div>
  );
}

function MovingCamelStack({ colors, space }: { colors: CamelUpColor[]; space: number }) {
  const pos = trackSpaceStyle(space);
  return (
    <div className="camel-up-track__moving-stack" style={pos} aria-hidden>
      <CamelStack colors={colors} />
    </div>
  );
}

function TrackSpace({
  space,
  stack,
  desert,
  playerName,
  canDropDesert,
  desertDropActive,
  showDesertDropMarker,
  myId,
}: {
  space: number;
  stack: CamelUpColor[];
  desert?: CamelUpPlayerView['desertTiles'][0];
  playerName: (id: string) => string;
  canDropDesert: boolean;
  desertDropActive: boolean;
  showDesertDropMarker: boolean;
  myId?: string;
}) {
  const pos = trackSpaceStyle(space);
  const dropEnabled = desertDropActive && canDropDesert;
  const { setNodeRef, isOver } = useDroppable({
    id: desertDropZoneId(space),
    disabled: !dropEnabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        'camel-up-track__space',
        dropEnabled ? 'camel-up-track__space--desert-drop' : '',
        showDesertDropMarker ? 'camel-up-track__space--desert-drop-visible' : '',
        dropEnabled && isOver ? 'camel-up-track__space--desert-drop-over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={pos}
      data-space={space}
      aria-label={
        dropEnabled
          ? `วาง Desert Tile ช่อง ${space}`
          : space === 1
            ? 'จุดเริ่ม / เส้นชัย'
            : `ช่อง ${space}`
      }
    >
      {showDesertDropMarker ? (
        <span className="camel-up-track__desert-drop-marker" aria-hidden>
          {space}
        </span>
      ) : null}
      {desert ? (
        <div
          className={[
            'camel-up-track__desert-placed',
            desert.playerId === myId ? 'camel-up-track__desert-placed--mine' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <img
            src={camelUpDesertTileUrl(desert.effect)}
            alt=""
            className="camel-up-track__desert-img"
            loading="lazy"
          />
          <span className="camel-up-track__desert-owner">{playerName(desert.playerId)}</span>
        </div>
      ) : null}
      <CamelStack colors={stack} />
    </div>
  );
}

export function CamelUpTrack({
  displayTrack,
  movingStack,
  desertTiles,
  players,
  lastRoll,
  leg,
  phase,
  rolledDice,
  canAct = false,
  legalActions = [],
  sendAction,
  desertMode = false,
  onDesertModeChange,
  draggingDesertEffect = null,
  desertDropSpaces = [],
  myId,
}: Props) {
  const mapUrl = camelUpMapUrl();
  const desertSpaces = useMemo(() => spacesForDesert(legalActions), [legalActions]);
  const desertDropSet = useMemo(() => new Set(desertDropSpaces), [desertDropSpaces]);
  const canPyramid = hasActionType(legalActions, 'take-pyramid-tile');
  const showTrackActions = canAct && (desertSpaces.length > 0 || canPyramid);
  const desertDropActive = desertMode || draggingDesertEffect !== null;
  const showDesertDropMarker = draggingDesertEffect !== null;

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  return (
    <section className="card camel-up-track" aria-label="สนามแข่ง">
      <div className="camel-up-track__header">
        <div className="camel-up-track__heading">
          <h3 className="camel-up-track__title">สนามแข่ง</h3>
          {lastRoll ? (
            <p className="camel-up-track__last-roll">
              ลูกเต๋าล่าสุด:{' '}
              <strong>
                {CAMEL_COLOR_LABEL[lastRoll.color]} ({lastRoll.value})
              </strong>
              {lastRoll.legEnded ? ' — ข้ามเส้นชัย! เกมจบ' : ''}
            </p>
          ) : null}
        </div>
      </div>

      <div className="camel-up-track__board">
        <img src={mapUrl} alt="" className="camel-up-track__map" loading="eager" decoding="async" />
        <div
          className={[
            'camel-up-track__overlay',
            movingStack ? 'camel-up-track__overlay--animating' : '',
            desertDropActive ? 'camel-up-track__overlay--desert-drop-active' : '',
            showDesertDropMarker ? 'camel-up-track__overlay--desert-drag' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {ALL_TRACK_SPACES.map((space) => (
            <TrackSpace
              key={space}
              space={space}
              stack={displayTrack[space]?.colors ?? []}
              desert={desertTiles.find((d) => d.space === space)}
              playerName={playerName}
              canDropDesert={desertDropSet.has(space)}
              desertDropActive={desertDropActive}
              showDesertDropMarker={showDesertDropMarker && desertDropSet.has(space)}
              myId={myId}
            />
          ))}
          {movingStack ? (
            <MovingCamelStack colors={movingStack.colors} space={movingStack.space} />
          ) : null}
        </div>
      </div>

      <div className="camel-up-track__footer">
        <CamelUpLegPyramidStatus
          leg={leg}
          phase={phase}
          rolledDice={rolledDice}
          track={displayTrack}
        />
        {showTrackActions && sendAction ? (
          <div className="camel-up-track__actions">
            {canPyramid ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => sendAction({ type: 'take-pyramid-tile' })}
              >
                ทอยลูกเต๋า Pyramid
              </Button>
            ) : null}
            {desertSpaces.length > 0 ? (
              <Button
                type="button"
                variant={desertMode ? 'primary' : 'secondary'}
                onClick={() => onDesertModeChange?.(!desertMode)}
              >
                วาง Desert Tile
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
