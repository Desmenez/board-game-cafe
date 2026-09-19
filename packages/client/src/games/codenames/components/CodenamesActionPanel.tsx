import { useMemo } from 'react';
import type { CodenamesAction, CodenamesPlayerView } from 'shared';
import {
  GameDecisionActions,
  GamePhasePanel,
} from '../../../components/game-shell';
import { Button, Input } from '../../../components/ui';

type Props = {
  view: CodenamesPlayerView;
  clueWord: string;
  setClueWord: (value: string) => void;
  clueCountInput: string;
  setClueCountInput: (value: string) => void;
  send: (action: CodenamesAction) => void;
};

export function CodenamesActionPanel({
  view,
  clueWord,
  setClueWord,
  clueCountInput,
  setClueCountInput,
  send,
}: Props) {
  const parsedClueCount = useMemo(() => {
    const n = Number.parseInt(clueCountInput, 10);
    if (!Number.isFinite(n) || n < 1 || n > 9) return null;
    return n;
  }, [clueCountInput]);

  const canGiveClue = view.canAct && view.turnStage === 'clue';
  const canGuess = view.canAct && view.turnStage === 'guess';
  const myPendingGuessCardIndex = view.pendingGuessByPlayer[view.myId];
  const canConfirmConsensusGuess =
    canGuess &&
    view.consensusGuessCardIndex !== undefined &&
    myPendingGuessCardIndex !== undefined;

  if (canGiveClue) {
    return (
      <GamePhasePanel
        title="ให้คำใบ้"
        description="ส่ง 1 คำ + จำนวนคำที่ตั้งใจใบ้ — ห้ามใช้คำบนกระดาน"
        density="compact"
        actionsPlacement="footer"
        actions={
          <Button
            type="button"
            disabled={!clueWord.trim() || parsedClueCount === null}
            onClick={() => {
              if (parsedClueCount === null) return;
              send({ type: 'give_clue', clueWord, clueCount: parsedClueCount });
              setClueWord('');
            }}
          >
            ส่งคำใบ้
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-0 flex-1"
            value={clueWord}
            onChange={(event) => setClueWord(event.target.value)}
            placeholder="คำใบ้ 1 คำ"
            aria-label="คำใบ้"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && clueWord.trim() && parsedClueCount !== null) {
                send({ type: 'give_clue', clueWord, clueCount: parsedClueCount });
                setClueWord('');
              }
            }}
          />
          <Input
            className="w-20"
            type="number"
            min={1}
            max={9}
            inputMode="numeric"
            aria-label="จำนวนคำที่เกี่ยวข้อง"
            value={clueCountInput}
            onChange={(event) => setClueCountInput(event.target.value)}
          />
        </div>
      </GamePhasePanel>
    );
  }

  if (canGuess) {
    return (
      <GamePhasePanel
        title="ลูกทีม Operative"
        description="แตะคำเพื่อโหวตก่อนเปิดจริง ผู้เล่นทุกคนในทีมต้องเลือกคำเดียวกัน แล้วใครก็ได้กดปุ่มยืนยัน"
        density="compact"
        meta={
          view.consensusGuessCardIndex !== undefined ? (
            <p className="font-bold text-success">พร้อมยืนยัน: ทุกคนเลือกตรงกันแล้ว</p>
          ) : (
            <p>รอให้ลูกทีมในเทิร์นนี้เลือกคำเดียวกันก่อน</p>
          )
        }
      >
        <GameDecisionActions
          primary={{
            label: 'ยืนยันคำที่เลือกตรงกัน',
            onSelect: () => send({ type: 'confirm_guess' }),
            disabled: !canConfirmConsensusGuess,
          }}
          secondary={{
            label: 'จบการเดา',
            variant: 'secondary',
            onSelect: () => send({ type: 'end_guesses' }),
          }}
        />
      </GamePhasePanel>
    );
  }

  return null;
}
