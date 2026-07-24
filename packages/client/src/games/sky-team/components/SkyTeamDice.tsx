import type { SkyTeamDie, SkyTeamDieColor } from 'shared';

type DieFaceProps = {
  value: number;
  color: SkyTeamDieColor;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
};

export function SkyTeamDieFace({
  value,
  color,
  selected,
  disabled,
  onClick,
  size = 'md',
}: DieFaceProps) {
  const className = [
    'st-die',
    `st-die--${color}`,
    `st-die--${size}`,
    selected ? 'st-die--selected' : '',
    disabled ? 'st-die--disabled' : '',
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
        aria-label={`${color} die ${value}`}
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
}: {
  dice: SkyTeamDie[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="st-dice-tray">
      {dice.map((d) => (
        <SkyTeamDieFace
          key={d.id}
          value={d.value}
          color={d.color}
          selected={selectedId === d.id}
          disabled={disabled}
          onClick={() => onSelect(d.id)}
        />
      ))}
    </div>
  );
}
