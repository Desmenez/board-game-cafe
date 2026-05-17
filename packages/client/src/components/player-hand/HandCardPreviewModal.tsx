import { createPortal } from 'react-dom';
import type { PlayerHandPreviewContent } from './types';
import './player-hand.css';

type Props = {
  open: boolean;
  preview: PlayerHandPreviewContent | null;
  onClose: () => void;
};

export function HandCardPreviewModal({ open, preview, onClose }: Props) {
  if (!open || !preview || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-overlay hand-card-preview-overlay"
      role="dialog"
      aria-modal
      aria-label={preview.alt}
      onClick={onClose}
    >
      <div className="hand-card-preview__panel" onClick={(e) => e.stopPropagation()}>
        <img className="hand-card-preview__img" src={preview.src} alt={preview.alt} />
        {preview.caption ? <p className="hand-card-preview__caption">{preview.caption}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
