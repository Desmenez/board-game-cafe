import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import './game-card-image.css';

type Dim = CSSProperties['width'];

export interface GameCardImageProps {
  src: string;
  alt: string;
  /** When only width is set, height follows `aspectRatio` automatically. */
  width?: Dim;
  /** If set together with width, forces exact render size. */
  height?: Dim;
  /** Width/height ratio used when auto-sizing from width only. */
  aspectRatio?: number;
  /** Max height of zoom preview image (vh). */
  previewMaxVh?: number;
  /** Set false to hide the top-right zoom button. */
  showZoom?: boolean;
  /** Optional card-back image. When provided, component can animate flip. */
  backCardUrl?: string;
  /** Flip trigger (controlled). True shows back side, false shows front side. */
  flipCard?: boolean;
  /** Flip animation duration in milliseconds. */
  flipDurationMs?: number;
  className?: string;
  loading?: 'eager' | 'lazy';
}

function joinClass(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function GameCardImage({
  src,
  alt,
  width,
  height,
  aspectRatio = 63 / 88,
  previewMaxVh = 78,
  showZoom = true,
  backCardUrl,
  flipCard = false,
  flipDurationMs = 320,
  className,
  loading = 'lazy',
}: GameCardImageProps) {
  const [open, setOpen] = useState(false);

  const style: CSSProperties = {
    width,
    ...(height != null ? { height } : { aspectRatio }),
  };
  const canFlip = Boolean(backCardUrl);
  const previewSrc = canFlip && flipCard ? backCardUrl! : src;

  return (
    <>
      <div className={joinClass('game-card-image', className)} style={style}>
        <div
          className={joinClass(
            'game-card-image__flip',
            canFlip && flipCard ? 'is-flipped' : undefined,
          )}
          style={{ transitionDuration: `${flipDurationMs}ms` }}
        >
          <div className="game-card-image__face game-card-image__face--front">
            <img className="game-card-image__img" src={src} alt={alt} loading={loading} />
          </div>
          {canFlip ? (
            <div className="game-card-image__face game-card-image__face--back">
              <img
                className="game-card-image__img"
                src={backCardUrl}
                alt={`${alt} (back)`}
                loading={loading}
              />
            </div>
          ) : null}
        </div>
        {showZoom ? (
          <button
            type="button"
            className="game-card-image__zoom"
            aria-label={`ดูการ์ดใหญ่: ${alt}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            ?
          </button>
        ) : null}
      </div>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="modal-overlay game-card-image__overlay"
              role="dialog"
              aria-modal
              onClick={() => setOpen(false)}
            >
              <div className="game-card-image__preview" onClick={(e) => e.stopPropagation()}>
                <img
                  className="game-card-image__preview-img"
                  src={previewSrc}
                  alt={alt}
                  style={{ maxHeight: `${previewMaxVh}vh` }}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
