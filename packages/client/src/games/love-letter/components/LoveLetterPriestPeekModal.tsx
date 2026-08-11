import type { LoveLetterCard } from 'shared';
import { Button } from '../../../components/ui';
import { roleLabel } from '../lib/cardMeta';
import { LoveLetterCardFace } from './LoveLetterCardFace';
import { LlModalShell } from './LlModalShell';

type Props = {
  targetName: string;
  card: LoveLetterCard;
  onAck: () => void;
};

export function LoveLetterPriestPeekModal({ targetName, card, onAck }: Props) {
  return (
    <LlModalShell
      title={`Priest — มือของ ${targetName}`}
      titleId="ll-peek-title"
      media={
        <div className="flex flex-col items-center gap-2">
          <LoveLetterCardFace card={card} size="modal" />
          <p className="m-0">{roleLabel(card.role)}</p>
        </div>
      }
      footer={
        <Button type="button" onClick={onAck}>
          ตกลง
        </Button>
      }
    />
  );
}
