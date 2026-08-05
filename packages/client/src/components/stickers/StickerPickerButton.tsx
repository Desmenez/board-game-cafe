import { useEffect, useId, useRef, useState } from 'react';
import { DEFAULT_STICKERS } from 'shared';
import { Smile } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Props {
  onSend: (stickerId: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function StickerPickerButton({ onSend, disabled, className }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handlePick = async (stickerId: string) => {
    if (disabled || sending) return;
    setSending(true);
    try {
      await onSend(stickerId);
      setOpen(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn('pointer-events-auto fixed bottom-4 left-3 z-130 sm:bottom-5 sm:left-5', className)}
    >
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="เลือกสติกเกอร์"
          className="mb-2 grid w-[min(calc(100vw-1.5rem),340px)] grid-cols-4 gap-2 rounded-2xl border border-white/15 bg-black/70 p-2.5 shadow-lg backdrop-blur-md"
        >
          {DEFAULT_STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              disabled={disabled || sending}
              className="flex aspect-square items-center justify-center rounded-xl bg-white/5 p-1 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 disabled:opacity-50"
              aria-label={sticker.label}
              onClick={() => void handlePick(sticker.id)}
            >
              <img
                src={sticker.imageUrl}
                alt=""
                width={72}
                height={72}
                className="h-full w-full object-contain"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? 'ปิดสติกเกอร์' : 'เปิดสติกเกอร์'}
        className={cn(
          'flex size-8 md:size-14 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-md backdrop-blur-md transition hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 disabled:opacity-40',
          open && 'bg-black/75',
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <Smile className="size-5 md:size-8" aria-hidden />
      </button>
    </div>
  );
}
