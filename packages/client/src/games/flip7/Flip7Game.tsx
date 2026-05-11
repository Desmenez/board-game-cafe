import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Flip7Action,
  Flip7Card,
  Flip7LastRoundSummary,
  Flip7LastRoundSummaryRow,
  Flip7ModalScript,
  Flip7ModalScriptItem,
  Flip7PendingActionView,
  Flip7PlayerView,
  Flip7PublicPlayer,
  Flip7SpecialDrawBroadcast,
} from 'shared';
import { ClipboardList, LogOut, RotateCcw, Skull, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, GameCardImage } from '../../components/ui';
import { imageMap } from '../../imageMap';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { fireFlip7BonusConfetti, startWinCelebrationLoop } from '../../utils/winCelebration';
import './flip7.css';

/** Match Avalon `RoleReveal` flip feel (motion/react + 3D card). */
const F7_FORCED_FLIP_DURATION_SEC = 1;
const F7_FORCED_FLIP_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const F7_FORCED_FLIP_INTRO_MS = 320;
const F7_FORCED_FLIP_END_DWELL_MS = 550;
type Flip7SpecialUi = Flip7SpecialDrawBroadcast & { titleOverride?: string };

/** +2…+10 และ x2 ใน `imageMap.flip7.special` — ไม่แสดง special modal */
function isFlip7ModifierStackCard(c: Flip7Card): boolean {
  return c.kind === 'modifier_add' || c.kind === 'modifier_mul2';
}

function flip7RecapStatusPill(r: Flip7LastRoundSummaryRow): { mod: string; label: string } {
  if (r.flip7) return { mod: 'flip7', label: 'Flip 7!' };
  if (r.busted) return { mod: 'bust', label: 'BUST' };
  if (r.stayed) return { mod: 'stay', label: 'Stay' };
  return { mod: 'none', label: '—' };
}

/** เลขบนการ์ด number ที่มากที่สุดบนแถว (ไม่นับ modifier / action / SC) */
function flip7MaxNumberValueOnLine(line: Flip7Card[]): number | null {
  let max: number | null = null;
  for (const c of line) {
    if (c.kind === 'number') {
      if (max === null || c.value > max) max = c.value;
    }
  }
  return max;
}

/** บรรทัดย่อบนปุ่มเลือกเป้า — แต้ม + เลขสูงสุดบนแถว (สอดคล้องกับ `line` ที่โชว์บนกระดาน) */
function flip7TargetChoiceMeta(
  playerId: string,
  players: Flip7PublicPlayer[],
  line: Flip7Card[],
): string | null {
  const p = players.find((x) => x.id === playerId);
  if (!p) return null;
  const maxNum = flip7MaxNumberValueOnLine(line);
  const high =
    maxNum !== null ? ` · เลขสูงสุดบนมือ ${maxNum}` : ' · ยังไม่มีเลขบนแถว';
  return `แต้มรวม ${p.totalScore} · รอบนี้ ${p.roundPreviewScore}${high}`;
}

function cardEquals(a: Flip7Card, b: Flip7Card): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function linesMatchTail(full: Flip7Card[], tail: Flip7Card[]): boolean {
  if (tail.length > full.length) return false;
  for (let i = 0; i < tail.length; i++) {
    if (!cardEquals(full[full.length - tail.length + i]!, tail[i]!)) return false;
  }
  return true;
}

type Flip7LineRevealPlan = {
  baseByPlayer: Record<string, Flip7Card[]>;
  tailByPlayer: Record<string, Flip7Card[]>;
  /** JOM: การ์ดแอคชันไม่อยู่ใน `items` — โชว์บนแถวก่อน flip แรก */
  initialRevealCountByPlayer?: Record<string, number>;
};

/** แยก base / tail ตามลำดับใน `modalScript` เพื่อโชว์บนแถวทีละใบ — ถ้าไม่ตรงกับ state จริงคืน null */
function computeLineRevealFromScript(
  script: Flip7ModalScript,
  tableLines: Record<string, Flip7Card[]>,
): Flip7LineRevealPlan | null {
  if (script.items.some((i) => i.kind === 'second_chance_consumed')) return null;

  const flipCards = script.items.filter(
    (i): i is Extract<Flip7ModalScriptItem, { kind: 'flip_card' }> => i.kind === 'flip_card',
  );
  const hasLeadingActionSpecial = script.items.some(
    (i) =>
      i.kind === 'special_draw' &&
      (i.card.kind === 'action_flip_n' || i.card.kind === 'action_just_one_more'),
  );

  if (flipCards.length > 0 && !hasLeadingActionSpecial) {
    const pid = flipCards[0]!.revealedPlayerId;
    const draws = flipCards.map((f) => f.card);
    const full = tableLines[pid] ?? [];
    if (full.length < draws.length + 1) return null;
    const actionIdx = full.length - draws.length - 1;
    const ac = full[actionIdx]!;
    if (ac.kind !== 'action_just_one_more' && ac.kind !== 'action_flip_n') return null;
    const tail = [ac, ...draws];
    if (!linesMatchTail(full, tail)) return null;
    return {
      baseByPlayer: { [pid]: full.slice(0, actionIdx) },
      tailByPlayer: { [pid]: tail },
      initialRevealCountByPlayer: { [pid]: 1 },
    };
  }

  const defaultFlipTarget = flipCards[0]?.targetPlayerId;

  const tailByPlayer: Record<string, Flip7Card[]> = {};
  const add = (pid: string, c: Flip7Card) => {
    if (!tailByPlayer[pid]) tailByPlayer[pid] = [];
    tailByPlayer[pid].push(c);
  };

  for (const item of script.items) {
    if (item.kind === 'special_draw') {
      const c = item.card;
      if (c.kind === 'action_flip_n' || c.kind === 'action_just_one_more') {
        if (!defaultFlipTarget) return null;
        add(defaultFlipTarget, c);
      } else if (isFlip7ModifierStackCard(c)) {
        add(item.playerId, c);
      } else if (c.kind === 'second_chance') {
        add(item.playerId, c);
      }
    } else if (item.kind === 'flip_card') {
      add(item.revealedPlayerId, item.card);
    } else if (item.kind === 'second_chance_acquired') {
      add(item.playerId, { kind: 'second_chance' });
    }
  }

  if (Object.keys(tailByPlayer).length === 0) return null;

  const baseByPlayer: Record<string, Flip7Card[]> = {};
  for (const pid of Object.keys(tailByPlayer)) {
    const full = tableLines[pid] ?? [];
    const tail = tailByPlayer[pid]!;
    if (!linesMatchTail(full, tail)) return null;
    baseByPlayer[pid] = full.slice(0, full.length - tail.length);
  }
  return { baseByPlayer, tailByPlayer };
}

type Props = {
  gameState: Flip7PlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

function cardLabel(c: Flip7Card): string {
  if (c.kind === 'number') return `${c.value}`;
  if (c.kind === 'modifier_add') return `+${c.value}`;
  if (c.kind === 'modifier_mul2') return 'x2';
  if (c.kind === 'second_chance') return 'Second Chance';
  if (c.kind === 'action_freeze') return 'Freeze';
  if (c.kind === 'action_discard') return 'Discard';
  if (c.kind === 'action_steal') return 'Steal';
  if (c.kind === 'action_flip_n') return `Flip ${c.count}`;
  return 'Just One More';
}

function cardImage(c: Flip7Card): string {
  const assets = imageMap.flip7;
  if (c.kind === 'number') return assets.number[c.value];
  if (c.kind === 'modifier_add') {
    if (c.value === 2) return assets.special.plus2;
    if (c.value === 4) return assets.special.plus4;
    if (c.value === 6) return assets.special.plus6;
    if (c.value === 8) return assets.special.plus8;
    return assets.special.plus10;
  }
  if (c.kind === 'modifier_mul2') return assets.special.x2;
  if (c.kind === 'second_chance') return assets.special.secondChance;
  if (c.kind === 'action_freeze') return assets.special.freeze;
  if (c.kind === 'action_discard') return assets.special.discard;
  if (c.kind === 'action_steal') return assets.special.steal;
  if (c.kind === 'action_flip_n')
    return c.count === 3 ? assets.special.flip3 : assets.special.flip4;
  return assets.special.justOneMore;
}

function pendingActionToDrawnCard(pa: Flip7PendingActionView): Flip7Card {
  if (pa.mode === 'bust_second_chance') return pa.duplicateCard;
  if (pa.mode === 'second_chance_gift') return { kind: 'second_chance' };
  if (pa.kind === 'action_flip_n')
    return { kind: 'action_flip_n', count: pa.drawCount === 4 ? 4 : 3 };
  if (pa.kind === 'action_freeze') return { kind: 'action_freeze' };
  if (pa.kind === 'action_discard') return { kind: 'action_discard' };
  if (pa.kind === 'action_steal') return { kind: 'action_steal' };
  return { kind: 'action_just_one_more' };
}

function cardBackSrc(): string {
  return imageMap.flip7.cardBack;
}

function specialCardDescription(card: Flip7Card): { title: string; body: string } {
  if (card.kind === 'modifier_add') {
    return {
      title: `การ์ด +${card.value}`,
      body: `บวก ${card.value} แต้มเข้าผลรวมเลขหน้าไพ่เมื่อจบรอบ (นับหลังคูณ x2 ตามจำนวนใบ x2)`,
    };
  }
  if (card.kind === 'modifier_mul2') {
    return {
      title: 'การ์ด x2',
      body: 'คูณผลรวมของเลขทั้งหมดบนโต๊ะด้วย 2 (ซ้อนกับใบ x2 ใบอื่นได้)',
    };
  }
  if (card.kind === 'second_chance') {
    return {
      title: 'Second Chance',
      body: 'เมื่อจั่วเลขซ้ำจะใช้การ์ดนี้แทนการ bust ได้หนึ่งครั้ง (การ์ด Second Chance จะถูกทิ้ง)',
    };
  }
  if (card.kind === 'action_freeze') {
    return {
      title: 'Freeze',
      body: 'บังคับให้เป้าหมายหยุดจั่วทันที (เหมือน Stay) และการ์ดนี้ยังอยู่บนแถวของเป้าหมาย',
    };
  }
  if (card.kind === 'action_discard') {
    return { title: 'Discard', body: 'บังคับให้เป้าหมายทิ้งเลขบนแถวที่มีค่าสูงสุดหนึ่งใบ' };
  }
  if (card.kind === 'action_steal') {
    return {
      title: 'Steal',
      body: 'ขโมยเลขสูงสุดจากแถวเป้าหมายมาใส่มือผู้ใช้การ์ด (ถ้าเลขซ้ำในมือตัวเองจะ bust หรือใช้ Second Chance)',
    };
  }
  if (card.kind === 'action_flip_n') {
    return {
      title: `Flip ${card.count}`,
      body: `บังคับให้เป้าหมายจั่วทันที ${card.count} ใบติดกัน — ถ้าเลขซ้ำจะ bust (หรือใช้ Second Chance)`,
    };
  }
  return {
    title: 'Just One More',
    body: 'บังคับให้เป้าหมายจั่วอีก 1 ใบ',
  };
}

export function Flip7Game({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  useEffect(() => {
    if (gameState.phase !== 'game_over') return;
    return startWinCelebrationLoop();
  }, [gameState.phase]);

  const gameOverBoard = useMemo(() => {
    if (gameState.phase !== 'game_over' || !gameState.gameResult) return [];
    const winners = new Set(gameState.gameResult.winners);
    return [...gameState.players]
      .map((p) => ({
        id: p.id,
        name: p.name,
        totalScore: p.totalScore,
        isWinner: winners.has(p.id),
      }))
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.name.localeCompare(b.name, 'th');
      })
      .map((row, i) => ({ ...row, place: i + 1 }));
  }, [gameState.phase, gameState.players, gameState.gameResult]);

  const gameOverWinnerLine = useMemo(() => {
    if (gameState.phase !== 'game_over' || !gameState.gameResult?.winners.length) return '—';
    return gameState.gameResult.winners
      .map((id) => gameState.players.find((p) => p.id === id)?.name ?? id)
      .join(' · ');
  }, [gameState.phase, gameState.gameResult, gameState.players]);

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
  const bustModalInitRef = useRef(false);
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
  const [bustModal, setBustModal] = useState<{
    playerName: string;
    card: Flip7Card | null;
    id: number;
  } | null>(null);
  const [roundRecap, setRoundRecap] = useState<Flip7LastRoundSummary | null>(null);
  const [flip7RoundWinModal, setFlip7RoundWinModal] = useState<{
    id: number;
    winners: Array<{ id: string; name: string; roundPoints: number }>;
  } | null>(null);
  const [specialOverlay, setSpecialOverlay] = useState<Flip7SpecialUi | null>(null);
  const dismissedAutoSpecialIdsRef = useRef<Set<string>>(new Set());
  type FlipCardItem = Extract<Flip7ModalScriptItem, { kind: 'flip_card' }>;
  const [flipScriptCard, setFlipScriptCard] = useState<FlipCardItem | null>(null);
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
    setBustModal(null);
    if (pending) openRoundRecapFromState(pending);
  };

  const closeBustModal = () => {
    if (bustCloseTimerRef.current) {
      clearTimeout(bustCloseTimerRef.current);
      bustCloseTimerRef.current = null;
    }
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
        (i): i is FlipCardItem => i.kind === 'flip_card',
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
          setBustModal({
            playerName: item.playerName,
            card: item.card,
            id: Date.now(),
          });
          push(
            2200,
            safe(() => {
              setBustModal(null);
              advance(index + 1);
            }),
          );
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
    prevBustedRef.current = Object.fromEntries(gameState.players.map((p) => [p.id, p.busted]));
    dismissedAutoSpecialIdsRef.current.clear();
    inProgressOrDoneModalScriptIdRef.current = null;
    pendingRecapAfterFlip7Ref.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset bust tracking on new round
  }, [gameState.round]);

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
        if (bustCloseTimerRef.current) {
          clearTimeout(bustCloseTimerRef.current);
          bustCloseTimerRef.current = null;
        }
        setBustModal({
          playerName: lr.soloEndingBust.playerName,
          card: lr.soloEndingBust.card,
          id: Date.now(),
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
    if (!bustModalInitRef.current) {
      bustModalInitRef.current = true;
      return;
    }
    if (scriptBlockingRef.current) return;
    for (const p of gameState.players) {
      const was = prevBustedRef.current[p.id] ?? false;
      if (!was && p.busted) {
        if (suppressBustDetectOnceRef.current) {
          suppressBustDetectOnceRef.current = false;
          prevBustedRef.current[p.id] = p.busted;
          continue;
        }
        const line = gameState.tableLines[p.id] ?? [];
        const last = line[line.length - 1] ?? null;
        if (bustCloseTimerRef.current) {
          clearTimeout(bustCloseTimerRef.current);
          bustCloseTimerRef.current = null;
        }
        setBustModal({
          playerName: p.name,
          card: last,
          id: Date.now(),
        });
        bustCloseTimerRef.current = setTimeout(() => {
          setBustModal(null);
          bustCloseTimerRef.current = null;
        }, 2000);
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

  return (
    <div className="page container f7-page flex flex-col gap-4 pb-[160px]!">
      <div className="card f7-status-summary">
        <div className="f7-status-summary__head">
          <div className="f7-status-summary__head-main">
            <h1 className="f7-status-summary__title">Flip 7</h1>
            <span className="f7-status-summary__mode">Target {gameState.targetScore}</span>
          </div>
          <div className="f7-status-summary__head-actions">
            {onRestart ? (
              <Button type="button" variant="secondary" onClick={onRestart}>
                <RotateCcw size={16} aria-hidden />
                เล่นใหม่
              </Button>
            ) : null}
            <Button type="button" variant="danger" onClick={onLeave}>
              <LogOut size={16} aria-hidden />
              ออกจากห้อง
            </Button>
          </div>
        </div>
      </div>

      {/* <div className="card f7-panel">
        <p className="f7-last">{gameState.lastEvent}</p>
      </div> */}

      <div className="f7-grid">
        {gameState.players.map((p) => {
          const line = displayLineFor(p.id, gameState.tableLines[p.id] ?? []);
          const mine = p.id === myId;
          const current = p.id === gameState.currentPlayerId;
          const dealer = p.id === gameState.dealerId;
          const disabled = p.busted || p.stayed || !p.active;
          return (
            <section
              key={p.id}
              className={`card f7-player${mine ? ' mine' : ''}${p.active ? ' active' : ''}${current ? ' current' : ''}${disabled ? ' disabled' : ''}`}
            >
              <div className="f7-player-head">
                <h3>
                  {p.name} {mine ? '(คุณ)' : ''}
                </h3>
                <span className="f7-total">{p.totalScore}</span>
              </div>
              <div className="f7-player-tags">
                {current ? <span className="f7-tag f7-tag-turn">ถึงตา</span> : null}
                {dealer ? <span className="f7-tag">Dealer</span> : null}
                {p.flip7 ? <span className="f7-tag f7-tag-flip7">+15</span> : null}
                {p.forcedDrawRemaining > 0 ? (
                  <span className="f7-tag f7-tag-forced-draw" title="บังคับจั่วจาก Flip / Just One More">
                    จั่วค้าง ×{p.forcedDrawRemaining}
                  </span>
                ) : null}
                {current ? (
                  <span className="f7-tag f7-tag-round">
                    รอบ {gameState.round} · จั่ว {gameState.deckRemaining} · ทิ้ง{' '}
                    {gameState.discardCount}
                  </span>
                ) : null}
              </div>
              <p className="f7-status">
                {p.busted
                  ? 'BUST'
                  : p.flip7
                    ? 'Flip 7!'
                    : p.stayed
                      ? 'Stay'
                      : p.active
                        ? 'กำลังเล่น'
                        : 'รอรอบใหม่'}{' '}
                · รอบนี้ {p.roundPreviewScore} แต้ม
              </p>
              <div className="f7-line">
                {line.length === 0 ? (
                  <span className="muted">ยังไม่มีการ์ด</span>
                ) : (
                  line.map((c, i) => (
                    <GameCardImage
                      key={`${c.kind}-${i}`}
                      src={cardImage(c)}
                      alt={cardLabel(c)}
                      width={120}
                      aspectRatio={469 / 768}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="card f7-panel">
        <h3>กติกาย่อ</h3>
        <p className="f7-hint">
          ถ้าเลขซ้ำจะ Bust (ยกเว้นมี Second Chance) · มีเลขไม่ซ้ำครบ 7 ใบ รับโบนัส +15 และจบรอบทันที
        </p>
      </section>

      <div className="f7-action-bar" role="region" aria-label="แอคชันหลัก">
        <div className="f7-action-bar__inner">
          <Button
            type="button"
            size="lg"
            onClick={() => sendAction({ type: 'hit' } satisfies Flip7Action)}
            disabled={!canAct || blockHitStayPendingSc}
          >
            {myForcedDrawRemaining > 0 ? `Hit (${myForcedDrawRemaining})` : 'Hit'}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            onClick={() => sendAction({ type: 'stay' } satisfies Flip7Action)}
            disabled={!canAct || !me?.active || blockHitStayPendingSc || myForcedDrawRemaining > 0}
          >
            Stay
          </Button>
        </div>
      </div>

      {specialOverlay ? (
        <div
          className={`modal-overlay f7-special-overlay${specialOverlay.needsTarget ? ' f7-special-overlay--peek' : ''}`}
          role="dialog"
          aria-modal
        >
          <div
            className={`modal f7-special-modal${specialOverlay.needsTarget ? ' f7-special-modal--dock' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-center f7-special-modal__title">
              {specialOverlay.titleOverride
                ? specialOverlay.titleOverride
                : gameState.pendingAction?.mode === 'second_chance_gift'
                  ? 'Second Chance ซ้ำ'
                  : specialCardDescription(specialOverlay.card).title}
            </h2>
            <p className="f7-special-modal__who">
              <strong>{specialOverlay.playerName}</strong> จั่วได้การ์ดพิเศษ
            </p>
            <div className="f7-special-modal__card">
              <GameCardImage
                src={cardImage(specialOverlay.card)}
                alt={cardLabel(specialOverlay.card)}
                width={specialOverlay.needsTarget ? 132 : 180}
                aspectRatio={469 / 768}
                showZoom={false}
              />
            </div>
            <p className="f7-special-modal__body">
              {gameState.pendingAction?.mode === 'second_chance_gift'
                ? 'เลือกผู้เล่นคนอื่นที่ยังไม่มี Second Chance บนมือเพื่อมอบการ์ดนี้ (เลือกตัวเองไม่ได้) หากไม่มีใครรับได้การ์ดจะถูกทิ้ง'
                : specialCardDescription(specialOverlay.card).body}
            </p>
            {specialOverlay.needsTarget ? (
              <p className="f7-special-modal__peek-hint">
                ด้านบนยังเห็นมือและแต้มรวม — เลื่อนดูกระดานก่อนเลือกเป้าหมาย
              </p>
            ) : null}
            {gameState.pendingAction?.mode === 'action_target' &&
            gameState.pendingAction.targetOptions.length === 1 &&
            gameState.pendingAction.targetOptions[0]!.id ===
              gameState.pendingAction.sourcePlayerId ? (
              <p className="f7-hint f7-special-modal__sole-hint">
                เหลือคุณคนเดียวที่ยังเล่น — กดชื่อคุณเพื่อเลือกตัวเองเป็นเป้าหมาย (ผู้เล่นอื่นจะ
                bust หรือ stay แล้ว)
              </p>
            ) : null}
            {specialOverlay.needsTarget && gameState.pendingAction ? (
              <div className="f7-actions f7-special-modal__targets f7-special-modal__targets--dock">
                {(() => {
                  const pa = gameState.pendingAction;
                  if (!pa) return null;
                  if (pa.mode === 'second_chance_gift') {
                    return pa.targetOptions.map((o) => {
                      const canPick = pa.sourcePlayerId === myId && o.id !== myId;
                      const line = displayLineFor(o.id, gameState.tableLines[o.id] ?? []);
                      const meta = flip7TargetChoiceMeta(o.id, gameState.players, line);
                      return (
                        <Button
                          key={o.id}
                          type="button"
                          variant="secondary"
                          block
                          disabled={!canPick}
                          className="f7-special-modal__target-btn"
                          onClick={() =>
                            sendAction({
                              type: 'resolve_pending_action',
                              targetPlayerId: o.id,
                            } satisfies Flip7Action)
                          }
                        >
                          <span className="f7-special-modal__target-stack">
                            <span className="f7-special-modal__target-name">
                              {o.name}
                              {o.id === myId ? ' (คุณ)' : ''}
                            </span>
                            {meta ? (
                              <span className="f7-special-modal__target-meta">{meta}</span>
                            ) : null}
                          </span>
                        </Button>
                      );
                    });
                  }
                  if (pa.mode === 'action_target') {
                    const solePickSelf =
                      pa.targetOptions.length === 1 &&
                      pa.targetOptions[0]!.id === pa.sourcePlayerId;
                    const rows = solePickSelf
                      ? gameState.players.map((p) => ({ id: p.id, name: p.name }))
                      : pa.targetOptions.map((o) => ({ id: o.id, name: o.name }));
                    return rows.map((o) => {
                      const inChoice = pa.targetOptions.some((t) => t.id === o.id);
                      const canPick = pa.sourcePlayerId === myId && inChoice;
                      const line = displayLineFor(o.id, gameState.tableLines[o.id] ?? []);
                      const meta = flip7TargetChoiceMeta(o.id, gameState.players, line);
                      return (
                        <Button
                          key={o.id}
                          type="button"
                          variant="secondary"
                          block
                          disabled={!canPick}
                          className="f7-special-modal__target-btn"
                          onClick={() =>
                            sendAction({
                              type: 'resolve_pending_action',
                              targetPlayerId: o.id,
                            } satisfies Flip7Action)
                          }
                        >
                          <span className="f7-special-modal__target-stack">
                            <span className="f7-special-modal__target-name">
                              {o.name}
                              {o.id === myId ? ' (คุณ)' : ''}
                            </span>
                            {meta ? (
                              <span className="f7-special-modal__target-meta">{meta}</span>
                            ) : null}
                          </span>
                        </Button>
                      );
                    });
                  }
                  return null;
                })()}
              </div>
            ) : null}
            {!specialOverlay.needsTarget ? (
              <Button
                type="button"
                block
                className="f7-special-modal__close"
                onClick={closeSpecialModal}
              >
                ปิด
              </Button>
            ) : gameState.pendingAction &&
              gameState.pendingAction.mode !== 'bust_second_chance' &&
              gameState.pendingAction.sourcePlayerId !== myId ? (
              <p className="f7-hint f7-special-modal__hint">รอผู้เล่นที่จั่วได้เลือกเป้าหมาย</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {flipScriptCard ? (
        <div className="modal-overlay f7-flip-reveal-overlay" role="dialog" aria-modal>
          <div className="modal f7-flip-reveal-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-center">Flip บังคับจั่ว</h2>
            <p className="f7-flip-reveal__sub">
              {flipScriptCard.sourceName} → {flipScriptCard.targetName} (ใบที่{' '}
              {flipScriptCard.flipIndex + 1}/{flipScriptCard.flipTotal})
            </p>
            <div className="f7-flip-reveal__row">
              <div key={flipScriptCard.id} className="f7-flip-reveal__slot">
                <div className="f7-card-flip-perspective">
                  <motion.div
                    className="f7-card-flip-inner"
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: 180 }}
                    transition={{
                      delay: F7_FORCED_FLIP_INTRO_MS / 1000,
                      duration: F7_FORCED_FLIP_DURATION_SEC,
                      ease: F7_FORCED_FLIP_EASE,
                    }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="f7-card-flip-face f7-card-flip-face--back" aria-hidden>
                      <img
                        src={cardBackSrc()}
                        alt=""
                        className="f7-card-flip-img"
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                    <div className="f7-card-flip-face f7-card-flip-face--front">
                      <img
                        src={cardImage(flipScriptCard.card)}
                        alt={cardLabel(flipScriptCard.card)}
                        className="f7-card-flip-img"
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {bustSecondChancePending ? (
        <div className="modal-overlay f7-bust-sc-overlay" role="dialog" aria-modal>
          <div
            className="modal f7-bust-modal f7-bust-sc-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-center">เลขซ้ำ</h2>
            <p className="f7-bust-modal__text">
              {gameState.players.find((p) => p.id === bustSecondChancePending.playerId)?.name ??
                bustSecondChancePending.playerId}
              {bustSecondChancePending.duplicateCard.kind === 'number'
                ? ` จั่วเลข ${bustSecondChancePending.duplicateCard.value} ซ้ำ`
                : ''}
            </p>
            <p className="f7-bust-sc-modal__hint">
              คุณมี Second Chance — เลือกใช้เพื่อทิ้งเลขนี้และการ์ด Second Chance หรือยอม Bust
            </p>
            <div className="f7-bust-modal__card">
              <GameCardImage
                src={cardImage(bustSecondChancePending.duplicateCard)}
                alt={cardLabel(bustSecondChancePending.duplicateCard)}
                width={140}
                aspectRatio={469 / 768}
                showZoom={false}
              />
            </div>
            {bustSecondChancePending.playerId === myId && gameState.canAct ? (
              <div className="f7-bust-sc-modal__actions">
                <Button
                  type="button"
                  block
                  onClick={() =>
                    sendAction({
                      type: 'resolve_bust_second_chance',
                      useSecondChance: true,
                    } satisfies Flip7Action)
                  }
                >
                  ใช้ Second Chance
                </Button>
              </div>
            ) : (
              <p className="f7-hint f7-special-modal__hint">รอผู้เล่นตัดสินใจ…</p>
            )}
          </div>
        </div>
      ) : null}

      {bustModal ? (
        <div
          key={bustModal.id}
          className="modal-overlay f7-bust-overlay f7-bust-overlay--fatal"
          role="dialog"
          aria-modal
        >
          <div
            className="modal f7-bust-modal f7-bust-modal--fatal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="f7-bust-modal__header f7-bust-modal__header--fatal">
              <Skull className="f7-bust-modal__skull" aria-hidden strokeWidth={1.85} size={52} />
              <h2 className="f7-bust-modal__title f7-bust-modal__title--fatal">เลขซ้ำ — BUST</h2>
              <span className="f7-bust-modal__badge">OUT</span>
            </div>
            <p className="f7-bust-modal__text f7-bust-modal__text--fatal">
              <strong className="f7-bust-modal__name">{bustModal.playerName}</strong>
              {bustModal.card?.kind === 'number'
                ? ` จั่วเลข ${bustModal.card.value} ซ้ำ`
                : ' bust จากการ์ดซ้ำ'}
            </p>
            {bustModal.card ? (
              <div className="f7-bust-modal__card f7-bust-modal__card--fatal">
                <GameCardImage
                  src={cardImage(bustModal.card)}
                  alt={cardLabel(bustModal.card)}
                  width={140}
                  aspectRatio={469 / 768}
                  showZoom={false}
                />
              </div>
            ) : null}
            <Button type="button" variant="danger" block onClick={closeBustModal}>
              ปิด
            </Button>
          </div>
        </div>
      ) : null}

      {flip7RoundWinModal ? (
        <div
          key={flip7RoundWinModal.id}
          className="modal-overlay f7-flip7-round-win-overlay f7-flip7-round-win-overlay--celebrate"
          role="dialog"
          aria-modal
        >
          <div
            className="modal f7-flip7-round-win-modal f7-flip7-round-win-modal--celebrate"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="f7-flip7-round-win__header">
              <Trophy
                className="f7-flip7-round-win__trophy"
                aria-hidden
                strokeWidth={1.65}
                size={52}
              />
              <h2 className="f7-flip7-round-win__title">Flip 7 สำเร็จ!</h2>
              <span className="f7-flip7-round-win__badge">LUCKY 7</span>
            </div>
            <p className="f7-flip7-round-win__lead">ผู้เล่นที่ทำ Flip 7 และแต้มที่ได้ในรอบนี้</p>
            <div className="f7-flip7-round-win__list">
              {flip7RoundWinModal.winners.map((w) => (
                <div key={w.id} className="f7-flip7-round-win__row">
                  <span className="f7-flip7-round-win__name">{w.name}</span>
                  <span className="f7-flip7-round-win__pts">{w.roundPoints} แต้ม</span>
                </div>
              ))}
            </div>
            <Button type="button" variant="success" block onClick={closeFlip7RoundWinModal}>
              ปิด
            </Button>
          </div>
        </div>
      ) : null}

      {gameState.phase === 'game_over' && gameState.gameResult && (
        <div
          className="modal-overlay f7-game-over-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="f7-game-over-title"
        >
          <div className="modal f7-game-over-modal" onClick={(e) => e.stopPropagation()}>
            <div className="f7-game-over-toolbar">
              <p className="f7-game-over-kicker" id="f7-game-over-title">
                🏆 เกมจบแล้ว
              </p>
            </div>

            <div className="f7-game-over-hero" aria-live="polite">
              <p className="f7-game-over-hero-label">ผู้ชนะ</p>
              <p className="f7-game-over-hero-names">{gameOverWinnerLine}</p>
              <p className="f7-game-over-hero-reason">{gameState.gameResult.reason}</p>
            </div>

            {gameOverBoard.length > 0 ? (
              <>
                <h3 className="f7-game-over-score-heading">
                  คะแนนรวม{' '}
                  <span className="f7-game-over-score-sub">
                    (เป้าหมาย {gameState.targetScore} แต้ม · เรียงจากมากไปน้อย)
                  </span>
                </h3>
                <div className="f7-game-over-table-wrap">
                  <table className="f7-game-over-table">
                    <thead>
                      <tr>
                        <th scope="col" className="w-16">
                          อันดับ
                        </th>
                        <th scope="col">ผู้เล่น</th>
                        <th scope="col">แต้ม</th>
                        <th scope="col" className="f7-game-over-table__th-narrow">
                          สถานะ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameOverBoard.map((row) => (
                        <tr
                          key={row.id}
                          className={row.isWinner ? 'f7-game-over-table__row--winner' : undefined}
                        >
                          <td className="f7-game-over-table__place">{row.place}</td>
                          <td className="f7-game-over-table__name">
                            {row.name}
                            {row.id === myId ? ' (คุณ)' : ''}
                          </td>
                          <td className="f7-game-over-table__score">{row.totalScore}</td>
                          <td className="f7-game-over-table__badge-cell">
                            {row.isWinner ? (
                              <span className="f7-game-over-winner-badge">ชนะ</span>
                            ) : (
                              <span className="f7-game-over-table__dash">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            <div className="f7-game-over-toolbar-actions">
              {onRestart ? (
                <Button type="button" variant="secondary" size="md" onClick={onRestart}>
                  <RotateCcw size={16} aria-hidden />
                  เล่นใหม่
                </Button>
              ) : (
                <span className="f7-game-over-wait-host f7-game-over-wait-host--toolbar">
                  รอหัวห้องกด «เล่นใหม่»
                </span>
              )}
              <Button type="button" variant="danger" size="md" onClick={onLeave}>
                <LogOut size={16} aria-hidden />
                ออกจากห้อง
              </Button>
            </div>
          </div>
        </div>
      )}

      {roundRecap ? (
        <div
          className="modal-overlay f7-round-recap-overlay f7-round-recap-overlay--sheet"
          role="dialog"
          aria-modal
          aria-labelledby="f7-round-recap-title"
        >
          <div
            className="modal f7-round-recap-modal f7-round-recap-modal--sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="f7-round-recap__header">
              <ClipboardList
                className="f7-round-recap__header-icon"
                aria-hidden
                strokeWidth={1.5}
                size={40}
              />
              <span className="f7-round-recap__round-pill">รอบที่ {roundRecap.endedRoundNo}</span>
              <h2 id="f7-round-recap-title" className="f7-round-recap__title">
                จบรอบ
              </h2>
            </div>
            <p className="f7-round-recap__lead">สรุปแต้มที่ได้ในรอบนี้</p>
            {gameState.phase === 'playing' && roundRecap.nextDealerName ? (
              <p className="f7-round-recap__dealer">
                <span className="f7-round-recap__dealer-label">Dealer รอบหน้า</span>
                <strong className="f7-round-recap__dealer-name">{roundRecap.nextDealerName}</strong>
              </p>
            ) : null}
            <div className="f7-round-recap__table-wrap">
              <table className="f7-round-recap__table">
                <thead>
                  <tr>
                    <th scope="col">ผู้เล่น</th>
                    <th scope="col" className="f7-round-recap__th-num">
                      แต้มรอบ
                    </th>
                    <th scope="col" className="f7-round-recap__th-status">
                      สถานะ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roundRecap.rows.map((r) => {
                    const st = flip7RecapStatusPill(r);
                    return (
                      <tr key={r.id} className="f7-round-recap__row">
                        <td className="f7-round-recap__name">{r.name}</td>
                        <td className="f7-round-recap__pts f7-round-recap__pts-cell">{r.roundPoints}</td>
                        <td className="f7-round-recap__status-cell">
                          <span
                            className={`f7-round-recap__pill f7-round-recap__pill--${st.mod}`}
                          >
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="secondary" block onClick={closeRoundRecap}>
              ปิด
            </Button>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {drawToast ? (
          <motion.div
            key={drawToast.id}
            className="f7-draw-toast"
            aria-live="polite"
            initial={{ y: 200, opacity: 0.4 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 92, opacity: 0 }}
            transition={{
              duration: 0.32,
              ease: [0.2, 0.82, 0.2, 1],
            }}
          >
            <GameCardImage
              src={drawToast.src}
              alt={drawToast.alt}
              width={200}
              aspectRatio={469 / 768}
              showZoom={false}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
