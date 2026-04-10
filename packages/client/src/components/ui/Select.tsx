import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Label } from './Label';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  requiredMark?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, id, label, hint, error, requiredMark, required, children, ...props },
  ref,
) {
  const uid = useId();
  const selectId = id ?? uid;

  const control = (
    <select
      ref={ref}
      id={selectId}
      className={cn('input', 'select', className)}
      aria-invalid={error ? true : undefined}
      aria-describedby={
        [hint && !error ? `${selectId}-hint` : '', error ? `${selectId}-err` : '']
          .filter(Boolean)
          .join(' ') || undefined
      }
      required={required}
      {...props}
    >
      {children}
    </select>
  );

  if (!label && !hint && !error) {
    return control;
  }

  return (
    <div className="ui-field">
      {label ? (
        <Label htmlFor={selectId} required={requiredMark}>
          {label}
        </Label>
      ) : null}
      {control}
      {hint && !error ? (
        <p id={`${selectId}-hint`} className="ui-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${selectId}-err`} className="ui-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
