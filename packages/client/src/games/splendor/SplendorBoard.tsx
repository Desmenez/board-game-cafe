import type { SplendorCardView, SplendorGem, SplendorGems, SplendorNobleView } from 'shared';
import { SplendorBank } from './SplendorBank';
import { SplendorBankDropZone } from './SplendorBankDropZone';
import { SplendorCardFace } from './SplendorCardFace';
import { SplendorNobleTile } from './SplendorNobleTile';

type TablePick = { level: 1 | 2 | 3; slot: number; card: SplendorCardView };

type Props = {
  nobles: SplendorNobleView[];
  visible: [
    Array<SplendorCardView | null>,
    Array<SplendorCardView | null>,
    Array<SplendorCardView | null>,
  ];
  deckSizes: [number, number, number];
  bankGems: SplendorGems;
  bankGold: number;
  canActPlaying: boolean;
  canActReturn: boolean;
  canReserve: boolean;
  onCardClick: (pick: TablePick) => void;
  onReserveDeck: (level: 1 | 2 | 3) => void;
  onBankGemClick?: (g: SplendorGem) => void;
};

export function SplendorBoard({
  nobles,
  visible,
  deckSizes,
  bankGems,
  bankGold,
  canActPlaying,
  canActReturn,
  canReserve,
  onCardClick,
  onReserveDeck,
  onBankGemClick,
}: Props) {
  return (
    <div className="splendor-board">
      <div className="splendor-nobles" aria-label="โนเบิล">
        {nobles.map((n) => (
          <SplendorNobleTile key={n.id} noble={n} />
        ))}
      </div>

      <div className="splendor-rows">
        {([3, 2, 1] as const).map((level) => {
          const idx = level - 1;
          const row = visible[idx];
          const deckN = deckSizes[idx];
          return (
            <div key={level} className="splendor-level-row">
              <button
                type="button"
                className="splendor-deck-pile"
                data-level={String(level)}
                disabled={!canReserve || deckN < 1}
                onClick={() => onReserveDeck(level)}
                aria-label={`จองจากกองระดับ ${level} (${deckN} ใบ)`}
              >
                <SplendorCardFace level={level} faceDown size="board" />
                <span className="splendor-deck-count">{deckN}</span>
                {canReserve && deckN > 0 && (
                  <span className="splendor-deck-label">จองกอง</span>
                )}
              </button>
              <div className="splendor-cards-row">
                {row.map((card, slot) =>
                  card ? (
                    <SplendorCardFace
                      key={`${level}-${slot}-${card.id}`}
                      card={card}
                      size="board"
                      onClick={
                        canActPlaying
                          ? () => onCardClick({ level, slot, card })
                          : undefined
                      }
                      disabled={!canActPlaying}
                    />
                  ) : (
                    <div key={`empty-${level}-${slot}`} className="splendor-slot-empty" aria-hidden />
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SplendorBankDropZone active={canActReturn}>
        <SplendorBank
          bankGems={bankGems}
          bankGold={bankGold}
          canPick={canActPlaying}
          onBankGemClick={onBankGemClick}
        />
      </SplendorBankDropZone>
    </div>
  );
}
