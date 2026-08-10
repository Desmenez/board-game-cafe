import { useEffect, useId, useState } from 'react';
import type { HuesAndCuesColorOption } from 'shared';
import {
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../components/ui';
import { cn } from '../../../utils/cn';
import '../hues-and-cues.css';

type Props = {
  open: boolean;
  options: HuesAndCuesColorOption[];
  onPick: (col: number, row: number) => void;
};

function optionKey(opt: Pick<HuesAndCuesColorOption, 'col' | 'row'>): string {
  return `${opt.col},${opt.row}`;
}

/** Cue giver picks 1 of 4 colors from the drawn card (non-dismissible). */
export function HuesColorCardModal({ open, options, onPick }: Props) {
  const titleId = useId();
  const descId = useId();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = options.find((o) => optionKey(o) === selectedKey) ?? null;
  const optionsSig = options.map(optionKey).join('|');

  useEffect(() => {
    setSelectedKey(null);
  }, [open, optionsSig]);

  return (
    <Dialog
      open={open}
      dismissible={false}
      onOpenChange={() => undefined}
      // Portal escapes .app-night-page — night chrome required or :root purple btn leaks in.
      overlayClassName="room-night-dialog-overlay"
      contentClassName="hac-color-card-modal room-night-dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <DialogTitle id={titleId} className="hac-color-card-modal__title">
        เลือกสีจากบัตร
      </DialogTitle>
      <DialogDescription id={descId} className="hac-color-card-modal__lead">
        เลือก 1 จาก 4 สี แล้วกดยืนยัน — ผู้ทายจะไม่เห็นบัตรนี้
      </DialogDescription>

      <ul className="hac-color-card-modal__grid" role="listbox" aria-label="สีบนบัตร">
        {options.map((opt) => {
          const key = optionKey(opt);
          const isSelected = selectedKey === key;
          return (
            <li key={key} role="none">
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'hac-color-card-modal__swatch',
                  isSelected && 'hac-color-card-modal__swatch--selected',
                )}
                style={{ backgroundColor: opt.hex }}
                aria-label={`สี ${opt.label}`}
                onClick={() => setSelectedKey(key)}
              >
                <span className="hac-color-card-modal__gloss" aria-hidden />
                <span className="hac-color-card-modal__code" lang="en">
                  {opt.label}
                </span>
                {isSelected ? (
                  <span className="hac-color-card-modal__check" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <DialogFooter className="hac-color-card-modal__footer">
        <Button
          type="button"
          block
          size="lg"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            onPick(selected.col, selected.row);
          }}
        >
          {selected ? `ยืนยันสี ${selected.label}` : 'เลือกสีก่อน'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
