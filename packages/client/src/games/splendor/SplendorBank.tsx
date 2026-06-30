import { useMemo } from 'react';
import type { SplendorGem, SplendorGems } from 'shared';
import { PlayerHand } from '../../components/player-hand';
import { SplendorChip } from './SplendorChip';
import { splendorChipImageUrl } from './cardMeta';
import {
  SPLENDOR_BANK_DRAG_PREFIX,
  buildBankHandItems,
  type SplendorBankHandItem,
} from './splendorDragUtils';
import { GEM_SHORT } from './splendorUtils';

type Props = {
  bankGems: SplendorGems;
  bankGold: number;
  canPick: boolean;
  onBankGemClick?: (gem: SplendorGem) => void;
};

export function SplendorBank({ bankGems, bankGold, canPick, onBankGemClick }: Props) {
  const items = useMemo(() => buildBankHandItems(bankGems), [bankGems]);

  const disabledIds = useMemo(
    () => items.filter((item) => item.count < 1 || !canPick).map((item) => item.id),
    [items, canPick],
  );

  return (
    <div className="splendor-bank" aria-label="ธนาคารโทเคน">
      <PlayerHand
        cards={items}
        getCardId={(item: SplendorBankHandItem) => item.id}
        dragMode={canPick ? 'play' : 'none'}
        dockPeek={false}
        draggableIdPrefix={SPLENDOR_BANK_DRAG_PREFIX}
        disabledCardIds={disabledIds}
        className="splendor-bank-hand"
        onSelectToggle={
          onBankGemClick
            ? (id) => {
                const gem = id as SplendorGem;
                if (!disabledIds.includes(gem)) onBankGemClick(gem);
              }
            : undefined
        }
        getPreview={(item) => ({
          src: splendorChipImageUrl(item.gem),
          alt: GEM_SHORT[item.gem],
          caption: `${GEM_SHORT[item.gem]} · คงเหลือ ${item.count}`,
        })}
        renderCard={({ card: item }) => (
          <div className="splendor-bank-pile">
            <SplendorChip kind={item.gem} size="md" />
            <span className="splendor-bank-pile__count">{item.count}</span>
          </div>
        )}
        aria-label="กองโทเคนธนาคาร"
      />
      <span className="splendor-bank-gold" aria-label={`ทองในธนาคาร ${bankGold}`}>
        <SplendorChip kind="gold" size="md" />
        <span className="splendor-bank-pile__count">{bankGold}</span>
      </span>
    </div>
  );
}
