import type { ExplodingKittensPlayerView } from 'shared';
import { Button } from '../../../components/ui';
import { CARD_IMAGE, CARD_LABEL } from '../lib/cardMeta';
import { getReactionActionSummary } from '../lib/reactionActionSummary';
import { EkActorsRow } from './EkActorsRow';
import { EkModalCard } from './EkModalCard';

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

function playedCardLabels(pa: PendingAction): string {
  if (!pa.playedCardTypes?.length) return '';
  return pa.playedCardTypes.map((t) => CARD_LABEL[t]).join(' + ');
}

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

  const isChainNope = pa.nopeCount > 0;
  const actionSummary = getReactionActionSummary(gs);
  const cardLabels = playedCardLabels(pa);
  /** Extra effect copy beyond the card caption already under the hero art */
  const actionAddsInfo = Boolean(actionSummary) && actionSummary !== cardLabels;
  const targetPlayer = pa.targetId ? gs.players.find((p) => p.id === pa.targetId) : undefined;
  const actorPlayer = gs.players.find((p) => p.id === pa.actorId);
  const nopePlayer = pa.lastNopePlayerId
    ? gs.players.find((p) => p.id === pa.lastNopePlayerId)
    : undefined;

  const spotlightId = isChainNope ? (pa.lastNopePlayerId ?? pa.actorId) : pa.actorId;
  const spotlightName = isChainNope
    ? (pa.lastNopePlayerName ?? nopePlayer?.name ?? '?')
    : (pa.actorName || actorPlayer?.name || '?');

  const isActorWaiting = pa.actorId === myId && pa.nopeCount === 0;
  const statusLine = isActorWaiting
    ? `ตอบแล้ว ${pa.passedBy.length}/${aliveCount} · คุณเล่นแล้ว — รอผู้อื่น`
    : `ตอบแล้ว ${pa.passedBy.length}/${aliveCount} คน`;

  return (
    <div
      className="modal-overlay ek-reaction-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ek-reaction-title"
    >
      <div className="modal ek-reaction-modal">
        <p id="ek-reaction-title" className="ek-reaction-kicker">
          {isChainNope ? 'Chain Nope' : 'รอ Nope'}
        </p>

        {isChainNope ? (
          <div className="ek-modal-shell__media">
            <EkModalCard
              size="hero"
              src={CARD_IMAGE.nope}
              alt={CARD_LABEL.nope}
              caption={CARD_LABEL.nope}
            />
          </div>
        ) : (
          pa.playedCardTypes &&
          pa.playedCardTypes.length > 0 && (
            <div className="ek-modal-card-strip">
              {pa.playedCardTypes.map((t, i) => (
                <EkModalCard key={`${t}-${i}`} size="hero" cardType={t} decorative />
              ))}
            </div>
          )
        )}

        <EkActorsRow
          from={
            isChainNope
              ? { id: spotlightId, name: spotlightName, role: 'เล่น Nope' }
              : { id: spotlightId, name: spotlightName }
          }
          to={
            isChainNope
              ? {
                  id: pa.actorId,
                  name: pa.actorName || actorPlayer?.name || '?',
                  role: 'เอฟเฟ็กต์เดิม',
                  secondary: actionSummary || reactionOneLiner,
                }
              : targetPlayer
                ? { id: targetPlayer.id, name: targetPlayer.name, role: 'เป้าหมาย' }
                : undefined
          }
        />

        {!isChainNope && actionAddsInfo ? (
          <p className="ek-reaction-action-line">{actionSummary}</p>
        ) : null}

        <p className="ek-reaction-progress">{statusLine}</p>

        {isActorWaiting ? null : (
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
                {needsReactionAutoPass ? (
                  <div
                    className="ek-reaction-pass-countdown-fill"
                    style={{
                      transform: `scaleX(${Math.max(0.02, reactionCountdownFrac)})`,
                    }}
                    aria-hidden
                  />
                ) : null}
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
