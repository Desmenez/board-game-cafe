import type { SplendorCardView, SplendorPlayerRowView } from 'shared';
import { SplendorCardFace } from './SplendorCardFace';
import { SplendorChip } from './SplendorChip';
import { GEM_SHORT, SPLENDOR_GEMS } from './splendorUtils';

type Props = {
  players: SplendorPlayerRowView[];
  myId: string;
  currentPlayerId: string;
};

export function SplendorPlayerStrip({ players, myId, currentPlayerId }: Props) {
  return (
    <section className="card splendor-player-strip" aria-label="ผู้เล่น">
      <div className="splendor-players">
        {players.map((p) => {
          const isMe = p.id === myId;
          const isTurn = p.id === currentPlayerId;
          const opponentReserves = !isMe
            ? p.reservedSlots.filter((entry): entry is SplendorCardView | { hidden: true } => entry !== null)
            : [];

          return (
            <div
              key={p.id}
              className={[
                'splendor-player-card',
                isMe ? 'splendor-player-card--me' : '',
                isTurn ? 'splendor-player-card--turn' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="splendor-player-name">
                {p.name}
                {isMe ? ' (คุณ)' : ''}
                {isTurn ? ' — กำลังถึงตา' : ''}
              </div>
              <div className="splendor-stat-line">
                แต้ม {p.prestige}
                {!isMe && (
                  <>
                    {' '}
                    · โบนัส{' '}
                    {SPLENDOR_GEMS.map((g) =>
                      p.bonuses[g] > 0 ? `${GEM_SHORT[g]}${p.bonuses[g]} ` : '',
                    )}
                  </>
                )}
              </div>
              {!isMe && (
                <div className="splendor-token-row">
                  {SPLENDOR_GEMS.map((g) =>
                    p.gems[g] > 0 ? (
                      <SplendorChip key={g} kind={g} count={p.gems[g]} size="sm" />
                    ) : null,
                  )}
                  {p.gold > 0 && <SplendorChip kind="gold" count={p.gold} size="sm" />}
                </div>
              )}
              {opponentReserves.length > 0 && (
                <div className="splendor-reserve-hidden" aria-label="การ์ดจอง">
                  {opponentReserves.map((entry, i) =>
                    'hidden' in entry ? (
                      <SplendorCardFace key={`hidden-${i}`} level={1} faceDown size="tiny" />
                    ) : (
                      <SplendorCardFace key={entry.id} card={entry} size="tiny" />
                    ),
                  )}
                </div>
              )}
              {!isMe && p.purchasedCards.length > 0 && (
                <div className="splendor-purchased-stacks">
                  {SPLENDOR_GEMS.map((g) => {
                    const cards = p.purchasedCards.filter((c) => c.bonus === g);
                    if (cards.length === 0) return null;
                    return (
                      <div key={g} className={`splendor-purchased-stack splendor-bonus-${g}`}>
                        {cards.map((c, i) => (
                          <SplendorCardFace
                            key={c.id}
                            card={c}
                            size="stack"
                            className={i > 0 ? 'splendor-card-face--stacked' : ''}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
