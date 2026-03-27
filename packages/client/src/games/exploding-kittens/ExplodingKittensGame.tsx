import { useEffect, useState } from 'react';
import type {
  ExplodingKittensAction,
  ExplodingKittensCardType,
  ExplodingKittensPlayerView,
} from 'shared';
import cardAttack from '../../assets/exploding-kittens/attack.jpg';
import cardBeardCat from '../../assets/exploding-kittens/beard-cat.jpg';
import catExplodeGif from '../../assets/exploding-kittens/cat-explode.gif';
import cardCattermelon from '../../assets/exploding-kittens/cattermelon.jpg';
import cardDefuse from '../../assets/exploding-kittens/defuse.jpg';
import cardDrawBottom from '../../assets/exploding-kittens/draw-from-the-bottom.jpg';
import cardExploding from '../../assets/exploding-kittens/exploding.jpg';
import cardFeralCat from '../../assets/exploding-kittens/feral-cat.jpg';
import cardFavor from '../../assets/exploding-kittens/favor.jpg';
import cardPotato from '../../assets/exploding-kittens/hairy-potato-cat.jpg';
import cardNope from '../../assets/exploding-kittens/nope.jpg';
import cardRainbow from '../../assets/exploding-kittens/rainbow-ralphing-cat.jpg';
import cardSeeFuture from '../../assets/exploding-kittens/see-the-future.jpg';
import cardShuffle from '../../assets/exploding-kittens/shuffle.jpg';
import cardSkip from '../../assets/exploding-kittens/skip.jpg';
import cardTaco from '../../assets/exploding-kittens/tacocat.jpg';
import cardTargetedAttack from '../../assets/exploding-kittens/targeted-attack-2x.jpg';
import cardAlterFuture from '../../assets/exploding-kittens/alter-the-future.jpg';
import { startWinCelebrationLoop } from '../../utils/winCelebration';

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
  targeted_attack: 'Targeted Attack',
  draw_from_bottom: 'Draw from the Bottom',
  alter_future: 'Alter the Future',
  nope: 'Nope',
  feral_cat: 'Feral Cat',
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
  targeted_attack: cardTargetedAttack,
  draw_from_bottom: cardDrawBottom,
  alter_future: cardAlterFuture,
  nope: cardNope,
  feral_cat: cardFeralCat,
  cat_taco: cardTaco,
  cat_melon: cardCattermelon,
  cat_beard: cardBeardCat,
  cat_rainbow: cardRainbow,
  cat_potato: cardPotato,
};

function canPlayAsSingle(type: ExplodingKittensCardType): boolean {
  return [
    'attack',
    'targeted_attack',
    'skip',
    'shuffle',
    'see_future',
    'alter_future',
    'draw_from_bottom',
    'favor',
  ].includes(type);
}

const BASE_CAT_TYPES: ExplodingKittensCardType[] = [
  'cat_taco',
  'cat_melon',
  'cat_beard',
  'cat_rainbow',
  'cat_potato',
];

function pickCatComboCards(
  hand: { id: string; type: ExplodingKittensCardType }[],
  comboType: ExplodingKittensCardType,
  count: number,
): { id: string; type: ExplodingKittensCardType }[] | null {
  const exact = hand.filter((c) => c.type === comboType);
  const feral = hand.filter((c) => c.type === 'feral_cat');
  if (exact.length + feral.length < count) return null;
  const picked = [...exact.slice(0, count), ...feral.slice(0, Math.max(0, count - exact.length))];
  return picked.slice(0, count);
}

function ExplosionGif() {
  return (
    <img
      src={catExplodeGif}
      alt="Exploding cat"
      style={{ width: '100%', maxWidth: 360, margin: '0 auto', display: 'block', borderRadius: 12 }}
    />
  );
}

export function ExplodingKittensGame({ gameState: gs, myId, sendAction, onLeave }: Props) {
  const [hoveredFavorCard, setHoveredFavorCard] = useState<ExplodingKittensCardType | null>(null);
  const [defuseInsertIndex, setDefuseInsertIndex] = useState(0);
  const [seenStealNoticeId, setSeenStealNoticeId] = useState<number | null>(null);
  const [showStealPopup, setShowStealPopup] = useState(false);
  const [seenThreeClaimNoticeId, setSeenThreeClaimNoticeId] = useState<number | null>(null);
  const [showThreeClaimPopup, setShowThreeClaimPopup] = useState(false);
  const [threeClaimTargetId, setThreeClaimTargetId] = useState<string | null>(null);
  const [threeClaimComboType, setThreeClaimComboType] = useState<ExplodingKittensCardType | null>(
    null,
  );
  const [selectedFiveCatIds, setSelectedFiveCatIds] = useState<string[]>([]);
  const [alterOrder, setAlterOrder] = useState<[number, number, number]>([0, 1, 2]);
  const isMyTurn = gs.currentPlayerId === myId;
  const aliveOpponents = gs.players.filter((p) => p.id !== myId && p.alive);
  const favorTargetOptions = aliveOpponents.filter((p) => p.handCount > 0);
  const cardTypeCounts = gs.myHand.reduce<Record<ExplodingKittensCardType, number>>(
    (acc, c) => {
      acc[c.type] = (acc[c.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<ExplodingKittensCardType, number>,
  );
  const feralCount = cardTypeCounts.feral_cat ?? 0;
  const pairTypes = BASE_CAT_TYPES.filter((type) => (cardTypeCounts[type] ?? 0) + feralCount >= 2);
  const tripleTypes = BASE_CAT_TYPES.filter(
    (type) => (cardTypeCounts[type] ?? 0) + feralCount >= 3,
  );
  const fiveCatTypes = BASE_CAT_TYPES.filter((type) => (cardTypeCounts[type] ?? 0) >= 1);
  const eligibleFiveCatCards = gs.myHand.filter(
    (c) => c.type.startsWith('cat_') || c.type === 'feral_cat',
  );
  const selectedFiveCatCards = selectedFiveCatIds
    .map((id) => gs.myHand.find((c) => c.id === id))
    .filter((c): c is { id: string; type: ExplodingKittensCardType } => Boolean(c));
  const selectedTypeCount = new Set(selectedFiveCatCards.map((c) => c.type)).size;
  const canPlayFiveCatsCombo =
    selectedFiveCatCards.length === 5 &&
    new Set(selectedFiveCatCards.filter((c) => c.type !== 'feral_cat').map((c) => c.type)).size ===
      selectedFiveCatCards.filter((c) => c.type !== 'feral_cat').length &&
    selectedTypeCount >= 1 &&
    selectedFiveCatCards.every((c) => c.type.startsWith('cat_') || c.type === 'feral_cat');
  const me = gs.players.find((p) => p.id === myId);
  const hasNope = gs.myHand.some((c) => c.type === 'nope');
  const canReactNope = gs.phase === 'reaction' && hasNope && me?.alive;
  const hasPassedReaction =
    gs.phase === 'reaction' && (gs.pendingAction?.passedBy.includes(myId) ?? false);
  const reactionTargetName =
    gs.pendingAction?.targetId != null
      ? (gs.players.find((p) => p.id === gs.pendingAction?.targetId)?.name ?? 'ไม่ทราบชื่อ')
      : null;

  const playSingle = (cardId: string) => sendAction({ type: 'play_card', cardId });
  const playPair = (type: ExplodingKittensCardType, targetId: string) => {
    const same = pickCatComboCards(gs.myHand, type, 2);
    if (!same) return;
    sendAction({ type: 'play_pair', cardIdA: same[0].id, cardIdB: same[1].id, targetId });
  };
  const playThreeClaim = (
    comboType: ExplodingKittensCardType,
    targetId: string,
    requestedType: ExplodingKittensCardType,
  ) => {
    const same = pickCatComboCards(gs.myHand, comboType, 3);
    if (!same) return;
    sendAction({
      type: 'play_three_claim',
      cardIdA: same[0].id,
      cardIdB: same[1].id,
      cardIdC: same[2].id,
      targetId,
      requestedType,
    });
    setThreeClaimComboType(null);
    setThreeClaimTargetId(null);
  };
  const playFiveCats = () => {
    if (!canPlayFiveCatsCombo) return;
    const ids = selectedFiveCatCards.map((c) => c.id);
    sendAction({ type: 'play_five_cats', cardIds: [ids[0], ids[1], ids[2], ids[3], ids[4]] });
    setSelectedFiveCatIds([]);
  };
  const toggleFiveCatCard = (cardId: string) => {
    setSelectedFiveCatIds((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 5) return prev;
      return [...prev, cardId];
    });
  };
  const reactNope = () => {
    const nopeCard = gs.myHand.find((c) => c.type === 'nope');
    if (!nopeCard) return;
    sendAction({ type: 'react_nope', cardId: nopeCard.id });
  };

  useEffect(() => {
    if (gs.phase !== 'game_over') return;
    return startWinCelebrationLoop();
  }, [gs.phase]);

  useEffect(() => {
    if (gs.phase !== 'defuse_reinsert') return;
    const max = gs.drawPileCount;
    setDefuseInsertIndex((prev) => Math.max(0, Math.min(prev, max)));
  }, [gs.phase, gs.drawPileCount]);

  useEffect(() => {
    const notice = gs.stealNotice;
    if (!notice) return;
    if (seenStealNoticeId === notice.id) return;
    setSeenStealNoticeId(notice.id);
    setShowStealPopup(true);
  }, [gs.stealNotice, seenStealNoticeId]);

  useEffect(() => {
    if (!showStealPopup || !gs.stealNotice) return;
    // Spectators (non-involved players) don't see the stolen card type;
    // auto-dismiss their popup so flow stays fast.
    if (gs.stealNotice.cardType !== undefined) return;
    const t = window.setTimeout(() => setShowStealPopup(false), 2500);
    return () => window.clearTimeout(t);
  }, [showStealPopup, gs.stealNotice]);

  useEffect(() => {
    const notice = gs.threeClaimNotice;
    if (!notice) return;
    if (seenThreeClaimNoticeId === notice.id) return;
    setSeenThreeClaimNoticeId(notice.id);
    setShowThreeClaimPopup(true);
  }, [gs.threeClaimNotice, seenThreeClaimNoticeId]);

  useEffect(() => {
    // Keep selection valid when hand changes
    setSelectedFiveCatIds((prev) => prev.filter((id) => gs.myHand.some((c) => c.id === id)));
  }, [gs.myHand]);

  useEffect(() => {
    if (!gs.alterFuturePrompt) return;
    setAlterOrder([0, 1, 2]);
  }, [gs.alterFuturePrompt?.playerId]);

  return (
    <div className="page container">
      {showStealPopup && gs.stealNotice && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>🃏 มีการขโมยการ์ด</h2>
            <p>
              <strong>{gs.stealNotice.actorName}</strong> ขโมยการ์ดจาก{' '}
              <strong>{gs.stealNotice.targetName}</strong>
            </p>
            {gs.stealNotice.cardType ? (
              <div className="ek-steal-popup-card">
                <img
                  src={CARD_IMAGE[gs.stealNotice.cardType]}
                  alt={CARD_LABEL[gs.stealNotice.cardType]}
                  className="ek-card-img"
                  loading="lazy"
                />
                <div className="ek-card-caption">
                  การ์ดที่เกี่ยวข้อง: <strong>{CARD_LABEL[gs.stealNotice.cardType]}</strong>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>การ์ดที่ถูกขโมยเป็นข้อมูลส่วนตัว</p>
            )}
            <button className="btn btn-primary btn-block" onClick={() => setShowStealPopup(false)}>
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {showThreeClaimPopup && gs.threeClaimNotice && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>🧩 ผลคอมโบ 3 ใบ</h2>
            <p>
              <strong>{gs.threeClaimNotice.actorName}</strong> เรียกการ์ด{' '}
              <strong>{CARD_LABEL[gs.threeClaimNotice.requestedType]}</strong> จาก{' '}
              <strong>{gs.threeClaimNotice.targetName}</strong>
            </p>
            <div className="ek-steal-popup-card">
              <img
                src={CARD_IMAGE[gs.threeClaimNotice.requestedType]}
                alt={CARD_LABEL[gs.threeClaimNotice.requestedType]}
                className="ek-card-img"
                loading="lazy"
              />
              <div className="ek-card-caption">
                {gs.threeClaimNotice.success
                  ? '✅ เป้าหมายมีการ์ดที่เรียก'
                  : '❌ เป้าหมายไม่มีการ์ดที่เรียก'}
              </div>
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={() => setShowThreeClaimPopup(false)}
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {gs.phase === 'explosion_reveal' && gs.explosionReveal && (
        <div className="ek-explosion-overlay" role="dialog" aria-modal="true">
          <div className="ek-explosion-modal">
            <h2>💥 EXPLODING KITTEN!</h2>
            <p>
              <strong>{gs.explosionReveal.playerName}</strong> จั่วการ์ดระเบิด!
            </p>
            <ExplosionGif />
            <p className="ek-explosion-note">
              {gs.explosionReveal.hasDefuse ? 'ต้องกดใช้ Defuse' : 'ถ้าไม่มี Defuse จะตายทันที'}
            </p>
          </div>
        </div>
      )}

      <div className="phase-header">
        <h1>Exploding Kittens ({gs.mode})</h1>
        <div className="ek-status-grid">
          <div className="ek-status-item">
            <div className="ek-status-label">ชื่อผู้เล่นของคุณ</div>
            <div className="ek-status-value">{me?.name ?? '-'}</div>
          </div>
          <div className="ek-status-item highlight">
            <div className="ek-status-label">ตาปัจจุบัน</div>
            <div className="ek-status-value">{gs.currentPlayerName}</div>
            <div className="ek-status-sub">เหลือ {gs.pendingTurnsForCurrent} เทิร์น</div>
          </div>
          <div className="ek-status-item">
            <div className="ek-status-label">Draw Pile</div>
            <div className="ek-status-value">{gs.drawPileCount} ใบ</div>
          </div>
          <div className="ek-status-item">
            <div className="ek-status-label">Discard Pile</div>
            <div className="ek-status-value">{gs.discardCount} ใบ</div>
            <div className="ek-status-sub">
              ใบบนสุด: {gs.discardTop ? CARD_LABEL[gs.discardTop] : 'ยังไม่มี'}
            </div>
          </div>
        </div>
        {gs.lastEvent && <p className="ek-last-event">ล่าสุด: {gs.lastEvent}</p>}
      </div>

      {gs.phase === 'game_over' && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal" style={{ textAlign: 'center' }}>
            <h2>🏆 เกมจบแล้ว</h2>
            <p>
              ผู้ชนะ: <strong>{gs.winnerName ?? gs.winnerId}</strong>
            </p>
            <button className="btn btn-primary btn-block" onClick={onLeave}>
              กลับห้อง
            </button>
          </div>
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
                <img
                  src={CARD_IMAGE[t]}
                  alt={CARD_LABEL[t]}
                  className="ek-card-img"
                  loading="lazy"
                />
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
                <img
                  src={CARD_IMAGE[t]}
                  alt={CARD_LABEL[t]}
                  className="ek-card-img"
                  loading="lazy"
                />
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
            <strong>{gs.pendingAction?.actorName}</strong> · Nope chain:{' '}
            {gs.pendingAction?.nopeCount ?? 0}
          </p>
          {gs.pendingAction?.type === 'favor' && reactionTargetName && (
            <p style={{ color: 'var(--accent-hover)' }}>
              Favor target: <strong>{reactionTargetName}</strong>
            </p>
          )}
          <p style={{ color: 'var(--text-secondary)' }}>
            ตอบสนองแล้ว {gs.pendingAction?.passedBy.length ?? 0}/
            {gs.players.filter((p) => p.alive).length} คน
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

      {gs.phase === 'targeted_attack_target' && gs.targetedAttackPrompt?.fromId === myId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>เลือกเป้าหมาย Targeted Attack</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            ผู้เล่นที่ถูกเลือกจะต้องเล่น 2 เทิร์นติด
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {aliveOpponents.map((p) => (
              <button
                key={p.id}
                className="btn btn-secondary"
                onClick={() =>
                  sendAction({ type: 'targeted_attack_choose_target', targetId: p.id })
                }
              >
                เลือก {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {gs.phase === 'favor_give' && gs.favorPrompt?.targetId === myId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>คุณถูก Favor — เลือกการ์ดที่จะให้</h3>
          <p className="ek-hovered-card-name">
            {hoveredFavorCard
              ? `กำลังเลือก: ${CARD_LABEL[hoveredFavorCard]}`
              : 'เลื่อนเมาส์บนการ์ดเพื่อดูชื่อ'}
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
                <img
                  src={CARD_IMAGE[c.type]}
                  alt={CARD_LABEL[c.type]}
                  className="ek-card-img"
                  loading="lazy"
                />
                <div className="ek-card-caption">{CARD_LABEL[c.type]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {gs.phase === 'defuse_reinsert' && gs.defusePrompt?.playerId === myId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Defuse สำเร็จ — ใส่ Exploding Kitten กลับกอง</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            เลือกตำแหน่งเจาะจงได้ (0 = บนสุด, {gs.drawPileCount} = ล่างสุด)
          </p>
          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            <input
              type="range"
              min={0}
              max={gs.drawPileCount}
              value={defuseInsertIndex}
              onChange={(e) => setDefuseInsertIndex(Number(e.target.value))}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="defuse-index-input">ตำแหน่ง</label>
              <input
                id="defuse-index-input"
                className="input"
                style={{ width: 90 }}
                type="number"
                min={0}
                max={gs.drawPileCount}
                value={defuseInsertIndex}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (Number.isNaN(next)) return;
                  setDefuseInsertIndex(Math.max(0, Math.min(next, gs.drawPileCount)));
                }}
              />
              <button
                className="btn btn-primary"
                onClick={() => sendAction({ type: 'defuse_reinsert', index: defuseInsertIndex })}
              >
                ยืนยันตำแหน่ง
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => sendAction({ type: 'defuse_reinsert', index: 0 })}
            >
              วางบนสุด
            </button>
            <button
              className="btn btn-secondary"
              onClick={() =>
                sendAction({ type: 'defuse_reinsert', index: Math.floor(gs.drawPileCount / 2) })
              }
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

      {gs.phase === 'alter_future_reorder' && gs.alterFuturePrompt?.playerId === myId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Alter the Future — จัดลำดับ 3 ใบบนสุด</h3>
          <div className="ek-card-grid" style={{ marginBottom: 10 }}>
            {alterOrder.map((idx, pos) => {
              const t = gs.alterFuturePrompt?.top3[idx];
              if (!t) return null;
              return (
                <div key={`alter-${idx}-${pos}`} className="ek-card-figure">
                  <img
                    src={CARD_IMAGE[t]}
                    alt={CARD_LABEL[t]}
                    className="ek-card-img"
                    loading="lazy"
                  />
                  <div className="ek-card-caption">
                    ตำแหน่ง {pos + 1}: {CARD_LABEL[t]}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setAlterOrder(([a, b, c]) => [b, c, a])}
            >
              หมุนซ้าย
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setAlterOrder(([a, b, c]) => [c, a, b])}
            >
              หมุนขวา
            </button>
            <button
              className="btn btn-primary"
              onClick={() => sendAction({ type: 'alter_future_reorder', order: alterOrder })}
            >
              ยืนยันลำดับ
            </button>
          </div>
        </div>
      )}

      {gs.phase === 'defuse_prompt' && gs.defusePrompt?.playerId === myId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>คุณมี Defuse — กดเพื่อใช้</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 10 }}>
            หลังใช้ Defuse คุณจะเลือกตำแหน่งวาง Exploding Kitten กลับเข้ากองได้
          </p>
          <button className="btn btn-primary" onClick={() => sendAction({ type: 'use_defuse' })}>
            ใช้ Defuse
          </button>
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
                <img
                  src={CARD_IMAGE[c.type]}
                  alt={CARD_LABEL[c.type]}
                  className="ek-card-img"
                  loading="lazy"
                />
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
                  <button
                    key={p.id}
                    className="btn btn-secondary"
                    onClick={() => playPair(t, p.id)}
                  >
                    ขโมยจาก {p.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {gs.phase === 'turn' && isMyTurn && fiveCatTypes.length >= 5 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>คอมโบ 5 แมวต่างกัน</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            ใช้แมวคนละชนิด 5 ใบ เพื่อหยิบการ์ด 1 ใบจากกองทิ้ง (คอมโบนี้โดน Nope ได้)
          </p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            เลือกแล้ว {selectedFiveCatCards.length}/5 ใบ • ชนิดไม่ซ้ำ {selectedTypeCount}/5
          </p>
          <div className="ek-card-grid" style={{ marginBottom: 10 }}>
            {eligibleFiveCatCards.map((card) => {
              const selected = selectedFiveCatIds.includes(card.id);
              return (
                <button
                  key={`five-cat-select-${card.id}`}
                  className="ek-hand-card-button"
                  style={
                    selected
                      ? { borderColor: 'var(--accent)', boxShadow: 'var(--shadow-sm)' }
                      : undefined
                  }
                  onClick={() => toggleFiveCatCard(card.id)}
                >
                  <img
                    src={CARD_IMAGE[card.type]}
                    alt={CARD_LABEL[card.type]}
                    className="ek-card-img"
                    loading="lazy"
                  />
                  <div className="ek-card-caption">{CARD_LABEL[card.type]}</div>
                </button>
              );
            })}
          </div>
          <button
            className="btn btn-primary"
            disabled={!canPlayFiveCatsCombo}
            onClick={playFiveCats}
          >
            เล่นคอมโบ 5 แมวต่างกัน
          </button>
        </div>
      )}

      {gs.phase === 'five_cats_pick_discard' && gs.fiveCatsPrompt?.pickerId === myId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>เลือกการ์ดจากกองทิ้ง</h3>
          {gs.discardCards.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>กองทิ้งว่าง — ยังหยิบไม่ได้</p>
          ) : (
            <div className="ek-card-grid ek-discard-grid">
              {gs.discardCards.map((card, i) => (
                <button
                  key={`pick-discard-${card.id}`}
                  className="ek-hand-card-button"
                  onClick={() =>
                    sendAction({ type: 'five_cats_pick_discard', discardCardId: card.id })
                  }
                >
                  <img
                    src={CARD_IMAGE[card.type]}
                    alt={CARD_LABEL[card.type]}
                    className="ek-card-img"
                    loading="lazy"
                  />
                  <div className="ek-card-caption">
                    เลือก #{i + 1} {CARD_LABEL[card.type]}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {gs.phase === 'turn' && isMyTurn && tripleTypes.length > 0 && aliveOpponents.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>เล่น 3 ใบเหมือนกัน (เลือกชนิดการ์ดที่อยากได้)</h3>
          {tripleTypes.map((t) => (
            <div key={t} style={{ marginBottom: 14 }}>
              <strong>{CARD_LABEL[t]}</strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {aliveOpponents.map((p) => (
                  <button
                    key={p.id}
                    className={`btn ${threeClaimTargetId === p.id && threeClaimComboType === t ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setThreeClaimComboType(t);
                      setThreeClaimTargetId(p.id);
                    }}
                  >
                    เลือกเป้า {p.name}
                  </button>
                ))}
              </div>
              {threeClaimComboType === t && threeClaimTargetId && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>
                    เลือกชนิดการ์ดที่ต้องการจาก{' '}
                    <strong>
                      {gs.players.find((p) => p.id === threeClaimTargetId)?.name ?? 'เป้าหมาย'}
                    </strong>
                  </p>
                  <div className="ek-card-grid">
                    {(Object.keys(CARD_LABEL) as ExplodingKittensCardType[]).map((wanted) => (
                      <button
                        key={`${t}-${threeClaimTargetId}-${wanted}`}
                        className="ek-hand-card-button"
                        onClick={() => playThreeClaim(t, threeClaimTargetId, wanted)}
                      >
                        <img
                          src={CARD_IMAGE[wanted]}
                          alt={CARD_LABEL[wanted]}
                          className="ek-card-img"
                          loading="lazy"
                        />
                        <div className="ek-card-caption">{CARD_LABEL[wanted]}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
