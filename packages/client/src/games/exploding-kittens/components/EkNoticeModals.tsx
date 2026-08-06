import type { ExplodingKittensPlayerView } from 'shared';
import { Button } from '../../../components/ui';
import { CARD_LABEL } from '../lib/cardMeta';
import { EkModalCard } from './EkModalCard';
import { EkModalShell } from './EkModalShell';

type Props = {
  gs: ExplodingKittensPlayerView;
  showStealPopup: boolean;
  showThreeClaimPopup: boolean;
  showFiveCatsDiscardPickPopup: boolean;
  onDismissSteal: () => void;
  onDismissThreeClaim: () => void;
  onDismissFiveCats: () => void;
};

export function EkNoticeModals({
  gs,
  showStealPopup,
  showThreeClaimPopup,
  showFiveCatsDiscardPickPopup,
  onDismissSteal,
  onDismissThreeClaim,
  onDismissFiveCats,
}: Props) {
  return (
    <>
      {showStealPopup && gs.stealNotice && (
        <EkModalShell
          title="มีการขโมยการ์ด"
          actors={{
            from: {
              id: gs.stealNotice.actorId,
              name: gs.stealNotice.actorName,
              role: 'ผู้ขโมย',
            },
            to: {
              id: gs.stealNotice.targetId,
              name: gs.stealNotice.targetName,
              role: 'เป้าหมาย',
            },
          }}
          media={
            gs.stealNotice.cardType ? (
              <EkModalCard size="hero" cardType={gs.stealNotice.cardType} />
            ) : undefined
          }
          actionLine={
            gs.stealNotice.cardType
              ? {
                  label: 'การ์ดที่เกี่ยวข้อง',
                  value: CARD_LABEL[gs.stealNotice.cardType],
                }
              : { label: 'การ์ด', value: 'ข้อมูลส่วนตัว — ไม่เปิดเผยชนิด' }
          }
          footer={
            <Button variant="primary" onClick={onDismissSteal}>
              รับทราบ
            </Button>
          }
        />
      )}

      {showThreeClaimPopup && gs.threeClaimNotice && (
        <EkModalShell
          title="ผลคอมโบ 3 ใบ"
          actors={{
            from: {
              id: gs.threeClaimNotice.actorId,
              name: gs.threeClaimNotice.actorName,
              role: 'ผู้เรียก',
            },
            to: {
              id: gs.threeClaimNotice.targetId,
              name: gs.threeClaimNotice.targetName,
              role: 'เป้าหมาย',
            },
          }}
          media={
            <EkModalCard
              size="hero"
              cardType={
                gs.threeClaimNotice.stolenFromTower &&
                gs.threeClaimNotice.success &&
                gs.threeClaimNotice.actualStolenType
                  ? gs.threeClaimNotice.actualStolenType
                  : gs.threeClaimNotice.requestedType
              }
            />
          }
          actionLine={{
            label: 'ผลลัพธ์',
            value: gs.threeClaimNotice.stolenFromTower
              ? gs.threeClaimNotice.success
                ? 'มีชนิดนี้ใน Tower'
                : 'ไม่มีชนิดนี้ใน Tower'
              : gs.threeClaimNotice.success
                ? `เป้าหมายมี ${CARD_LABEL[gs.threeClaimNotice.requestedType]}`
                : `เป้าหมายไม่มี ${CARD_LABEL[gs.threeClaimNotice.requestedType]}`,
          }}
          footer={
            <Button variant="primary" onClick={onDismissThreeClaim}>
              รับทราบ
            </Button>
          }
        />
      )}

      {showFiveCatsDiscardPickPopup && gs.fiveCatsDiscardPickNotice && (
        <EkModalShell
          title="หยิบจากกองทิ้ง (คอมโบ 5 แมว)"
          actors={{
            from: {
              id: gs.fiveCatsDiscardPickNotice.pickerId,
              name: gs.fiveCatsDiscardPickNotice.pickerName,
              role: 'ผู้หยิบ',
            },
          }}
          media={
            <EkModalCard size="hero" cardType={gs.fiveCatsDiscardPickNotice.cardType} />
          }
          actionLine={{
            label: 'การ์ดที่ได้',
            value: CARD_LABEL[gs.fiveCatsDiscardPickNotice.cardType],
          }}
          footer={
            <Button variant="primary" onClick={onDismissFiveCats}>
              รับทราบ
            </Button>
          }
        />
      )}
    </>
  );
}
