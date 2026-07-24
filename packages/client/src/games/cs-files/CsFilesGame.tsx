import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CsFilesAction, CsFilesPlayerView } from 'shared';
import { CS_FILES_ROLE_LABEL_TH } from 'shared';
import { Button } from '../../components/ui';
import {
  GamePlayHeader,
  GameShell,
  GamePhasePanel,
  GameWaitingState,
} from '../../components/game-shell';
import { useDeadlineCountdown } from '../../hooks/useDeadlineCountdown';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { CsFilesBoard } from './components/CsFilesBoard';
import { CsFilesCompositionStage } from './components/CsFilesCompositionStage';
import { CsFilesGameOver } from './components/CsFilesGameOver';
import { CsFilesNightCrime } from './components/CsFilesNightCrime';
import { CsFilesRoleReveal } from './components/CsFilesRoleReveal';
import { CsFilesScenePanel } from './components/CsFilesScenePanel';
import { CsFilesSolveModal } from './components/CsFilesSolveModal';
import { CsFilesWrongSolveModal } from './components/CsFilesWrongSolveModal';
import { CsFilesWitnessHunt } from './components/CsFilesWitnessHunt';

interface Props {
  gameState: CsFilesPlayerView;
  myId: string;
  sendAction: (a: CsFilesAction) => void;
  onLeave: () => void;
  onRestart?: () => void;
}

export function CsFilesGame({ gameState: gs, myId, sendAction, onLeave, onRestart }: Props) {
  const finished = gs.phase === 'game_over' && gs.gameResult != null;
  const [solveOpen, setSolveOpen] = useState(false);
  const [wrongSolveOpen, setWrongSolveOpen] = useState(false);
  const seenSolveKey = useRef<string | null>(null);

  const send = useCallback((a: CsFilesAction) => sendAction(a), [sendAction]);

  const inComposition = gs.phase === 'composition';
  const inRoleReveal = gs.phase === 'role_reveal';
  const inIntro = inComposition || inRoleReveal;
  const isForensic = gs.myRole === 'forensic';
  const isMurderer = gs.myRole === 'murderer';
  const mySeat = gs.seats.find((s) => s.id === myId);
  const isMyTurn = gs.investigationSubPhase === 'presenting' && gs.currentSpeakerId === myId;
  const canSolve =
    gs.phase === 'investigation' &&
    gs.investigationSubPhase === 'presenting' &&
    isMyTurn &&
    !isForensic &&
    Boolean(mySeat?.hasBadge);
  const mustSolve = Boolean(gs.mustSolveThisTurn);

  const csFilesNeedsMe = useMemo(() => {
    if (finished || inIntro) return false;
    if (gs.phase === 'night_crime' && isMurderer) return true;
    if (gs.phase === 'witness_hunt' && isMurderer) return true;
    if (gs.phase === 'investigation') {
      if (
        isForensic &&
        (gs.investigationSubPhase === 'placing_pins' ||
          gs.investigationSubPhase === 'replacing_situation')
      ) {
        return true;
      }
      if (gs.investigationSubPhase === 'presenting' && gs.currentSpeakerId === myId) {
        return true;
      }
    }
    return false;
  }, [
    finished,
    gs.currentSpeakerId,
    gs.investigationSubPhase,
    gs.phase,
    inIntro,
    isForensic,
    isMurderer,
    myId,
  ]);

  useYourTurnToast(csFilesNeedsMe, !finished);

  const deadlineMs = useMemo(() => {
    if (gs.investigationSubPhase === 'discussion') return gs.discussionEndsAtMs ?? null;
    if (gs.investigationSubPhase === 'presenting') return gs.turnEndsAtMs ?? null;
    return null;
  }, [gs.discussionEndsAtMs, gs.investigationSubPhase, gs.turnEndsAtMs]);

  const { label: remainLabel } = useDeadlineCountdown(deadlineMs);

  const speakerName =
    gs.currentSpeakerId != null
      ? (gs.players.find((p) => p.id === gs.currentSpeakerId)?.name ?? '')
      : '';

  useEffect(() => {
    const r = gs.lastSolveResult;
    if (!r || r.correct) return;
    const key = `${r.playerId}:${r.evidenceCardId}:${r.meansCardId}`;
    if (seenSolveKey.current === key) return;
    seenSolveKey.current = key;
    setWrongSolveOpen(true);
  }, [gs.lastSolveResult]);

  return (
    <GameShell className={inIntro || gs.phase === 'night_crime' ? 'max-w-5xl' : undefined}>
      <GamePlayHeader title="CS Files" onLeave={onLeave} onRestart={onRestart} leaveLabel="full" />

      {!finished && !inIntro ? (
        <p className="mb-3 text-sm text-ink-2">
          คุณคือ <strong>{CS_FILES_ROLE_LABEL_TH[gs.myRole]}</strong>
          {gs.forensicId ? (
            <span> · นักนิติฯ: {gs.players.find((p) => p.id === gs.forensicId)?.name ?? '—'}</span>
          ) : null}
          {remainLabel ? (
            <span className="ml-2 font-semibold text-pear">เหลือ {remainLabel}</span>
          ) : null}
          {gs.lastEvent ? <span className="block text-ink-3">{gs.lastEvent}</span> : null}
        </p>
      ) : null}

      {finished ? <CsFilesGameOver gameState={gs} onLeave={onLeave} onRestart={onRestart} /> : null}

      {inComposition && gs.compositionAcknowledgeProgress ? (
        <CsFilesCompositionStage
          rolesInPlay={gs.roleRevealAllRoles ?? []}
          hasAcknowledged={gs.hasAcknowledgedComposition ?? false}
          progress={gs.compositionAcknowledgeProgress}
          onAcknowledge={() => send({ type: 'acknowledge_composition' })}
        />
      ) : null}

      {inRoleReveal && gs.roleAcknowledgeProgress ? (
        <CsFilesRoleReveal
          myRole={gs.myRole}
          knownInfo={gs.knownInfo}
          hasAcknowledged={gs.hasAcknowledgedRole ?? false}
          progress={gs.roleAcknowledgeProgress}
          onAcknowledge={() => send({ type: 'acknowledge_role' })}
        />
      ) : null}

      {gs.phase === 'night_crime' ? (
        <CsFilesNightCrime
          gameState={gs}
          myId={myId}
          onDraftChange={(evidenceCardId, meansCardId) =>
            send({ type: 'murderer_set_crime_draft', evidenceCardId, meansCardId })
          }
          onSelect={(evidenceCardId, meansCardId) =>
            send({ type: 'murderer_select_solution', evidenceCardId, meansCardId })
          }
        />
      ) : null}

      {gs.phase === 'witness_hunt' ? (
        <CsFilesWitnessHunt
          gameState={gs}
          myId={myId}
          onDraftChange={(targetId) => send({ type: 'murderer_set_witness_draft', targetId })}
          onAccuse={(targetId) => send({ type: 'murderer_accuse_witness', targetId })}
        />
      ) : null}

      {gs.phase === 'investigation' ? (
        <div className="grid gap-4">
          {gs.myRole === 'witness' && gs.evilPairIds && gs.evilPairIds.length === 2 ? (
            <p className="rounded-input border border-rule bg-paper-3 px-3 py-2 text-sm text-ink-2">
              ฝ่ายร้ายที่คุณเห็น (ฆาตกร + สมรู้ร่วมคิด — ไม่แยกว่าใครเป็นใคร):{' '}
              {gs.evilPairIds
                .map((id) => gs.players.find((p) => p.id === id)?.name ?? id)
                .join(' และ ')}{' '}
              · คุณไม่รู้การ์ดคำตอบ
            </p>
          ) : null}

          <CsFilesScenePanel
            gameState={gs}
            isForensic={isForensic}
            onPlacePin={(tileId, optionIndex) =>
              send({ type: 'forensic_place_pin', tileId, optionIndex })
            }
            onConfirmPins={() => send({ type: 'forensic_confirm_pins' })}
            onReplaceSituation={(tileId) => send({ type: 'forensic_replace_situation', tileId })}
          />

          {gs.investigationSubPhase === 'replacing_situation' ? (
            <GamePhasePanel
              title={`รอบที่ ${gs.investigationRound} — แทนที่แผ่นสถานการณ์`}
              description={
                isForensic
                  ? 'เลือกแผ่นสถานการณ์เก่าที่จะเอาออก แล้ววางหมุดบนแผ่นใหม่'
                  : 'รอนักนิติวิทยาศาสตร์เลือกแผ่นสถานการณ์ที่จะแทนที่'
              }
            >
              {!isForensic ? <GameWaitingState>รอนักนิติวิทยาศาสตร์</GameWaitingState> : null}
            </GamePhasePanel>
          ) : null}

          {gs.investigationSubPhase === 'placing_pins' ? (
            <GamePhasePanel
              title={`รอบที่ ${gs.investigationRound} — วางหมุด`}
              description={
                isForensic
                  ? gs.investigationRound === 1
                    ? 'วางหมุดบนแผ่นสถานการณ์ทุกแผ่น แล้วกดยืนยัน'
                    : 'วางหมุดบนแผ่นสถานการณ์ใหม่ แล้วกดยืนยัน'
                  : 'รอนักนิติวิทยาศาสตร์วางหมุด'
              }
            >
              {!isForensic ? (
                <GameWaitingState>รอนักนิติวิทยาศาสตร์วางหมุด</GameWaitingState>
              ) : null}
            </GamePhasePanel>
          ) : null}

          {gs.investigationSubPhase === 'discussion' ? (
            <GamePhasePanel
              title={`รอบที่ ${gs.investigationRound} — อภิปราย`}
              description={
                isForensic
                  ? 'คุณเป็นนักนิติฯ — ไม่ร่วมอภิปราย รอจบเวลาหรือกดเริ่มรอบสืบสวน'
                  : `พูดคุย — เหลือ ${remainLabel ?? '…'}`
              }
              actions={
                <Button variant="primary" onClick={() => send({ type: 'advance_to_presenting' })}>
                  เริ่มรอบสืบสวน
                </Button>
              }
            >
              {isForensic ? <GameWaitingState>รอผู้อื่นอภิปราย</GameWaitingState> : null}
            </GamePhasePanel>
          ) : null}

          {gs.investigationSubPhase === 'presenting' ? (
            <GamePhasePanel
              title={`รอบที่ ${gs.investigationRound} — รอบสืบสวน`}
              description={
                mustSolve && isMyTurn
                  ? `ถึงตาคุณ — รอบสุดท้ายต้องไขคดี (เหลือ ${remainLabel ?? '…'})`
                  : isMyTurn
                    ? `ถึงตาคุณ — ไขคดีหรือผ่าน (เหลือ ${remainLabel ?? '…'})`
                    : `ถึงตา ${speakerName} (เหลือ ${remainLabel ?? '…'})`
              }
              actions={
                isMyTurn ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {canSolve ? (
                      <Button variant="danger" size="lg" onClick={() => setSolveOpen(true)}>
                        ขอไขคดี
                      </Button>
                    ) : null}
                    {!mustSolve ? (
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => send({ type: 'pass_turn' })}
                      >
                        ผ่าน
                      </Button>
                    ) : null}
                  </div>
                ) : undefined
              }
            >
              {!isMyTurn ? <GameWaitingState>รอ {speakerName} ตัดสินใจ</GameWaitingState> : null}
            </GamePhasePanel>
          ) : null}

          <CsFilesBoard
            gameState={gs}
            myId={myId}
            highlightSeatId={gs.currentSpeakerId}
            onToggleCardPin={
              !isForensic && (gs.phase === 'investigation' || gs.phase === 'witness_hunt')
                ? (cardId) => send({ type: 'toggle_card_pin', cardId })
                : undefined
            }
          />

          {gs.solution && (isForensic || gs.myRole === 'murderer' || gs.myRole === 'accomplice') ? (
            <p className="text-center text-xs text-ink-3">(คุณรู้คำตอบของคดี — อย่าเปิดเผยตรงๆ)</p>
          ) : null}
        </div>
      ) : null}

      {solveOpen ? (
        <CsFilesSolveModal
          open={solveOpen}
          onClose={() => setSolveOpen(false)}
          gameState={gs}
          myId={myId}
          onSubmit={(targetPlayerId, evidenceCardId, meansCardId) =>
            send({ type: 'solve_attempt', targetPlayerId, evidenceCardId, meansCardId })
          }
        />
      ) : null}

      {wrongSolveOpen && gs.lastSolveResult && !gs.lastSolveResult.correct ? (
        <CsFilesWrongSolveModal gameState={gs} onClose={() => setWrongSolveOpen(false)} />
      ) : null}
    </GameShell>
  );
}
