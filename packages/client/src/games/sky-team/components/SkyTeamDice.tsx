import type { SkyTeamDie, SkyTeamDieColor } from 'shared';

type DieFaceProps = {
  value: number;
  color: SkyTeamDieColor | 'traffic';
  selected?: boolean;
  /** Face value differs from rolled (Coffee). */
  modified?: boolean;
  disabled?: boolean;
  /** Flicker while reroll / traffic spin resolves. */
  rerolling?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
};

export function SkyTeamDieFace({
  value,
  color,
  selected,
  modified,
  disabled,
  rerolling,
  onClick,
  size = 'md',
}: DieFaceProps) {
  const className = [
    'st-die',
    `st-die--${color}`,
    `st-die--${size}`,
    selected ? 'st-die--selected' : '',
    modified ? 'st-die--modified' : '',
    disabled ? 'st-die--disabled' : '',
    rerolling ? 'st-die--rerolling' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const face = (
    <span className="st-die__value" aria-hidden>
      {value}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        disabled={disabled}
        aria-label={`${color} die ${value}${modified ? ' (modified)' : ''}`}
      >
        {face}
      </button>
    );
  }
  return (
    <div className={className} aria-label={`${color} die ${value}`}>
      {face}
    </div>
  );
}

export function SkyTeamDiceTray({
  dice,
  selectedId,
  onSelect,
  disabled,
  /** Applied to the selected die face only (Coffee ±). */
  selectedValueDelta = 0,
}: {
  dice: SkyTeamDie[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
  selectedValueDelta?: number;
}) {
  return (
    <div className="st-dice-tray">
      {dice.map((d) => {
        const selected = selectedId === d.id;
        const displayValue = selected ? d.value + selectedValueDelta : d.value;
        return (
          <SkyTeamDieFace
            key={d.id}
            value={displayValue}
            color={d.color}
            selected={selected}
            modified={selected && selectedValueDelta !== 0}
            disabled={disabled}
            onClick={() => onSelect(d.id)}
          />
        );
      })}
    </div>
  );
}
