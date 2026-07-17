import { onuwCardBackUrl } from '../../imageMap';

export function OnuwNightPlayerPickGrid({
  players,
  selectedId,
  onSelect,
  disabled = false,
}: {
  players: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="onuw-night-pick-grid">
      {players.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          className={`onuw-night-pick-tile${selectedId === p.id ? ' onuw-night-pick-tile--selected' : ''}`}
          onClick={() => onSelect(p.id)}
        >
          <div className="onuw-night-pick-thumb-wrap">
            <img
              src={onuwCardBackUrl()}
              alt=""
              className="onuw-night-pick-thumb"
              decoding="async"
            />
          </div>
          <span className="onuw-night-pick-name">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

export function OnuwNightCenterPickGrid({
  value,
  onChange,
  labels = ['กลาง 1', 'กลาง 2', 'กลาง 3'] as [string, string, string],
  disabled = false,
}: {
  value: 0 | 1 | 2;
  onChange: (v: 0 | 1 | 2) => void;
  labels?: [string, string, string];
  disabled?: boolean;
}) {
  return (
    <div className="onuw-night-pick-grid onuw-night-pick-grid--center">
      {([0, 1, 2] as const).map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          className={`onuw-night-pick-tile${value === i ? ' onuw-night-pick-tile--selected' : ''}`}
          onClick={() => onChange(i)}
        >
          <div className="onuw-night-pick-thumb-wrap">
            <img
              src={onuwCardBackUrl()}
              alt=""
              className="onuw-night-pick-thumb"
              decoding="async"
            />
          </div>
          <span className="onuw-night-pick-name">{labels[i]}</span>
        </button>
      ))}
    </div>
  );
}
