import { useEffect, useRef } from 'react';
import type { Salem1692PendingAccusation, Salem1692TryalCard, Salem1692TryalKind } from 'shared';
import { Eye } from 'lucide-react';
import { Badge, Button } from '../../../components/ui';
import { PlayerIdentity } from '../../../components/player-avatar';
import { salem1692TryalImage, salem1692TryalLabelTh, TRYAL_BACK_URL } from '../lib/cardMeta';
import { Salem1692AllyWitchHint } from './Salem1692AllyWitchHint';

const FLIP_ACK_MS = 1200;

type Props = {
  pending: Salem1692PendingAccusation;
  myId: string;
  /** Your tryals — used so the accusation target can see their own faces. */
  myTryals: Salem1692TryalCard[];
  isActor: boolean;
  /** Witch-team ids for this viewer (`null` if not a witch). */
  witchTeamIds: string[] | null;
  onSelect: (tryalId: string) => void;
  onReveal: (tryalId: string) => void;
  onAck: () => void;
};

export function Salem1692AccusationRevealModal({
  pending,
  myId,
  myTryals,
  isActor,
  witchTeamIds,
  onSelect,
  onReveal,
  onAck,
}: Props) {
  const { targetTryals, selectedTryalId, revealedTryalId, revealedKind, allyWitchTryalIds } =
    pending;
  const isRevealed = Boolean(revealedTryalId && revealedKind);
  const isTarget = pending.targetId === myId;
  const ackedRef = useRef(false);
  const witches = witchTeamIds ?? [];
  const targetIsWitchAlly = witches.includes(pending.targetId);
  const actorIsWitchAlly = witches.includes(pending.actorId);
  const allyWitchSet = new Set(allyWitchTryalIds);

  useEffect(() => {
    if (!isRevealed || !isActor || ackedRef.current) return;
    const t = window.setTimeout(() => {
      if (ackedRef.current) return;
      ackedRef.current = true;
      onAck();
    }, FLIP_ACK_MS);
    return () => window.clearTimeout(t);
  }, [isRevealed, isActor, onAck]);

  useEffect(() => {
    ackedRef.current = false;
  }, [pending.actorId, pending.targetId]);

  const title = isRevealed
    ? `เปิดแล้ว — ${salem1692TryalLabelTh(revealedKind as Salem1692TryalKind)}`
    : 'Accusation ครบ 7';

  const actorLabel = `${pending.actorName}${pending.actorId === myId ? ' (คุณ)' : ''}`;
  const targetLabel = `${pending.targetName}${pending.targetId === myId ? ' (คุณ)' : ''}`;

  const copy = isRevealed
    ? `ผล Tryal ของเป้าหมาย`
    : isActor
      ? targetIsWitchAlly && allyWitchTryalIds.length > 0
        ? 'เลือก Tryal คว่ำที่จะเปิด — ใบม่วงคือ Witch ของทีมคุณ · ใบที่เปิดแล้วเลือกไม่ได้'
        : 'เลือก Tryal คว่ำที่จะเปิด — ใบที่เปิดแล้วเลือกไม่ได้'
      : isTarget
        ? 'นี่คือ Tryal ของคุณ — รอผู้กล่าวหาเลือกเปิด'
        : 'กำลังเลือก Tryal ของเป้าหมาย';

  const ownById = new Map(myTryals.map((t) => [t.id, t]));

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="s1692-accusation-title"
    >
      <div
        className="modal s1692-accusation-modal md:max-w-2xl!"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="s1692-accusation-title">{title}</h2>

        <div className="s1692-modal-actors" aria-label="ใครเปิด Tryal ของใคร">
          <div className="s1692-modal-actors__actor">
            <span className="s1692-modal-actors__role">ผู้กล่าวหา</span>
            <PlayerIdentity
              playerId={pending.actorId}
              name={actorLabel}
              avatarSize={44}
              secondary="เลือก Tryal ที่จะเปิด"
              trailing={
                actorIsWitchAlly ? (
                  <Badge size="sm" variant="purple">
                    Witch
                  </Badge>
                ) : null
              }
            />
          </div>
          <span className="s1692-modal-actors__arrow" aria-hidden>
            →
          </span>
          <div className="s1692-modal-actors__actor">
            <span className="s1692-modal-actors__role">เป้าหมาย</span>
            <PlayerIdentity
              playerId={pending.targetId}
              name={targetLabel}
              avatarSize={44}
              secondary="เปิด Tryal 1 ใบ"
              trailing={
                targetIsWitchAlly ? (
                  <Badge size="sm" variant="purple">
                    Witch
                  </Badge>
                ) : null
              }
            />
          </div>
        </div>

        <p className="s1692-accusation-modal__copy">{copy}</p>

        <ul className="s1692-accusation-modal__row" aria-label="Tryal ของเป้าหมาย">
          {targetTryals.map((t) => {
            const isThisFlip = revealedTryalId === t.id && revealedKind != null;
            const isPriorOpen = Boolean(t.revealed && t.kind && !isThisFlip);
            const selected = selectedTryalId === t.id;
            const own = isTarget ? ownById.get(t.id) : undefined;
            const faceKind: Salem1692TryalKind | null = isThisFlip
              ? revealedKind
              : isPriorOpen
                ? t.kind
                : (own?.kind ?? null);
            const showOwnerFace = Boolean(isTarget && faceKind && !isThisFlip && !isPriorOpen);
            const showPublicFace = isThisFlip;
            const showAllyWitchHint =
              !isThisFlip && !isPriorOpen && !showOwnerFace && allyWitchSet.has(t.id);
            const selectable = !t.revealed && !isRevealed;

            return (
              <li key={t.id}>
                <button
                  type="button"
                  className={[
                    's1692-accusation-modal__slot',
                    selected ? 's1692-accusation-modal__slot--selected' : '',
                    isThisFlip || isPriorOpen ? 's1692-accusation-modal__slot--revealed' : '',
                    isPriorOpen ? 's1692-conspiracy-pass-slot--locked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={!isActor || !selectable}
                  onClick={() => {
                    if (!isActor || !selectable) return;
                    onSelect(t.id);
                  }}
                  aria-pressed={selected}
                  aria-label={
                    isPriorOpen && t.kind
                      ? `${salem1692TryalLabelTh(t.kind)} — เปิดแล้ว เลือกไม่ได้`
                      : faceKind
                        ? salem1692TryalLabelTh(faceKind)
                        : showAllyWitchHint
                          ? 'Witch ของทีมคุณ (คว่ำ)'
                          : selected
                            ? 'Tryal ที่เลือก'
                            : 'Tryal คว่ำ'
                  }
                >
                  {isPriorOpen && t.kind ? (
                    <div className="s1692-accusation-flip">
                      <div className="s1692-accusation-flip__face s1692-accusation-flip__face--front s1692-accusation-flip__face--static">
                        <img
                          src={salem1692TryalImage(t.kind)}
                          alt=""
                          className="s1692-accusation-flip__img"
                        />
                        <span className="s1692-accusation-flip__label">
                          {salem1692TryalLabelTh(t.kind)}
                        </span>
                        <div className="s1692-card__revealed-overlay" aria-hidden>
                          <Eye size={18} strokeWidth={2.25} className="s1692-card__revealed-icon" />
                          <span className="s1692-card__revealed-text">เปิดแล้ว</span>
                        </div>
                      </div>
                    </div>
                  ) : showOwnerFace && faceKind ? (
                    <div className="s1692-accusation-flip s1692-accusation-flip--owner">
                      <div className="s1692-accusation-flip__face s1692-accusation-flip__face--front s1692-accusation-flip__face--static">
                        <img
                          src={salem1692TryalImage(faceKind)}
                          alt=""
                          className="s1692-accusation-flip__img"
                        />
                        <span className="s1692-accusation-flip__label">
                          {salem1692TryalLabelTh(faceKind)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="s1692-accusation-flip">
                      <div
                        className={[
                          's1692-accusation-flip__inner',
                          showPublicFace ? 's1692-accusation-flip__inner--flipped' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <div className="s1692-accusation-flip__face s1692-accusation-flip__face--back">
                          <img src={TRYAL_BACK_URL} alt="" className="s1692-accusation-flip__img" />
                          {showAllyWitchHint ? <Salem1692AllyWitchHint /> : null}
                        </div>
                        <div className="s1692-accusation-flip__face s1692-accusation-flip__face--front">
                          {showPublicFace && revealedKind ? (
                            <>
                              <img
                                src={salem1692TryalImage(revealedKind)}
                                alt=""
                                className="s1692-accusation-flip__img"
                              />
                              <span className="s1692-accusation-flip__label">
                                {salem1692TryalLabelTh(revealedKind)}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="s1692-accusation-modal__actions">
          {isActor && !isRevealed ? (
            <Button
              type="button"
              disabled={!selectedTryalId}
              onClick={() => {
                if (!selectedTryalId) return;
                onReveal(selectedTryalId);
              }}
            >
              ยอมรับ — เปิด Tryal
            </Button>
          ) : null}
          {isRevealed && isActor ? (
            <>
              <p className="s1692-accusation-modal__hint">กำลังเปิดเผยผล…</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  ackedRef.current = true;
                  onAck();
                }}
              >
                ปิด
              </Button>
            </>
          ) : isRevealed && !isActor ? (
            <p className="s1692-accusation-modal__hint">ดูผลการเปิด Tryal…</p>
          ) : isTarget && !isActor ? (
            <p className="s1692-accusation-modal__hint">
              {selectedTryalId
                ? `${pending.actorName} ชี้ใบนี้แล้ว — รอเปิด`
                : `รอ ${pending.actorName} เลือกใบของคุณ`}
            </p>
          ) : !isActor ? (
            <p className="s1692-accusation-modal__hint">
              {selectedTryalId
                ? `${pending.actorName} เลือกใบแล้ว — รอเปิด`
                : `รอ ${pending.actorName} เลือกใบ`}
            </p>
          ) : (
            <p className="s1692-accusation-modal__hint">แตะการ์ดคว่ำเพื่อเลือก แล้วกดยอมรับ</p>
          )}
        </div>
      </div>
    </div>
  );
}
