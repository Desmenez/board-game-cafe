import { useCallback, useEffect, useMemo } from 'react';
import type { InsiderAction, InsiderPlayerView } from 'shared';
import { GamePlayHeader, GameShell } from '../../components/game-shell';
import { useDeadlineCountdown } from '../../hooks/useDeadlineCountdown';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import { InsiderCompositionStage } from './components/InsiderCompositionStage';
import { InsiderDiscussionPanel } from './components/InsiderDiscussionPanel';
import { InsiderGameOver } from './components/InsiderGameOver';
import { InsiderQuestioningPanel } from './components/InsiderQuestioningPanel';
import { InsiderReadFlowPanel } from './components/InsiderReadFlowPanel';
import { InsiderRoleReveal } from './components/InsiderRoleReveal';
import { InsiderSecretMemory } from './components/InsiderSecretMemory';
import { ROLE_TH } from './lib/roleMeta';
import './insider.css';

interface Props {
  gameState: InsiderPlayerView;
  myId: string;
  sendAction: (a: InsiderAction) => void;
  onLeave: () => void;
  onRestart?: () => void;
}

export function InsiderGame({ gameState: gs, myId, sendAction, onLeave, onRestart }: Props) {
  const finished = gs.gameResult != null;

  useEffect(() => {
    if (!finished) return;
    return startWinCelebrationLoop();
  }, [finished]);

  const send = useCallback((a: InsiderAction) => sendAction(a), [sendAction]);

  const isMaster = gs.masterId === myId;
  const isInsider = gs.you.yourRole === 'insider';
  const canShowSecretRef =
    !finished &&
    gs.secretWord != null &&
    (gs.phase === 'questioning' || gs.phase === 'discussion') &&
    (isMaster || isInsider);

  const deadlineMs = useMemo(() => {
    if (gs.phase === 'questioning' && gs.questioningEndsAtMs != null) return gs.questioningEndsAtMs;
    if (gs.phase === 'discussion' && gs.discussionEndsAtMs != null) return gs.discussionEndsAtMs;
    return null;
  }, [gs.phase, gs.questioningEndsAtMs, gs.discussionEndsAtMs]);

  const { label: remainLabel } = useDeadlineCountdown(deadlineMs);

  const unansweredCount = useMemo(
    () => gs.questionLog.filter((q) => q.answer == null).length,
    [gs.questionLog],
  );

  const insiderMasterMustAnswer = isMaster && gs.phase === 'questioning' && unansweredCount > 0;
  useYourTurnToast(insiderMasterMustAnswer, gs.phase === 'questioning');

  const winnerNames =
    gs.gameResult?.winners.map((id) => gs.players.find((p) => p.id === id)?.name ?? id) ?? [];

  const inComposition = gs.phase === 'composition';
  const inRoleReveal = gs.phase === 'role_reveal';
  const inIntro = inComposition || inRoleReveal;

  const masterName = useMemo(
    () => gs.players.find((p) => p.id === gs.masterId)?.name ?? '—',
    [gs.masterId, gs.players],
  );

  return (
    <GameShell className={`insider-page${inIntro ? ' insider-page--wide' : ''}`}>
      <GamePlayHeader title="Insider" onLeave={onLeave} onRestart={onRestart} leaveLabel="full" />

      {!finished && !inIntro && (
        <p className="insider-role-pill">
          คุณคือ <strong>{ROLE_TH[gs.you.yourRole]}</strong>
          {isMaster && (
            <span className="insider-muted">
              {' '}
              · Master ตอบได้แค่ ใช่ / ไม่ใช่ / ไม่รู้ / ถูกต้อง
            </span>
          )}
        </p>
      )}

      {finished && gs.gameResult && gs.gameOverReveal ? (
        <InsiderGameOver
          gameState={gs}
          winnerNames={winnerNames}
          onLeave={onLeave}
          onRestart={onRestart}
        />
      ) : null}

      {inComposition && gs.compositionAcknowledgeProgress && (
        <InsiderCompositionStage
          playerCount={gs.players.length}
          hasAcknowledged={gs.hasAcknowledgedComposition ?? false}
          progress={gs.compositionAcknowledgeProgress}
          onAcknowledge={() => send({ type: 'acknowledge_composition' })}
        />
      )}

      {inRoleReveal && gs.roleAcknowledgeProgress && (
        <InsiderRoleReveal
          myRole={gs.you.yourRole}
          hasAcknowledged={gs.hasAcknowledgedRole ?? false}
          progress={gs.roleAcknowledgeProgress}
          onAcknowledge={() => send({ type: 'acknowledge_role' })}
        />
      )}

      {!finished && (gs.phase === 'master_reads' || gs.phase === 'insider_reads') && (
        <InsiderReadFlowPanel
          phase={gs.phase}
          masterName={masterName}
          isMaster={isMaster}
          isInsider={isInsider}
          categoryLabel={gs.categoryLabel}
          secretWord={gs.secretWord}
          onMasterAck={() => send({ type: 'master_ack_word' })}
          onInsiderAck={() => send({ type: 'insider_ack_word' })}
        />
      )}

      {!finished && canShowSecretRef && gs.secretWord != null && (
        <InsiderSecretMemory secretWord={gs.secretWord} categoryLabel={gs.categoryLabel} />
      )}

      {!finished && gs.phase === 'questioning' && (
        <InsiderQuestioningPanel
          questionLog={gs.questionLog}
          isMaster={isMaster}
          remainLabel={remainLabel}
          unansweredCount={unansweredCount}
          send={send}
        />
      )}

      {!finished && gs.phase === 'discussion' && (
        <InsiderDiscussionPanel gameState={gs} myId={myId} remainLabel={remainLabel} send={send} />
      )}
    </GameShell>
  );
}
