import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Label } from './Label';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** ขนาดช่อง — ค่าเริ่มต้น `lg` สอดคล้องกับสไตล์ `.input` เดิมใน index.css */
  size?: InputSize;
  label?: string;
  hint?: string;
  error?: string;
  /** When true, adds asterisk via Label (provide `label` too). */
  requiredMark?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, id, label, hint, error, requiredMark, required, size = 'md', ...props },
  ref,
) {
  const uid = useId();
  const inputId = id ?? uid;

  const control = (
    <input
      ref={ref}
      id={inputId}
      className={cn('input', size === 'md' && 'input--md', size === 'sm' && 'input--sm', className)}
      aria-invalid={error ? true : undefined}
      aria-describedby={
        [hint && !error ? `${inputId}-hint` : '', error ? `${inputId}-err` : '']
          .filter(Boolean)
          .join(' ') || undefined
      }
      required={required}
      {...props}
    />
  );

  if (!label && !hint && !error) {
    return control;
  }

  return (
    <div className="ui-field">
      {label ? (
        <Label htmlFor={inputId} required={requiredMark}>
          {label}
        </Label>
      ) : null}
      {control}
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="ui-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-err`} className="ui-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
