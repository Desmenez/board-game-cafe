import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HuesAndCuesAction, HuesAndCuesPlayerView } from 'shared';
import { GamePlayHeader, GameShell } from '../../components/game-shell';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { HuesBoardGrid } from './components/HuesBoardGrid';
import { HuesClueSection } from './components/HuesClueSection';
import { HuesColorCardModal } from './components/HuesColorCardModal';
import { HuesGameOverModal } from './components/HuesGameOverModal';
import { HuesPlayerOrderStrip } from './components/HuesPlayerOrderStrip';
import { HuesRevealPanel } from './components/HuesRevealPanel';
import type { MarkersMap } from './lib/boardHelpers';
import { headerSubtitle } from './lib/phaseCopy';
import './hues-and-cues.css';

type Props = {
  gameState: HuesAndCuesPlayerView;
  myId: string;
  sendAction: (a: HuesAndCuesAction) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

export function HuesAndCuesGame({ gameState: gs, myId, sendAction, onLeave, onRestart }: Props) {
  const [clue1Draft, setClue1Draft] = useState('');
  const [clue2Word1, setClue2Word1] = useState('');
  const [clue2Word2, setClue2Word2] = useState('');
  const finished = gs.phase === 'game_over';

  useEffect(() => {
    setClue1Draft('');
    setClue2Word1('');
    setClue2Word2('');
  }, [gs.roundIndex, gs.subPhase]);

  const send = useCallback((a: HuesAndCuesAction) => sendAction(a), [sendAction]);
  const subtitle = useMemo(() => headerSubtitle(gs), [gs]);

  const canPlace1 =
    !gs.amCueGiver && gs.subPhase === 'guess1' && gs.guess1[myId] == null && gs.phase === 'playing';
  const canPlace2 =
    !gs.amCueGiver && gs.subPhase === 'guess2' && gs.guess2[myId] == null && gs.phase === 'playing';

  const huesMyTurn =
    canPlace1 ||
    canPlace2 ||
    (gs.amCueGiver &&
      gs.phase === 'playing' &&
      (gs.subPhase === 'pick_target' || gs.subPhase === 'clue1' || gs.subPhase === 'clue2'));
  useYourTurnToast(huesMyTurn, gs.phase === 'playing');

  const colorCardOpen =
    gs.amCueGiver &&
    gs.phase === 'playing' &&
    gs.subPhase === 'pick_target' &&
    gs.colorCard != null &&
    gs.colorCard.length > 0;

  const markersAtCell = useMemo((): MarkersMap => {
    const m: MarkersMap = new Map();
    const add = (col: number, row: number, id: string, round: 1 | 2) => {
      const k = `${col},${row}`;
      const arr = m.get(k) ?? [];
      arr.push({ id, round });
      m.set(k, arr);
    };
    for (const [id, c] of Object.entries(gs.guess1)) {
      if (c) add(c.col, c.row, id, 1);
    }
    for (const [id, c] of Object.entries(gs.guess2)) {
      if (c) add(c.col, c.row, id, 2);
    }
    return m;
  }, [gs.guess1, gs.guess2]);

  const handleCellClick = (col: number, row: number) => {
    if (canPlace1) send({ type: 'place_guess1', col, row });
    else if (canPlace2) send({ type: 'place_guess2', col, row });
  };

  const showBoardScoring = gs.subPhase === 'reveal' && gs.target != null;
  const showCueGiverTargetRing =
    gs.amCueGiver && gs.phase === 'playing' && gs.target != null && gs.subPhase !== 'reveal';
  const showScoreFootprint = gs.target != null && (showBoardScoring || showCueGiverTargetRing);

  if (finished) {
    return (
      <GameShell className="hac-page">
        <GamePlayHeader
          title="Hues and Cues"
          subtitle={subtitle}
          onLeave={onLeave}
          onRestart={onRestart}
          leaveLabel="full"
        />
        <HuesGameOverModal
          gs={gs}
          myId={myId}
          markersAtCell={markersAtCell}
          onLeave={onLeave}
          onRestart={onRestart}
        />
      </GameShell>
    );
  }

  return (
    <GameShell className="hac-page">
      <GamePlayHeader
        title="Hues and Cues"
        subtitle={subtitle}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      <HuesClueSection
        gs={gs}
        clue1Draft={clue1Draft}
        clue2Word1={clue2Word1}
        clue2Word2={clue2Word2}
        setClue1Draft={setClue1Draft}
        setClue2Word1={setClue2Word1}
        setClue2Word2={setClue2Word2}
        send={send}
      />

      <HuesPlayerOrderStrip gs={gs} myId={myId} />

      <HuesBoardGrid
        gs={gs}
        myId={myId}
        markersAtCell={markersAtCell}
        canPlace1={canPlace1}
        canPlace2={canPlace2}
        onCellClick={handleCellClick}
        showChebyshevScores={showBoardScoring}
        showTargetRing={showBoardScoring}
        showCueGiverTargetRing={showCueGiverTargetRing}
        showScoreFootprint={showScoreFootprint}
      />

      <HuesRevealPanel gs={gs} send={send} />

      {gs.lastEvent && gs.subPhase !== 'reveal' && gs.subPhase !== 'pick_target' ? (
        <p className="hac-meta">{gs.lastEvent}</p>
      ) : null}

      <HuesColorCardModal
        open={colorCardOpen}
        options={gs.colorCard ?? []}
        onPick={(col, row) => send({ type: 'pick_target', col, row })}
      />
    </GameShell>
  );
}
