import { useMemo } from 'react';
import type { OnuwPlayerView } from 'shared';
import { ONUW_ROLE_DESCRIPTION_TH, onuwTeamForRole } from 'shared';
import type { GameProgressValue } from '../../components/game-shell';
import { DeckCompositionReveal } from '../../components/secret-identity';
import { onuwCardBackUrl, onuwRoleCardUrl } from '../../imageMap';
import { ROLE_LABEL_EN, buildOrderedCompositionSlots, teamTone } from './onuwRoles';

type Props = {
  rolesInPlay: OnuwPlayerView['rolesInPlay'];
  hasAcknowledged: boolean;
  progress: GameProgressValue;
  onAcknowledge: () => void;
};

export function OnuwCompositionStage({
  rolesInPlay,
  hasAcknowledged,
  progress,
  onAcknowledge,
}: Props) {
  const slots = useMemo(
    () =>
      buildOrderedCompositionSlots(rolesInPlay).map((slot) => ({
        key: slot.slotKey,
        imageSrc: onuwRoleCardUrl(slot.artKey),
        label: slot.label,
        tone: teamTone(onuwTeamForRole(slot.role)),
        description: ONUW_ROLE_DESCRIPTION_TH[slot.role],
        detailSubtitle: ROLE_LABEL_EN[slot.role],
      })),
    [rolesInPlay],
  );

  return (
    <DeckCompositionReveal
      slots={slots}
      cardBackSrc={onuwCardBackUrl()}
      hasAcknowledged={hasAcknowledged}
      progress={progress}
      onAcknowledge={onAcknowledge}
      title="การ์ดในเกมนี้"
      subtitle="สุ่มจากกล่องให้ครบผู้เล่น + การ์ดกลาง 3 ใบ — เรียงตามลำดับแอ็กชันกลางคืน (จำชุดนี้ไว้ก่อนเริ่มคืน)"
      acknowledgeLabel="รับทราบการ์ดในเกม"
      acknowledgedLabel="รับทราบแล้ว — รอผู้เล่นคนอื่น"
      progressLabel="รับทราบการ์ดแล้ว"
      readyStatus="บทบาทที่อยู่ในเกมนี้"
      flippingStatus="กำลังเปิดเผยการ์ดในสำรับ…"
    />
  );
}
