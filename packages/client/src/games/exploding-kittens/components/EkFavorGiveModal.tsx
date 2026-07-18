import { useState } from 'react';
import type {
  ExplodingKittensAction,
  ExplodingKittensCardType,
  ExplodingKittensPlayerView,
} from 'shared';
import { Button } from '../../../components/ui';
import { CARD_IMAGE, CARD_LABEL } from '../lib/cardMeta';

type Props = {
  gs: ExplodingKittensPlayerView;
  myId: string;
  sendAction: (action: ExplodingKittensAction) => void;
};

export function EkFavorGiveModal({ gs, myId, sendAction }: Props) {
  const [hoveredFavorCard, setHoveredFavorCard] = useState<ExplodingKittensCardType | null>(null);

  if (gs.phase !== 'favor_give' || gs.favorPrompt?.targetId !== myId) return null;

  return (
    <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
      <div className="modal ek-multi-card-modal" style={{ maxWidth: 380 }}>
        {myId === gs.towerWearerId && (gs.towerStashCount ?? 0) > 0 ? (
          <>
            <h2>คุณถูก Favor — Tower of Power</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              กฎมงกุฎ: ฝ่ายขอจะได้การ์ดสุ่มจาก Tower ของคุณก่อน (ไม่เลือกจากมือ) จน stash หมด
            </p>
            <Button
              variant="primary"
              block
              onClick={() => sendAction({ type: 'favor_give_from_tower' })}
            >
              มอบการ์ดสุ่มจาก Tower ({gs.towerStashCount} ใบในมงกุฎ)
            </Button>
          </>
        ) : (
          <>
            <h2>คุณถูก Favor — เลือกการ์ดที่จะให้</h2>
            <p className="ek-hovered-card-name ek-favor-give-hint">
              {hoveredFavorCard
                ? `กำลังเลือก: ${CARD_LABEL[hoveredFavorCard]}`
                : 'ชี้หรือแตะการ์ดเพื่อดูชื่อ'}
            </p>
            <div className="ek-modal-card-grid ek-modal-card-grid--dense ek-favor-give-grid">
              {gs.myHand.map((c) => (
                <Button
                  key={c.id}
                  variant="ghost"
                  className="ek-modal-card-pick-btn"
                  onMouseEnter={() => setHoveredFavorCard(c.type)}
                  onMouseLeave={() => setHoveredFavorCard(null)}
                  onClick={() => sendAction({ type: 'favor_choose_give', cardId: c.id })}
                >
                  <div className="ek-modal-card-preview">
                    <img
                      src={CARD_IMAGE[c.type]}
                      alt=""
                      className="ek-card-img"
                      loading="lazy"
                      aria-hidden
                    />
                  </div>
                  <div className="ek-card-caption">{CARD_LABEL[c.type]}</div>
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
