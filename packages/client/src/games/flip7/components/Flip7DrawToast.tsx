import { GameCardImage } from '../../../components/ui';

type Props = {
  toast: {
    src: string;
    alt: string;
    by: string;
    id: number;
  };
};

export function Flip7DrawToast({ toast }: Props) {
  return (
    <div key={toast.id} className="f7-draw-toast" aria-live="polite">
      <GameCardImage
        src={toast.src}
        alt={toast.alt}
        width={200}
        aspectRatio={469 / 768}
        showZoom={false}
      />
    </div>
  );
}
