import { useCallback, useState } from 'react';
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

      {!won && failArt ? (
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
};

export function SkyTeamRerollDialog({ view, onConfirm }: RerollProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const myPending =
    view.myRole === 'pilot' ? view.rerollPending?.pilotDieIds : view.rerollPending?.copilotDieIds;
  const waiting = myPending != null;

  const toggle = (id: string) => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (!view.rerollPending) return null;

  return (
    <div className="st-reroll-overlay" role="dialog" aria-label="Reroll">
      <div className="st-reroll-card card">
        <h3>Reroll</h3>
        <p>เลือกลูกเต๋าในมือที่จะทอยใหม่ (หรือไม่เลือกเลยก็ได้)</p>
        {waiting ? (
          <p>รออีกฝ่ายยืนยัน…</p>
        ) : (
          <>
            <div className="st-dice-tray">
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
            <Button type="button" onClick={() => onConfirm(picked)}>
              ยืนยัน Reroll
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
