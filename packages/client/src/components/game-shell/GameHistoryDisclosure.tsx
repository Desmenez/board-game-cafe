import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface GameHistoryDisclosureProps {
  title: ReactNode;
  children: ReactNode;
  note?: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export function GameHistoryDisclosure({
  title,
  children,
  note,
  className,
  defaultOpen = false,
}: GameHistoryDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn('rounded-card border border-rule bg-paper-2', className)}>
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-card px-4 py-3 text-left font-semibold text-ink outline-2 outline-transparent outline-offset-2 transition-[background-color,transform] duration-[var(--dur-micro)] ease-[var(--ease-out)] hover:bg-paper-3 focus-visible:outline-focus active:translate-y-px"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <ChevronDown
          size={19}
          className={cn(
            'shrink-0 transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-rule px-4 py-4">
          {children}
          {note != null ? <p className="mt-4 text-sm leading-relaxed text-ink-2">{note}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
