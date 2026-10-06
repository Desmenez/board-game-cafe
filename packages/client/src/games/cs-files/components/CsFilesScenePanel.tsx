import type { CsFilesPlayerView, CsFilesSceneTile } from 'shared';
import { Button } from '../../../components/ui';
import { GameHistoryDisclosure, GameWaitingState } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';
import { CsFilesReplaceSituationModal } from './CsFilesReplaceSituationModal';

type Props = {
  gameState: CsFilesPlayerView;
  isForensic: boolean;
  onPlacePin: (tileId: string, optionIndex: number) => void;
  onConfirmPins: () => void;
  onReplaceSituation: (tileId: string) => void;
};

function TileCard({
  tile,
  needsPin,
  canEdit,
  onPlacePin,
}: {
  tile: CsFilesSceneTile;
  needsPin: boolean;
  canEdit: boolean;
  onPlacePin: (optionIndex: number) => void;
}) {
  const isLocation = tile.kind === 'location';
  const isCause = tile.kind === 'causeOfDeath';
  const isSituation = tile.kind === 'situation';

  return (
    <article
      className={cn(
        'min-w-0 rounded-card border px-2 py-1.5',
        isLocation && 'border-emerald-700/60 bg-emerald-700/20 text-emerald-100',
        isCause && 'border-pink-700/60 bg-pink-700/20 text-pink-100',
        isSituation && 'border-orange-700/60 bg-orange-700/20 text-orange-100',
        needsPin && isLocation && 'ring-2 ring-emerald-500/35',
        needsPin && isCause && 'ring-2 ring-pink-500/35',
        needsPin && isSituation && 'ring-2 ring-orange-500/35',
      )}
    >
      <header className="mb-1 min-w-0">
        <p
          className={cn(
            'truncate text-[0.65rem] font-semibold tracking-wide uppercase',
            isLocation && 'text-emerald-400',
            isCause && 'text-pink-400',
            isSituation && 'text-orange-400',
          )}
        >
          {isLocation ? 'สถานที่เกิดเหตุ' : isCause ? 'สาเหตุการตาย' : tile.label}
        </p>
      </header>
      <ul className="grid min-w-0 grid-cols-2 gap-1">
        {tile.options.map((opt, i) => {
          const pinned = tile.pinIndex === i;
          return (
            <li key={`${tile.id}-${i}`} className="min-w-0">
              <button
                type="button"
                disabled={!canEdit || !needsPin}
                onClick={() => onPlacePin(i)}
                className={cn(
                  'flex w-full min-w-0 items-center gap-1 rounded-input border px-1.5 py-1 text-left text-xs leading-snug',
                  pinned &&
                    isLocation &&
                    'border-emerald-400 bg-emerald-800/90 font-medium text-emerald-50',
                  pinned && isCause && 'border-pink-400 bg-pink-800/90 font-medium text-pink-50',
                  pinned &&
                    isSituation &&
                    'border-orange-400 bg-orange-800/90 font-medium text-orange-50',
                  !pinned &&
                    isLocation &&
                    'border-emerald-800/80 bg-emerald-950/50 text-emerald-100/90',
                  !pinned && isCause && 'border-pink-800/80 bg-pink-950/50 text-pink-100/90',
                  !pinned &&
                    isSituation &&
                    'border-orange-800/80 bg-orange-950/50 text-orange-100/90',
                  canEdit && needsPin && !pinned && isLocation && 'hover:bg-emerald-900/70',
                  canEdit && needsPin && !pinned && isCause && 'hover:bg-pink-900/70',
                  canEdit && needsPin && !pinned && isSituation && 'hover:bg-orange-900/70',
                  (!canEdit || !needsPin) && 'cursor-default',
                )}
              >
                {pinned ? (
                  <span
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      isLocation && 'bg-emerald-300',
                      isCause && 'bg-pink-300',
                      isSituation && 'bg-orange-300',
                    )}
                    aria-hidden
                  />
                ) : null}
                <span className="min-w-0 [overflow-wrap:anywhere]">{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export function CsFilesScenePanel({
  gameState: gs,
  isForensic,
  onPlacePin,
  onConfirmPins,
  onReplaceSituation,
}: Props) {
  const tiles = gs.sceneTiles ?? [];
  const needing = new Set(gs.tilesNeedingPin ?? []);
  const placing = gs.investigationSubPhase === 'placing_pins';
  const replacing = gs.investigationSubPhase === 'replacing_situation';
  const pending = gs.pendingSituationTile ?? null;
  const allPinned =
    needing.size === 0 ||
    [...needing].every((id) => tiles.find((t) => t.id === id)?.pinIndex != null);

  const locationTiles = tiles.filter((t) => t.kind === 'location');
  const causeTiles = tiles.filter((t) => t.kind === 'causeOfDeath');
  const situationTiles = tiles.filter((t) => t.kind === 'situation');
  const forensic =
    gs.forensicId != null ? (gs.players.find((p) => p.id === gs.forensicId) ?? null) : null;

  const renderTile = (tile: CsFilesSceneTile) => (
    <TileCard
      key={tile.id}
      tile={tile}
      needsPin={needing.has(tile.id)}
      canEdit={isForensic && placing}
      onPlacePin={(i) => onPlacePin(tile.id, i)}
    />
  );

  return (
    <>
      <GameHistoryDisclosure
        key={`scene-${gs.investigationRound}-${gs.investigationSubPhase}`}
        title={`แผ่นสถานการณ์ · รอบที่ ${gs.investigationRound ?? 1}`}
        defaultOpen={placing || replacing}
        className="top-4 z-20 w-full max-w-full min-w-0 overflow-x-clip md:sticky"
        meta={
          forensic ? (
            <PlayerIdentity
              playerId={forensic.id}
              name={forensic.name}
              avatarSize={28}
              secondary="นักนิติวิทยาศาสตร์"
            />
          ) : null
        }
      >
        <div className="max-h-[min(50vh,28rem)] min-w-0 space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain">
          {replacing && !pending ? (
            <p className="text-sm text-ink-2">กำลังสุ่มแผ่นสถานการณ์ใหม่…</p>
          ) : null}

          {replacing && pending && !isForensic ? (
            <GameWaitingState>รอนักนิติวิทยาศาสตร์เลือกแผ่นที่จะแทนที่</GameWaitingState>
          ) : null}

          {tiles.length === 0 ? (
            <p className="text-sm text-ink-3">ยังไม่มีแผ่นสถานการณ์</p>
          ) : (
            <div className="grid min-w-0 gap-2">
              <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                {locationTiles.map(renderTile)}
                {causeTiles.map(renderTile)}
              </div>
              {situationTiles.length > 0 ? (
                <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {situationTiles.map(renderTile)}
                </div>
              ) : null}
            </div>
          )}

          {isForensic && placing ? (
            <div className="flex justify-center pt-1">
              <Button variant="primary" disabled={!allPinned} onClick={onConfirmPins}>
                ยืนยันหมุดทั้งหมด
              </Button>
            </div>
          ) : null}
        </div>
      </GameHistoryDisclosure>

      {replacing && pending ? (
        <CsFilesReplaceSituationModal
          open
          pending={pending}
          situationTiles={situationTiles}
          canChoose={isForensic}
          onReplace={onReplaceSituation}
        />
      ) : null}
    </>
  );
}
