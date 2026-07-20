import { ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useId, useState, type ReactNode } from 'react';
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
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const triggerId = useId();
  const transition = {
    duration: reduceMotion ? 0 : 0.32,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  return (
    <section className={cn('rounded-card border border-rule bg-paper-2', className)}>
      <button
        type="button"
        id={triggerId}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-card p-2 md:p-4 text-left font-semibold text-ink outline-2 outline-transparent outline-offset-2 transition-[background-color,transform] duration-[var(--dur-micro)] ease-[var(--ease-out)] hover:bg-paper-3 focus-visible:outline-focus active:translate-y-px"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="text-base!">{title}</span>
        <motion.span
          className="inline-flex shrink-0"
          aria-hidden
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={transition}
        >
          <ChevronDown size={19} />
        </motion.span>
      </button>
      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!open}
        initial={false}
        animate={{
          height: open ? 'auto' : 0,
          opacity: open ? 1 : 0,
        }}
        transition={transition}
        style={{
          overflow: 'hidden',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div className="border-t border-rule p-2 md:p-4">
          {children}
          {note != null ? <p className="mt-4 text-sm leading-relaxed text-ink-2">{note}</p> : null}
        </div>
      </motion.div>
    </section>
  );
}
