import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** สถานะเลือก (ปุ่มแบบตัวเลือก / แสดงค่าที่เลือก) */
  selected?: boolean;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { className, selected = false, type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-pressed={selected}
      className={cn('ui-chip', selected && 'ui-chip--selected', className)}
      {...rest}
    />
  );
});
