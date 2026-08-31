import type { ReactNode } from 'react';
import { Banknote } from 'lucide-react';

export function MoneyChip({ amount, label }: { amount: number; label?: ReactNode }) {
  return (
    <span
      className="ma-money"
      title="เงินของคุณ — คนอื่นมองไม่เห็น"
      aria-label={`เงินของคุณ $${amount}`}
    >
      <Banknote size={16} strokeWidth={2.25} aria-hidden />
      <span className="ma-money__label">{label ?? 'เงินคุณ'}</span>
      <span className="ma-money__amount tabular-nums">${amount}</span>
    </span>
  );
}
