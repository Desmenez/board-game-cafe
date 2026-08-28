import { useMemo, useState } from 'react';
import type { SurviveTheIslandAction, SurviveTheIslandPlayerView } from 'shared';
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
  const [selectedAdventurerId, setSelectedAdventurerId] = useState<string | null>(null);
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
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card p-3">
          <div
            className="sti-board-demo"
            style={{ backgroundImage: `url("${imageMap.surviveTheIsland.board}")` }}
          >
            {view.tiles.map((tile) => {
              const cell = SURVIVE_THE_ISLAND_CELLS[tile.id]!;
              const point = surviveTheIslandCellCenter(DEFAULT_SURVIVE_THE_ISLAND_LAYOUT, cell);
              const src = imageMap.surviveTheIsland.terrain[tile.terrain];
              const tokenIds = tile.adventurerIds;
              const selectable = tokenIds.some(
                (id) => view.adventurers.find((item) => item.id === id)?.playerId === myId,
              );
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
                  <span className="absolute inset-x-1 bottom-1 flex flex-wrap justify-center gap-0.5">
                    {tokenIds.map((id) => {
                      const adventurer = view.adventurers.find((item) => item.id === id)!;
                      return (
                        <img
                          key={id}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (selectable && adventurer.playerId === myId)
                              setSelectedAdventurerId(adventurer.id);
                          }}
                          className={`h-5 w-5 object-contain ${selectedAdventurerId === id ? 'ring-2 ring-white' : ''}`}
                          src={adventurerImage(adventurer.color)}
                          alt="Adventurer"
                        />
                      );
                    })}
                  </span>
                </button>
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
          {view.phase === 'action' ? (
            <>
              <p>
                {selected
                  ? 'คลิก Island tile ที่ติดกันเพื่อเดิน'
                  : 'คลิก Adventurer ของคุณ แล้วเลือก tile ปลายทาง'}
              </p>
              {view.canAct ? (
                <Button onClick={() => send({ type: 'finish-action' })}>จบ Action phase</Button>
              ) : null}
            </>
          ) : null}
          {view.phase === 'rising_waters' ? (
            <p>
              {view.canAct
                ? 'เลือก tile ที่เรืองแสงเพื่อให้จม'
                : 'รอผู้เล่นปัจจุบันเลือก tile ที่จม'}
            </p>
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
