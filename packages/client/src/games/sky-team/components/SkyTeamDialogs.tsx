import { useCallback, useEffect, useRef, useState } from 'react';
import type { SkyTeamLoseReason, SkyTeamPlayerView, SkyTeamRole } from 'shared';
import { GameOverModal } from '../../../components/game-shell';
import { PlayerAvatar } from '../../../components/player-avatar';
import { Button } from '../../../components/ui';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { startSkyTeamCelebrationLoop } from '../../../utils/winCelebration';
import { SkyTeamDieFace } from './SkyTeamDice';

type GameOverProps = {
  view: SkyTeamPlayerView;
  onLeave: () => void;
  onRestart?: () => void;
};

const FAIL_TITLE: Record<SkyTeamLoseReason, string> = {
  axis_spin: 'เครื่องหมุน',
  collision: 'ชนเครื่องบิน',
  overshoot: 'เลยสนามบิน',
  missing_mandatory: 'ไม่ได้วาง Axis / Engines',
  crash_before_airport: 'ตกก่อนถึงสนามบิน',
  brake_fail: 'เบรกไม่พอ',
  incomplete_landing: 'ลงจอดไม่สำเร็จ',
  kerosene_empty: 'น้ำมันหมด',
  turn_constraint: 'เลี้ยวผิด',
  intern_untrained: 'ฝึก Intern ไม่ครบ',
  ice_brakes_incomplete: 'Ice Brakes ไม่ครบ',
};

const REROLL_SPIN_MS = 900;
const REROLL_TICK_MS = 70;

function CrewSeat({
  role,
  playerId,
  name,
  isMe,
  won,
}: {
  role: SkyTeamRole;
  playerId: string;
  name: string;
  isMe: boolean;
  won: boolean;
}) {
  const roleLabel = role === 'pilot' ? 'Pilot' : 'Co-Pilot';

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-2.5 py-2',
        role === 'pilot' ? 'border-sky-400/35' : 'border-orange-400/35',
        won ? 'bg-black/20' : 'bg-black/25',
        isMe && (role === 'pilot' ? 'ring-1 ring-sky-300/50' : 'ring-1 ring-orange-300/50'),
      )}
    >
      <PlayerAvatar playerId={playerId} name={name} size={40} className="shrink-0" />
      <div className="min-w-0 text-left">
        <p
          className={cn(
            'm-0 font-label text-[0.65rem] font-bold tracking-[0.08em] uppercase',
            role === 'pilot' ? 'text-sky-200' : 'text-orange-200',
          )}
        >
          {roleLabel}
          {isMe ? ' · คุณ' : ''}
        </p>
        <p className="m-0 truncate text-sm font-semibold text-white">{name}</p>
      </div>
    </div>
  );
}

export function SkyTeamGameOver({ view, onLeave, onRestart }: GameOverProps) {
  const won = view.winReason === 'landed';
  const loseReason = view.loseReason;
  const failArt =
    !won && loseReason != null ? imageMap.skyTeam.failScenarios[loseReason] : undefined;
  const failTitle = loseReason != null ? FAIL_TITLE[loseReason] : null;
  const detail = view.gameResult?.reason ?? (won ? 'ผู้โดยสารปรบมือ' : 'ลองใหม่');
  const startCelebration = useCallback(
    () => startSkyTeamCelebrationLoop(won ? 'win' : 'lose'),
    [won],
  );

  const pilot = view.players.find((p) => p.role === 'pilot');
  const copilot = view.players.find((p) => p.role === 'copilot');
  const pilotName = pilot?.name ?? 'Pilot';
  const copilotName = copilot?.name ?? 'Co-Pilot';

  return (
    <GameOverModal
      titleId="st-gameover-title"
      panelClassName={cn(
        'st-gameover-modal max-w-[22rem] sm:max-w-[26rem]',
        won ? 'st-gameover-modal--win' : 'st-gameover-modal--lose',
      )}
      overlayClassName={won ? undefined : 'st-gameover-overlay--lose'}
      onLeave={onLeave}
      onRestart={onRestart}
      celebrate
      tone={won ? 'win' : 'lose'}
      startCelebration={startCelebration}
    >
      <p
        className={cn(
          'm-0 mb-1.5 font-label text-[0.7rem] font-bold tracking-[0.14em] uppercase',
          won ? 'text-amber-200/80' : 'text-red-200/85',
        )}
      >
        {won ? 'Mission complete' : 'Mission failed'}
      </p>
      <h2
        id="st-gameover-title"
        className={cn(
          'm-0 text-center font-display text-2xl font-extrabold tracking-[-0.03em]',
          won ? 'text-amber-50' : 'text-red-50',
        )}
      >
        {won ? 'ลงจอดสำเร็จ!' : 'ภารกิจล้มเหลว'}
      </h2>

      {won ? (
        <figure className="mx-auto mt-4 mb-0 w-full max-w-68">
          <div className="overflow-hidden rounded-xl border border-amber-200/25 bg-black/25 shadow-[0_12px_32px_rgba(0,0,0,0.35)] ring-1 ring-amber-400/35">
            <img
              src={imageMap.skyTeam.cover}
              alt="Sky Team"
              className="block aspect-video w-full object-cover object-center"
              draggable={false}
            />
          </div>
        </figure>
      ) : failArt ? (
        <figure className="mx-auto mt-4 mb-0 w-full max-w-68">
          <div className="overflow-hidden rounded-xl border border-red-200/25 bg-black/25 shadow-[0_12px_32px_rgba(0,0,0,0.35)] ring-1 ring-red-500/30">
            <img
              src={failArt}
              alt={failTitle ?? 'สาเหตุที่แพ้'}
              className="block aspect-video w-full object-cover object-center"
              draggable={false}
            />
          </div>
          {failTitle ? (
            <figcaption className="mt-2.5 text-center text-[0.95rem] font-semibold tracking-tight text-red-50">
              {failTitle}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="mt-3.5 flex flex-col gap-2" aria-label="ลูกเรือ">
        <CrewSeat
          role="pilot"
          playerId={view.pilotId}
          name={pilotName}
          isMe={view.myRole === 'pilot'}
          won={won}
        />
        <CrewSeat
          role="copilot"
          playerId={view.copilotId}
          name={copilotName}
          isMe={view.myRole === 'copilot'}
          won={won}
        />
      </div>

      <p
        className={cn(
          'st-gameover-msg mx-auto mt-3 mb-0 max-w-[34ch] text-sm leading-relaxed',
          won ? 'text-amber-100/80' : 'text-red-100/80',
        )}
      >
        {detail}
      </p>
    </GameOverModal>
  );
}

type RerollProps = {
  view: SkyTeamPlayerView;
  onConfirm: (dieIds: string[]) => void;
  onCancel: () => void;
  /** Close after reveal (or cancel without confirm). */
  onClose: () => void;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Flicker faces while spinning, then settle on the rolled value. */
function RerollRevealDie({
  color,
  fromValue,
  toValue,
  spinning,
}: {
  color: 'blue' | 'orange';
  fromValue: number;
  toValue: number;
  spinning: boolean;
}) {
  const [face, setFace] = useState(fromValue);

  useEffect(() => {
    if (!spinning) {
      setFace(toValue);
      return;
    }
    if (prefersReducedMotion()) {
      setFace(toValue);
      return;
    }
    setFace(fromValue);
    const tick = window.setInterval(() => {
      setFace(1 + Math.floor(Math.random() * 6));
    }, REROLL_TICK_MS);
    return () => window.clearInterval(tick);
  }, [spinning, fromValue, toValue]);

  return (
    <div
      className={cn('st-die', `st-die--${color}`, spinning && 'st-die--rerolling')}
      aria-label={`${color} die ${spinning ? 'rolling' : toValue}`}
    >
      <span className="st-die__value" aria-hidden>
        {spinning ? face : toValue}
      </span>
    </div>
  );
}

export function SkyTeamRerollDialog({ view, onConfirm, onCancel, onClose }: RerollProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const [phase, setPhase] = useState<'pick' | 'wait' | 'reveal'>('pick');
  const [spinning, setSpinning] = useState(false);
  const [revealFrom, setRevealFrom] = useState<Record<string, number>>({});
  const [revealIds, setRevealIds] = useState<string[]>([]);

  const pending = view.rerollPending;
  const myPending = view.myRole === 'pilot' ? pending?.pilotDieIds : pending?.copilotDieIds;
  const partnerPending = view.myRole === 'pilot' ? pending?.copilotDieIds : pending?.pilotDieIds;
  const waiting = myPending != null;
  const partnerReady = partnerPending != null;
  const pickedCount = picked.length;

  const confirmedRef = useRef(false);
  const fromValuesRef = useRef<Record<string, number>>({});
  const pickedIdsRef = useRef<string[]>([]);
  const prevPendingRef = useRef(pending);

  const toggle = (id: string) => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleConfirm = () => {
    const from: Record<string, number> = {};
    for (const d of view.myDice) from[d.id] = d.value;
    fromValuesRef.current = from;
    pickedIdsRef.current = [...picked];
    confirmedRef.current = true;
    setPhase('wait');
    onConfirm(picked);
  };

  const handleCancel = () => {
    confirmedRef.current = false;
    onCancel();
    onClose();
  };

  // Sync wait UI if server already has our confirmation (reconnect / race).
  useEffect(() => {
    if (!pending || myPending == null || phase !== 'pick') return;
    if (Object.keys(fromValuesRef.current).length === 0) {
      const from: Record<string, number> = {};
      for (const d of view.myDice) from[d.id] = d.value;
      fromValuesRef.current = from;
      pickedIdsRef.current = [...myPending];
    }
    confirmedRef.current = true;
    setPhase('wait');
  }, [pending, myPending, phase, view.myDice]);

  // Pending cleared → reveal if we completed, otherwise dismiss (cancel).
  useEffect(() => {
    const hadPending = prevPendingRef.current != null;
    prevPendingRef.current = pending;
    if (!hadPending || pending != null) return;

    const completed = view.eventLog.at(-1)?.includes('Reroll เสร็จแล้ว') === true;
    if (confirmedRef.current && completed) {
      setRevealFrom(fromValuesRef.current);
      setRevealIds(pickedIdsRef.current);
      setPhase('reveal');
      setSpinning(true);
      return;
    }
    confirmedRef.current = false;
    onClose();
  }, [pending, view.eventLog, onClose]);

  useEffect(() => {
    if (phase !== 'reveal' || !spinning) return;
    const reduced = prefersReducedMotion();
    const t = window.setTimeout(() => setSpinning(false), reduced ? 0 : REROLL_SPIN_MS);
    return () => window.clearTimeout(t);
  }, [phase, spinning]);

  if (!pending && phase !== 'reveal') return null;

  return (
    <div
      className="st-reroll-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="st-reroll-title"
    >
      <div className="st-reroll-card">
        <header className="st-reroll-card__head">
          <img
            src={imageMap.skyTeam.rerollToken}
            alt=""
            className="st-reroll-card__token"
            draggable={false}
          />
          <div className="st-reroll-card__titles">
            <p className="st-reroll-card__eyebrow">
              {phase === 'reveal' ? 'ผลลัพธ์' : 'ทั้งคู่ต้องยืนยัน'}
            </p>
            <h3 id="st-reroll-title">Reroll</h3>
          </div>
        </header>

        {phase === 'reveal' ? (
          <>
            <p className="st-reroll-card__hint">
              {spinning
                ? 'กำลังทอยใหม่…'
                : revealIds.length > 0
                  ? 'ทอยเสร็จแล้ว — ดูผลแล้วกดปิด'
                  : 'ไม่ได้ทอยลูกใด — กดปิดได้'}
            </p>
            <div
              className="st-reroll-card__dice st-dice-tray"
              role="group"
              aria-label="ผลลัพธ์ Reroll"
              aria-live="polite"
            >
              {view.myDice.map((d) => {
                const didReroll = revealIds.includes(d.id);
                if (didReroll) {
                  return (
                    <RerollRevealDie
                      key={d.id}
                      color={d.color}
                      fromValue={revealFrom[d.id] ?? d.value}
                      toValue={d.value}
                      spinning={spinning}
                    />
                  );
                }
                return <SkyTeamDieFace key={d.id} value={d.value} color={d.color} />;
              })}
            </div>
            <div className="st-reroll-card__actions">
              <Button type="button" onClick={onClose} disabled={spinning}>
                ปิด
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="st-reroll-card__hint">
              แตะลูกเต๋าในมือที่จะทอยใหม่ — ไม่เลือกก็ได้ แล้วกดยืนยัน
            </p>

            <div className="st-reroll-card__status" aria-live="polite">
              <span
                className={cn(
                  'st-reroll-pill',
                  waiting ? 'st-reroll-pill--done' : 'st-reroll-pill--you',
                )}
              >
                คุณ: {waiting ? 'ยืนยันแล้ว' : 'กำลังเลือก'}
              </span>
              <span
                className={cn(
                  'st-reroll-pill',
                  partnerReady ? 'st-reroll-pill--done' : 'st-reroll-pill--wait',
                )}
              >
                คู่หู: {partnerReady ? 'ยืนยันแล้ว' : 'รออยู่'}
              </span>
            </div>

            {waiting ? (
              <p className="st-reroll-card__wait">รออีกฝ่ายยืนยัน…</p>
            ) : (
              <>
                <div
                  className="st-reroll-card__dice st-dice-tray"
                  role="group"
                  aria-label="ลูกเต๋าในมือ"
                >
                  {view.myDice.map((d) => (
                    <SkyTeamDieFace
                      key={d.id}
                      value={d.value}
                      color={d.color}
                      selected={picked.includes(d.id)}
                      onClick={() => toggle(d.id)}
                    />
                  ))}
                </div>
                <p className="st-reroll-card__pick">
                  {pickedCount === 0
                    ? 'ยังไม่เลือก — จะไม่ทอยใหม่'
                    : `เลือกแล้ว ${pickedCount} ลูก`}
                </p>
              </>
            )}

            <div className="st-reroll-card__actions">
              <Button type="button" variant="secondary" onClick={handleCancel}>
                ยกเลิก
              </Button>
              {!waiting && (
                <Button type="button" onClick={handleConfirm}>
                  ยืนยัน{pickedCount > 0 ? ` · ${pickedCount}` : ''}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
