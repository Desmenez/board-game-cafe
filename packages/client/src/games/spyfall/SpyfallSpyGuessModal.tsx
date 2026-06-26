type Props = {
  choices: { id: string; name: string }[];
  onGuess: (locationId: string) => void;
};

export function SpyfallSpyGuessModal({ choices, onGuess }: Props) {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spyfall-guess-title"
    >
      <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 id="spyfall-guess-title">ทายสถานที่</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          เลือกสถานที่ที่คุณคิดว่าทุกคนอยู่
        </p>
        <div className="sf-location-grid">
          {choices.map((loc) => (
            <button
              key={loc.id}
              type="button"
              className="sf-location-btn"
              onClick={() => onGuess(loc.id)}
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
