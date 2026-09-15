import { useEffect, useMemo, useRef, useState } from 'react';
import type { HeyThatsMyFishAction, HeyThatsMyFishPlayerView } from 'shared';
import {
  GameHistoryDisclosure,
  GameOverModal,
  GamePlayHeader,
  GameShell,
} from '../../components/game-shell';
import { PlayerIdentity } from '../../components/player-avatar';
import { PlayerRosterStrip } from '../../components/player-roster';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { imageMap } from '../../imageMap';
import { HTMF_PHASE_LABEL } from './art';
import { DEFAULT_HEY_THATS_MY_FISH_LAYOUT } from './boardLayout';
import { HeyThatsMyFishBoard } from './components/HeyThatsMyFishBoard';
import { HeyThatsMyFishGameOverBody } from './components/HeyThatsMyFishGameOverBody';
import { HeyThatsMyFishPlayerTray } from './components/HeyThatsMyFishPlayerTray';
import { buildHeyThatsMyFishRosterSeats } from './components/heyThatsMyFishRosterSeats';

type Props = {
  gameState: HeyThatsMyFishPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

export function HeyThatsMyFishGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const view = gameState;
  const isMyTurn = view.canAct && view.activePlayerId === myId;
  useYourTurnToast(isMyTurn, view.phase !== 'game_over');

  const [selectedPenguinId, setSelectedPenguinId] = useState<string | null>(null);
  const clearedSelectionRef = useRef(false);

  const movableKey = Object.keys(view.legalMoves).sort().join(',');
  const movablePenguinIds = useMemo(
    () => (movableKey.length ? movableKey.split(',') : []),
    [movableKey],
  );

  useEffect(() => {
    if (view.phase !== 'move' || !isMyTurn) {
      clearedSelectionRef.current = false;
      setSelectedPenguinId(null);
      return;
    }
    setSelectedPenguinId((current) => {
      if (current && view.legalMoves[current]?.length) return current;
      if (clearedSelectionRef.current) return null;
      return movablePenguinIds.length === 1 ? movablePenguinIds[0]! : null;
    });
  }, [view.phase, isMyTurn, view.legalMoves, movablePenguinIds]);

  const togglePenguin = (penguinId: string) => {
    const next = selectedPenguinId === penguinId ? null : penguinId;
    clearedSelectionRef.current = next == null;
    setSelectedPenguinId(next);
  };

  const rosterSeats = useMemo(() => buildHeyThatsMyFishRosterSeats(view), [view]);
  const activePlayer = view.players.find((player) => player.id === view.activePlayerId);
  const selectedPenguin = view.penguins.find((penguin) => penguin.id === selectedPenguinId) ?? null;

  const boardHexes = useMemo(
    () =>
      view.hexes.map((hex) => ({
        id: hex.id,
        fish: hex.fish,
        artKey: hex.artKey,
      })),
    [view.hexes],
  );

  const boardPenguins = useMemo(
    () =>
      view.penguins.flatMap((penguin) =>
        penguin.hexId == null
          ? []
          : [
              {
                id: penguin.id,
                hexId: penguin.hexId,
                color: penguin.color,
                mine: penguin.playerId === myId,
              },
            ],
      ),
    [view.penguins],
  );

  const legalHexIds = useMemo(() => {
    if (!isMyTurn) return [];
    if (view.phase === 'placement') return view.legalPlaceHexIds;
    if (selectedPenguinId && view.legalMoves[selectedPenguinId]) {
      return view.legalMoves[selectedPenguinId]!;
    }
    return [];
  }, [isMyTurn, view.phase, view.legalPlaceHexIds, view.legalMoves, selectedPenguinId]);

  const send = (action: HeyThatsMyFishAction) => sendAction(action);

  const onHexClick = (hexId: number) => {
    if (!isMyTurn) return;
    if (view.phase === 'placement') {
      if (!view.legalPlaceHexIds.includes(hexId)) return;
      send({ type: 'place-penguin', hexId });
      return;
    }
    const penguinHere = view.penguins.find(
      (penguin) => penguin.hexId === hexId && penguin.playerId === myId,
    );
    if (penguinHere && view.legalMoves[penguinHere.id]) {
      togglePenguin(penguinHere.id);
      return;
    }
    if (selectedPenguinId && view.legalMoves[selectedPenguinId]?.includes(hexId)) {
      send({ type: 'move-penguin', penguinId: selectedPenguinId, hexId });
      setSelectedPenguinId(null);
    }
  };

  const subtitle =
    view.phase === 'game_over'
      ? 'เกมจบแล้ว'
      : `${HTMF_PHASE_LABEL[view.phase]} · ${isMyTurn ? 'ตาของคุณ' : `ตาของ ${activePlayer?.name ?? '…'}`}`;

  if (view.phase === 'game_over') {
    return (
      <GameShell>
        <GamePlayHeader
          title="Hey, That's My Fish!"
          subtitle={subtitle}
          onLeave={onLeave}
          onRestart={onRestart}
          leaveLabel="full"
        />
        <GameOverModal
          titleId="htmf-game-over"
          gameId="hey-thats-my-fish"
          onLeave={onLeave}
          onRestart={onRestart}
        >
          <HeyThatsMyFishGameOverBody view={view} myId={myId} titleId="htmf-game-over" />
        </GameOverModal>
      </GameShell>
    );
  }

  return (
    <GameShell>
      <GamePlayHeader
        title="Hey, That's My Fish!"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {activePlayer ? (
              <PlayerIdentity
                playerId={activePlayer.id}
                name={activePlayer.name}
                avatarSize={28}
                secondary={isMyTurn ? 'ตาของคุณ' : undefined}
              />
            ) : null}
            <span>{HTMF_PHASE_LABEL[view.phase]}</span>
          </span>
        }
        trailing={<p className="max-w-xs text-xs opacity-70 line-clamp-2">{view.lastEvent}</p>}
        onLeave={onLeave}
        onRestart={onRestart}
      />
      <GameHistoryDisclosure
        title={`ผู้เล่น · ${view.players.length} คน`}
        defaultOpen
        className="sticky top-4 z-20"
      >
        <PlayerRosterStrip
          layout="grid"
          myId={myId}
          ariaLabel="สถานะผู้เล่น Hey That's My Fish"
          seats={rosterSeats}
        />
      </GameHistoryDisclosure>
      <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="card p-3">
          <HeyThatsMyFishBoard
            layout={DEFAULT_HEY_THATS_MY_FISH_LAYOUT}
            seaUrl={imageMap.heyThatsMyFish.sea}
            hexes={boardHexes}
            penguins={boardPenguins}
            selectedHexId={selectedPenguin?.hexId ?? null}
            legalHexIds={legalHexIds}
            onHexClick={onHexClick}
          />
        </section>
        <aside className="card space-y-3 p-4 text-sm">
          <h2 className="font-semibold">
            {view.phase === 'placement' ? 'วางเพนกวิน' : 'เดินเพนกวิน'}
          </h2>
          <p className="opacity-75">
            {view.phase === 'placement'
              ? isMyTurn
                ? 'คลิกแผ่นปลา 1 ตัวที่ว่างเพื่อวางเพนกวิน'
                : `รอ ${activePlayer?.name ?? 'ผู้เล่น'} วางเพนกวิน`
              : isMyTurn
                ? selectedPenguin
                  ? 'คลิกแผ่นน้ำแข็งตามเส้นตรงเพื่อเดิน — คลิกเพนกวินอีกครั้งเพื่อยกเลิก'
                  : 'เลือกเพนกวินของคุณ แล้วเดินตรงไปแผ่นว่าง'
                : `รอ ${activePlayer?.name ?? 'ผู้เล่น'} เดิน`}
          </p>
          <HeyThatsMyFishPlayerTray
            view={view}
            myId={myId}
            selectedPenguinId={selectedPenguinId}
            onSelectPenguin={view.phase === 'move' && isMyTurn ? togglePenguin : undefined}
          />
        </aside>
      </div>
    </GameShell>
  );
}
