import { useMemo } from 'react';
import type { Salem1692TryalComposition } from 'shared';
import { type GameProgressValue } from '../../../components/game-shell';
import { DeckCompositionReveal } from '../../../components/secret-identity';
import { imageMap } from '../../../imageMap';
import { salem1692TryalImage, salem1692TryalLabelTh, TRYAL_BACK_URL } from '../lib/cardMeta';

type Props = {
  composition: Salem1692TryalComposition;
  hasAcknowledged: boolean;
  progress: GameProgressValue;
  onAcknowledge: () => void;
};

export function Salem1692CompositionStage({
  composition,
  hasAcknowledged,
  progress,
  onAcknowledge,
}: Props) {
  const slots = useMemo(() => {
    const out: {
      key: string;
      imageSrc: string;
      label: string;
      tone: 'good' | 'evil' | 'default';
      description: string;
      detailSubtitle: string;
    }[] = [];

    for (let i = 0; i < composition.witch; i += 1) {
      out.push({
        key: `witch-${i}`,
        imageSrc: salem1692TryalImage('witch'),
        label: salem1692TryalLabelTh('witch'),
        tone: 'evil',
        description:
          'มี Witch Tryal ในสำรับ — ผู้ถือใบนี้เป็นทีม Witch (4–5 คน: 1 ใบ · 6–12 คน: 2 ใบ)',
        detailSubtitle: 'Witch Tryal',
      });
    }

    out.push({
      key: 'constable',
      imageSrc: salem1692TryalImage('constable'),
      label: salem1692TryalLabelTh('constable'),
      tone: 'good',
      description: 'Constable ใช้ 1 ใบเสมอ — คืนที่ Night สามารถปกป้องผู้เล่นด้วย Gavel',
      detailSubtitle: 'Constable Tryal',
    });

    out.push({
      key: 'not-witch',
      imageSrc: salem1692TryalImage('not_witch'),
      label: `${salem1692TryalLabelTh('not_witch')} ×${composition.notWitch}`,
      tone: 'default',
      description: `Tryal ที่เหลือในสำรับ (${composition.notWitch} ใบ) — ไม่ใช่ Witch และไม่ใช่ Constable`,
      detailSubtitle: 'Not a Witch',
    });

    return out;
  }, [composition]);

  return (
    <DeckCompositionReveal
      slots={slots}
      cardBackSrc={TRYAL_BACK_URL || imageMap.salem1692.cardBack}
      hasAcknowledged={hasAcknowledged}
      progress={progress}
      onAcknowledge={onAcknowledge}
      title="Tryal ในเกมนี้"
      subtitle="เปิดเผยเฉพาะว่ามี Tryal อะไรในสำรับ — ไม่บอกว่าใครถือใบไหน"
      acknowledgeLabel="รับทราบ Tryal ในเกม"
      acknowledgedLabel="รับทราบแล้ว — รอผู้เล่นคนอื่น"
      progressLabel="รับทราบแล้ว"
      readyStatus="Tryal ที่อยู่ในเกมนี้"
      flippingStatus="กำลังเปิดเผย Tryal ในสำรับ…"
      gridClassName="grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
    />
  );
}
