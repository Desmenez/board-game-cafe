import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Flip7Action,
  Flip7Card,
  Flip7LastRoundSummary,
  Flip7ModalScript,
  Flip7ModalScriptItem,
  Flip7PlayerView,
  Flip7PublicPlayer,
} from 'shared';
import { GamePlayHeader, GameShell } from '../../components/game-shell';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { fireFlip7BonusConfetti, startWinCelebrationLoop } from '../../utils/winCelebration';
import './flip7.css';
import { Flip7ActionBar } from './components/Flip7ActionBar';
import { Flip7BustModal, type Flip7BustModalState } from './components/Flip7BustModal';
import { Flip7BustSecondChanceModal } from './components/Flip7BustSecondChanceModal';
import { Flip7DrawToast } from './components/Flip7DrawToast';
import { Flip7FlipRevealModal } from './components/Flip7FlipRevealModal';
import { Flip7GameOverModal } from './components/Flip7GameOverModal';
import { Flip7PlayerBoard } from './components/Flip7PlayerBoard';
import { Flip7RoundRecap } from './components/Flip7RoundRecap';
import { Flip7RoundWinModal, type Flip7RoundWinModalState } from './components/Flip7RoundWinModal';
import { Flip7SpecialDock } from './components/Flip7SpecialDock';
import { Flip7SpecialModal } from './components/Flip7SpecialModal';
import {
  F7_FORCED_FLIP_DURATION_SEC,
  F7_FORCED_FLIP_END_DWELL_MS,
  F7_FORCED_FLIP_INTRO_MS,
  cardImage,
  cardLabel,
  computeLineRevealFromScript,
  isFlip7ModifierStackCard,
  pendingActionToDrawnCard,
  type Flip7FlipCardItem,
  type Flip7LineRevealPlan,
  type Flip7SpecialUi,
} from './lib/flip7Ui';

type Props = {
  gameState: Flip7PlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

export function Flip7Game({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  useEffect(() => {
    if (gameState.phase !== 'game_over') return;
    return startWinCelebrationLoop();
  }, [gameState.phase]);

  const canAct = gameState.phase === 'playing' && gameState.canAct && gameState.myId === myId;
  useYourTurnToast(canAct, gameState.phase === 'playing');
  const myForcedDrawRemaining = gameState.myForcedDrawRemaining ?? 0;
  const blockHitStayPendingSc =
    gameState.pendingAction?.mode === 'bust_second_chance' &&
    gameState.pendingAction.playerId === myId;
  const me = gameState.players.find((p) => p.id === myId) ?? null;
  const prevLinesRef = useRef<Record<string, Flip7Card[]>>({});
  const mountedRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevBustedRef = useRef<Record<string, boolean>>({});
  /** ผู้เล่นที่ผู้ใช้ปิด bust modal แล้ว — กัน bust-detect เปิดซ้ำเมื่อ tableLines อัปเดต */
  const manualDismissedBustIdsRef = useRef<Set<string>>(new Set());
  const openBustModalPlayerIdRef = useRef<string | null>(null);
  const bustCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recapCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedRoundRecapKeyRef = useRef<string | null>(null);
  const pendingRecapAfterBustRef = useRef<Flip7LastRoundSummary | null>(null);
  const pendingRecapAfterFlip7Ref = useRef<Flip7LastRoundSummary | null>(null);
  const [drawToast, setDrawToast] = useState<{
    src: string;
    alt: string;
    by: string;
    id: number;
  } | null>(null);
  const [bustModal, setBustModal] = useState<Flip7BustModalState | null>(null);

  const syncPrevBustedFromPlayers = (players: Flip7PublicPlayer[]) => {
    prevBustedRef.current = Object.fromEntries(players.map((p) => [p.id, p.busted]));
  };

  const showBustModal = (payload: {
    playerId: string;
    playerName: string;
    card: Flip7Card | null;
  }) => {
    if (manualDismissedBustIdsRef.current.has(payload.playerId)) return;
    if (openBustModalPlayerIdRef.current === payload.playerId) return;
    if (bustCloseTimerRef.current) {
      clearTimeout(bustCloseTimerRef.current);
      bustCloseTimerRef.current = null;
    }
    const newModalId = Date.now();
    openBustModalPlayerIdRef.current = payload.playerId;
    prevBustedRef.current[payload.playerId] = true;
    setBustModal({
      playerId: payload.playerId,
      playerName: payload.playerName,
      card: payload.card,
      id: newModalId,
    });
    bustCloseTimerRef.current = setTimeout(() => {
      openBustModalPlayerIdRef.current = null;
      setBustModal(null);
      bustCloseTimerRef.current = null;
    }, 2000);
  };
  const [roundRecap, setRoundRecap] = useState<Flip7LastRoundSummary | null>(null);
  const [flip7RoundWinModal, setFlip7RoundWinModal] = useState<Flip7RoundWinModalState | null>(
    null,
  );
  const [specialOverlay, setSpecialOverlay] = useState<Flip7SpecialUi | null>(null);
  /** ย่อ special dock บน mobile เพื่อดูการ์ดบนกระดาน */
  const [specialDockCollapsed, setSpecialDockCollapsed] = useState(false);
  const dismissedAutoSpecialIdsRef = useRef<Set<string>>(new Set());
  const [flipScriptCard, setFlipScriptCard] = useState<Flip7FlipCardItem | null>(null);
  const modalScriptTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const modalScriptPlaybackGenRef = useRef(0);
  const scriptBlockingRef = useRef(false);
  /** Same `modalScript.id` is kept on the server until the next Hit/Stay; avoid replaying on every view update. */
  const inProgressOrDoneModalScriptIdRef = useRef<string | null>(null);
  const suppressBustDetectOnceRef = useRef(false);
  /** รอบจบแล้ว `tableLines` ถูกล้างก่อนเล่น preface — ใช้ snapshot นี้จับคู่กับ script */
  const lastNonEmptyTableLinesRef = useRef<Record<string, Flip7Card[]>>({});
  const scriptLineRevealDataRef = useRef<Flip7LineRevealPlan | null>(null);
  const scriptLineRevealCountRef = useRef<Record<string, number>>({});
  const [lineRevealTick, setLineRevealTick] = useState(0);
  /** เมื่อปิด special modal ระหว่างเล่น `modalScript` ให้ไปขั้นถัดไป */
  const specialModalContinueAfterCloseRef = useRef<(() => void) | null>(null);

  const displayLineFor = (pid: string, fullLine: Flip7Card[]): Flip7Card[] => {
    void lineRevealTick;
    const plan = scriptLineRevealDataRef.current;
    if (!plan) return fullLine;
    const tail = plan.tailByPlayer[pid];
    if (!tail?.length) return fullLine;
    const base = plan.baseByPlayer[pid] ?? [];
    const n = scriptLineRevealCountRef.current[pid] ?? 0;
    return [...base, ...tail.slice(0, Math.min(n, tail.length))];
  };

  const openRoundRecapFromState = (lr: Flip7LastRoundSummary) => {
    if (recapCloseTimerRef.current) {
      clearTimeout(recapCloseTimerRef.current);
      recapCloseTimerRef.current = null;
    }
    setRoundRecap(lr);
    recapCloseTimerRef.current = setTimeout(() => {
      setRoundRecap(null);
      recapCloseTimerRef.current = null;
    }, 2000);
  };

  const flushPendingRecapAfterBust = () => {
    const pending = pendingRecapAfterBustRef.current;
    pendingRecapAfterBustRef.current = null;
    openBustModalPlayerIdRef.current = null;
    setBustModal(null);
    if (pending) openRoundRecapFromState(pending);
  };

  const closeBustModal = () => {
    if (bustCloseTimerRef.current) {
      clearTimeout(bustCloseTimerRef.current);
      bustCloseTimerRef.current = null;
    }
    if (bustModal?.playerId) {
      manualDismissedBustIdsRef.current.add(bustModal.playerId);
      prevBustedRef.current[bustModal.playerId] = true;
    }
    for (const p of gameState.players) {
      if (p.busted) prevBustedRef.current[p.id] = true;
    }
    openBustModalPlayerIdRef.current = null;
    if (pendingRecapAfterBustRef.current) {
      flushPendingRecapAfterBust();
      return;
    }
    setBustModal(null);
  };

  const closeRoundRecap = () => {
    if (recapCloseTimerRef.current) {
      clearTimeout(recapCloseTimerRef.current);
      recapCloseTimerRef.current = null;
    }
    setRoundRecap(null);
  };

  const closeFlip7RoundWinModal = () => {
    setFlip7RoundWinModal(null);
    const pending = pendingRecapAfterFlip7Ref.current;
    pendingRecapAfterFlip7Ref.current = null;
    if (pending) openRoundRecapFromState(pending);
  };

  const clearModalScriptTimers = () => {
    for (const t of modalScriptTimersRef.current) clearTimeout(t);
    modalScriptTimersRef.current = [];
  };

  const closeSpecialModal = useCallback(() => {
    const cont = specialModalContinueAfterCloseRef.current;
    if (cont) {
      specialModalContinueAfterCloseRef.current = null;
      cont();
      return;
    }
    setSpecialOverlay((prev) => {
      if (prev && !prev.needsTarget) {
        dismissedAutoSpecialIdsRef.current.add(prev.id);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    if (!specialOverlay || specialOverlay.needsTarget) return;
    const timer = setTimeout(() => {
      closeSpecialModal();
    }, 3000);
    return () => clearTimeout(timer);
  }, [specialOverlay, closeSpecialModal]);

  const startModalScriptPlayback = useCallback(
    (
      script: Flip7ModalScript,
      onDone: () => void,
      tableLinesSnapshot: Record<string, Flip7Card[]>,
    ) => {
      modalScriptPlaybackGenRef.current += 1;
      const myGen = modalScriptPlaybackGenRef.current;
      scriptBlockingRef.current = true;
      clearModalScriptTimers();

      const flipCardsForTarget = script.items.filter(
        (i): i is Flip7FlipCardItem => i.kind === 'flip_card',
      );
      const defaultFlipTarget = flipCardsForTarget[0]?.targetPlayerId ?? null;

      const plan = computeLineRevealFromScript(script, tableLinesSnapshot);
      scriptLineRevealDataRef.current = plan;
      scriptLineRevealCountRef.current = plan?.initialRevealCountByPlayer
        ? { ...plan.initialRevealCountByPlayer }
        : {};
      setLineRevealTick((x) => x + 1);

      const bump = (pid: string | null | undefined) => {
        if (!pid) return;
        if (!scriptLineRevealDataRef.current?.tailByPlayer[pid]) return;
        scriptLineRevealCountRef.current[pid] = (scriptLineRevealCountRef.current[pid] ?? 0) + 1;
        setLineRevealTick((x) => x + 1);
      };

      const bumpForSpecialDraw = (
        item: Extract<Flip7ModalScriptItem, { kind: 'special_draw' }>,
      ) => {
        const c = item.card;
        if (c.kind === 'action_flip_n' || c.kind === 'action_just_one_more')
          bump(defaultFlipTarget);
        else if (isFlip7ModifierStackCard(c) || c.kind === 'second_chance') bump(item.playerId);
      };

      const finishReveal = () => {
        scriptLineRevealDataRef.current = null;
        scriptLineRevealCountRef.current = {};
        setLineRevealTick((x) => x + 1);
      };

      const push = (ms: number, fn: () => void) => {
        modalScriptTimersRef.current.push(setTimeout(fn, ms));
      };
      const alive = () => modalScriptPlaybackGenRef.current === myGen;
      const safe = (fn: () => void) => () => {
        if (!alive()) return;
        fn();
      };

      const advance = (index: number) => {
        if (!alive()) return;
        if (index >= script.items.length) {
          scriptBlockingRef.current = false;
          clearModalScriptTimers();
          finishReveal();
          onDone();
          return;
        }
        const item = script.items[index]!;
        if (item.kind === 'special_draw') {
          if (isFlip7ModifierStackCard(item.card)) {
            push(
              0,
              safe(() => {
                bumpForSpecialDraw(item);
                advance(index + 1);
              }),
            );
            return;
          }
          specialModalContinueAfterCloseRef.current = () => {
            specialModalContinueAfterCloseRef.current = null;
            setSpecialOverlay(null);
            bumpForSpecialDraw(item);
            advance(index + 1);
          };
          setSpecialOverlay({
            id: item.id,
            playerId: item.playerId,
            playerName: item.playerName,
            card: item.card,
            needsTarget: item.needsTarget,
          });
          return;
        }
        if (item.kind === 'flip_card') {
          setFlipScriptCard(item);
          push(
            F7_FORCED_FLIP_INTRO_MS +
              F7_FORCED_FLIP_DURATION_SEC * 1000 +
              F7_FORCED_FLIP_END_DWELL_MS,
            safe(() => {
              setFlipScriptCard(null);
              bump(item.revealedPlayerId);
              advance(index + 1);
            }),
          );
          return;
        }
        if (item.kind === 'second_chance_acquired') {
          specialModalContinueAfterCloseRef.current = () => {
            specialModalContinueAfterCloseRef.current = null;
            setSpecialOverlay(null);
            bump(item.playerId);
            advance(index + 1);
          };
          setSpecialOverlay({
            id: item.id,
            playerId: item.playerId,
            playerName: item.playerName,
            card: { kind: 'second_chance' },
            needsTarget: false,
          });
          return;
        }
        if (item.kind === 'second_chance_consumed') {
          specialModalContinueAfterCloseRef.current = () => {
            specialModalContinueAfterCloseRef.current = null;
            setSpecialOverlay(null);
            advance(index + 1);
          };
          setSpecialOverlay({
            id: item.id,
            playerId: item.playerId,
            playerName: item.playerName,
            card: { kind: 'second_chance' },
            needsTarget: false,
            titleOverride: 'ใช้ Second Chance',
          });
          return;
        }
        if (item.kind === 'bust') {
          suppressBustDetectOnceRef.current = true;
          showBustModal({
            playerId: item.playerId,
            playerName: item.playerName,
            card: item.card,
          });
          push(
            2200,
            safe(() => {
              openBustModalPlayerIdRef.current = null;
              setBustModal(null);
              advance(index + 1);
            }),
          );
          return;
        }
      };

      push(
        0,
        safe(() => advance(0)),
      );

      return () => {
        modalScriptPlaybackGenRef.current += 1;
        scriptBlockingRef.current = false;
        specialModalContinueAfterCloseRef.current = null;
        clearModalScriptTimers();
        setSpecialOverlay(null);
        setFlipScriptCard(null);
        finishReveal();
      };
    },
    [],
  );

  useEffect(() => {
    const sd = gameState.lastSpecialDraw;
    if (scriptBlockingRef.current) {
      return;
    }
    if (sd) {
      if (isFlip7ModifierStackCard(sd.card)) {
        setSpecialOverlay(null);
        return;
      }
      if (!sd.needsTarget && dismissedAutoSpecialIdsRef.current.has(sd.id)) {
        setSpecialOverlay(null);
        return;
      }
      specialModalContinueAfterCloseRef.current = null;
      setSpecialOverlay(sd);
      return;
    }
    if (gameState.pendingAction) {
      const pa = gameState.pendingAction;
      if (pa.mode === 'bust_second_chance') {
        setSpecialOverlay(null);
        return;
      }
      const pn =
        gameState.players.find((p) => p.id === pa.sourcePlayerId)?.name ?? pa.sourcePlayerId;
      specialModalContinueAfterCloseRef.current = null;
      setSpecialOverlay({
        id: `pending-${pa.sourcePlayerId}-${pa.mode}`,
        playerId: pa.sourcePlayerId,
        playerName: pn,
        card: pendingActionToDrawnCard(pa),
        needsTarget: true,
      });
      return;
    }
    setSpecialOverlay(null);
  }, [gameState.lastSpecialDraw, gameState.pendingAction, gameState.players]);

  useEffect(() => {
    const tl = gameState.tableLines;
    if (Object.values(tl).some((l) => l.length > 0)) {
      lastNonEmptyTableLinesRef.current = structuredClone(tl);
    }
  }, [gameState.tableLines]);

  useEffect(() => {
    const ms = gameState.modalScript;
    if (!ms?.items.length) {
      inProgressOrDoneModalScriptIdRef.current = null;
      return undefined;
    }
    if (inProgressOrDoneModalScriptIdRef.current === ms.id) return undefined;
    inProgressOrDoneModalScriptIdRef.current = ms.id;
    return startModalScriptPlayback(ms, () => {}, gameState.tableLines);
  }, [gameState.modalScript, gameState.tableLines, startModalScriptPlayback]);

  useEffect(() => {
    syncPrevBustedFromPlayers(gameState.players);
    manualDismissedBustIdsRef.current.clear();
    openBustModalPlayerIdRef.current = null;
    dismissedAutoSpecialIdsRef.current.clear();
    inProgressOrDoneModalScriptIdRef.current = null;
    pendingRecapAfterFlip7Ref.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset bust tracking on new round
  }, [gameState.round]);

  useEffect(() => {
    syncPrevBustedFromPlayers(gameState.players);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per mount (Strict Mode remount included)
  }, []);

  useEffect(() => {
    const lr = gameState.lastRoundSummary;
    if (!lr?.showRecapModal) return;
    const key = `${lr.endedRoundNo}:${lr.rows.map((r) => `${r.id}:${r.roundPoints}`).join('|')}`;
    if (processedRoundRecapKeyRef.current === key) return;

    const runRecapFlow = () => {
      processedRoundRecapKeyRef.current = key;
      const flip7Rows = lr.rows.filter((r) => r.flip7);
      if (flip7Rows.length > 0) {
        pendingRecapAfterFlip7Ref.current = lr;
        setFlip7RoundWinModal({
          id: Date.now(),
          winners: flip7Rows.map((r) => ({ id: r.id, name: r.name, roundPoints: r.roundPoints })),
        });
        fireFlip7BonusConfetti();
        return;
      }
      /** Sole active player busted to end the round — everyone sees BUST then recap (not only the busting player). */
      if (lr.soloEndingBust && !lr.prefaceModalScript?.items?.length) {
        pendingRecapAfterBustRef.current = lr;
        showBustModal({
          playerId: lr.soloEndingBust.playerId,
          playerName: lr.soloEndingBust.playerName,
          card: lr.soloEndingBust.card,
        });
        bustCloseTimerRef.current = setTimeout(() => {
          bustCloseTimerRef.current = null;
          flushPendingRecapAfterBust();
        }, 2000);
        return;
      }
      openRoundRecapFromState(lr);
    };

    const preface = lr.prefaceModalScript;
    if (preface?.items?.length) {
      const allEmpty = Object.values(gameState.tableLines).every((l) => !l.length);
      const snap =
        allEmpty && Object.values(lastNonEmptyTableLinesRef.current).some((l) => l.length > 0)
          ? lastNonEmptyTableLinesRef.current
          : gameState.tableLines;
      return startModalScriptPlayback(preface, runRecapFlow, snap);
    }

    runRecapFlow();
    // flushPendingRecapAfterBust / openRoundRecapFromState are stable helpers (refs + setState)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when summary payload changes
  }, [gameState.lastRoundSummary, gameState.tableLines, startModalScriptPlayback]);

  useEffect(() => {
    if (scriptBlockingRef.current) return;
    for (const p of gameState.players) {
      const was = prevBustedRef.current[p.id] ?? false;
      if (!was && p.busted) {
        if (suppressBustDetectOnceRef.current) {
          suppressBustDetectOnceRef.current = false;
          prevBustedRef.current[p.id] = p.busted;
          continue;
        }
        if (manualDismissedBustIdsRef.current.has(p.id)) {
          prevBustedRef.current[p.id] = true;
          continue;
        }
        if (openBustModalPlayerIdRef.current === p.id) {
          prevBustedRef.current[p.id] = true;
          continue;
        }
        const line = gameState.tableLines[p.id] ?? [];
        const last = line[line.length - 1] ?? null;
        showBustModal({ playerId: p.id, playerName: p.name, card: last });
        break;
      }
      prevBustedRef.current[p.id] = p.busted;
    }
  }, [gameState.players, gameState.tableLines]);

  useEffect(
    () => () => {
      if (bustCloseTimerRef.current) clearTimeout(bustCloseTimerRef.current);
      if (recapCloseTimerRef.current) clearTimeout(recapCloseTimerRef.current);
      clearModalScriptTimers();
    },
    [],
  );

  useEffect(() => {
    const next = gameState.tableLines;
    if (!mountedRef.current) {
      prevLinesRef.current = Object.fromEntries(
        Object.entries(next).map(([pid, line]) => [pid, [...line]]),
      );
      mountedRef.current = true;
      return;
    }

    const prev = prevLinesRef.current;
    let detected: { pid: string; card: Flip7Card } | null = null;
    for (const p of gameState.players) {
      const pid = p.id;
      const before = prev[pid] ?? [];
      const after = next[pid] ?? [];
      if (after.length > before.length) {
        detected = { pid, card: after[after.length - 1]! };
        break;
      }
    }

    prevLinesRef.current = Object.fromEntries(
      Object.entries(next).map(([pid, line]) => [pid, [...line]]),
    );
    if (!detected) return;
    if (detected.card.kind !== 'number' && !isFlip7ModifierStackCard(detected.card)) return;

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setDrawToast({
      src: cardImage(detected.card),
      alt: cardLabel(detected.card),
      by: gameState.players.find((p) => p.id === detected!.pid)?.name ?? detected.pid,
      id: Date.now(),
    });
    toastTimerRef.current = setTimeout(() => setDrawToast(null), 1800);
  }, [gameState.players, gameState.tableLines]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const bustSecondChancePending =
    gameState.pendingAction?.mode === 'bust_second_chance' ? gameState.pendingAction : null;

  useEffect(() => {
    if (specialOverlay?.needsTarget) setSpecialDockCollapsed(false);
  }, [specialOverlay?.id, specialOverlay?.needsTarget]);

  const send = sendAction as (action: Flip7Action) => void;

  const targetPending =
    specialOverlay?.needsTarget &&
    gameState.pendingAction &&
    (gameState.pendingAction.mode === 'action_target' ||
      gameState.pendingAction.mode === 'second_chance_gift')
      ? gameState.pendingAction
      : null;

  return (
    <GameShell
      className={[
        'f7-page pb-[160px]!',
        specialOverlay?.needsTarget
          ? specialDockCollapsed
            ? 'f7-page--special-dock f7-page--special-dock-collapsed'
            : 'f7-page--special-dock'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <GamePlayHeader
        title="Flip 7"
        subtitle={`Target ${gameState.targetScore}`}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      <Flip7PlayerBoard gameState={gameState} myId={myId} displayLineFor={displayLineFor} />

      <section className="card f7-panel">
        <h3>กติกาย่อ</h3>
        <p className="f7-hint">
          ถ้าเลขซ้ำจะ Bust (ยกเว้นมี Second Chance) · มีเลขไม่ซ้ำครบ 7 ใบ รับโบนัส +15 และจบรอบทันที
        </p>
      </section>

      {!specialOverlay?.needsTarget ? (
        <Flip7ActionBar
          canAct={canAct}
          meActive={Boolean(me?.active)}
          blockHitStayPendingSc={blockHitStayPendingSc}
          myForcedDrawRemaining={myForcedDrawRemaining}
          sendAction={send}
        />
      ) : null}

      {specialOverlay && !specialOverlay.needsTarget ? (
        <Flip7SpecialModal overlay={specialOverlay} onClose={closeSpecialModal} />
      ) : null}

      {specialOverlay && targetPending ? (
        <Flip7SpecialDock
          overlay={specialOverlay}
          pendingAction={targetPending}
          players={gameState.players}
          tableLines={gameState.tableLines}
          myId={myId}
          collapsed={specialDockCollapsed}
          onCollapsedChange={setSpecialDockCollapsed}
          displayLineFor={displayLineFor}
          sendAction={send}
        />
      ) : null}

      {flipScriptCard ? <Flip7FlipRevealModal card={flipScriptCard} /> : null}

      {bustSecondChancePending ? (
        <Flip7BustSecondChanceModal
          pending={bustSecondChancePending}
          players={gameState.players}
          myId={myId}
          canAct={gameState.canAct}
          sendAction={send}
        />
      ) : null}

      {bustModal ? (
        <Flip7BustModal bust={bustModal} round={gameState.round} onClose={closeBustModal} />
      ) : null}

      {flip7RoundWinModal ? (
        <Flip7RoundWinModal modal={flip7RoundWinModal} onClose={closeFlip7RoundWinModal} />
      ) : null}

      {gameState.phase === 'game_over' && gameState.gameResult ? (
        <Flip7GameOverModal
          gameState={gameState}
          myId={myId}
          onLeave={onLeave}
          onRestart={onRestart}
        />
      ) : null}

      {roundRecap ? (
        <Flip7RoundRecap recap={roundRecap} phase={gameState.phase} onClose={closeRoundRecap} />
      ) : null}

      {drawToast ? <Flip7DrawToast toast={drawToast} /> : null}
    </GameShell>
  );
}
