import { motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import type {
  SurviveTheIslandAction,
  SurviveTheIslandPlayerView,
  SurviveTheIslandWaterSpace,
} from 'shared';
import { SURVIVE_THE_ISLAND_WATER_CELLS } from 'shared';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import { Button } from '../../components/ui';
import { imageMap } from '../../imageMap';
import {
  DEFAULT_SURVIVE_THE_ISLAND_LAYOUT,
  SURVIVE_THE_ISLAND_CELLS,
  surviveTheIslandCellCenter,
} from './boardLayout';
import './survive-the-island-layout-demo.css';

type Props = {
  gameState: SurviveTheIslandPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

function adventurerImage(color: string): string {
  return imageMap.surviveTheIsland.tokens.adventurers[
    color as keyof typeof imageMap.surviveTheIsland.tokens.adventurers
  ];
}

export function SurviveTheIslandGame({
  gameState: view,
  myId,
  sendAction,
  onLeave,
  onRestart,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [selectedAdventurerId, setSelectedAdventurerId] = useState<string | null>(null);
  const [selectedRaftId, setSelectedRaftId] = useState<string | null>(null);
  const selected = selectedAdventurerId
    ? view.adventurers.find((item) => item.id === selectedAdventurerId)
    : null;
  const activeName = view.players.find((player) => player.id === view.activePlayerId)?.name ?? '—';
  const myUnplaced = useMemo(
    () =>
      view.adventurers.find(
        (item) => item.playerId === myId && item.tileId == null && !item.eliminated,
      ),
    [view.adventurers, myId],
  );
  const send = (action: SurviveTheIslandAction) => sendAction(action);
  const canMoveSelected = selected?.playerId === myId && view.phase === 'action' && view.canAct;
  const myUnplacedRaft = view.rafts.find(
    (raft) => raft.playerId === myId && raft.waterSpaceId == null,
  );
  const sinkingTerrain = view.legalSinkTileIds.length
    ? view.tiles.find((tile) => tile.id === view.legalSinkTileIds[0])?.terrain
    : null;

  const waterPoint = (waterSpaceId: SurviveTheIslandWaterSpace) => {
    const waterCell = SURVIVE_THE_ISLAND_WATER_CELLS.find((cell) => cell.id === waterSpaceId);
    if (!waterCell) return null;
    return {
      left:
        DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.gridOrigin.left +
        (waterCell.q2 / 2) * DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.columnPitch,
      top:
        DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.gridOrigin.top +
        (waterCell.row - 3) * DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.rowPitch,
    };
  };

  const onTileClick = (tileId: number) => {
    if (!view.canAct) return;
    if (view.phase === 'setup_adventurers' && myUnplaced) {
      send({ type: 'place-adventurer', adventurerId: myUnplaced.id, tileId });
      return;
    }
    if (view.phase === 'rising_waters' && view.legalSinkTileIds.includes(tileId)) {
      send({ type: 'sink-tile', tileId });
      return;
    }
    if (canMoveSelected) {
      send({ type: 'move-adventurer', adventurerId: selected.id, tileId });
      setSelectedAdventurerId(null);
    }
  };

  const onWaterClick = (waterSpaceId: SurviveTheIslandWaterSpace) => {
    if (view.phase === 'setup_rafts' && view.canAct && myUnplacedRaft) {
      send({ type: 'place-raft', raftId: myUnplacedRaft.id, waterSpaceId });
      return;
    }
    if (selectedRaftId && view.phase === 'action' && view.canAct) {
      send({ type: 'move-raft', raftId: selectedRaftId, waterSpaceId });
      setSelectedRaftId(null);
      return;
    }
    if (canMoveSelected) {
      send({ type: 'move-adventurer', adventurerId: selected.id, waterSpaceId });
      setSelectedAdventurerId(null);
    }
  };

  const onRaftClick = (raftId: string) => {
    if (view.phase !== 'action' || !view.canAct) return;
    setSelectedAdventurerId(null);
    // Raft destinations are selected by clicking a neighbouring water hex.
    setSelectedRaftId(raftId);
  };

  if (view.phase === 'game_over') {
    return (
      <GameShell className="app-night-page p-4">
        <GameOverModal
          titleId="sti-game-over"
          gameId="survive-the-island"
          onLeave={onLeave}
          onRestart={onRestart}
        >
          <h1 id="sti-game-over">เกาะจมแล้ว</h1>
          <p>{view.result?.reason}</p>
        </GameOverModal>
      </GameShell>
    );
  }

  return (
    <GameShell className="app-night-page p-4">
      <GamePlayHeader
        title="Survive the Island"
        subtitle={`${activeName} · ${view.phase}`}
        onLeave={onLeave}
        onRestart={onRestart}
      />
      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card p-3">
          <div
            className="sti-board-demo"
            style={{ backgroundImage: `url("${imageMap.surviveTheIsland.board}")` }}
          >
            {view.tiles.map((tile) => {
              const cell = SURVIVE_THE_ISLAND_CELLS[tile.id]!;
              const point = surviveTheIslandCellCenter(DEFAULT_SURVIVE_THE_ISLAND_LAYOUT, cell);
              const src = imageMap.surviveTheIsland.terrain[tile.terrain];
              const sunk = tile.state === 'sunk';
              return (
                <button
                  key={tile.id}
                  type="button"
                  className={`sti-tile ${view.legalSinkTileIds.includes(tile.id) ? 'sti-tile--selected' : ''}`}
                  style={{
                    left: `${point.left}%`,
                    top: `${point.top}%`,
                    width: '8.1%',
                    aspectRatio: '1.111',
                  }}
                  disabled={sunk}
                  onClick={() => onTileClick(tile.id)}
                >
                  {sunk ? (
                    <span className="sti-tile__art">Water</span>
                  ) : (
                    <img className="sti-tile__image" src={src} alt="" />
                  )}
                  {tile.state === 'volcano' ? (
                    <img
                      className="sti-marker"
                      style={{ left: '50%', top: '50%', width: '78%', height: '78%' }}
                      src={imageMap.surviveTheIsland.effects.volcano}
                      alt="Volcano"
                    />
                  ) : null}
                </button>
              );
            })}
            {SURVIVE_THE_ISLAND_WATER_CELLS.map((waterCell) => {
              const point = {
                left:
                  DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.gridOrigin.left +
                  (waterCell.q2 / 2) * DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.columnPitch,
                top:
                  DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.gridOrigin.top +
                  (waterCell.row - 3) * DEFAULT_SURVIVE_THE_ISLAND_LAYOUT.rowPitch,
              };
              const raft = view.rafts.find((item) => item.waterSpaceId === waterCell.id);
              return (
                <button
                  key={waterCell.id}
                  type="button"
                  className={`absolute z-20 grid w-[8.1%] -translate-x-1/2 -translate-y-1/2 place-items-center border-2 ${view.phase === 'setup_rafts' && view.canAct && !raft ? 'border-amber-200 bg-amber-100/20' : 'border-transparent'}`}
                  style={{
                    left: `${point.left}%`,
                    top: `${point.top}%`,
                    aspectRatio: '0.866',
                    clipPath: 'polygon(50% 0, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)',
                  }}
                  onClick={() => onWaterClick(waterCell.id as SurviveTheIslandWaterSpace)}
                  aria-label="Water space"
                >
                </button>
              );
            })}
            {view.rafts.flatMap((raft) => {
              if (raft.waterSpaceId == null) return [];
              const point = waterPoint(raft.waterSpaceId);
              if (!point) return [];
              return (
                <motion.button
                  key={raft.id}
                  type="button"
                  className={`absolute z-20 w-[7.2%] -translate-x-1/2 -translate-y-1/2 ${selectedRaftId === raft.id ? 'drop-shadow-[0_0_10px_white]' : ''}`}
                  style={{ aspectRatio: '1.2' }}
                  initial={false}
                  animate={{ left: `${point.left}%`, top: `${point.top}%` }}
                  transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRaftClick(raft.id);
                  }}
                  aria-label="Raft"
                >
                  <img className="h-full w-full object-contain" src={imageMap.surviveTheIsland.tokens.raft} alt="Raft" />
                </motion.button>
              );
            })}
            {view.adventurers.flatMap((adventurer) => {
              if (adventurer.eliminated || adventurer.rescued) return [];
              const point =
                adventurer.tileId != null
                  ? surviveTheIslandCellCenter(
                      DEFAULT_SURVIVE_THE_ISLAND_LAYOUT,
                      SURVIVE_THE_ISLAND_CELLS[adventurer.tileId]!,
                    )
                  : adventurer.waterSpaceId
                    ? waterPoint(adventurer.waterSpaceId)
                    : null;
              if (!point) return [];
              return (
                <motion.button
                  key={adventurer.id}
                  type="button"
                  className={`absolute z-30 w-[4.8%] -translate-x-1/2 -translate-y-1/2 ${selectedAdventurerId === adventurer.id ? 'drop-shadow-[0_0_10px_white]' : ''}`}
                  style={{ aspectRatio: '0.7' }}
                  initial={false}
                  animate={{ left: `${point.left}%`, top: `${point.top}%`, scale: 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (adventurer.playerId === myId) {
                      setSelectedRaftId(null);
                      setSelectedAdventurerId(adventurer.id);
                    }
                  }}
                  aria-label="Adventurer"
                >
                  <img className="h-full w-full object-contain" src={adventurerImage(adventurer.color)} alt="Adventurer" />
                </motion.button>
              );
            })}
            <img
              className="sti-marker z-20"
              style={{ left: '50%', top: '50%', width: '8.6%', height: '8.6%' }}
              src={imageMap.surviveTheIsland.tokens.seaSerpent}
              alt="Sea Serpent"
            />
          </div>
        </section>
        <aside className="card space-y-3 p-4 text-sm">
          <p className="font-semibold">{view.lastEvent}</p>
          <p>
            Volcano: {view.volcanoesRevealed}/3 · Moves: {view.movesRemaining}/3
          </p>
          {view.phase === 'setup_adventurers' ? (
            <p>
              {view.canAct
                ? 'คลิก Island tile ว่างเพื่อวาง Adventurer ตัวถัดไป'
                : 'รอผู้เล่นอื่นวาง Adventurer'}
            </p>
          ) : null}
          {view.phase === 'setup_rafts' ? (
            <p>
              {view.canAct ? 'คลิกวงกลมสีทองบน water เพื่อวาง Raft 1 ลำ' : 'รอผู้เล่นอื่นวาง Raft'}
            </p>
          ) : null}
          {view.phase === 'action' ? (
            <>
              <p>
                {selectedRaftId
                  ? 'คลิก Water hex ที่ติดกันและว่างเพื่อขยับ Raft'
                  : selected
                  ? 'คลิก Island tile ที่ติดกันเพื่อเดิน หรือ Water hex ที่ติดกับเกาะเพื่อว่ายน้ำ'
                  : 'คลิก Adventurer หรือ Raft ของคุณ แล้วเลือกช่องปลายทาง'}
              </p>
              {view.canAct ? (
                <Button onClick={() => send({ type: 'finish-action' })}>จบ Action phase</Button>
              ) : null}
            </>
          ) : null}
          {view.phase === 'rising_waters' ? (
            <div className="space-y-2 rounded-lg border border-amber-300/50 bg-amber-100/10 p-3">
              <p className="font-semibold text-amber-100">น้ำขึ้น: ทำให้เกาะจม 1 แผ่น</p>
              {view.canAct ? (
                <p>
                  เลือก <strong>{sinkingTerrain ?? 'Beach'}</strong> ที่เรืองแสงบนกระดาน 1 แผ่น (
                  {view.legalSinkTileIds.length} แผ่นให้เลือก) แล้วระบบจะเปิดผลด้านหลังให้ทันที
                </p>
              ) : (
                <p>รอผู้เล่นปัจจุบันเลือก Island tile 1 แผ่นให้จม</p>
              )}
            </div>
          ) : null}
          <div className="space-y-1 border-t pt-3">
            {view.players.map((player) => (
              <p key={player.id}>
                {player.name}: {player.rescuedTreasure} แต้ม · Ability {player.abilityCount}
              </p>
            ))}
          </div>
        </aside>
      </div>
    </GameShell>
  );
}
