import { useMemo } from 'react';
import type { GameProgressValue } from '../../../components/game-shell';
import { DeckCompositionReveal } from '../../../components/secret-identity';
import {
  COMPOSITION_ROLE_ORDER,
  INSIDER_CARD_BACK_URL,
  ROLE_REVEAL_META,
  insiderRoleCardUrl,
} from '../lib/roleMeta';

type Props = {
  playerCount: number;
  hasAcknowledged: boolean;
  progress: GameProgressValue;
  onAcknowledge: () => void;
};

export function InsiderCompositionStage({
  playerCount,
  hasAcknowledged,
  progress,
  onAcknowledge,
}: Props) {
  const commonCount = Math.max(1, playerCount - 2);

  const slots = useMemo(
    () =>
      COMPOSITION_ROLE_ORDER.map((role) => {
        const meta = ROLE_REVEAL_META[role];
        const label =
          role === 'common' && commonCount > 1 ? `${meta.title} ×${commonCount}` : meta.title;
        return {
          key: role,
          imageSrc: insiderRoleCardUrl(role),
          label,
          tone: meta.compositionTone,
          description: meta.hint,
          detailSubtitle: meta.affiliation,
        };
      }),
    [commonCount],
  );

  return (
    <DeckCompositionReveal
      slots={slots}
      cardBackSrc={INSIDER_CARD_BACK_URL}
      hasAcknowledged={hasAcknowledged}
      progress={progress}
      onAcknowledge={onAcknowledge}
      title="บทบาทในเกมนี้"
      subtitle="เปิดเผยเฉพาะว่ามีบทอะไรในเกม — ไม่บอกว่าใครถือบทไหน"
      acknowledgeLabel="รับทราบการ์ดในเกม"
      acknowledgedLabel="รับทราบแล้ว — รอผู้เล่นคนอื่น"
      progressLabel="รับทราบการ์ดแล้ว"
      readyStatus="บทบาทที่อยู่ในเกมนี้"
      flippingStatus="กำลังเปิดเผยบทบาททั้งหมด…"
      gridClassName="grid-cols-3"
    />
  );
}
