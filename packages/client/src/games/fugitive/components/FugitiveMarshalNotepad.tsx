import { Check, Pencil } from 'lucide-react';
import { Button } from '../../../components/ui';

const NOTEPAD_ROWS = 6;
const NOTEPAD_NUMBERS = Array.from({ length: NOTEPAD_ROWS * 7 }, (_, i) => i + 1);

type Props = {
  noted: Set<number>;
  revealedNumbers: Set<number>;
  guessPicks: number[];
  noteTarget: number | null;
  multiSelect?: boolean;
  onSelectNumber: (n: number) => void;
  onGuess: () => void;
  onNote: () => void;
  onSkip: () => void;
  /** เลขสูงสุดที่ทายได้ (Marshal ปกติ = 41) */
  guessableMax?: number;
  canGuessAction?: boolean;
  canNoteAction?: boolean;
  showNoteAction?: boolean;
  canSkipAction?: boolean;
  showSkipAction?: boolean;
};

export function FugitiveMarshalNotepad({
  noted,
  revealedNumbers,
  guessPicks,
  noteTarget,
  multiSelect = false,
  onSelectNumber,
  onGuess,
  onNote,
  onSkip,
  guessableMax = 41,
  canGuessAction = false,
  canNoteAction = true,
  showNoteAction = true,
  canSkipAction = false,
  showSkipAction = true,
}: Props) {
  const guessPicksValid =
    guessPicks.length > 0 && guessPicks.every((n) => !revealedNumbers.has(n) && n <= guessableMax);
  const canGuess = canGuessAction && guessPicksValid;
  const canNote =
    canNoteAction && showNoteAction && noteTarget !== null && !revealedNumbers.has(noteTarget);
  const noteTargetNoted = noteTarget !== null && noted.has(noteTarget);
  const guessLabel =
    guessPicks.length > 0 ? ` (${[...guessPicks].sort((a, b) => a - b).join(', ')})` : '';

  return (
    <div className="fugitive-notepad-wrap">
      <div className="fugitive-notepad" role="group" aria-label="สมุดจดเลข hideout">
        <div className="fugitive-notepad__spiral" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="fugitive-notepad__ring" />
          ))}
        </div>
        <div className="fugitive-notepad__grid">
          {NOTEPAD_NUMBERS.map((n) => {
            const revealed = revealedNumbers.has(n);
            const isNoted = noted.has(n);
            const isPicked = guessPicks.includes(n);
            const isNoteTarget = noteTarget === n;
            const unavailable = !revealed && n > guessableMax;

            return (
              <button
                key={n}
                type="button"
                className={[
                  'fugitive-notepad__cell',
                  isPicked ? 'fugitive-notepad__cell--picked' : '',
                  isNoteTarget && !isPicked ? 'fugitive-notepad__cell--note-target' : '',
                  revealed ? 'fugitive-notepad__cell--revealed' : '',
                  isNoted && !revealed ? 'fugitive-notepad__cell--noted' : '',
                  unavailable ? 'fugitive-notepad__cell--unavailable' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={revealed || unavailable}
                aria-pressed={isPicked || isNoteTarget}
                aria-label={
                  revealed
                    ? `เลข ${n} ทายถูกแล้ว`
                    : isPicked
                      ? `เลข ${n} เลือกทาย`
                      : isNoted
                        ? `เลข ${n} จดไว้`
                        : unavailable
                          ? `เลข ${n} ทายไม่ได้`
                          : `เลข ${n}`
                }
                onClick={() => onSelectNumber(n)}
              >
                <span className="fugitive-notepad__num">{n}</span>
                {revealed ? (
                  <span
                    className="fugitive-notepad__badge fugitive-notepad__badge--correct"
                    aria-hidden
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                ) : isNoted ? (
                  <span
                    className="fugitive-notepad__badge fugitive-notepad__badge--note"
                    aria-hidden
                  >
                    <Pencil size={10} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="fugitive-notepad-legend" aria-label="คำอธิบายสัญลักษณ์">
        {multiSelect ? (
          <li>
            <span className="fugitive-notepad-legend__swatch fugitive-notepad-legend__swatch--picked" />
            เลือกทาย
          </li>
        ) : null}
        <li>
          <span className="fugitive-notepad-legend__swatch fugitive-notepad-legend__swatch--note" />
          จดไว้
        </li>
        <li>
          <span className="fugitive-notepad-legend__swatch fugitive-notepad-legend__swatch--correct" />
          ทายถูกแล้ว
        </li>
      </ul>

      <div className="fugitive-notepad-actions">
        <Button type="button" disabled={!canGuess} onClick={onGuess}>
          ทาย{canGuess ? guessLabel : ''}
        </Button>
        {showNoteAction ? (
          <Button type="button" variant="secondary" disabled={!canNote} onClick={onNote}>
            {noteTargetNoted ? 'ลบจด' : 'จด'}
            {canNote && noteTarget !== null ? ` (${noteTarget})` : ''}
          </Button>
        ) : null}
        {showSkipAction ? (
          <Button type="button" variant="secondary" disabled={!canSkipAction} onClick={onSkip}>
            ข้าม
          </Button>
        ) : null}
      </div>
    </div>
  );
}
