import { useMemo, useState } from 'react';
import type {
  SplendorAction,
  SplendorCardView,
  SplendorGem,
  SplendorGems,
  SplendorPlayerView,
} from 'shared';
import { Button } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { LogOut } from 'lucide-react';
import './splendor.css';

interface Props {
  gameState: SplendorPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
}

const GEMS: SplendorGem[] = ['white', 'blue', 'green', 'red', 'black'];

const GEM_SHORT: Record<SplendorGem, string> = {
  white: 'ขาว',
  blue: 'น้ำเงิน',
  green: 'เขียว',
  red: 'แดง',
  black: 'ดำ',
};

function z(): SplendorGems {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0 };
}

function sumGems(g: SplendorGems): number {
  return GEMS.reduce((s, k) => s + g[k], 0);
}

function totalHeld(gems: SplendorGems, gold: number): number {
  return sumGems(gems) + gold;
}

function CostChips({ cost }: { cost: SplendorGems }) {
  return (
    <div className="splendor-costs">
      {GEMS.map((g) =>
        cost[g] > 0 ? (
          <span key={g} className={`splendor-chip splendor-chip-${g}`}>
            {cost[g]}
          </span>
        ) : null,
      )}
    </div>
  );
}

function DevCardInner({ card }: { card: SplendorCardView }) {
  const dots = card.level;
  return (
    <>
      <span className="splendor-dev-prestige">{card.prestige}</span>
      <span
        className={`splendor-dev-bonus-dot splendor-chip-${card.bonus}`}
        title={GEM_SHORT[card.bonus]}
        aria-label={`โบนัส ${GEM_SHORT[card.bonus]}`}
      />
      <CostChips cost={card.cost} />
      <div className="splendor-dev-level-dots" aria-hidden>
        {Array.from({ length: dots }, (_, i) => (
          <span key={i}>●</span>
        ))}
      </div>
    </>
  );
}

function DevCardFace({
  card,
  onClick,
  disabled,
}: {
  card: SplendorCardView;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`splendor-dev-card splendor-bonus-${card.bonus}`}
      onClick={onClick}
      disabled={disabled}
    >
      <DevCardInner card={card} />
    </button>
  );
}

function DevCardStatic({ card, className }: { card: SplendorCardView; className?: string }) {
  return (
    <div className={`splendor-dev-card splendor-bonus-${card.bonus} ${className ?? ''}`.trim()}>
      <DevCardInner card={card} />
    </div>
  );
}

function NobleTile({ noble }: { noble: { id: string; prestige: number; requires: SplendorGems } }) {
  return (
    <div className="splendor-noble" title={noble.id}>
      <span className="splendor-noble__pts">{noble.prestige}</span>
      <div
        className="splendor-costs"
        style={{ position: 'static', transform: 'none', marginTop: 28 }}
      >
        {GEMS.map((g) =>
          noble.requires[g] > 0 ? (
            <span
              key={g}
              className={`splendor-chip splendor-chip-${g}`}
              style={{ borderRadius: 4, minWidth: 20, height: 20, fontSize: '0.65rem' }}
            >
              {noble.requires[g]}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

type TablePick = { level: 1 | 2 | 3; slot: number; card: SplendorCardView };

export function SplendorGame({ gameState, myId, sendAction, onLeave }: Props) {
  const [pickThree, setPickThree] = useState<SplendorGem[]>([]);
  const [tablePick, setTablePick] = useState<TablePick | null>(null);
  const [returnDraft, setReturnDraft] = useState<SplendorGems & { gold: number }>({
    ...z(),
    gold: 0,
  });

  const me = useMemo(() => gameState.players.find((p) => p.id === myId), [gameState.players, myId]);

  const isMyTurn =
    gameState.currentPlayerId === myId &&
    (gameState.phase === 'playing' || gameState.phase === 'return_tokens');

  const canActPlaying = gameState.phase === 'playing' && isMyTurn;
  const canActReturn = gameState.phase === 'return_tokens' && gameState.currentPlayerId === myId;

  const send = (a: SplendorAction) => sendAction(a);

  const togglePickGem = (g: SplendorGem) => {
    if (!canActPlaying) return;
    if (gameState.bankGems[g] < 1) return;
    setPickThree((prev) => {
      if (prev.includes(g)) return prev.filter((x) => x !== g);
      if (prev.length >= 3) return prev;
      return [...prev, g];
    });
  };

  const confirmTakeThree = () => {
    if (pickThree.length !== 3) return;
    const a = pickThree[0];
    const b = pickThree[1];
    const c = pickThree[2];
    if (a === b || a === c || b === c) return;
    send({ type: 'take_three', colors: [a, b, c] });
    setPickThree([]);
  };

  const takeTwo = (color: SplendorGem) => {
    if (gameState.bankGems[color] < 4) return;
    send({ type: 'take_two', color });
  };

  const reservedFilled = me?.reservedSlots.filter(Boolean).length ?? 0;
  const canReserve = canActPlaying && reservedFilled < 3;

  const openTableCard = (level: 1 | 2 | 3, slot: number, card: SplendorCardView | null) => {
    if (!card || !canActPlaying) return;
    setTablePick({ level, slot, card });
  };

  const excess = me ? Math.max(0, totalHeld(me.gems, me.gold) - 10) : 0;
  const returnSum = sumGems(returnDraft) + returnDraft.gold;

  const confirmReturn = () => {
    if (excess <= 0 || returnSum !== excess) return;
    send({
      type: 'return_tokens',
      gems: {
        white: returnDraft.white,
        blue: returnDraft.blue,
        green: returnDraft.green,
        red: returnDraft.red,
        black: returnDraft.black,
      },
      gold: returnDraft.gold,
    });
  };

  const canPickNoble =
    gameState.phase === 'noble_pick' &&
    Boolean(gameState.noblePickOptions?.length) &&
    gameState.currentPlayerId === myId;

  useYourTurnToast(
    Boolean(canActPlaying || canActReturn || canPickNoble),
    gameState.phase !== 'game_over',
  );

  if (gameState.phase === 'game_over' && gameState.result) {
    const { winners, reason, scores } = gameState.result;
    return (
      <div className="splendor-game">
        <div className="splendor-game__header">
          <h1>Splendor</h1>
          <Button type="button" variant="secondary" onClick={onLeave}>
            <LogOut size={18} aria-hidden /> ออก
          </Button>
        </div>
        <div className="splendor-game-over">
          <h2>จบเกม</h2>
          <p>{reason}</p>
          <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
            {gameState.players.map((p) => (
              <span key={p.id} style={{ display: 'block' }}>
                {p.name}: {scores[p.id] ?? 0} แต้ม
                {winners.includes(p.id) ? ' — ชนะ' : ''}
              </span>
            ))}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="splendor-game">
      <div className="splendor-game__header">
        <div>
          <h1>Splendor</h1>
          {gameState.lastEvent && <p className="splendor-game__event">{gameState.lastEvent}</p>}
        </div>
        <Button type="button" variant="secondary" onClick={onLeave}>
          <LogOut size={18} aria-hidden /> ออก
        </Button>
      </div>

      {gameState.finalRoundNotice && (
        <p className="splendor-game__notice" role="status">
          รอบสุดท้าย: มีผู้เล่นถึง 15 แต้มแล้ว — เล่นจบรอบนี้
        </p>
      )}

      <div className="splendor-layout">
        <div className="splendor-board">
          <div className="splendor-nobles">
            {gameState.nobles.map((n) => (
              <NobleTile key={n.id} noble={n} />
            ))}
          </div>

          <div className="splendor-rows">
            {([3, 2, 1] as const).map((level) => {
              const idx = level - 1;
              const row = gameState.visible[idx];
              const deckN = gameState.deckSizes[idx];
              return (
                <div key={level} className="splendor-level-row">
                  <div className="splendor-deck-pile" data-level={String(level)}>
                    <span className="splendor-deck-count">{deckN}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!canReserve || deckN < 1}
                      onClick={() => send({ type: 'reserve_deck', level })}
                    >
                      จองกอง
                    </Button>
                  </div>
                  <div className="splendor-cards-row">
                    {row.map((card, slot) =>
                      card ? (
                        <DevCardFace
                          key={`${level}-${slot}-${card.id}`}
                          card={card}
                          disabled={!canActPlaying}
                          onClick={() => openTableCard(level, slot, card)}
                        />
                      ) : (
                        <div
                          key={`empty-${level}-${slot}`}
                          className="splendor-slot-empty"
                          aria-hidden
                        />
                      ),
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="splendor-bank" aria-label="ธนาคารโทเคน">
            {GEMS.map((g) => (
              <span key={g} className={`splendor-bank-chip splendor-chip-${g}`}>
                {GEM_SHORT[g]} {gameState.bankGems[g]}
              </span>
            ))}
            <span className="splendor-bank-chip splendor-bank-chip--gold">
              ทอง {gameState.bankGold}
            </span>
          </div>
        </div>

        <div className="splendor-panel">
          <h2>ผู้เล่น</h2>
          <div className="splendor-players">
            {gameState.players.map((p) => {
              const isMe = p.id === myId;
              const isTurn = p.id === gameState.currentPlayerId;
              return (
                <div
                  key={p.id}
                  className={`splendor-player-card${isMe ? ' splendor-player-card--me' : ''}${
                    isTurn ? ' splendor-player-card--turn' : ''
                  }`}
                >
                  <div className="splendor-player-name">
                    {p.name}
                    {isMe ? ' (คุณ)' : ''}
                    {isTurn ? ' — กำลังถึงตา' : ''}
                  </div>
                  <div className="splendor-stat-line">
                    แต้ม {p.prestige} · โบนัส{' '}
                    {GEMS.map((g) => (p.bonuses[g] > 0 ? `${GEM_SHORT[g]}${p.bonuses[g]} ` : ''))}
                  </div>
                  <div className="splendor-token-row">
                    {GEMS.map((g) =>
                      p.gems[g] > 0 ? (
                        <span key={g} className={`splendor-chip splendor-chip-${g}`}>
                          {p.gems[g]}
                        </span>
                      ) : null,
                    )}
                    {p.gold > 0 && (
                      <span className="splendor-bank-chip splendor-bank-chip--gold">
                        ทอง {p.gold}
                      </span>
                    )}
                  </div>
                  <div
                    className="splendor-stat-line splendor-reserved-row"
                    style={{ marginTop: 6 }}
                  >
                    จอง:
                    {p.reservedSlots.map((slot, i) => (
                      <span key={i} style={{ marginLeft: 6, display: 'inline-block' }}>
                        {slot === null ? (
                          <span style={{ opacity: 0.4 }}>—</span>
                        ) : 'hidden' in slot ? (
                          <span
                            className="splendor-reserved-back"
                            style={{ width: 56, minHeight: 40, display: 'inline-block' }}
                          />
                        ) : (
                          <DevCardStatic card={slot} className="splendor-dev-card--tiny" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {gameState.phase === 'noble_pick' && gameState.noblePickOptions && (
            <div className="splendor-actions">
              <h3>เลือกโนเบิล 1 คน</h3>
              <div className="splendor-gem-pick">
                {gameState.nobles
                  .filter((n) => gameState.noblePickOptions!.includes(n.id))
                  .map((n) => (
                    <Button
                      key={n.id}
                      type="button"
                      variant="primary"
                      onClick={() => send({ type: 'choose_noble', nobleId: n.id })}
                    >
                      {n.id} (+{n.prestige})
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {canActReturn && me && (
            <div className="splendor-actions">
              <h3>คืนโทเคนให้เหลือ 10 เม็ด (ต้องคืน {excess})</h3>
              <p className="splendor-stat-line">
                คืนแล้ว {returnSum} / {excess}
              </p>
              {GEMS.map((g) => (
                <div key={g} className="splendor-token-row" style={{ marginBottom: 4 }}>
                  <span style={{ width: 52 }}>{GEM_SHORT[g]}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={returnDraft[g] <= 0}
                    onClick={() => setReturnDraft((d) => ({ ...d, [g]: Math.max(0, d[g] - 1) }))}
                  >
                    −
                  </Button>
                  <span style={{ minWidth: 24, textAlign: 'center' }}>{returnDraft[g]}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={returnDraft[g] >= me.gems[g] || returnSum >= excess}
                    onClick={() => setReturnDraft((d) => ({ ...d, [g]: d[g] + 1 }))}
                  >
                    +
                  </Button>
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>มี {me.gems[g]}</span>
                </div>
              ))}
              <div className="splendor-token-row" style={{ marginBottom: 4 }}>
                <span style={{ width: 52 }}>ทอง</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={returnDraft.gold <= 0}
                  onClick={() => setReturnDraft((d) => ({ ...d, gold: Math.max(0, d.gold - 1) }))}
                >
                  −
                </Button>
                <span style={{ minWidth: 24, textAlign: 'center' }}>{returnDraft.gold}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={returnDraft.gold >= me.gold || returnSum >= excess}
                  onClick={() => setReturnDraft((d) => ({ ...d, gold: d.gold + 1 }))}
                >
                  +
                </Button>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>มี {me.gold}</span>
              </div>
              <Button
                type="button"
                variant="primary"
                disabled={returnSum !== excess}
                onClick={confirmReturn}
              >
                ยืนยันคืนโทเคน
              </Button>
            </div>
          )}

          {canActPlaying && (
            <div className="splendor-actions">
              <h3>หยิบ 3 สีต่างกัน</h3>
              <div className="splendor-gem-pick">
                {GEMS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`splendor-gem-btn splendor-chip-${g}`}
                    data-active={pickThree.includes(g)}
                    disabled={gameState.bankGems[g] < 1}
                    onClick={() => togglePickGem(g)}
                  >
                    {GEM_SHORT[g]}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="primary"
                disabled={pickThree.length !== 3}
                onClick={confirmTakeThree}
              >
                หยิบ 3 เม็ด
              </Button>

              <h3>หยิบ 2 เม็ดสีเดียว (ธนาคาร ≥ 4)</h3>
              <div className="splendor-gem-pick">
                {GEMS.map((g) => (
                  <Button
                    key={g}
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={gameState.bankGems[g] < 4}
                    onClick={() => takeTwo(g)}
                  >
                    {GEM_SHORT[g]} ×2
                  </Button>
                ))}
              </div>

              {me && me.reservedSlots.some((s) => s !== null && !('hidden' in s)) && (
                <>
                  <h3>ซื้อการ์ดที่จองไว้</h3>
                  <div className="splendor-gem-pick">
                    {me.reservedSlots.map((slot, i) =>
                      slot !== null && !('hidden' in slot) ? (
                        <Button
                          key={i}
                          type="button"
                          size="sm"
                          variant="primary"
                          onClick={() => send({ type: 'buy_reserved', slot: i })}
                        >
                          ซื้อจอง #{i + 1}
                        </Button>
                      ) : null,
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {tablePick && (
        <div
          className="splendor-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="splendor-card-modal-title"
        >
          <div className="splendor-modal">
            <h3 id="splendor-card-modal-title">การ์ดระดับ {tablePick.level}</h3>
            <DevCardFace card={tablePick.card} />
            <div className="splendor-modal-actions">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  send({
                    type: 'buy_table',
                    level: tablePick.level,
                    slot: tablePick.slot,
                  });
                  setTablePick(null);
                }}
              >
                ซื้อ
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!canReserve}
                onClick={() => {
                  send({
                    type: 'reserve_table',
                    level: tablePick.level,
                    slot: tablePick.slot,
                  });
                  setTablePick(null);
                }}
              >
                จอง
              </Button>
              <Button type="button" variant="secondary" onClick={() => setTablePick(null)}>
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
