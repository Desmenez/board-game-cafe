import { useEffect, useMemo, useState } from 'react';
import {
  spicyDeclareLabelTh,
  spicySpiceLabelTh,
  type SpicyCard,
  type SpicyDeclaration,
  type SpicySpice,
} from 'shared';
import { GameCardActionModal } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { spicyCardFaceUrl, spicyCardLabelTh } from '../art';

const SPICES: SpicySpice[] = ['chili', 'wasabi', 'pepper'];

type Props = {
  open: boolean;
  card: SpicyCard;
  mode: 'play' | 'copy';
  legalDeclarations: SpicyDeclaration[];
  /** Fixed declaration when Copy Cat. */
  copyDeclaration?: SpicyDeclaration | null;
  actorName: string;
  actorId: string;
  onConfirm: (declaration: SpicyDeclaration) => void;
  onCancel: () => void;
};

export function SpicyDeclareModal({
  open,
  card,
  mode,
  legalDeclarations,
  copyDeclaration,
  actorName,
  actorId,
  onConfirm,
  onCancel,
}: Props) {
  const legalNums = useMemo(() => {
    const set = new Set(legalDeclarations.map((d) => d.number));
    return [...set].sort((a, b) => a - b);
  }, [legalDeclarations]);

  const [number, setNumber] = useState<number | null>(null);
  const [spice, setSpice] = useState<SpicySpice | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'copy' && copyDeclaration) {
      setNumber(copyDeclaration.number);
      setSpice(copyDeclaration.spice);
      return;
    }
    const first = legalDeclarations[0];
    setNumber(first?.number ?? null);
    setSpice(first?.spice ?? null);
  }, [open, mode, copyDeclaration, legalDeclarations, card.id]);

  const spicesForNum = (n: number | null): SpicySpice[] => {
    if (n == null) return [];
    return SPICES.filter((sp) =>
      legalDeclarations.some((d) => d.number === n && d.spice === sp),
    );
  };

  const canConfirm =
    mode === 'copy'
      ? copyDeclaration != null
      : number != null &&
        spice != null &&
        legalDeclarations.some((d) => d.number === number && d.spice === spice);

  return (
    <GameCardActionModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      titleId="spicy-declare-title"
      descriptionId="spicy-declare-desc"
      title={mode === 'copy' ? 'Copy Cat' : 'ประกาศการ์ด'}
      description={
        mode === 'copy'
          ? `วางใบบนสุดด้วยประกาศเดียวกับคนก่อน — ${
              copyDeclaration ? spicyDeclareLabelTh(copyDeclaration) : '…'
            }`
          : 'เลือกเลขและเครื่องเทศที่ต้องการประกาศ (อาจบลัฟได้)'
      }
      cardSrc={spicyCardFaceUrl(card)}
      cardAlt={spicyCardLabelTh(card)}
      cardAspectRatio="331 / 514"
      actors={<PlayerIdentity playerId={actorId} name={actorName} avatarSize={36} />}
      meta={
        mode === 'copy' && copyDeclaration
          ? spicyDeclareLabelTh(copyDeclaration)
          : number != null && spice != null
            ? `จะประกาศ ${spicyDeclareLabelTh({ number, spice })}`
            : undefined
      }
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (mode === 'copy' && copyDeclaration) {
                onConfirm(copyDeclaration);
                return;
              }
              if (number == null || spice == null) return;
              onConfirm({ number, spice });
            }}
          >
            {mode === 'copy'
              ? 'วาง Copy Cat'
              : number != null && spice != null
                ? `วาง · ${spicyDeclareLabelTh({ number, spice })}`
                : 'วาง'}
          </Button>
        </>
      }
    >
      {mode === 'play' ? (
        <div className="spicy-declare-pickers">
          <div className="spicy-declare-group">
            <span className="spicy-declare-label">เลข</span>
            <div className="spicy-declare-chips" role="group" aria-label="เลือกเลข">
              {legalNums.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cn('spicy-declare-chip', number === n && 'spicy-declare-chip--on')}
                  onClick={() => {
                    setNumber(n);
                    const next = spicesForNum(n);
                    setSpice((prev) => (prev && next.includes(prev) ? prev : (next[0] ?? null)));
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="spicy-declare-group">
            <span className="spicy-declare-label">เครื่องเทศ</span>
            <div className="spicy-declare-chips" role="group" aria-label="เลือกเครื่องเทศ">
              {spicesForNum(number).map((sp) => (
                <button
                  key={sp}
                  type="button"
                  className={cn(
                    'spicy-declare-chip',
                    `spicy-declare-chip--${sp}`,
                    spice === sp && 'spicy-declare-chip--on',
                  )}
                  onClick={() => setSpice(sp)}
                >
                  {spicySpiceLabelTh(sp)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="spicy-declare-copy-claim" aria-live="polite">
          {copyDeclaration ? spicyDeclareLabelTh(copyDeclaration) : '—'}
        </p>
      )}
    </GameCardActionModal>
  );
}
