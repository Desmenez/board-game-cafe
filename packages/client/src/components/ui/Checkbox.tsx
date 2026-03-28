import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, id, label, description, disabled, ...props },
  ref,
) {
  const uid = useId();
  const inputId = id ?? uid;

  return (
    <label className={cn('ui-checkbox', className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="ui-checkbox-input"
        disabled={disabled}
        {...props}
      />
      {(label != null || description != null) && (
        <span className="ui-checkbox-text">
          {label != null ? <span>{label}</span> : null}
          {description != null ? (
            <span className="ui-checkbox-description">{description}</span>
          ) : null}
        </span>
      )}
    </label>
  );
});
