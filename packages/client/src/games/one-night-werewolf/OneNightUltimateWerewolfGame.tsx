import type { OnuwAction, OnuwPlayerView } from 'shared';
import { GamePlayHeader, GameShell } from '../../components/game-shell';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { OnuwCompositionStage } from './OnuwCompositionStage';
import { OnuwDayVoteSection } from './OnuwDayVoteSection';
import { OnuwGameOverModal } from './OnuwGameOver';
import { OnuwHunterReveal, OnuwHunterShot } from './OnuwHunterPhases';
import { OnuwNightPhase } from './OnuwNightPhase';
import { OnuwRoleReveal } from './OnuwRoleReveal';
import { OnuwVoteEliminationRevealModal } from './OnuwVoteEliminationReveal';
import './onuw.css';

interface Props {
  gameState: OnuwPlayerView;
  myId: string;
  sendAction: (action: OnuwAction) => void;
  onLeave: () => void;
  onRestart?: () => void;
  isHost?: boolean;
}

function isRevealIntroPhase(phase: OnuwPlayerView['phase']) {
  return phase === 'composition' || phase === 'role_reveal';
}

export function OneNightUltimateWerewolfGame({
  gameState: gs,
  myId,
  sendAction,
  onLeave,
  onRestart,
  isHost,
}: Props) {
  const nightList = gs.nightSteps ?? [];
  const nightCurIdx =
    gs.phase === 'night' &&
    gs.nightStepIndex != null &&
    gs.nightStepIndex >= 0 &&
    gs.nightStepIndex < nightList.length
      ? gs.nightStepIndex
      : nightList.findIndex((st) => st.kind === gs.currentNightKind);
  const hunterRevealCard = gs.phase === 'hunter_reveal' ? gs.hunterRevealCard : null;
  const playerCount = gs.players.length;

  const onuwNightIsMyStep =
    gs.phase === 'night' && gs.currentNightKind != null && (gs.nightActors ?? []).includes(myId);
  useYourTurnToast(onuwNightIsMyStep, gs.phase === 'night');

  return (
    <GameShell className="onuw-root">
      <GamePlayHeader
        title="One Night Ultimate Werewolf"
        subtitle={isRevealIntroPhase(gs.phase) ? undefined : gs.lastEvent}
        onLeave={onLeave}
        onRestart={isHost ? onRestart : undefined}
        leaveLabel="full"
      />

      {gs.phase === 'composition' && (
        <OnuwCompositionStage
          rolesInPlay={gs.rolesInPlay}
          hasAcknowledged={gs.hasAcknowledgedComposition}
          progress={gs.compositionAckProgress ?? { current: 0, total: playerCount }}
          onAcknowledge={() => sendAction({ type: 'acknowledge_composition' })}
        />
      )}

      {gs.phase === 'role_reveal' && gs.myRole && gs.myRoleArtKey && (
        <OnuwRoleReveal
          myRole={gs.myRole}
          myRoleArtKey={gs.myRoleArtKey}
          descriptionTh={gs.myRoleDescriptionTh}
          hasAcknowledged={gs.hasAcknowledgedRole}
          progress={gs.roleRevealProgress ?? undefined}
          onAcknowledge={() => sendAction({ type: 'acknowledge_role' })}
        />
      )}

      {gs.phase === 'night' && (
        <OnuwNightPhase
          gs={gs}
          myId={myId}
          nightList={nightList}
          nightCurIdx={nightCurIdx}
          sendAction={sendAction}
        />
      )}

      {gs.phase === 'vote' && <OnuwDayVoteSection gs={gs} myId={myId} sendAction={sendAction} />}

      {gs.phase === 'vote_elimination_reveal' && gs.revealEliminations.length > 0 ? (
        <OnuwVoteEliminationRevealModal gs={gs} />
      ) : null}

      {hunterRevealCard && (
        <OnuwHunterReveal gs={gs} hunterRevealCard={hunterRevealCard} sendAction={sendAction} />
      )}

      {gs.phase === 'hunter_shot' && <OnuwHunterShot gs={gs} myId={myId} sendAction={sendAction} />}

      {gs.phase === 'game_over' && gs.gameResult ? (
        <OnuwGameOverModal
          gameState={gs}
          onLeave={onLeave}
          onRestart={isHost ? onRestart : undefined}
        />
      ) : null}
    </GameShell>
  );
}
