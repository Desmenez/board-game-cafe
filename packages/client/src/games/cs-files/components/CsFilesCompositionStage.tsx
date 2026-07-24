import { useMemo } from 'react';
import type { CsFilesRole } from 'shared';
import type { GameProgressValue } from '../../../components/game-shell';
import { DeckCompositionReveal } from '../../../components/secret-identity';
import {
  COMPOSITION_ROLE_ORDER,
  CS_FILES_ROLE_BACK_URL,
  ROLE_REVEAL_META,
  csFilesRoleCardUrl,
} from '../lib/roleMeta';

type Props = {
  rolesInPlay: CsFilesRole[];
  hasAcknowledged: boolean;
  progress: GameProgressValue;
  onAcknowledge: () => void;
};

export function CsFilesCompositionStage({
  rolesInPlay,
  hasAcknowledged,
  progress,
  onAcknowledge,
}: Props) {
  const counts = useMemo(() => {
    const c: Partial<Record<CsFilesRole, number>> = {};
    for (const r of rolesInPlay) c[r] = (c[r] ?? 0) + 1;
    return c;
  }, [rolesInPlay]);

  const slots = useMemo(
    () =>
      COMPOSITION_ROLE_ORDER.filter((role) => (counts[role] ?? 0) > 0).map((role) => {
        const meta = ROLE_REVEAL_META[role];
        const n = counts[role] ?? 1;
        const label = n > 1 ? `${meta.title} ×${n}` : meta.title;
        return {
          key: role,
          imageSrc: csFilesRoleCardUrl(role),
          label,
          tone: meta.compositionTone,
          description: meta.hint,
          detailSubtitle: meta.affiliation,
        };
      }),
    [counts],
  );

  return (
    <DeckCompositionReveal
      slots={slots}
      cardBackSrc={CS_FILES_ROLE_BACK_URL}
      hasAcknowledged={hasAcknowledged}
      progress={progress}
      onAcknowledge={onAcknowledge}
      title="บทบาทในเกมนี้"
      subtitle="เปิดเผยเฉพาะว่ามีบทอะไรในเกม — ไม่บอกว่าใครถือบทไหน (ยกเว้นนักนิติฯ ที่จะเปิดเผยตัว)"
      acknowledgeLabel="รับทราบการ์ดในเกม"
      acknowledgedLabel="รับทราบแล้ว — รอผู้เล่นคนอื่น"
      progressLabel="รับทราบการ์ดแล้ว"
      readyStatus="บทบาทที่อยู่ในเกมนี้"
      flippingStatus="กำลังเปิดเผยบทบาททั้งหมด…"
      gridClassName="grid-cols-2 sm:grid-cols-3"
    />
  );
}
