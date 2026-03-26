import { useState } from 'react';
import type { ExplodingKittensAction, ExplodingKittensCardType, ExplodingKittensPlayerView } from 'shared';
import cardAttack from '../../assets/exploding-kittens/attack.jpg';
import cardBeardCat from '../../assets/exploding-kittens/beard-cat.jpg';
import cardCattermelon from '../../assets/exploding-kittens/cattermelon.jpg';
import cardDefuse from '../../assets/exploding-kittens/defuse.jpg';
import cardExploding from '../../assets/exploding-kittens/exploding.jpg';
import cardFavor from '../../assets/exploding-kittens/favor.jpg';
import cardPotato from '../../assets/exploding-kittens/hairy-potato-cat.jpg';
import cardNope from '../../assets/exploding-kittens/nope.jpg';
import cardRainbow from '../../assets/exploding-kittens/rainbow-ralphing-cat.jpg';
import cardSeeFuture from '../../assets/exploding-kittens/see-the-future.jpg';
import cardShuffle from '../../assets/exploding-kittens/shuffle.jpg';
import cardSkip from '../../assets/exploding-kittens/skip.jpg';
import cardTaco from '../../assets/exploding-kittens/tacocat.jpg';

interface Props {
  gameState: ExplodingKittensPlayerView;
  myId: string;
  sendAction: (action: ExplodingKittensAction) => void;
  onLeave: () => void;
}

const CARD_LABEL: Record<ExplodingKittensCardType, string> = {
  exploding_kitten: 'Exploding Kitten',
  defuse: 'Defuse',
  attack: 'Attack',
  skip: 'Skip',
  shuffle: 'Shuffle',
  see_future: 'See the Future',
  favor: 'Favor',
  nope: 'Nope',
  cat_taco: 'Taco Cat',
  cat_melon: 'Cattermelon',
  cat_beard: 'Beard Cat',
  cat_rainbow: 'Rainbow Cat',
  cat_potato: 'Hairy Potato Cat',
};

const CARD_IMAGE: Record<ExplodingKittensCardType, string> = {
  exploding_kitten: cardExploding,
  defuse: cardDefuse,
  attack: cardAttack,
  skip: cardSkip,
  shuffle: cardShuffle,
  see_future: cardSeeFuture,
  favor: cardFavor,
  nope: cardNope,
  cat_taco: cardTaco,
  cat_melon: cardCattermelon,
  cat_beard: cardBeardCat,
  cat_rainbow: cardRainbow,
  cat_potato: cardPotato,
};

function canPlayAsSingle(type: ExplodingKittensCardType): boolean {
  return ['attack', 'skip', 'shuffle', 'see_future', 'favor'].includes(type);
}

export function ExplodingKittensGame({ gameState: gs, myId, sendAction, onLeave }: Props) {
  const [hoveredFavorCard, setHoveredFavorCard] = useState<ExplodingKittensCardType | null>(null);
  const isMyTurn = gs.currentPlayerId === myId;
  const aliveOpponents = gs.players.filter((p) => p.id !== myId && p.alive);
  const favorTargetOptions = aliveOpponents.filter((p) => p.handCount > 0);
  const cardTypeCounts = gs.myHand.reduce<Record<ExplodingKittensCardType, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {} as Record<ExplodingKittensCardType, number>);
  const pairTypes = Object.entries(cardTypeCounts)
    .filter(([type, count]) => type.startsWith('cat_') && count >= 2)
    .map(([type]) => type as ExplodingKittensCardType);
  const me = gs.players.find((p) => p.id === myId);
  const hasNope = gs.myHand.some((c) => c.type === 'nope');
  const canReactNope = gs.phase === 'reaction' && hasNope && me?.alive;
  const hasPassedReaction = gs.phase === 'reaction' && (gs.pendingAction?.passedBy.includes(myId) ?? false);

  const playSingle = (cardId: string) => sendAction({ type: 'play_card', cardId });
  const playPair = (type: ExplodingKittensCardType, targetId: string) => {
    const same = gs.myHand.filter((c) => c.type === type).slice(0, 2);
    if (same.length < 2) return;
    sendAction({ type: 'play_pair', cardIdA: same[0].id, cardIdB: same[1].id, targetId });
  };
  const reactNope = () => {
    const nopeCard = gs.myHand.find((c) => c.type === 'nope');
    if (!nopeCard) return;
    sendAction({ type: 'react_nope', cardId: nopeCard.id });
  };

  return (
    <div className="page container">
      <div className="phase-header">
        <h1>Exploding Kittens ({gs.mode})</h1>
        <p>
          ตาปัจจุบัน: <strong>{gs.currentPlayerName}</strong> ({gs.pendingTurnsForCurrent} เทิร์นค้าง)
        </p>
        <p>
          Draw pile: <strong>{gs.drawPileCount}</strong> ใบ · Discard: <strong>{gs.discardCount}</strong>{' '}
          {gs.discardTop ? `(${CARD_LABEL[gs.discardTop]})` : ''}
        </p>
        {gs.lastEvent && <p style={{ color: 'var(--text-secondary)' }}>ล่าสุด: {gs.lastEvent}</p>}
      </div>

      {gs.phase === 'game_over' && (
        <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
          <h2>🏆 เกมจบแล้ว</h2>
          <p>
            ผู้ชนะ: <strong>{gs.winnerName ?? gs.winnerId}</strong>
          </p>
          <button className="btn btn-primary" onClick={onLeave}>
            กลับห้อง
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>ผู้เล่น</h3>
        <div className="vote-results">
          {gs.players.map((p) => (
            <div key={p.id} className={`vote-result-item ${p.alive ? 'approve' : 'reject'}`}>
              <div>
                {p.name} {p.id === gs.currentPlayerId ? '👈' : ''}
              </div>
              <div style={{ fontSize: 12 }}>มือ {p.handCount} ใบ</div>
            </div>
          ))}
        </div>
      </div>

      {gs.seenTopCards && gs.seenTopCards.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>See the Future (Top 3)</h3>
          <div className="ek-card-grid">
            {gs.seenTopCards.map((t, i) => (
              <div key={`${t}-${i}`} className="ek-card-figure">
                <img src={CARD_IMAGE[t]} alt={CARD_LABEL[t]} className="ek-card-img" loading="lazy" />
                <div className="ek-card-caption">
                  {i + 1}. {CARD_LABEL[t]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>กองทิ้ง (ใหม่ → เก่า)</h3>
        {gs.discardHistory.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>ยังไม่มีการ์ดในกองทิ้ง</p>
        ) : (
          <div className="ek-card-grid ek-discard-grid">
            {gs.discardHistory.map((t, i) => (
              <div key={`${t}-${i}`} className="ek-card-figure">
                <img src={CARD_IMAGE[t]} alt={CARD_LABEL[t]} className="ek-card-img" loading="lazy" />
                <div className="ek-card-caption">
                  #{i + 1} {CARD_LABEL[t]}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {gs.phase === 'reaction' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Reaction Window</h3>
          <p>
            การ์ดที่กำลังรอ resolve: <strong>{gs.pendingAction?.type}</strong> โดย{' '}
            <strong>{gs.pendingAction?.actorName}</strong> · Nope chain: {gs.pendingAction?.nopeCount ?? 0}
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            ตอบสนองแล้ว {gs.pendingAction?.passedBy.length ?? 0}/{gs.players.filter((p) => p.alive).length} คน
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-danger" disabled={!canReactNope} onClick={reactNope}>
              Nope
            </button>
            <button
              className="btn btn-secondary"
              disabled={hasPassedReaction}
              onClick={() => sendAction({ type: 'react_pass' })}
            >
              {hasPassedReaction ? 'Pass แล้ว' : 'Pass'}
            </button>
          </div>
        </div>
      )}

      {gs.phase === 'favor_target' && isMyTurn && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>เลือกเป้าหมาย Favor</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {favorTargetOptions.map((p) => (
              <button
                key={p.id}
                className="btn btn-secondary"
                onClick={() => sendAction({ type: 'favor_choose_target', targetId: p.id })}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {gs.phase === 'favor_give' && gs.favorPrompt?.targetId === myId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>คุณถูก Favor — เลือกการ์ดที่จะให้</h3>
          <p className="ek-hovered-card-name">
            {hoveredFavorCard ? `กำลังเลือก: ${CARD_LABEL[hoveredFavorCard]}` : 'เลื่อนเมาส์บนการ์ดเพื่อดูชื่อ'}
          </p>
          <div className="ek-card-grid">
            {gs.myHand.map((c) => (
              <button
                key={c.id}
                className="ek-hand-card-button"
                onMouseEnter={() => setHoveredFavorCard(c.type)}
                onMouseLeave={() => setHoveredFavorCard(null)}
                onClick={() => sendAction({ type: 'favor_choose_give', cardId: c.id })}
              >
                <img src={CARD_IMAGE[c.type]} alt={CARD_LABEL[c.type]} className="ek-card-img" loading="lazy" />
                <div className="ek-card-caption">{CARD_LABEL[c.type]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {gs.phase === 'defuse_reinsert' && gs.defusePrompt?.playerId === myId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Defuse สำเร็จ — ใส่ Exploding Kitten กลับกอง</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => sendAction({ type: 'defuse_reinsert', index: 0 })}>
              วางบนสุด
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => sendAction({ type: 'defuse_reinsert', index: Math.floor(gs.drawPileCount / 2) })}
            >
              วางกลางกอง
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => sendAction({ type: 'defuse_reinsert', index: gs.drawPileCount })}
            >
              วางล่างสุด
            </button>
          </div>
        </div>
      )}

      {gs.phase === 'turn' && isMyTurn && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>แอ็กชันของคุณ</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => sendAction({ type: 'draw_card' })}>
              Draw
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>มือของคุณ ({gs.myHand.length} ใบ)</h3>
        <div className="ek-card-grid">
          {gs.myHand.map((c) => {
            const singlePlayable = gs.phase === 'turn' && isMyTurn && canPlayAsSingle(c.type);
            return (
              <button
                key={c.id}
                className="ek-hand-card-button"
                disabled={!singlePlayable}
                onClick={() => playSingle(c.id)}
              >
                <img src={CARD_IMAGE[c.type]} alt={CARD_LABEL[c.type]} className="ek-card-img" loading="lazy" />
                <div className="ek-card-caption">{CARD_LABEL[c.type]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {gs.phase === 'turn' && isMyTurn && pairTypes.length > 0 && aliveOpponents.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>เล่นคู่แมว (ขโมยการ์ดสุ่ม)</h3>
          {pairTypes.map((t) => (
            <div key={t} style={{ marginBottom: 10 }}>
              <strong>{CARD_LABEL[t]}</strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {aliveOpponents.map((p) => (
                  <button key={p.id} className="btn btn-secondary" onClick={() => playPair(t, p.id)}>
                    ขโมยจาก {p.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-danger" onClick={onLeave}>
          ออกจากห้อง
        </button>
      </div>
    </div>
  );
}
