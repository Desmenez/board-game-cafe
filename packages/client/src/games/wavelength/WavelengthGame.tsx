import { useEffect, useMemo, useState } from 'react';
import type { WavelengthAction, WavelengthPlayerView } from 'shared';
import {
  GameHistoryDisclosure,
  GameOverModal,
  GamePlayHeader,
  GameShell,
} from '../../components/game-shell';
import { PlayerIdentity } from '../../components/player-avatar';
import { PlayerRosterStrip } from '../../components/player-roster';
import { Badge } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { imageMap } from '../../imageMap';
import { WL_PHASE_LABEL, WL_TEAM_LABEL } from './art';
import { DEFAULT_WAVELENGTH_LAYOUT } from './boardLayout';
import './wavelength.css';
import { WavelengthActionPanel } from './components/WavelengthActionPanel';
import { WavelengthDevice } from './components/WavelengthDevice';
import { WavelengthGameOverBody } from './components/WavelengthGameOverBody';
import { buildWavelengthRosterSeats } from './components/wavelengthRosterSeats';

type Props = {
  gameState: WavelengthPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

export function WavelengthGame({ gameState: view, myId, sendAction, onLeave, onRestart }: Props) {
  const [clueDraft, setClueDraft] = useState('');
  useYourTurnToast(view.canAct, view.phase !== 'game_over');

  useEffect(() => {
    setClueDraft('');
  }, [view.psychicId, view.phase]);

  const send = (action: WavelengthAction) => sendAction(action);
  const rosterSeats = useMemo(() => buildWavelengthRosterSeats(view), [view]);
  const psychic = view.players.find((player) => player.id === view.psychicId);

  const subtitle = (
    <span className="inline-flex flex-wrap items-center gap-2">
      {psychic ? (
        <PlayerIdentity
          playerId={psychic.id}
          name={psychic.name}
          avatarSize={28}
          secondary="Psychic"
        />
      ) : null}
      <span>{WL_PHASE_LABEL[view.phase]}</span>
      {view.suddenDeath ? (
        <Badge size="sm" variant="warning">
          Sudden death
        </Badge>
      ) : null}
    </span>
  );

  const canMoveDial = view.canAct && view.phase === 'team_dial' && !view.amPsychic;

  if (view.phase === 'game_over') {
    return (
      <GameShell>
        <GamePlayHeader
          title="Wavelength"
          subtitle={subtitle}
          onLeave={onLeave}
          onRestart={onRestart}
          leaveLabel="full"
        />
        <GameOverModal
          titleId="wl-game-over"
          gameId="wavelength"
          onLeave={onLeave}
          onRestart={onRestart}
        >
          <WavelengthGameOverBody view={view} myId={myId} titleId="wl-game-over" />
        </GameOverModal>
      </GameShell>
    );
  }

  return (
    <GameShell>
      <GamePlayHeader
        title="Wavelength"
        subtitle={subtitle}
        trailing={
          <p className="max-w-xs text-xs opacity-70 line-clamp-2">
            {WL_TEAM_LABEL.orange} {view.scores.orange} · {WL_TEAM_LABEL.purple}{' '}
            {view.scores.purple}
            {view.clue ? ` · «${view.clue}»` : ''}
          </p>
        }
        onLeave={onLeave}
        onRestart={onRestart}
      />
      <GameHistoryDisclosure
        title={`ผู้เล่น · ${view.players.length} คน`}
        defaultOpen
        className="sticky top-4 z-20"
      >
        <PlayerRosterStrip
          className="wl-roster"
          layout="grid"
          myId={myId}
          ariaLabel="สถานะผู้เล่น Wavelength"
          seats={rosterSeats}
        />
      </GameHistoryDisclosure>
      <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="card p-3">
          <WavelengthDevice
            layout={DEFAULT_WAVELENGTH_LAYOUT}
            deviceUrl={imageMap.wavelength.device}
            leftLabel={view.leftLabel}
            rightLabel={view.rightLabel}
            dial={view.dial ?? (canMoveDial ? 0.5 : null)}
            target={view.target}
            screenOpen={view.screenOpen}
            scores={view.scores}
            interactive={canMoveDial}
            onDialChange={(position) => send({ type: 'set-dial', position })}
          />
        </section>
        <aside className="space-y-3">
          {view.clue ? (
            <div className="rounded-card border border-rule bg-paper-2 p-3 text-center">
              <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">คำใบ้</p>
              <p className="mt-1 font-display text-xl font-bold text-ink">{view.clue}</p>
            </div>
          ) : null}
          <WavelengthActionPanel
            view={view}
            clueDraft={clueDraft}
            setClueDraft={setClueDraft}
            send={send}
            onDialChange={(position) => send({ type: 'set-dial', position })}
          />
          {view.lastEvent && view.phase !== 'reveal' ? (
            <p className="text-sm text-ink-2">{view.lastEvent}</p>
          ) : null}
        </aside>
      </div>
    </GameShell>
  );
}
