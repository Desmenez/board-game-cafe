import type { ExplodingKittensPlayerView } from 'shared';
import { Button } from '../../../components/ui';
import { CARD_IMAGE, CARD_LABEL } from '../lib/cardMeta';

type PendingAction = NonNullable<ExplodingKittensPlayerView['pendingAction']>;
type Me = ExplodingKittensPlayerView['players'][number] | undefined;

type Props = {
  gs: ExplodingKittensPlayerView;
  myId: string;
  pa: PendingAction;
  reactionOneLiner: string;
  aliveCount: number;
  canReactNope: boolean;
  hasPassedReaction: boolean;
  needsReactionAutoPass: boolean;
  reactionCountdownFrac: number;
  reactionRemainingMs: number;
  hasNope: boolean;
  me: Me;
  blockedNopeSelfAction: boolean;
  blockedNopeOwnChain: boolean;
  onNope: () => void;
  onPass: () => void;
};

export function EkReactionModal({
  gs,
  myId,
  pa,
  reactionOneLiner,
  aliveCount,
  canReactNope,
  hasPassedReaction,
  needsReactionAutoPass,
  reactionCountdownFrac,
  reactionRemainingMs,
  hasNope,
  me,
  blockedNopeSelfAction,
  blockedNopeOwnChain,
  onNope,
  onPass,
}: Props) {
  if (gs.phase !== 'reaction') return null;

  return (
    <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
      <div className="modal ek-reaction-modal">
        <p id="ek-reaction-title" className="ek-reaction-kicker">
          {pa.nopeCount > 0 ? 'Chain Nope' : 'มีผู้เล่นการ์ด'}
        </p>

        {pa.nopeCount > 0 ? (
          <div className="ek-reaction-nope-spotlight">
            <div className="ek-modal-card-preview ek-modal-card-preview--reaction-hero">
              <img
                src={CARD_IMAGE.nope}
                alt={CARD_LABEL.nope}
                className="ek-card-img"
                loading="lazy"
              />
            </div>
            <p className="ek-reaction-hero-caption">
              <strong>{pa.lastNopePlayerName ?? '?'}</strong>
              <span className="ek-reaction-hero-action"> · Nope</span>
              <span className="ek-reaction-hero-sub"> · {reactionOneLiner}</span>
            </p>
          </div>
        ) : (
          pa.playedCardTypes &&
          pa.playedCardTypes.length > 0 && (
            <div className="ek-reaction-card-strip ek-reaction-card-strip--hero">
              {pa.playedCardTypes.map((t, i) => (
                <div
                  key={`${t}-${i}`}
                  className="ek-reaction-card-cell ek-modal-card-preview ek-modal-card-preview--reaction-hero"
                >
                  <img
                    src={CARD_IMAGE[t]}
                    alt=""
                    className="ek-card-img"
                    loading="lazy"
                    aria-hidden
                  />
                  <span className="ek-reaction-card-caption">{CARD_LABEL[t]}</span>
                </div>
              ))}
            </div>
          )
        )}

        {pa.nopeCount === 0 && (
          <p className="ek-reaction-one-liner">
            <span className="ek-reaction-one-liner-label">การ์ดที่เล่น</span>{' '}
            <strong className="text-white text-base">{reactionOneLiner}</strong>
          </p>
        )}

        <p className="ek-reaction-progress">
          ตอบแล้ว {pa.passedBy.length}/{aliveCount} คน
        </p>

        {pa.actorId === myId && pa.nopeCount === 0 ? (
          <p className="ek-reaction-wait">รอผู้อื่น (คุณเล่นการ์ดแล้ว)</p>
        ) : (
          <>
            <div className="ek-reaction-actions">
              <Button
                className="ek-reaction-nope-btn"
                variant="danger"
                disabled={!canReactNope}
                onClick={onNope}
              >
                Nope
              </Button>
              <div className="ek-reaction-pass-wrap">
                <div
                  className="ek-reaction-pass-countdown-fill"
                  style={{
                    transform: `scaleX(${Math.max(0.02, reactionCountdownFrac)})`,
                  }}
                  aria-hidden
                />
                <Button
                  className="ek-reaction-pass-btn"
                  variant="secondary"
                  disabled={hasPassedReaction}
                  onClick={onPass}
                  aria-label={
                    hasPassedReaction
                      ? 'ผ่านแล้ว'
                      : needsReactionAutoPass
                        ? `ผ่าน เหลือ ${Math.max(0, Math.ceil(reactionRemainingMs / 1000))} วินาที จะผ่านอัตโนมัติ`
                        : 'ผ่าน — ไม่ยกเลิกเอฟเฟ็กต์'
                  }
                >
                  {hasPassedReaction
                    ? 'ผ่านแล้ว'
                    : needsReactionAutoPass
                      ? `ผ่าน · ${Math.max(0, Math.ceil(reactionRemainingMs / 1000))} วิ`
                      : 'ผ่าน'}
                </Button>
              </div>
            </div>
            {hasNope && me?.alive && !canReactNope && (
              <p className="ek-reaction-nope-blocked">
                {blockedNopeSelfAction && 'ห้าม Nope การ์ดตัวเอง'}
                {blockedNopeOwnChain &&
                  !blockedNopeSelfAction &&
                  'ห้าม Nope ต่อจากตัวเอง — รอคนอื่น'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
