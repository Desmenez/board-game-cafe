import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CARD_BACK_URL } from '../lib/cardMeta';

export const S1692_DRAW_REVEAL_MS = 2000;
const DRAW_FLIP_DELAY_MS = 150;

type Props = {
  /** When false, skip the flip beat and render children immediately. */
  enabled: boolean;
  titleId: string;
  title: string;
  kicker: string;
  hint: string;
  faceSrc: string;
  faceAlt?: string;
  /** Called once when the reveal finishes (or immediately if `enabled` is false). */
  onComplete?: () => void;
  children: ReactNode;
};

/**
 * Shared intro beat: flip a drawn / revealed card face-up (~2s), then show children.
 */
export function Salem1692DrawnCardRevealGate({
  enabled,
  titleId,
  title,
  kicker,
  hint,
  faceSrc,
  faceAlt = title,
  onComplete,
  children,
}: Props) {
  const [showReveal, setShowReveal] = useState(enabled);
  const [flipped, setFlipped] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (completedRef.current) return;

    if (!enabled || !showReveal) {
      completedRef.current = true;
      onComplete?.();
      return;
    }

    const flipT = window.setTimeout(() => setFlipped(true), DRAW_FLIP_DELAY_MS);
    const doneT = window.setTimeout(() => setShowReveal(false), S1692_DRAW_REVEAL_MS);
    return () => {
      window.clearTimeout(flipT);
      window.clearTimeout(doneT);
    };
  }, [enabled, showReveal, onComplete]);

  if (!showReveal) return children;

  return (
    <div
      className="modal-overlay s1692-drawn-reveal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="s1692-drawn-reveal" onClick={(e) => e.stopPropagation()}>
        <p className="s1692-drawn-reveal__kicker">{kicker}</p>
        <h2 id={titleId} className="s1692-drawn-reveal__title">
          {title}
        </h2>
        <div className="s1692-drawn-reveal__stage" aria-hidden={!flipped}>
          <div className="s1692-drawn-reveal__flip">
            <div
              className={[
                's1692-drawn-reveal__inner',
                flipped ? 's1692-drawn-reveal__inner--flipped' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="s1692-drawn-reveal__face s1692-drawn-reveal__face--back">
                <img src={CARD_BACK_URL} alt="" className="s1692-drawn-reveal__img" />
              </div>
              <div className="s1692-drawn-reveal__face s1692-drawn-reveal__face--front">
                <img src={faceSrc} alt={faceAlt} className="s1692-drawn-reveal__img" />
              </div>
            </div>
          </div>
        </div>
        <p className="s1692-drawn-reveal__hint">{hint}</p>
      </div>
    </div>
  );
}
