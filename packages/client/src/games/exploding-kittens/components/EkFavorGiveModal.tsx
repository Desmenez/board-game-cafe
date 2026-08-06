import { useState } from 'react';
import type {
  ExplodingKittensAction,
  ExplodingKittensCardType,
  ExplodingKittensPlayerView,
} from 'shared';
import { Button } from '../../../components/ui';
import { CARD_LABEL } from '../lib/cardMeta';
import { EkModalCard } from './EkModalCard';
import { EkModalShell } from './EkModalShell';

type Props = {
  gs: ExplodingKittensPlayerView;
  myId: string;
  sendAction: (action: ExplodingKittensAction) => void;
};

export function EkFavorGiveModal({ gs, myId, sendAction }: Props) {
  const [hoveredFavorCard, setHoveredFavorCard] = useState<ExplodingKittensCardType | null>(null);

  if (gs.phase !== 'favor_give' || gs.favorPrompt?.targetId !== myId) return null;

  const fromId = gs.favorPrompt.fromId;
  const fromPlayer = gs.players.find((p) => p.id === fromId);
  const me = gs.players.find((p) => p.id === myId);
  const towerMode = myId === gs.towerWearerId && (gs.towerStashCount ?? 0) > 0;

  return (
    <EkModalShell
      layout="wide"
      title={towerMode ? 'คุณถูก Favor — Tower of Power' : 'คุณถูก Favor — เลือกการ์ดที่จะให้'}
      media={
        towerMode ? (
          <div className="ek-modal-shell__media--compact">
            <EkModalCard size="hero" cardType="favor" />
          </div>
        ) : undefined
      }
      actors={{
        from: {
          id: fromId,
          name: fromPlayer?.name ?? 'ผู้ขอ',
          role: 'ผู้เล่น Favor',
        },
        to: {
          id: myId,
          name: me?.name ?? 'คุณ',
          role: 'เป้าหมาย',
        },
      }}
      actionLine={
        towerMode
          ? {
              label: 'แอ็กชัน',
              value: 'มอบการ์ดสุ่มจาก Tower จน stash หมด',
            }
          : {
              label: 'แอ็กชัน',
              value: hoveredFavorCard
                ? `กำลังเลือก: ${CARD_LABEL[hoveredFavorCard]}`
                : 'เลือกการ์ดจากมือเพื่อมอบ',
            }
      }
      footer={
        towerMode ? (
          <Button
            variant="primary"
            onClick={() => sendAction({ type: 'favor_give_from_tower' })}
          >
            มอบการ์ดสุ่มจาก Tower ({gs.towerStashCount} ใบในมงกุฎ)
          </Button>
        ) : undefined
      }
    >
      {!towerMode ? (
        <div className="ek-modal-pick-scroll">
          <div className="ek-modal-card-grid ek-modal-card-grid--4">
            {gs.myHand.map((c) => (
              <div
                key={c.id}
                onMouseEnter={() => setHoveredFavorCard(c.type)}
                onMouseLeave={() => setHoveredFavorCard(null)}
              >
                <EkModalCard
                  size="grid"
                  cardType={c.type}
                  onClick={() => sendAction({ type: 'favor_choose_give', cardId: c.id })}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="ek-modal-shell__hint">
          กฎมงกุฎ: ฝ่ายขอจะได้การ์ดสุ่มจาก Tower ของคุณก่อน (ไม่เลือกจากมือ)
        </p>
      )}
    </EkModalShell>
  );
}
