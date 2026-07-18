import type { ExplodingKittensPlayerView } from 'shared';
import { CARD_IMAGE, CARD_LABEL } from '../lib/cardMeta';
import { ExplodingKittensSingleCardModal } from './ExplodingKittensSingleCardModal';

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
        <ExplodingKittensSingleCardModal
          open
          title="🃏 มีการขโมยการ์ด"
          intro={
            <p>
              <strong>{gs.stealNotice.actorName}</strong> ขโมยการ์ดจาก{' '}
              <strong>{gs.stealNotice.targetName}</strong>
            </p>
          }
          card={
            gs.stealNotice.cardType
              ? {
                  imageSrc: CARD_IMAGE[gs.stealNotice.cardType],
                  imageAlt: CARD_LABEL[gs.stealNotice.cardType],
                  caption: (
                    <>
                      การ์ดที่เกี่ยวข้อง: <strong>{CARD_LABEL[gs.stealNotice.cardType]}</strong>
                    </>
                  ),
                }
              : undefined
          }
          bodyFallback={
            !gs.stealNotice.cardType ? (
              <p style={{ color: 'var(--text-secondary)' }}>การ์ดที่ถูกขโมยเป็นข้อมูลส่วนตัว</p>
            ) : undefined
          }
          primaryAction={{ label: 'รับทราบ', onClick: onDismissSteal }}
        />
      )}

      {showThreeClaimPopup && gs.threeClaimNotice && (
        <ExplodingKittensSingleCardModal
          open
          title="🧩 ผลคอมโบ 3 ใบ"
          intro={
            <p>
              <strong>{gs.threeClaimNotice.actorName}</strong>{' '}
              {gs.threeClaimNotice.stolenFromTower ? (
                gs.threeClaimNotice.success ? (
                  <>
                    เรียกถูก — ได้การ์ดจาก Tower ของ{' '}
                    <strong>{gs.threeClaimNotice.targetName}</strong>
                  </>
                ) : (
                  <>
                    เรียกชนิดที่ไม่มีใน Tower ของ <strong>{gs.threeClaimNotice.targetName}</strong>{' '}
                    — เสียฟรี
                  </>
                )
              ) : (
                <>
                  เรียกการ์ด <strong>{CARD_LABEL[gs.threeClaimNotice.requestedType]}</strong> จาก{' '}
                  <strong>{gs.threeClaimNotice.targetName}</strong>
                </>
              )}
            </p>
          }
          card={{
            imageSrc:
              CARD_IMAGE[
                gs.threeClaimNotice.stolenFromTower &&
                gs.threeClaimNotice.success &&
                gs.threeClaimNotice.actualStolenType
                  ? gs.threeClaimNotice.actualStolenType
                  : gs.threeClaimNotice.requestedType
              ],
            imageAlt:
              CARD_LABEL[
                gs.threeClaimNotice.stolenFromTower &&
                gs.threeClaimNotice.success &&
                gs.threeClaimNotice.actualStolenType
                  ? gs.threeClaimNotice.actualStolenType
                  : gs.threeClaimNotice.requestedType
              ],
            caption: gs.threeClaimNotice.stolenFromTower
              ? gs.threeClaimNotice.success
                ? '✅ มีชนิดนี้ใน Tower'
                : '❌ ไม่มีชนิดนี้ใน Tower'
              : gs.threeClaimNotice.success
                ? '✅ เป้าหมายมีการ์ดที่เรียก'
                : '❌ เป้าหมายไม่มีการ์ดที่เรียก',
          }}
          primaryAction={{ label: 'รับทราบ', onClick: onDismissThreeClaim }}
        />
      )}

      {showFiveCatsDiscardPickPopup && gs.fiveCatsDiscardPickNotice && (
        <ExplodingKittensSingleCardModal
          open
          title="🐱 หยิบจากกองทิ้ง (คอมโบ 5 แมว)"
          intro={
            <p>
              <strong>{gs.fiveCatsDiscardPickNotice.pickerName}</strong> หยิบการ์ดจากกองทิ้ง
            </p>
          }
          card={{
            imageSrc: CARD_IMAGE[gs.fiveCatsDiscardPickNotice.cardType],
            imageAlt: CARD_LABEL[gs.fiveCatsDiscardPickNotice.cardType],
            caption: (
              <>
                การ์ดที่ได้: <strong>{CARD_LABEL[gs.fiveCatsDiscardPickNotice.cardType]}</strong>
              </>
            ),
          }}
          primaryAction={{
            label: 'รับทราบ',
            onClick: onDismissFiveCats,
          }}
        />
      )}
    </>
  );
}
