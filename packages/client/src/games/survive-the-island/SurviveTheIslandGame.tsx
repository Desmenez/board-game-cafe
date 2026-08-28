import { motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import type {
  SurviveTheIslandAction,
  SurviveTheIslandPlayerView,
  SurviveTheIslandWaterSpace,
} from 'shared';
import {
  SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES,
  SURVIVE_THE_ISLAND_WATER_CELLS,
  surviveTheIslandAdjacentIslandTiles,
  surviveTheIslandAdjacentWaterSpaces,
  surviveTheIslandWaterCellForSpace,
  surviveTheIslandWaterNeighboursForTile,
  surviveTheIslandWaterSpaceForTile,
} from 'shared';
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
  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null);
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
  const availableWaterSpaces = useMemo(
    () => [
      ...SURVIVE_THE_ISLAND_WATER_CELLS.map((cell) => cell.id),
      ...view.tiles
        .filter((tile) => tile.state === 'sunk')
        .map((tile) => surviveTheIslandWaterSpaceForTile(tile.id)),
    ],
    [view.tiles],
  );

  const waterPoint = (waterSpaceId: SurviveTheIslandWaterSpace) => {
    const waterCell = surviveTheIslandWaterCellForSpace(waterSpaceId);
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

  const reachableWaterTargets = (origin: string, range: number): string[] => {
    const distances = new Map<string, number>([[origin, 0]]);
    const queue = [origin];
    while (queue.length) {
      const current = queue.shift()!;
      const distance = distances.get(current)!;
      if (distance >= range) continue;
      for (const neighbour of surviveTheIslandAdjacentWaterSpaces(current, availableWaterSpaces)) {
        if (!distances.has(neighbour)) {
          distances.set(neighbour, distance + 1);
          queue.push(neighbour);
        }
      }
    }
    return [...distances.keys()].filter((waterSpaceId) => waterSpaceId !== origin);
  };

  const legalWaterTargetIds = useMemo(() => {
    if (selectedAbility === 'dive') return availableWaterSpaces;
    if (selectedRaftId) {
      const raft = view.rafts.find((item) => item.id === selectedRaftId);
      return raft?.waterSpaceId
        ? reachableWaterTargets(raft.waterSpaceId, selectedAbility === 'paddle' ? 2 : 1)
        : [];
    }
    if (selected && selected.tileId != null)
      return surviveTheIslandWaterNeighboursForTile(selected.tileId, availableWaterSpaces);
    if (selectedCreatureId && view.phase === 'creatures') {
      const creature = view.creatures.find((item) => item.id === selectedCreatureId);
      return creature
        ? reachableWaterTargets(creature.waterSpaceId, creature.kind === 'sea-serpent' ? 1 : 2)
        : [];
    }
    if (selected?.waterSpaceId && selectedAbility === 'dolphin')
      return reachableWaterTargets(selected.waterSpaceId, 2);
    return [];
  }, [availableWaterSpaces, selected, selectedAbility, selectedCreatureId, selectedRaftId, view.creatures, view.phase, view.rafts]);

  const legalIslandTargetIds = useMemo(() => {
    if (!selected) return [];
    if (selected.tileId != null) return surviveTheIslandAdjacentIslandTiles(selected.tileId);
    if (!selected.waterSpaceId) return [];
    const reachable =
      selectedAbility === 'dolphin'
        ? reachableWaterTargets(selected.waterSpaceId, 2)
        : [selected.waterSpaceId];
    return view.tiles.flatMap((tile) =>
      tile.state === 'island' &&
      surviveTheIslandWaterNeighboursForTile(tile.id, availableWaterSpaces).some((waterSpaceId) =>
        reachable.includes(waterSpaceId),
      )
        ? [tile.id]
        : [],
    );
  }, [availableWaterSpaces, selected, view.tiles]);

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
      if (selectedAbility === 'dolphin') {
        send({ type: 'use-ability', ability: 'dolphin', adventurerId: selected.id, tileId });
        setSelectedAbility(null);
        setSelectedAdventurerId(null);
        return;
      }
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
      if (selectedAbility === 'paddle') {
        send({ type: 'use-ability', ability: 'paddle', raftId: selectedRaftId, waterSpaceId });
        setSelectedAbility(null);
        setSelectedRaftId(null);
        return;
      }
      send({ type: 'move-raft', raftId: selectedRaftId, waterSpaceId });
      setSelectedRaftId(null);
      return;
    }
    if (selectedCreatureId && view.phase === 'creatures' && view.canAct) {
      send({ type: 'move-creature', creatureId: selectedCreatureId, waterSpaceId });
      setSelectedCreatureId(null);
      return;
    }
    if (selectedCreatureId && selectedAbility === 'dive' && view.phase === 'action' && view.canAct) {
      send({ type: 'use-ability', ability: 'dive', creatureId: selectedCreatureId, waterSpaceId });
      setSelectedAbility(null);
      setSelectedCreatureId(null);
      return;
    }
    if (canMoveSelected) {
      if (selectedAbility === 'dolphin') {
        send({ type: 'use-ability', ability: 'dolphin', adventurerId: selected.id, waterSpaceId });
        setSelectedAbility(null);
        setSelectedAdventurerId(null);
        return;
      }
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

  const rescueSelectedAdventurer = () => {
    if (!selected || !canMoveSelected) return;
    send({ type: 'rescue-adventurer', adventurerId: selected.id });
    setSelectedAdventurerId(null);
  };

  const selectedCanBeRescued = Boolean(
      selected &&
      selected.waterSpaceId &&
      (SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES as readonly string[]).includes(selected.waterSpaceId) &&
      view.rafts.some((raft) => raft.waterSpaceId === selected.waterSpaceId),
  );

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
          <ol className="mt-4 space-y-2 text-left">
            {[...view.players]
              .sort((a, b) => b.rescuedTreasure - a.rescuedTreasure)
              .map((player, index) => {
                const rescued = view.adventurers.filter(
                  (adventurer) => adventurer.playerId === player.id && adventurer.rescued,
                ).length;
                const eliminated = view.adventurers.filter(
                  (adventurer) => adventurer.playerId === player.id && adventurer.eliminated,
                ).length;
                return (
                  <li key={player.id} className="rounded-lg border border-white/15 px-3 py-2">
                    {index + 1}. {player.name} — {player.rescuedTreasure} แต้ม · ช่วย {rescued} · สูญหาย {eliminated}
                  </li>
                );
              })}
          </ol>
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
                  className={`sti-tile ${view.legalSinkTileIds.includes(tile.id) || legalIslandTargetIds.includes(tile.id) ? 'sti-tile--selected' : ''}`}
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
            {availableWaterSpaces.map((waterSpaceId) => {
              const point = waterPoint(waterSpaceId);
              if (!point) return null;
              const raft = view.rafts.find((item) => item.waterSpaceId === waterSpaceId);
              const isTarget = legalWaterTargetIds.includes(waterSpaceId);
              return (
                <button
                  key={waterSpaceId}
                  type="button"
                  className={`absolute z-20 grid w-[8.1%] -translate-x-1/2 -translate-y-1/2 place-items-center border-2 ${isTarget ? 'border-cyan-100 bg-cyan-100/20' : view.phase === 'setup_rafts' && view.canAct && !raft ? 'border-amber-200 bg-amber-100/20' : 'border-transparent'}`}
                  style={{
                    left: `${point.left}%`,
                    top: `${point.top}%`,
                    aspectRatio: '0.866',
                    clipPath: 'polygon(50% 0, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)',
                  }}
                  onClick={() => onWaterClick(waterSpaceId as SurviveTheIslandWaterSpace)}
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
            {view.creatures.flatMap((creature) => {
              const point = waterPoint(creature.waterSpaceId);
              if (!point) return [];
              const src =
                creature.kind === 'sea-serpent'
                  ? imageMap.surviveTheIsland.tokens.seaSerpent
                  : creature.kind === 'shark'
                    ? imageMap.surviveTheIsland.tokens.shark
                    : imageMap.surviveTheIsland.tokens.kaiju;
              return (
                <motion.button
                  key={creature.id}
                  type="button"
                  className={`absolute z-25 w-[7.4%] -translate-x-1/2 -translate-y-1/2 ${selectedCreatureId === creature.id ? 'drop-shadow-[0_0_10px_white]' : ''}`}
                  initial={false}
                  animate={{ left: `${point.left}%`, top: `${point.top}%`, scale: 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (view.phase === 'creatures' && view.canAct && view.creatureToMove === creature.kind)
                      setSelectedCreatureId(creature.id);
                    if (view.phase === 'action' && view.canAct && selectedAbility === 'repellent') {
                      send({ type: 'use-ability', ability: 'repellent', creatureId: creature.id });
                      setSelectedAbility(null);
                    }
                    if (view.phase === 'action' && view.canAct && selectedAbility === 'dive')
                      setSelectedCreatureId(creature.id);
                  }}
                  aria-label={creature.kind}
                >
                  <img className="h-full w-full object-contain" src={src} alt={creature.kind} />
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
                      if (selectedAbility !== 'dolphin' && selectedAbility != null) setSelectedAbility(null);
                      setSelectedAdventurerId(adventurer.id);
                    }
                  }}
                  aria-label="Adventurer"
                >
                  <img className="h-full w-full object-contain" src={adventurerImage(adventurer.color)} alt="Adventurer" />
                  {view.myAdventurerTreasures[adventurer.id] != null ? (
                    <span className="absolute -right-[18%] -top-[10%] grid h-[1.45em] min-w-[1.45em] place-items-center rounded-full border border-white/90 bg-slate-950 px-[0.18em] text-[0.82em] font-black leading-none text-amber-200 shadow-md">
                      {view.myAdventurerTreasures[adventurer.id]}
                    </span>
                  ) : null}
                </motion.button>
              );
            })}
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
                {selectedAbility === 'paddle'
                  ? selectedRaftId
                    ? 'คลิก Water hex ปลายทางของ Paddle (ไกลได้ 2 ช่อง)'
                    : 'เลือก Raft ที่จะใช้ Paddle'
                  : selectedAbility === 'dolphin'
                    ? selected
                      ? 'เลือก Water hex หรือ Island tile ปลายทางของ Dolphin'
                      : 'เลือก Adventurer ที่กำลังว่ายน้ำ'
                    : selectedAbility === 'dive'
                      ? selectedCreatureId
                        ? 'เลือก Water hex ว่างเพื่อย้าย Creature'
                        : 'เลือก Creature ที่จะใช้ Dive ย้าย'
                    : selectedAbility === 'repellent'
                      ? 'เลือก Shark หรือ Kaiju ที่อยู่กับ Adventurer ของคุณ'
                : selectedRaftId
                  ? 'คลิก Water hex ที่ติดกันและว่างเพื่อขยับ Raft'
                  : selected
                  ? 'คลิก Island tile ที่ติดกันเพื่อเดิน หรือ Water hex ที่ติดกับเกาะเพื่อว่ายน้ำ'
                  : 'คลิก Adventurer หรือ Raft ของคุณ แล้วเลือกช่องปลายทาง'}
              </p>
              {view.canAct ? (
                <div className="flex flex-wrap gap-2">
                  {selectedCanBeRescued ? (
                    <Button onClick={rescueSelectedAdventurer}>ช่วยขึ้น Rescue Island</Button>
                  ) : null}
                  <Button onClick={() => send({ type: 'finish-action' })}>จบ Action phase</Button>
                </div>
              ) : null}
              {view.myAbilities.length ? (
                <div className="space-y-1 rounded-lg border border-emerald-300/30 bg-emerald-100/10 p-2">
                  <p className="font-semibold text-emerald-100">Ability ของคุณ</p>
                  <div className="flex flex-wrap gap-1.5">
                    {view.myAbilities.map((ability, index) => (
                      <Button
                        key={`${ability}-${index}`}
                        size="sm"
                        variant={selectedAbility === ability ? 'secondary' : 'ghost'}
                        disabled={!view.canAct}
                        onClick={() => {
                          setSelectedAdventurerId(null);
                          setSelectedRaftId(null);
                          setSelectedCreatureId(null);
                          if (ability === 'creature-die') {
                            send({ type: 'use-ability', ability });
                            return;
                          }
                          setSelectedAbility(ability);
                        }}
                      >
                        {ability}
                      </Button>
                    ))}
                  </div>
                </div>
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
          {view.phase === 'creatures' ? (
            <div className="space-y-2 rounded-lg border border-cyan-300/40 bg-cyan-100/10 p-3">
              <p className="font-semibold text-cyan-100">Creature phase</p>
              {view.canAct ? (
                view.creatureToMove ? (
                  <p>คลิก {view.creatureToMove} ที่เรืองแสง แล้วเลือก Water hex ปลายทาง</p>
                ) : (
                  <Button onClick={() => send({ type: 'roll-creature' })}>ทอย Creature die</Button>
                )
              ) : (
                <p>รอผู้เล่นปัจจุบันขยับ Creature</p>
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
