import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { NameItAction, NameItBreedId, NameItLastPlay, NameItPlayerView } from 'shared';
import {
  NAME_IT_BREED_FACE_IMAGE_IDS,
  NAME_IT_BREED_LABELS,
  NAME_IT_BREED_LABELS_TH,
  NAME_IT_BREEDS,
  NAME_IT_CARD_BACK_URL,
  normalizeToUppercase,
} from 'shared';
import { Button } from '../../components/ui';
import { fireNameItDogNamedConfetti, startWinCelebrationLoop } from '../../utils/winCelebration';
import './name-it.css';

/** กดสายพันธุ์ / ชื่อเจ้าของผิด — รอก่อนกดใหม่ */
const WRONG_PICK_COOLDOWN_MS = 2000;

const NAME_REVEAL_MODAL_MS = 3000;

interface Props {
  gameState: NameItPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  /** เฉพาะหัวห้อง — เริ่มรอบใหม่ในห้องเดิม (ไม่ต้องสร้างห้องใหม่) */
  onRestart?: () => void;
  remoteError?: string | null;
  onClearRemoteError?: () => void;
}

function cardUrl(base: string, imageId: string): string {
  const b = base.replace(/\/$/, '');
  return `${b}/${imageId}.jpg`;
}

function validateDogNameClient(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, ' ');
  if (!t) return null;
  const words = t.split(' ');
  if (words.length > 4) return null;
  const wordRe = /^[\u0E00-\u0E7Fa-zA-Z]+$/;
  if (!words.every((w) => wordRe.test(w))) return null;
  return normalizeToUppercase(t);
}

const DOG_NAME_MAX_GRAPHEMES = 10;

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    try {
      const seg = new Intl.Segmenter('th', { granularity: 'grapheme' });
      return [...seg.segment(text)].map((s) => s.segment);
    } catch {
      /* ignore */
    }
  }
  return [...text];
}

function clampGraphemeString(text: string, max: number): string {
  return splitGraphemes(text).slice(0, max).join('');
}

/** อนุญาตเฉพาะไทย / a-z A-Z / ช่องว่าง — สอดคล้อง validateDogNameClient; สูงสุด 4 คำ */
function filterDogNameInput(raw: string): string {
  let t = '';
  for (const ch of raw) {
    if (/^[\u0E00-\u0E7Fa-zA-Z ]$/.test(ch)) t += ch;
  }
  t = t.replace(/  +/g, ' ');
  const words = t.split(' ').filter((w) => w.length > 0);
  const capped = words.slice(0, 4);
  let out = capped.join(' ');
  if (t.endsWith(' ') && capped.length > 0 && capped.length < 4) out += ' ';
  return out;
}

function sanitizeDogNameDraft(raw: string): string {
  return clampGraphemeString(filterDogNameInput(raw), DOG_NAME_MAX_GRAPHEMES);
}

function sanitizeGuessDogNameDraft(raw: string, maxGraphemes: number): string {
  return clampGraphemeString(filterDogNameInput(raw), maxGraphemes);
}

function DogNameSlotInput({
  value,
  onChange,
  inputRef,
  onEnter,
  slotCount = DOG_NAME_MAX_GRAPHEMES,
  sanitize = sanitizeDogNameDraft,
  wrapperClassName,
  readOnly = false,
  'aria-label': ariaLabel = 'ชื่อสุนัข',
}: {
  value: string;
  onChange: (next: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onEnter?: () => void;
  slotCount?: number;
  sanitize?: (raw: string) => string;
  wrapperClassName?: string;
  readOnly?: boolean;
  'aria-label'?: string;
}) {
  const composingRef = useRef(false);
  const graphemes = splitGraphemes(value).slice(0, slotCount);
  const slots = Array.from({ length: slotCount }, (_, i) => graphemes[i] ?? '');

  return (
    <div
      className={['name-it__slot-input', wrapperClassName].filter(Boolean).join(' ')}
      onPointerDownCapture={(e) => {
        if (readOnly) return;
        const inp = inputRef.current;
        if (!inp || e.target === inp) return;
        inp.focus({ preventScroll: true });
      }}
    >
      <div
        className="name-it__slot-input__track"
        aria-hidden
        style={{ gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))` }}
      >
        {slots.map((g, i) => (
          <div key={i} className="name-it__slot-input__cell">
            <span className="name-it__slot-input__char">{g}</span>
            <span className="name-it__slot-input__line" />
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        className="name-it__slot-input__field"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="off"
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        value={value}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          onChange(sanitize(e.currentTarget.value));
        }}
        onChange={(e) => {
          if (composingRef.current) return;
          onChange(sanitize(e.target.value));
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          if (e.nativeEvent.isComposing) return;
          e.preventDefault();
          if (!readOnly) onEnter?.();
        }}
        aria-label={ariaLabel}
      />
    </div>
  );
}

function BreedPickButtonContent({ bid }: { bid: NameItBreedId }) {
  return (
    <>
      <span className="name-it__breed-btn__en">{NAME_IT_BREED_LABELS[bid]}</span>
      <span className="name-it__breed-btn__th">{NAME_IT_BREED_LABELS_TH[bid]}</span>
    </>
  );
}

function gollumReplayLabel(replay: NameItLastPlay | undefined): string | null {
  if (!replay) return null;
  if (replay.kind === 'guess_dog_name') return 'Gollum: เล่นซ้ำ — แข่งพิมพ์ชื่อสุนัข';
  if (replay.kind === 'guess_owner_name') return 'Gollum: เล่นซ้ำ — กดชื่อเจ้าของสุนัข (ชื่อในเกม)';
  if (replay.kind === 'race_cat') return 'Gollum: เล่นซ้ำ — กดไอคอนแมว';
  return 'Gollum: เล่นซ้ำ — Gluta';
}

function useRoundDeadline(ar: NameItPlayerView['activeRound']): number | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!ar) return;
    const t = setInterval(() => setTick((x) => x + 1), 200);
    return () => clearInterval(t);
  }, [ar]);
  if (!ar) return null;
  if (ar.subPhase === 'owner_naming' && ar.nameDeadlineMs != null) {
    return Math.max(0, Math.ceil((ar.nameDeadlineMs - Date.now()) / 1000));
  }
  if (ar.deadlineMs == null) return null;
  return Math.max(0, Math.ceil((ar.deadlineMs - Date.now()) / 1000));
}

const DECK_LAYER_COUNT = 5;

function NameItDeckStack({ shuffleTick }: { shuffleTick: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="name-it__deck-stack" aria-hidden>
      <motion.div
        key={shuffleTick}
        className="name-it__deck-stack-inner"
        initial={{ rotate: 0, x: 0 }}
        animate={
          reduceMotion || shuffleTick === 0
            ? { rotate: 0, x: 0 }
            : { rotate: [0, -6, 5.5, -3.5, 0], x: [0, 4, -4, 2, 0] }
        }
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {Array.from({ length: DECK_LAYER_COUNT }, (_, i) => (
          <motion.img
            key={i}
            src={NAME_IT_CARD_BACK_URL}
            alt=""
            className="name-it__deck-layer"
            style={{
              left: i * 6,
              top: -i * 6,
              zIndex: DECK_LAYER_COUNT - i,
            }}
            initial={false}
            animate={
              reduceMotion || shuffleTick === 0
                ? { x: 0, y: 0, rotate: 0 }
                : {
                    x: [0, (i % 2 === 0 ? 3 : -3) + i * 0.4, 0],
                    y: [0, -5, 0],
                    rotate: [0, (i - 2) * 3, 0],
                  }
            }
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
          />
        ))}
      </motion.div>
    </div>
  );
}

export function NameItGame({
  gameState,
  myId,
  sendAction,
  onLeave,
  onRestart,
  remoteError,
  onClearRemoteError,
}: Props) {
  const [nameDraft, setNameDraft] = useState('');
  const [guessDraft, setGuessDraft] = useState('');
  const [breedWrongCooldownUntil, setBreedWrongCooldownUntil] = useState<number | null>(null);
  const [, setBreedWrongCooldownTick] = useState(0);
  const [ownerPickWrongCooldownUntil, setOwnerPickWrongCooldownUntil] = useState<number | null>(
    null,
  );
  const [, setOwnerPickWrongCooldownTick] = useState(0);
  const [guessWrongCooldownUntil, setGuessWrongCooldownUntil] = useState<number | null>(null);
  const [, setGuessWrongCooldownTick] = useState(0);
  const [nameReveal, setNameReveal] = useState<{
    dogName: string;
    ownerName: string;
    breedLabel: string;
    imageId: string;
  } | null>(null);
  /** สแนปช็อต dogName ต่อสายพันธุ์ — ใช้ตรวจ null→ชื่อใหม่เพื่อโชว์ modal ให้ทุกคน */
  const prevBreedsDogName = useRef<Record<NameItBreedId, string | null> | null>(null);
  const ownerNameInputRef = useRef<HTMLInputElement | null>(null);
  const guessNameInputRef = useRef<HTMLInputElement | null>(null);

  const ar = gameState.activeRound;
  const secs = useRoundDeadline(ar);
  const [deckShuffleTick, setDeckShuffleTick] = useState(0);
  const prevDeckRemaining = useRef(gameState.deckRemaining);

  useEffect(() => {
    const prev = prevDeckRemaining.current;
    if (prev > gameState.deckRemaining) {
      setDeckShuffleTick((n) => n + 1);
    }
    prevDeckRemaining.current = gameState.deckRemaining;
  }, [gameState.deckRemaining]);

  const drawerName = gameState.players.find((p) => p.id === gameState.drawerId)?.name ?? '—';

  useEffect(() => {
    if (remoteError) {
      const t = setTimeout(() => onClearRemoteError?.(), 4000);
      return () => clearTimeout(t);
    }
  }, [remoteError, onClearRemoteError]);

  useEffect(() => {
    if (!ar || ar.subPhase !== 'owner_naming' || ar.pendingOwnerId !== myId) return;
    setNameDraft('');
    const raf = window.requestAnimationFrame(() => {
      ownerNameInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [ar, myId]);

  useEffect(() => {
    if (gameState.phase !== 'playing') {
      prevBreedsDogName.current = null;
      return;
    }

    const breeds = gameState.breeds;
    const snapshot = (): Record<NameItBreedId, string | null> => {
      const o = {} as Record<NameItBreedId, string | null>;
      for (const bid of NAME_IT_BREEDS) o[bid] = breeds[bid]?.dogName ?? null;
      return o;
    };

    if (prevBreedsDogName.current === null) {
      prevBreedsDogName.current = snapshot();
      return;
    }

    for (const bid of NAME_IT_BREEDS) {
      const was = prevBreedsDogName.current[bid];
      const now = breeds[bid]?.dogName ?? null;
      const ownerId = breeds[bid]?.ownerId;
      if (was == null && now != null && now.length > 0 && ownerId) {
        setNameReveal({
          dogName: now,
          ownerName: gameState.players.find((p) => p.id === ownerId)?.name ?? '—',
          breedLabel: NAME_IT_BREED_LABELS[bid],
          imageId: NAME_IT_BREED_FACE_IMAGE_IDS[bid],
        });
        break;
      }
    }

    prevBreedsDogName.current = snapshot();
  }, [gameState.breeds, gameState.phase, gameState.players]);

  useEffect(() => {
    if (!nameReveal) return;
    fireNameItDogNamedConfetti();
    const t = window.setTimeout(() => setNameReveal(null), NAME_REVEAL_MODAL_MS);
    return () => window.clearTimeout(t);
  }, [nameReveal]);

  useEffect(() => {
    if (breedWrongCooldownUntil == null) return;
    const until = breedWrongCooldownUntil;
    const id = window.setInterval(() => {
      setBreedWrongCooldownTick((x) => x + 1);
      if (Date.now() >= until) {
        window.clearInterval(id);
        setBreedWrongCooldownUntil(null);
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [breedWrongCooldownUntil]);

  useEffect(() => {
    if (ownerPickWrongCooldownUntil == null) return;
    const until = ownerPickWrongCooldownUntil;
    const id = window.setInterval(() => {
      setOwnerPickWrongCooldownTick((x) => x + 1);
      if (Date.now() >= until) {
        window.clearInterval(id);
        setOwnerPickWrongCooldownUntil(null);
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [ownerPickWrongCooldownUntil]);

  useEffect(() => {
    if (guessWrongCooldownUntil == null) return;
    const until = guessWrongCooldownUntil;
    const id = window.setInterval(() => {
      setGuessWrongCooldownTick((x) => x + 1);
      if (Date.now() >= until) {
        window.clearInterval(id);
        setGuessWrongCooldownUntil(null);
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [guessWrongCooldownUntil]);

  useEffect(() => {
    if (remoteError && ar?.subPhase === 'race_dog_name') {
      setGuessWrongCooldownUntil(Date.now() + WRONG_PICK_COOLDOWN_MS);
    }
  }, [remoteError, ar?.subPhase]);

  useEffect(() => {
    setBreedWrongCooldownUntil(null);
    setOwnerPickWrongCooldownUntil(null);
    setGuessWrongCooldownUntil(null);
  }, [ar?.card.id, ar?.subPhase]);

  useEffect(() => {
    if (ar?.subPhase !== 'race_dog_name') return;
    setGuessDraft('');
    const raf = window.requestAnimationFrame(() => {
      guessNameInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [ar?.card.id, ar?.subPhase]);

  const ownerPickPlayersSig = gameState.players.map((p) => `${p.id}:${p.name}`).join('|');
  const ownerPickButtonOrder = useMemo(() => {
    if (!ar || ar.subPhase !== 'race_owner_display_name') return [];
    const list = [...gameState.players];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [ar?.card.id, ar?.subPhase, ownerPickPlayersSig]); // eslint-disable-line react-hooks/exhaustive-deps -- ownerPickPlayersSig = id+name

  const guessDogSlotConfig = useMemo(() => {
    if (!ar || ar.subPhase !== 'race_dog_name') return null;
    const breed = ar.answerBreed ?? ar.card.breed;
    const dn = breed ? gameState.breeds[breed]?.dogName : undefined;
    if (!dn) {
      return {
        slotCount: DOG_NAME_MAX_GRAPHEMES,
        sanitize: (raw: string) => sanitizeGuessDogNameDraft(raw, DOG_NAME_MAX_GRAPHEMES),
      };
    }
    const slotCount = Math.min(
      DOG_NAME_MAX_GRAPHEMES,
      Math.max(1, splitGraphemes(dn).length),
    );
    return {
      slotCount,
      sanitize: (raw: string) => sanitizeGuessDogNameDraft(raw, slotCount),
    };
  }, [ar, gameState.breeds]);

  const send = (a: NameItAction) => sendAction(a);

  const submitOwnerDogName = () => {
    if (!ar || ar.subPhase !== 'owner_naming') return;
    const breed = ar.answerBreed ?? ar.card.breed;
    if (!breed) return;
    const v = validateDogNameClient(nameDraft);
    if (!v) return;
    send({ type: 'submit_dog_name', name: v });
    setNameDraft('');
  };

  useEffect(() => {
    if (gameState.phase !== 'game_over') return;
    return startWinCelebrationLoop();
  }, [gameState.phase]);

  const isPlaying = gameState.phase === 'playing';
  const gameOver =
    gameState.phase === 'game_over' && gameState.result != null ? gameState.result : null;

  const gameOverWinnerNames = useMemo(() => {
    if (!gameOver) return [];
    return gameOver.winners.map(
      (id) => gameState.players.find((p) => p.id === id)?.name ?? id,
    );
  }, [gameOver, gameState.players]);

  const canDraw = isPlaying && gameState.drawerId === myId && !ar;

  const isRaceBreedFirstClaim = Boolean(
    ar && ar.subPhase === 'race_breed' && ar.deadlineMs == null,
  );
  const breedWrongCooldownActive =
    isRaceBreedFirstClaim &&
    breedWrongCooldownUntil != null &&
    Date.now() < breedWrongCooldownUntil;
  const breedWrongCooldownSecs = breedWrongCooldownUntil
    ? Math.max(0, Math.ceil((breedWrongCooldownUntil - Date.now()) / 1000))
    : 0;
  const breedWrongCooldownFill =
    breedWrongCooldownActive && breedWrongCooldownUntil != null
      ? Math.max(0, Math.min(1, (breedWrongCooldownUntil - Date.now()) / WRONG_PICK_COOLDOWN_MS))
      : 0;

  const isRaceOwnerPick = Boolean(ar && ar.subPhase === 'race_owner_display_name');
  const ownerPickWrongCooldownActive =
    isRaceOwnerPick &&
    ownerPickWrongCooldownUntil != null &&
    Date.now() < ownerPickWrongCooldownUntil;
  const ownerPickWrongCooldownSecs = ownerPickWrongCooldownUntil
    ? Math.max(0, Math.ceil((ownerPickWrongCooldownUntil - Date.now()) / 1000))
    : 0;
  const ownerPickWrongCooldownFill =
    ownerPickWrongCooldownActive && ownerPickWrongCooldownUntil != null
      ? Math.max(
          0,
          Math.min(1, (ownerPickWrongCooldownUntil - Date.now()) / WRONG_PICK_COOLDOWN_MS),
        )
      : 0;

  const isRaceDogNameGuess = Boolean(ar && ar.subPhase === 'race_dog_name');
  const guessDogWrongCooldownActive =
    isRaceDogNameGuess &&
    guessWrongCooldownUntil != null &&
    Date.now() < guessWrongCooldownUntil;
  const guessDogWrongCooldownSecs = guessWrongCooldownUntil
    ? Math.max(0, Math.ceil((guessWrongCooldownUntil - Date.now()) / 1000))
    : 0;
  const guessDogWrongCooldownFill =
    guessDogWrongCooldownActive && guessWrongCooldownUntil != null
      ? Math.max(0, Math.min(1, (guessWrongCooldownUntil - Date.now()) / WRONG_PICK_COOLDOWN_MS))
      : 0;

  const glutaWrongUntilMs = ar?.glutaWrongUntil?.[myId];
  const isRaceGluta = Boolean(ar && ar.subPhase === 'race_gluta');
  const glutaWrongCooldownActive =
    isRaceGluta && glutaWrongUntilMs != null && Date.now() < glutaWrongUntilMs;
  const glutaWrongCooldownSecs = glutaWrongUntilMs
    ? Math.max(0, Math.ceil((glutaWrongUntilMs - Date.now()) / 1000))
    : 0;
  const glutaWrongCooldownFill =
    glutaWrongCooldownActive && glutaWrongUntilMs != null
      ? Math.max(0, Math.min(1, (glutaWrongUntilMs - Date.now()) / WRONG_PICK_COOLDOWN_MS))
      : 0;

  const pickBreed = (bid: NameItBreedId) => {
    if (!ar || ar.subPhase !== 'race_breed') return;
    if (ar.deadlineMs == null) {
      if (breedWrongCooldownUntil != null && Date.now() < breedWrongCooldownUntil) return;
      if (bid !== ar.card.breed) {
        setBreedWrongCooldownUntil(Date.now() + WRONG_PICK_COOLDOWN_MS);
        return;
      }
    }
    send({ type: 'pick_breed', breed: bid });
  };

  const pickOwnerDisplayGuess = (playerId: string) => {
    if (!ar || ar.subPhase !== 'race_owner_display_name') return;
    if (ownerPickWrongCooldownUntil != null && Date.now() < ownerPickWrongCooldownUntil) return;
    const breed = ar.answerBreed ?? ar.card.breed;
    if (!breed) return;
    const correctOwnerId = gameState.breeds[breed]?.ownerId;
    if (!correctOwnerId) return;
    if (playerId !== correctOwnerId) {
      setOwnerPickWrongCooldownUntil(Date.now() + WRONG_PICK_COOLDOWN_MS);
      return;
    }
    const p = gameState.players.find((x) => x.id === playerId);
    if (!p) return;
    send({ type: 'guess_text', text: p.name });
  };

  const submitGuessDogName = () => {
    if (!ar || ar.subPhase !== 'race_dog_name') return;
    if (guessDogWrongCooldownActive) return;
    onClearRemoteError?.();
    send({ type: 'guess_text', text: guessDraft });
  };

  return (
    <>
    <div className="page container flex flex-col gap-4">
      <div className="phase-header">
        <h1 className="name-it__page-title">Name It</h1>
      </div>

      {remoteError && (
        <p className="name-it__remote-error" role="alert">
          {remoteError}
        </p>
      )}

      <div className="name-it__layout">
        <div className="card name-it__panel name-it__panel--deck">
          <div className="name-it__deck-block">
            <h3 className="name-it__deck-heading">กองจั่ว</h3>
            <NameItDeckStack shuffleTick={deckShuffleTick} />
            <p className="name-it__deck-meta">
              การ์ดเหลือ <strong>{gameState.deckRemaining}</strong> ใบ
            </p>
            <p className="name-it__deck-meta">
              ผู้จั่วตอนนี้: <strong>{drawerName}</strong>
            </p>
            {gameState.lastEvent && <p className="name-it__last-event">{gameState.lastEvent}</p>}
          </div>
          <div className="name-it__actions">
            {canDraw && (
              <Button type="button" size="lg" onClick={() => send({ type: 'draw' })}>
                จั่วการ์ด
              </Button>
            )}
            {isPlaying && gameState.drawerId === myId && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => send({ type: 'toggle_breed_directory' })}
              >
                {gameState.breedDirectoryOpen ? 'ซ่อนรายชื่อสุนัข' : 'แสดงชื่อสุนัขทั้งหมด'}
              </Button>
            )}
          </div>
          {!canDraw && !ar && (
            <p className="name-it__hint-inline">
              รอผู้มีสิทธิ์จั่ว ({gameState.drawerId === myId ? 'คุณ' : 'คนอื่น'})
            </p>
          )}
        </div>

        <div className="card name-it__panel name-it__panel--players">
          <h3 className="name-it__players-heading">ผู้เล่น</h3>
          <div className="name-it__player-board">
            {gameState.players.map((p) => {
              const ownedBreeds = NAME_IT_BREEDS.filter(
                (bid) => gameState.breeds[bid]?.ownerId === p.id,
              );
              return (
                <div
                  key={p.id}
                  className={`name-it__player-box${p.id === gameState.drawerId ? ' name-it__player-box--drawer' : ''}${
                    p.id === myId ? ' name-it__player-box--me' : ''
                  }`}
                >
                  <div className="name-it__player-box-head">
                    <div className="name-it__player-box-identity">
                      <span className="name-it__player-box-name">
                        {p.name}
                        {p.id === myId ? ' (คุณ)' : ''}
                      </span>
                      {p.id === gameState.drawerId && (
                        <span className="name-it__player-box-badge">สิทธิ์จั่ว</span>
                      )}
                    </div>
                    <div className="name-it__player-box-score-wrap" aria-label="คะแนน">
                      <span className="name-it__player-box-score">{p.score}</span>
                      <span className="name-it__player-box-score-label">คะแนน</span>
                    </div>
                  </div>
                  {ownedBreeds.length === 0 ? (
                    <p className="name-it__player-box-empty">ยังไม่มีสุนัข</p>
                  ) : (
                    <div className="name-it__player-dogs">
                      {ownedBreeds.map((bid) => {
                        const st = gameState.breeds[bid];
                        const label = NAME_IT_BREED_LABELS[bid];
                        const imageId = NAME_IT_BREED_FACE_IMAGE_IDS[bid];
                        return (
                          <div key={bid} className="name-it__player-dog-tile">
                            <img
                              className="name-it__player-dog-img"
                              src={cardUrl(gameState.imageBase, imageId)}
                              alt={label}
                              loading="lazy"
                            />
                            <span className="name-it__player-dog-breed">{label}</span>
                            {gameState.breedDirectoryOpen && st?.dogName ? (
                              <span className="name-it__player-dog-nickname">«{st.dogName}»</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isPlaying && ar && (
        <>
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="การ์ดที่จั่ว">
            <div className="modal name-it__play-modal" onClick={(e) => e.stopPropagation()}>
              {secs !== null && <div className="name-it__countdown">{secs}s</div>}
              <img
                className="name-it__card-img"
                src={cardUrl(gameState.imageBase, ar.card.imageId)}
                alt="การ์ด"
              />

              {ar.card.kind === 'special_gollum' && ar.gollumReplay && (
                <p className="name-it__gollum-hint">{gollumReplayLabel(ar.gollumReplay)}</p>
              )}

              {ar.subPhase === 'race_cat' && (
                <p className="name-it__hint name-it__special-cat-hint">
                  ใต้รูปการ์ดนี้: มองหาไอคอนแมวที่ลอยอยู่บนภาพการ์ด แล้วแข่งกันกดให้เร็วที่สุดภายในเวลานับถอยหลัง — คนกดก่อนได้ +1 คะแนน
                </p>
              )}

              {ar.subPhase === 'race_breed' && (
                <>
                  <p className="name-it__hint">
                    กดปุ่มให้ตรงกับสายพันธุ์ในภาพ (ครั้งแรกของสายพันธุ์นี้)
                    {ar.deadlineMs == null ? ' — ไม่จำกัดเวลา' : ''}
                  </p>
                  {breedWrongCooldownActive && (
                    <div
                      className="name-it__breed-wrong-cooldown"
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      <div className="name-it__breed-wrong-cooldown__track" aria-hidden>
                        <div
                          className="name-it__breed-wrong-cooldown__fill"
                          style={{
                            width: `${breedWrongCooldownFill * 100}%`,
                          }}
                        />
                      </div>
                      <p className="name-it__breed-wrong-cooldown__text">
                        กดผิดสายพันธุ์ — รอก่อนกดใหม่{' '}
                        <strong className="name-it__breed-wrong-cooldown__secs">
                          {breedWrongCooldownSecs}
                        </strong>{' '}
                        วินาที
                      </p>
                    </div>
                  )}
                  <div className="name-it__breed-buttons">
                    {ar.breedButtonOrder.map((bid) => (
                      <button
                        key={bid}
                        type="button"
                        className="name-it__breed-btn"
                        disabled={breedWrongCooldownActive}
                        onClick={() => pickBreed(bid)}
                      >
                        <BreedPickButtonContent bid={bid} />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {ar.subPhase === 'owner_naming' && (
                <>
                  <p className="name-it__hint">
                    {ar.pendingOwnerId === myId
                      ? 'ตั้งชื่อสุนัข (ไทย/อังกฤษ ไม่มีเลขหรืออักขระพิเศษ) สูงสุด 10 ตัวอักษร'
                      : `รอ ${gameState.players.find((p) => p.id === ar.pendingOwnerId)?.name ?? ''} ตั้งชื่อ…`}
                  </p>
                  {ar.pendingOwnerId === myId && (
                    <div className="name-it__input-row name-it__input-row--owner-name">
                      <DogNameSlotInput
                        value={nameDraft}
                        onChange={setNameDraft}
                        inputRef={ownerNameInputRef}
                        onEnter={submitOwnerDogName}
                      />
                      <Button
                        type="button"
                        className="name-it__owner-name-submit"
                        onClick={submitOwnerDogName}
                      >
                        ยืนยันชื่อ
                      </Button>
                    </div>
                  )}
                </>
              )}

              {ar.subPhase === 'race_dog_name' && guessDogSlotConfig && (
                <>
                  <p className="name-it__hint">
                    {ar.card.kind === 'special_gollum'
                      ? 'พิมพ์ชื่อสุนัขให้ตรงกับรอบก่อน (ผิดแล้วรอ 2 วินาที)'
                      : 'พิมพ์ชื่อสุนัขให้ตรงก่อน (ผิดแล้วรอ 2 วินาที) — ช่องแสดงความยาวคำตอบ'}
                  </p>
                  {guessDogWrongCooldownActive && (
                    <div
                      className="name-it__breed-wrong-cooldown"
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      <div className="name-it__breed-wrong-cooldown__track" aria-hidden>
                        <div
                          className="name-it__breed-wrong-cooldown__fill"
                          style={{
                            width: `${guessDogWrongCooldownFill * 100}%`,
                          }}
                        />
                      </div>
                      <p className="name-it__breed-wrong-cooldown__text">
                        พิมพ์ผิด — รอก่อนส่งใหม่{' '}
                        <strong className="name-it__breed-wrong-cooldown__secs">
                          {guessDogWrongCooldownSecs}
                        </strong>{' '}
                        วินาที
                      </p>
                    </div>
                  )}
                  <div className="name-it__input-row name-it__input-row--owner-name">
                    <DogNameSlotInput
                      value={guessDraft}
                      onChange={setGuessDraft}
                      inputRef={guessNameInputRef}
                      onEnter={submitGuessDogName}
                      slotCount={guessDogSlotConfig.slotCount}
                      sanitize={guessDogSlotConfig.sanitize}
                      readOnly={guessDogWrongCooldownActive}
                      wrapperClassName={
                        guessDogWrongCooldownActive ? 'name-it__slot-input--wrong' : undefined
                      }
                      aria-label="พิมพ์ชื่อสุนัข"
                    />
                    <Button
                      type="button"
                      className="name-it__owner-name-submit"
                      disabled={guessDogWrongCooldownActive}
                      onClick={submitGuessDogName}
                    >
                      ส่ง
                    </Button>
                  </div>
                </>
              )}

              {ar.subPhase === 'race_owner_display_name' && (
                <>
                  <p className="name-it__hint">
                    {ar.card.kind === 'special_gollum'
                      ? 'กดชื่อผู้เล่นที่เป็นเจ้าของสุนัขให้ตรงกับรอบก่อน (กดผิดรอ 2 วินาที)'
                      : 'กดชื่อผู้เล่นที่เป็นเจ้าของสุนัขในรูป (ชื่อในเกม) — กดผิดรอ 2 วินาที'}
                  </p>
                  {ownerPickWrongCooldownActive && (
                    <div
                      className="name-it__breed-wrong-cooldown"
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      <div className="name-it__breed-wrong-cooldown__track" aria-hidden>
                        <div
                          className="name-it__breed-wrong-cooldown__fill"
                          style={{
                            width: `${ownerPickWrongCooldownFill * 100}%`,
                          }}
                        />
                      </div>
                      <p className="name-it__breed-wrong-cooldown__text">
                        กดผิดผู้เล่น — รอก่อนกดใหม่{' '}
                        <strong className="name-it__breed-wrong-cooldown__secs">
                          {ownerPickWrongCooldownSecs}
                        </strong>{' '}
                        วินาที
                      </p>
                    </div>
                  )}
                  <div className="name-it__breed-buttons">
                    {ownerPickButtonOrder.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="name-it__breed-btn"
                        disabled={ownerPickWrongCooldownActive}
                        onClick={() => pickOwnerDisplayGuess(p.id)}
                      >
                        {p.name}
                        {p.id === myId ? ' (คุณ)' : ''}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {ar.subPhase === 'race_gluta' && ar.glutaBreeds && (
                <>
                  <p className="name-it__hint">
                    เจ้าของสุนัข: กดปุ่มพันธุ์ที่ตัวเองเป็นเจ้าของครบ · คนอื่นกดแล้ว -1 · กดพันธุ์ผิดรอ{' '}
                    {WRONG_PICK_COOLDOWN_MS / 1000} วินาที
                  </p>
                  {glutaWrongCooldownActive && (
                    <div
                      className="name-it__breed-wrong-cooldown"
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      <div className="name-it__breed-wrong-cooldown__track" aria-hidden>
                        <div
                          className="name-it__breed-wrong-cooldown__fill"
                          style={{
                            width: `${glutaWrongCooldownFill * 100}%`,
                          }}
                        />
                      </div>
                      <p className="name-it__breed-wrong-cooldown__text">
                        กดพันธุ์ผิด — รอก่อนกดใหม่{' '}
                        <strong className="name-it__breed-wrong-cooldown__secs">
                          {glutaWrongCooldownSecs}
                        </strong>{' '}
                        วินาที
                      </p>
                    </div>
                  )}
                  <div className="name-it__breed-buttons">
                    {ar.glutaBreeds.map((bid) => (
                      <button
                        key={bid}
                        type="button"
                        className="name-it__breed-btn"
                        disabled={glutaWrongCooldownActive}
                        onClick={() => send({ type: 'gluta_pick', breed: bid })}
                      >
                        <BreedPickButtonContent bid={bid} />
                      </button>
                    ))}
                  </div>
                  {ar.glutaProgress && Object.keys(ar.glutaProgress).length > 0 && (
                    <p className="name-it__hint" style={{ fontSize: '0.8rem' }}>
                      ความคืบหน้า:{' '}
                      {Object.entries(ar.glutaProgress)
                        .map(
                          ([pid, breeds]) =>
                            `${gameState.players.find((p) => p.id === pid)?.name ?? pid}: ${breeds.join(', ')}`,
                        )
                        .join(' · ')}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {ar.subPhase === 'race_cat' && ar.catPos && (
            <div className="name-it__tap-layer">
              <button
                type="button"
                className="name-it__tap-fab"
                style={{
                  left: `${ar.catPos.x * 100}%`,
                  top: `${ar.catPos.y * 100}%`,
                }}
                onClick={() => send({ type: 'tap_cat' })}
                aria-label="กดแมว"
              >
                🐱
              </button>
            </div>
          )}
        </>
      )}

      {nameReveal && (
        <div
          className="modal-overlay name-it__name-reveal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="name-it-reveal-title"
        >
          <div className="modal name-it__name-reveal-modal" onClick={(e) => e.stopPropagation()}>
            <p className="name-it__name-reveal-kicker">ตั้งชื่อสำเร็จ</p>
            <img
              className="name-it__name-reveal-img"
              src={cardUrl(gameState.imageBase, nameReveal.imageId)}
              alt=""
            />
            <h2 id="name-it-reveal-title" className="name-it__name-reveal-dog">
              {nameReveal.dogName}
            </h2>
            <p className="name-it__name-reveal-breed">{nameReveal.breedLabel}</p>
            <p className="name-it__name-reveal-owner">
              เจ้าของ: <strong>{nameReveal.ownerName}</strong>
            </p>
          </div>
        </div>
      )}

      {gameState.breedDirectoryOpen && (
        <div className="name-it__directory-overlay" role="dialog" aria-label="รายชื่อสุนัขทั้งหมด">
          <div className="name-it__directory-panel">
            <div className="name-it__directory-head">
              <h2>ชื่อสุนัขทั้งหมด</h2>
              {gameState.drawerId === myId && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => send({ type: 'toggle_breed_directory' })}
                >
                  ปิด
                </Button>
              )}
            </div>
            <div className="name-it__directory-table-wrap">
              <table className="name-it__directory-table">
                <thead>
                  <tr>
                    <th scope="col">พันธุ์สุนัข</th>
                    <th scope="col">ชื่อ</th>
                    <th scope="col">เจ้าของ</th>
                  </tr>
                </thead>
                <tbody>
                  {NAME_IT_BREEDS.map((bid) => {
                    const st = gameState.breeds[bid];
                    const owner = st?.ownerId
                      ? gameState.players.find((x) => x.id === st.ownerId)
                      : null;
                    return (
                      <tr key={bid}>
                        <td>{NAME_IT_BREED_LABELS[bid]}</td>
                        <td>
                          {st?.dogName ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td>
                          {owner?.name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {gameState.drawerId !== myId && (
              <p className="name-it__hint-inline" style={{ marginTop: 12 }}>
                ปิดแผงได้เฉพาะผู้มีสิทธิ์จั่ว
              </p>
            )}
          </div>
        </div>
      )}

      <div className="name-it__leave-row">
        <Button type="button" variant="danger" onClick={onLeave}>
          ออกจากห้อง
        </Button>
      </div>
    </div>

    {gameOver && (
      <div
        className="modal-overlay name-it__game-over-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-it-over-title"
      >
        <div className="modal name-it__game-over-modal" onClick={(e) => e.stopPropagation()}>
          <p className="name-it__game-over-kicker" id="name-it-over-title">
            🏆 เกมจบแล้ว
          </p>

          <div className="name-it__game-over-hero" aria-live="polite">
            <p className="name-it__game-over-hero-label">ผู้ชนะ</p>
            <p className="name-it__game-over-hero-names">
              {gameOverWinnerNames.length > 0
                ? gameOverWinnerNames.join(' · ')
                : '—'}
            </p>
          </div>

          <p className="name-it__game-over-reason">{gameOver.reason}</p>

          <h3 className="name-it__game-over-scores-heading">คะแนนรวม</h3>
          <div className="name-it__score-list">
            {gameState.players.map((p) => {
              const won = gameOver.winners.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={`name-it__score-row${won ? ' name-it__score-row--winner' : ''}`}
                >
                  <span>
                    {p.name}
                    {won ? <span className="name-it__score-winner-badge">ชนะ</span> : null}
                  </span>
                  <strong>{gameOver.scores[p.id] ?? 0}</strong>
                </div>
              );
            })}
          </div>

          <div className="name-it__game-over-actions">
            {onRestart ? (
              <Button type="button" block variant="secondary" size="lg" onClick={onRestart}>
                เล่นใหม่
              </Button>
            ) : (
              <p className="name-it__game-over-wait-host">รอหัวห้องกด «เล่นใหม่» เพื่อเริ่มรอบใหม่ในห้องนี้</p>
            )}
            <Button type="button" block variant="primary" size="lg" onClick={onLeave}>
              กลับห้อง
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
