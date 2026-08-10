import type { HuesAndCuesAction, HuesAndCuesPlayerView } from 'shared';
import { GamePhasePanel, GameWaitingState } from '../../../components/game-shell';
import { Button, Input } from '../../../components/ui';
import { clue2Placehold } from '../lib/phaseCopy';
import { HuesCueTargetHero } from './HuesCueTargetHero';

type Props = {
  gs: HuesAndCuesPlayerView;
  clue1Draft: string;
  clue2Word1: string;
  clue2Word2: string;
  setClue1Draft: (v: string) => void;
  setClue2Word1: (v: string) => void;
  setClue2Word2: (v: string) => void;
  send: (a: HuesAndCuesAction) => void;
};

export function HuesClueSection({
  gs,
  clue1Draft,
  clue2Word1,
  clue2Word2,
  setClue1Draft,
  setClue2Word1,
  setClue2Word2,
  send,
}: Props) {
  const showTarget =
    gs.amCueGiver && gs.phase === 'playing' && gs.target != null && gs.targetHex != null;

  return (
    <div className={`hac-action-strip${showTarget ? ' hac-action-strip--split' : ''}`}>
      {showTarget ? (
        <aside className="hac-action-strip__aside">
          <HuesCueTargetHero gs={gs} />
        </aside>
      ) : null}

      <div className="hac-action-strip__main">
        {gs.clue1 ? (
          <div className="hac-clues-showcase" aria-labelledby="hac-clues-heading">
            <div id="hac-clues-heading" className="hac-clues-showcase__title">
              คำใบ้ของรอบนี้
            </div>
            <div className="hac-clues-showcase__grid">
              <div className="hac-clue-card">
                <div className="hac-clue-card__label">คำใบ้ที่ 1</div>
                <div className="hac-clue-card__text" lang="th">
                  {gs.clue1}
                </div>
                <div className="hac-clue-card__hint">หนึ่งคำ</div>
              </div>
              <div className={`hac-clue-card${gs.clue2 ? '' : ' hac-clue-card--waiting'}`}>
                <div className="hac-clue-card__label">คำใบ้ที่ 2</div>
                <div className="hac-clue-card__text" lang="th">
                  {clue2Placehold(gs)}
                </div>
                <div className="hac-clue-card__hint">หนึ่ง–สองคำ</div>
              </div>
            </div>
          </div>
        ) : null}

        {gs.amCueGiver && gs.subPhase === 'clue1' ? (
          <GamePhasePanel
            title="ส่งคำใบ้แรก (หนึ่งคำ)"
            description="ห้ามใช้ชื่อสีพื้นฐาน"
            density="compact"
            actionsPlacement="footer"
            actions={
              <Button
                type="button"
                disabled={!clue1Draft.trim()}
                onClick={() => send({ type: 'submit_clue1', text: clue1Draft })}
              >
                ส่งคำใบ้
              </Button>
            }
          >
            <Input
              value={clue1Draft}
              onChange={(e) => setClue1Draft(e.target.value)}
              placeholder="เช่น มะนาว"
              aria-label="คำใบ้หนึ่งคำ"
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                clue1Draft.trim() &&
                send({ type: 'submit_clue1', text: clue1Draft })
              }
            />
          </GamePhasePanel>
        ) : null}

        {gs.amCueGiver && gs.subPhase === 'clue2' ? (
          <GamePhasePanel
            title="ส่งคำใบ้ที่สอง (1–2 คำ)"
            description="ห้ามชื่อสีพื้นฐาน · ข้าม = ผู้ทายไม่วางรอบ 2"
            density="compact"
            actionsPlacement="footer"
            actions={
              <>
                <Button
                  type="button"
                  disabled={!clue2Word1.trim()}
                  onClick={() => {
                    const text = clue2Word2.trim()
                      ? `${clue2Word1.trim()} ${clue2Word2.trim()}`
                      : clue2Word1.trim();
                    send({ type: 'submit_clue2', text });
                  }}
                >
                  ส่งคำใบ้
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => send({ type: 'skip_clue2' })}
                >
                  ข้าม (ไม่ทายรอบ 2)
                </Button>
              </>
            }
          >
            <div className="hac-clue2-pair">
              <Input
                value={clue2Word1}
                onChange={(e) => setClue2Word1(e.target.value)}
                placeholder="คำแรก (จำเป็น)"
                aria-label="คำใบ้รอบสอง คำแรก"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (!clue2Word1.trim()) return;
                  const text = clue2Word2.trim()
                    ? `${clue2Word1.trim()} ${clue2Word2.trim()}`
                    : clue2Word1.trim();
                  send({ type: 'submit_clue2', text });
                }}
              />
              <Input
                value={clue2Word2}
                onChange={(e) => setClue2Word2(e.target.value)}
                placeholder="คำที่สอง (ไม่บังคับ)"
                aria-label="คำใบ้รอบสอง คำที่สอง ไม่บังคับ"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (!clue2Word1.trim()) return;
                  const text = clue2Word2.trim()
                    ? `${clue2Word1.trim()} ${clue2Word2.trim()}`
                    : clue2Word1.trim();
                  send({ type: 'submit_clue2', text });
                }}
              />
            </div>
          </GamePhasePanel>
        ) : null}

        {!gs.amCueGiver && gs.subPhase === 'pick_target' ? (
          <GameWaitingState surface="panel">
            รอ {gs.playerNames[gs.cueGiverId] ?? 'ผู้ให้คำใบ้'} เลือกสีจากบัตร…
          </GameWaitingState>
        ) : null}

        {!gs.amCueGiver && gs.subPhase === 'clue1' ? (
          <GameWaitingState surface="panel">รอผู้ให้คำใบ้ส่งคำแรก…</GameWaitingState>
        ) : null}
        {!gs.amCueGiver && gs.subPhase === 'clue2' ? (
          <GameWaitingState surface="panel">
            รอผู้ให้คำใบ้ส่งคำที่สอง หรือข้าม (ข้าม = ไม่ทายรอบ 2)
          </GameWaitingState>
        ) : null}

        {gs.amCueGiver && (gs.subPhase === 'guess1' || gs.subPhase === 'guess2') ? (
          <GameWaitingState
            surface="panel"
            progress={
              gs.subPhase === 'guess1'
                ? { current: gs.progress.guess1Done, total: gs.progress.guess1Total }
                : { current: gs.progress.guess2Done, total: gs.progress.guess2Total }
            }
          >
            ผู้ทายกำลังวางมาร์กเกอร์…
          </GameWaitingState>
        ) : null}
      </div>
    </div>
  );
}
