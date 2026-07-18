import { useEffect, useMemo, useRef } from 'react';
import type { AvalonPlayerView, AvalonAction } from 'shared';
import './avalon-night.css';
import { GamePlayHeader, GameShell } from '../../components/game-shell';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { fireQuestSuccessConfetti } from '../../utils/winCelebration';
import { AvalonAssassination } from './AvalonAssassination';
import { AvalonCompositionStage } from './AvalonCompositionStage';
import { AvalonGameOverModal } from './AvalonGameOverModal';
import { AvalonLadyOfLakePhase } from './AvalonLadyOfLakePhase';
import { AvalonLadyRevealModals } from './AvalonLadyRevealModals';
import { AvalonMyRolePanel } from './AvalonMyRolePanel';
import { AvalonPlayerStatusPanel } from './AvalonPlayerStatusPanel';
import { AvalonQuestHistoryDock } from './AvalonQuestHistoryDock';
import { AvalonQuestPhase } from './AvalonQuestPhase';
import { AvalonQuestRevealOverlay } from './AvalonQuestRevealOverlay';
import { AvalonQuestTrack } from './AvalonQuestTrack';
import { AvalonRoleReveal } from './AvalonRoleReveal';
import { AvalonTeamBuilding } from './AvalonTeamBuilding';
import { AvalonTeamVote } from './AvalonTeamVote';

interface Props {
  gameState: AvalonPlayerView;
  myId: string;
  sendAction: (action: AvalonAction) => void;
  onLeave: () => void;
  onRestart?: () => void;
  isHost?: boolean;
}

function isRevealIntroPhase(phase: AvalonPlayerView['phase']) {
  return phase === 'composition' || phase === 'role_reveal';
}

export function AvalonGame({ gameState, myId, sendAction, onLeave, onRestart, isHost }: Props) {
  const gs = gameState;
  const playerCount = gs.players.length;
  const leader = gs.players[gs.currentLeaderIndex];
  const isLeader = leader?.id === myId;
  const myPlayer = gs.players.find((p) => p.id === myId);

  const prevQuestResultsKey = useRef<string | null>(null);
  useEffect(() => {
    const key = gs.questResults.join(',');
    if (prevQuestResultsKey.current === null) {
      prevQuestResultsKey.current = key;
      return;
    }
    if (prevQuestResultsKey.current === key) return;

    const prevParts = prevQuestResultsKey.current.split(',');
    for (let i = 0; i < gs.questResults.length; i++) {
      if (gs.questResults[i] === 'success' && prevParts[i] !== 'success') {
        fireQuestSuccessConfetti();
        break;
      }
    }
    prevQuestResultsKey.current = key;
  }, [gs.questResults]);

  const avalonNeedsMe = useMemo(() => {
    if (gs.phase === 'game_over' || isRevealIntroPhase(gs.phase)) return false;
    if (gs.phase === 'team_building' && isLeader) return true;
    if (gs.phase === 'team_vote' && gs.awaitingTeamVoteFrom?.some((p) => p.id === myId))
      return true;
    if (gs.phase === 'quest' && gs.selectedTeam.includes(myId)) return true;
    if (gs.phase === 'lady_of_lake' && gs.ladyPrompt?.holderId === myId) return true;
    if (gs.phase === 'assassination' && gs.myRole === 'assassin') return true;
    return false;
  }, [gs, isLeader, myId]);

  // Toast on rising edge + global yellow viewport frame (via useYourTurnToast)
  useYourTurnToast(avalonNeedsMe, gs.phase !== 'game_over');

  return (
    <GameShell className="avalon-page">
      <GamePlayHeader
        title="The Resistance: Avalon"
        onLeave={onLeave}
        onRestart={onRestart}
        leaveLabel="full"
      />

      <AvalonLadyRevealModals
        broadcast={gs.ladyRevealBroadcast}
        secret={gs.ladyRevealSecret}
        onAcknowledgeLady={() => sendAction({ type: 'acknowledge_lady_reveal' })}
      />

      {!isRevealIntroPhase(gs.phase) && gs.phase !== 'game_over' && (
        <AvalonPlayerStatusPanel
          players={gs.players}
          myId={myId}
          leaderId={leader.id}
          selectedTeam={gs.selectedTeam}
          phase={gs.phase}
          teamVotes={gs.teamVotes}
          awaitingTeamVoteFrom={gs.awaitingTeamVoteFrom}
        />
      )}

      <AvalonQuestHistoryDock quests={gs.quests} players={gs.players} />

      <AvalonQuestTrack
        phase={gs.phase}
        questResults={gs.questResults}
        currentQuest={gs.questNumber}
        playerCount={playerCount}
        compositionAcknowledgeProgress={gs.compositionAcknowledgeProgress}
        roleAcknowledgeProgress={gs.roleAcknowledgeProgress}
      />

      {!isRevealIntroPhase(gs.phase) && gs.phase !== 'game_over' && (
        <AvalonMyRolePanel
          myRole={gs.myRole}
          myPortraitVariant={gs.myPortraitVariant}
          myName={myPlayer?.name}
          isLeader={isLeader}
          leaderName={leader?.name}
          consecutiveRejects={gs.consecutiveRejects}
          ladyOfTheLakeEnabled={gs.ladyOfTheLakeEnabled}
          ladyHolderId={gs.ladyHolderId}
          lancelotEnabled={gs.lancelotEnabled}
          players={gs.players}
          myId={myId}
          knownInfo={gs.knownInfo}
        />
      )}

      {gs.phase === 'composition' && gs.roleRevealAllRoles && (
        <AvalonCompositionStage
          roles={gs.roleRevealAllRoles}
          portraitVariants={gs.roleRevealPortraitVariants}
          hasAcknowledged={gs.hasAcknowledgedComposition ?? false}
          progress={gs.compositionAcknowledgeProgress ?? { current: 0, total: playerCount }}
          onAcknowledge={() => sendAction({ type: 'acknowledge_composition' })}
        />
      )}

      {gs.phase === 'role_reveal' && (
        <AvalonRoleReveal
          role={gs.myRole}
          team={gs.myTeam}
          knownInfo={gs.knownInfo}
          hasAcknowledged={gs.hasAcknowledgedRole ?? false}
          progress={gs.roleAcknowledgeProgress}
          onAcknowledge={() => sendAction({ type: 'acknowledge_role' })}
          myPortraitVariant={gs.myPortraitVariant}
        />
      )}

      {gs.phase === 'team_building' && (
        <AvalonTeamBuilding
          players={gs.players}
          leader={leader}
          isLeader={isLeader}
          questNumber={gs.questNumber}
          playerCount={playerCount}
          selectedTeam={gs.selectedTeam}
          onSelectTeam={(ids) => sendAction({ type: 'select_team', playerIds: ids })}
          onSubmitTeam={() => sendAction({ type: 'submit_team' })}
        />
      )}

      {gs.phase === 'lady_of_lake' && (
        <AvalonLadyOfLakePhase
          myId={myId}
          players={gs.players}
          ladyHolderId={gs.ladyHolderId}
          prompt={gs.ladyPrompt}
          onInspect={(targetId) => sendAction({ type: 'lady_inspect', targetId })}
        />
      )}

      {gs.phase === 'team_vote' && (
        <AvalonTeamVote
          players={gs.players}
          selectedTeam={gs.selectedTeam}
          teamVotes={gs.teamVotes}
          teamVoteProgress={gs.teamVoteProgress}
          hasAcknowledgedTeamVote={gs.hasAcknowledgedTeamVote}
          teamVoteAcknowledgeProgress={gs.teamVoteAcknowledgeProgress}
          leaderId={leader.id}
          myId={myId}
          onVote={(approve) => sendAction({ type: 'vote_team', approve })}
          onAcknowledgeResult={() => sendAction({ type: 'acknowledge_team_vote' })}
        />
      )}

      {gs.phase === 'quest' && (
        <AvalonQuestPhase
          selectedTeam={gs.selectedTeam}
          players={gs.players}
          myId={myId}
          onVote={(success) => sendAction({ type: 'quest_vote', success })}
          myTeam={gs.myTeam}
        />
      )}

      {gs.phase === 'quest_reveal' && gs.questRevealSequence && (
        <AvalonQuestRevealOverlay
          sequence={gs.questRevealSequence}
          shown={gs.questRevealShown ?? 0}
          questVotesCount={gs.questVotesCount}
        />
      )}

      {gs.phase === 'assassination' && (
        <AvalonAssassination
          players={gs.players}
          myId={myId}
          myRole={gs.myRole}
          knownInfo={gs.knownInfo}
          onAssassinate={(targetId) => sendAction({ type: 'assassinate', targetId })}
        />
      )}

      {gs.phase === 'game_over' && (
        <AvalonGameOverModal
          gameState={gs}
          onLeave={onLeave}
          onRestart={isHost ? onRestart : undefined}
        />
      )}
    </GameShell>
  );
}
