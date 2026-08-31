import type { CSSProperties } from 'react';
import {
  SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES,
  SURVIVE_THE_ISLAND_SEA_SERPENT_STARTING_WATER_SPACES,
  SURVIVE_THE_ISLAND_WATER_CELLS,
  surviveTheIslandWaterCellForSpace,
} from 'shared';
import { imageMap } from '../../../imageMap';
import {
  DEFAULT_SURVIVE_THE_ISLAND_LAYOUT,
  SURVIVE_THE_ISLAND_CELLS,
  surviveTheIslandCellCenter,
  type SurviveTheIslandBoardLayout,
} from '../boardLayout';
import { tileFor, type DemoTileAssets, type DemoTileFace } from '../tilePreview';

export type SurviveTheIslandBoardPreview = {
  tileFace: DemoTileFace;
  shuffleSeed: number;
};

type Props = {
  layout?: SurviveTheIslandBoardLayout;
  boardImageUrl: string;
  tileAssets: DemoTileAssets;
  preview: SurviveTheIslandBoardPreview;
  showLabels: boolean;
  showMarkers: boolean;
  showWaterHighlights: boolean;
  showRescueHighlights: boolean;
  showSeaSerpentHighlights: boolean;
  selectedCellId: number | null;
  onCellClick: (cellId: number) => void;
};

function markerStyle(left: number, top: number, width: number, height = width): CSSProperties {
  return { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` };
}

function tileStyle(left: number, top: number, width: number, height: number): CSSProperties {
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
  };
}

function waterPoint(layout: SurviveTheIslandBoardLayout, waterSpaceId: string) {
  const cell = surviveTheIslandWaterCellForSpace(waterSpaceId);
  if (!cell) return null;
  return {
    left: layout.gridOrigin.left + (cell.q2 / 2) * layout.columnPitch,
    top: layout.gridOrigin.top + (cell.row - 3) * layout.rowPitch,
  };
}

export function SurviveTheIslandBoard({
  layout = DEFAULT_SURVIVE_THE_ISLAND_LAYOUT,
  boardImageUrl,
  tileAssets,
  preview,
  showLabels,
  showMarkers,
  showWaterHighlights,
  showRescueHighlights,
  showSeaSerpentHighlights,
  selectedCellId,
  onCellClick,
}: Props) {
  const adventurerCell = SURVIVE_THE_ISLAND_CELLS.find((cell) => cell.id === 19)!;
  const raftCell = SURVIVE_THE_ISLAND_CELLS.find((cell) => cell.id === 31)!;
  const adventurerPoint = surviveTheIslandCellCenter(layout, adventurerCell);
  const raftPoint = surviveTheIslandCellCenter(layout, raftCell);

  return (
    <div
      className="sti-board-demo"
      style={
        boardImageUrl.trim() ? { backgroundImage: `url("${boardImageUrl.trim()}")` } : undefined
      }
    >
      <div className="sti-board-demo__watermark">
        {boardImageUrl.trim() ? null : 'Paste a board image URL to calibrate the final art'}
      </div>

      {SURVIVE_THE_ISLAND_CELLS.map((cell) => {
        const point = surviveTheIslandCellCenter(layout, cell);
        const selected = cell.id === selectedCellId;
        const tile = tileFor(preview.tileFace, cell.id, preview.shuffleSeed);
        const assetUrl = tileAssets[tile.key]?.trim();
        return (
          <button
            key={cell.id}
            type="button"
            className={`sti-tile ${tile.className} ${selected ? 'sti-tile--selected' : ''}`}
            style={tileStyle(point.left, point.top, layout.tileWidth, layout.tileHeight)}
            onClick={() => onCellClick(cell.id)}
            aria-pressed={selected}
            aria-label={`Tile ${cell.id + 1}: ${tile.label}`}
          >
            {assetUrl ? <img className="sti-tile__image" src={assetUrl} alt="" /> : null}
            {assetUrl ? null : <span className="sti-tile__art">{tile.label}</span>}
            {showLabels ? <span className="sti-tile__label">{cell.id + 1}</span> : null}
          </button>
        );
      })}

      {showWaterHighlights
        ? SURVIVE_THE_ISLAND_WATER_CELLS.map((cell) => {
            const point = waterPoint(layout, cell.id);
            if (!point) return null;
            return (
              <span
                key={cell.id}
                className="sti-water-highlight"
                style={tileStyle(point.left, point.top, layout.tileWidth, layout.tileHeight)}
              />
            );
          })
        : null}

      {showRescueHighlights
        ? SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES.flatMap((waterSpaceId) => {
            const point = waterPoint(layout, waterSpaceId);
            if (!point) return [];
            return (
              <span
                key={waterSpaceId}
                className="sti-rescue-highlight"
                style={tileStyle(point.left, point.top, layout.tileWidth, layout.tileHeight)}
              >
                <span>RESCUE</span>
              </span>
            );
          })
        : null}

      {showSeaSerpentHighlights
        ? SURVIVE_THE_ISLAND_SEA_SERPENT_STARTING_WATER_SPACES.flatMap((waterSpaceId) => {
            const point = waterPoint(layout, waterSpaceId);
            if (!point) return [];
            return (
              <span
                key={waterSpaceId}
                className="sti-sea-serpent-highlight"
                style={tileStyle(point.left, point.top, layout.tileWidth, layout.tileHeight)}
              >
                <span>SERPENT</span>
              </span>
            );
          })
        : null}

      {showMarkers ? (
        <>
          <img
            className="sti-marker sti-token-preview"
            style={markerStyle(adventurerPoint.left, adventurerPoint.top, layout.adventurerSize)}
            src={imageMap.surviveTheIsland.tokens.adventurers.red}
            alt="Adventurer scale preview"
          />
          <img
            className="sti-marker sti-token-preview"
            style={markerStyle(raftPoint.left, raftPoint.top, layout.raftSize)}
            src={imageMap.surviveTheIsland.tokens.raft}
            alt="Raft scale preview"
          />
          <img
            className="sti-marker sti-token-preview"
            style={markerStyle(layout.gridOrigin.left, layout.gridOrigin.top, layout.creatureSize)}
            src={imageMap.surviveTheIsland.tokens.seaSerpent}
            alt="Sea Serpent scale preview"
          />
        </>
      ) : null}
    </div>
  );
}
