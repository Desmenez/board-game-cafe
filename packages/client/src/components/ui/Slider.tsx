import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Label } from './Label';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  /** Shown on the right (e.g. current value). */
  valueLabel?: string;
  hint?: string;
  error?: string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    className,
    id,
    label,
    valueLabel,
    hint,
    error,
    min = 0,
    max = 100,
    step = 1,
    disabled,
    ...props
  },
  ref,
) {
  const uid = useId();
  const inputId = id ?? uid;

  return (
    <div className="ui-field">
      {label ? (
        <div className="ui-slider-header">
          <Label htmlFor={inputId}>{label}</Label>
          {valueLabel != null ? <span className="ui-slider-value">{valueLabel}</span> : null}
        </div>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn('ui-slider', className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {hint && !error ? <p className="ui-hint">{hint}</p> : null}
      {error ? (
        <p className="ui-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
