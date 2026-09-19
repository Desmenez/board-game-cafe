import { useMemo } from 'react';
import type { CodenamesAction, CodenamesPlayerView } from 'shared';
import { GameDecisionActions, GamePhasePanel } from '../../../components/game-shell';
import { Button, Input } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { cnTeamName } from '../art';

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

  const canGiveClue = view.phase === 'playing' && view.canAct && view.turnStage === 'clue';
  const canGuess = view.phase === 'playing' && view.canAct && view.turnStage === 'guess';
  const myPendingGuessCardIndex = view.pendingGuessByPlayer[view.myId];
  const canConfirmConsensusGuess =
    canGuess && view.consensusGuessCardIndex !== undefined && myPendingGuessCardIndex !== undefined;

  if (canGiveClue) {
    const red = view.turnTeam === 'red';
    const submit = () => {
      if (parsedClueCount === null || !clueWord.trim()) return;
      send({ type: 'give_clue', clueWord, clueCount: parsedClueCount });
      setClueWord('');
    };
    return (
      <section
        className={cn(
          'rounded-card border px-3 py-2.5',
          red
            ? 'border-red-400/55 bg-gradient-to-br from-red-950/80 to-zinc-950/90'
            : 'border-sky-400/55 bg-gradient-to-br from-sky-950/80 to-zinc-950/90',
        )}
      >
        <div className="mb-2 flex items-baseline gap-2">
          <h2 className="font-display text-sm font-extrabold tracking-[-0.02em] text-ink md:text-base">
            ให้คำใบ้
          </h2>
          <span className={cn('text-xs font-bold', red ? 'text-red-300' : 'text-sky-300')}>
            {cnTeamName(view.turnTeam)}
          </span>
        </div>
        <div className="flex flex-wrap items-stretch gap-2">
          <Input
            className="min-w-0 flex-1"
            value={clueWord}
            onChange={(event) => setClueWord(event.target.value)}
            placeholder={view.boardVariant === 'pictures' ? 'สิ่งที่เห็นในรูป' : 'คำใบ้ 1 คำ'}
            aria-label="คำใบ้"
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
          <Input
            className="w-16"
            type="number"
            min={1}
            max={9}
            inputMode="numeric"
            aria-label={
              view.boardVariant === 'pictures' ? 'จำนวนรูปที่เกี่ยวข้อง' : 'จำนวนคำที่เกี่ยวข้อง'
            }
            value={clueCountInput}
            onChange={(event) => setClueCountInput(event.target.value)}
          />
          <Button
            type="button"
            variant={red ? 'danger' : 'secondary'}
            className={
              red ? undefined : '!border-sky-300/40 !bg-sky-600 !text-white hover:!bg-sky-500'
            }
            disabled={!clueWord.trim() || parsedClueCount === null}
            onClick={submit}
          >
            ส่ง
          </Button>
        </div>
      </section>
    );
  }

  if (canGuess) {
    return (
      <GamePhasePanel
        title="ลูกทีม Operative"
        description={
          view.boardVariant === 'pictures'
            ? 'แตะรูปเพื่อโหวตก่อนเปิดจริง ผู้เล่นทุกคนในทีมต้องเลือกใบเดียวกัน แล้วใครก็ได้กดปุ่มยืนยัน'
            : 'แตะคำเพื่อโหวตก่อนเปิดจริง ผู้เล่นทุกคนในทีมต้องเลือกคำเดียวกัน แล้วใครก็ได้กดปุ่มยืนยัน'
        }
        density="compact"
        meta={
          view.consensusGuessCardIndex !== undefined ? (
            <p className="font-bold text-success">พร้อมยืนยัน: ทุกคนเลือกตรงกันแล้ว</p>
          ) : (
            <p>
              รอให้ลูกทีมในเทิร์นนี้เลือก{view.boardVariant === 'pictures' ? 'รูป' : 'คำ'}
              เดียวกันก่อน
            </p>
          )
        }
      >
        <GameDecisionActions
          primary={{
            label:
              view.boardVariant === 'pictures'
                ? 'ยืนยันรูปที่เลือกตรงกัน'
                : 'ยืนยันคำที่เลือกตรงกัน',
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
