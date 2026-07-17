import { useMemo } from 'react';
import type { AvalonRole } from 'shared';
import { getTeamForRole } from 'shared';
import { type GameProgressValue } from '../../components/game-shell';
import { DeckCompositionReveal } from '../../components/secret-identity';
import { getAvalonRolePortraitUrl, imageMap } from '../../imageMap';
import { ROLE_DESCRIPTION_TH, ROLE_LABEL } from './avalonRoles';

type Props = {
  roles: AvalonRole[];
  portraitVariants?: number[];
  hasAcknowledged: boolean;
  progress: GameProgressValue;
  onAcknowledge: () => void;
};

export function AvalonCompositionStage({
  roles,
  portraitVariants,
  hasAcknowledged,
  progress,
  onAcknowledge,
}: Props) {
  const slots = useMemo(() => {
    const variants = portraitVariants ?? roles.map(() => 0);
    return roles.map((role, i) => {
      const portraitVariant = variants[i] ?? 0;
      const team = getTeamForRole(role);
      return {
        key: `${role}-${i}-${portraitVariant}`,
        imageSrc: getAvalonRolePortraitUrl(role, portraitVariant),
        label: ROLE_LABEL[role],
        tone: team as 'good' | 'evil',
        description: ROLE_DESCRIPTION_TH[role],
        detailSubtitle: team === 'good' ? 'Arthur & Knights' : 'Minions of Mordred',
      };
    });
  }, [roles, portraitVariants]);

  return (
    <DeckCompositionReveal
      slots={slots}
      cardBackSrc={imageMap.avalon.roleCardBack}
      hasAcknowledged={hasAcknowledged}
      progress={progress}
      onAcknowledge={onAcknowledge}
      title="การ์ดในเกมนี้"
      subtitle="เปิดเผยเฉพาะว่ามีบทอะไรในสำรับ — ไม่บอกว่าใครถือบทไหน (จำชุดนี้ไว้ก่อนรับบทของตัวเอง)"
      acknowledgeLabel="รับทราบการ์ดในเกม"
      acknowledgedLabel="รับทราบแล้ว — รอผู้เล่นคนอื่น"
      progressLabel="รับทราบการ์ดแล้ว"
      readyStatus="บทบาทที่อยู่ในเกมนี้"
      flippingStatus="กำลังเปิดเผยการ์ดในสำรับ…"
    />
  );
}
