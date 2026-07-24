import { useState } from 'react';
import type { SkyTeamPlayerView } from 'shared';
import { GameOverModal } from '../../../components/game-shell';
import { Button } from '../../../components/ui';
import { SkyTeamDieFace } from './SkyTeamDice';

type GameOverProps = {
  view: SkyTeamPlayerView;
  onLeave: () => void;
  onRestart?: () => void;
};

export function SkyTeamGameOver({ view, onLeave, onRestart }: GameOverProps) {
  const won = view.winReason === 'landed';
  return (
    <GameOverModal
      titleId="st-gameover-title"
      onLeave={onLeave}
      onRestart={onRestart}
      celebrate={won}
    >
      <h2 id="st-gameover-title">{won ? 'ลงจอดสำเร็จ!' : 'ภารกิจล้มเหลว'}</h2>
      <p className="st-gameover-msg">
        {view.gameResult?.reason ?? (won ? 'ผู้โดยสารปรบมือ' : 'ลองใหม่')}
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
    view.myRole === 'pilot'
      ? view.rerollPending?.pilotDieIds
      : view.rerollPending?.copilotDieIds;
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
