import { useMemo, useState } from 'react';
import type { Salem1692PendingPlay, Salem1692PlayingCard, Salem1692PublicPlayer } from 'shared';
import { isSalem1692BlueKind, isSalem1692RedKind, SALEM_1692_BLACK_CAT_SELECT_ID } from 'shared';
import { PlayerIdentity } from '../../../components/player-avatar';
import { Badge, Button } from '../../../components/ui';
import {
  BLACK_CAT_URL,
  salem1692CardLabelTh,
  salem1692PlayingCardImage,
  // salem1692TownHallLabel, // role abilities not supported yet
} from '../lib/cardMeta';
import { useResponsiveSize } from '../../../hooks/useResponsiveSize';

type PlayingKind = Salem1692PendingPlay['card']['kind'];

function needsTarget(kind: PlayingKind): boolean {
  return kind !== 'conspiracy' && kind !== 'night';
}

function needsSecondTarget(kind: PlayingKind): boolean {
  return kind === 'scapegoat' || kind === 'robbery' || kind === 'matchmaker';
}

function needsFrontCardPick(kind: PlayingKind): 'alibi' | 'curse' | null {
  if (kind === 'alibi') return 'alibi';
  if (kind === 'curse') return 'curse';
  return null;
}

function hasPiety(player: Salem1692PublicPlayer): boolean {
  return player.frontCards.some((c) => c.kind === 'piety');
}

type Props = {
  pendingPlay: Salem1692PendingPlay;
  players: Salem1692PublicPlayer[];
  myId: string;
  isActor: boolean;
  /** Witch-team ids for this viewer (`null` if not a witch). */
  witchTeamIds?: string[] | null;
  onConfirm: (args: {
    targetId?: string;
    secondTargetId?: string;
    selectedCardIds?: string[];
  }) => void;
  onCancel: () => void;
};

export function Salem1692PlayTargetModal({
  pendingPlay,
  players,
  myId,
  isActor,
  witchTeamIds = null,
  onConfirm,
  onCancel,
}: Props) {
  const actionButtonSize = useResponsiveSize({ base: 'sm', md: 'md' });
  const [targetId, setTargetId] = useState<string | null>(null);
  const [secondTargetId, setSecondTargetId] = useState<string | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const kind = pendingPlay.card.kind;
  const label = salem1692CardLabelTh(kind);
  const dual = needsSecondTarget(kind);
  const requireTarget = needsTarget(kind);
  const frontPick = needsFrontCardPick(kind);
  const isRedAccusation = isSalem1692RedKind(kind);

  const aliveTargets = useMemo(
    () => players.filter((p) => p.alive && p.id !== myId),
    [players, myId],
  );
  const witches = witchTeamIds ?? [];

  const targetPlayer = useMemo(
    () => (targetId ? (players.find((p) => p.id === targetId) ?? null) : null),
    [players, targetId],
  );

  const targetFront: Salem1692PlayingCard[] = useMemo(() => {
    return targetPlayer?.frontCards ?? [];
  }, [targetPlayer]);

  const pickableFront = useMemo(() => {
    if (frontPick === 'alibi') return targetFront.filter((c) => isSalem1692RedKind(c.kind));
    if (frontPick === 'curse') return targetFront.filter((c) => isSalem1692BlueKind(c.kind));
    return [];
  }, [frontPick, targetFront]);

  const canCurseBlackCat = frontPick === 'curse' && Boolean(targetPlayer?.hasBlackCat);

  const playersReady = useMemo(() => {
    if (!requireTarget) return true;
    if (!targetId) return false;
    if (dual) return Boolean(secondTargetId);
    return true;
  }, [requireTarget, dual, targetId, secondTargetId]);

  const canConfirm = useMemo(() => {
    if (!playersReady) return false;
    if (isRedAccusation && targetId) {
      const t = players.find((p) => p.id === targetId);
      if (t && hasPiety(t)) return false;
    }
    if (frontPick === 'alibi') {
      return selectedCardIds.length >= 1 && selectedCardIds.length <= 3;
    }
    if (frontPick === 'curse') {
      return selectedCardIds.length === 1;
    }
    return true;
  }, [playersReady, frontPick, selectedCardIds, isRedAccusation, targetId, players]);

  const title = isActor ? `เล่น ${label}` : `${pendingPlay.actorName} กำลังเล่น ${label}`;

  const showFrontPick = isActor && frontPick && playersReady;

  const copyBody = !isActor
    ? `รอ ${pendingPlay.actorName} เลือกเป้าหมาย…`
    : showFrontPick
      ? frontPick === 'alibi'
        ? 'เลือก accusation 1–3 ใบที่จะทิ้ง'
        : 'เลือกการ์ดน้ำเงินหรือ Black Cat 1 ใบที่จะทิ้ง'
      : dual
        ? targetId
          ? 'เลือกเป้าหมายคนที่ 2'
          : 'เลือกผู้เล่น 2 คนเป็นเป้าหมาย'
        : requireTarget
          ? isRedAccusation
            ? 'แตะชื่อผู้เล่นเพื่อใส่ Accusation (ผู้มี Piety เลือกไม่ได้)'
            : 'แตะชื่อผู้เล่นเพื่อเลือกเป้าหมาย'
          : 'ยืนยันเพื่อเล่นการ์ดนี้';

  const selectTarget = (id: string) => {
    const player = players.find((p) => p.id === id);
    if (!player) return;
    if (isRedAccusation && hasPiety(player)) return;
    setSelectedCardIds([]);
    if (!dual) {
      setTargetId(id);
      setSecondTargetId(null);
      return;
    }
    // Dual (Matchmaker / Scapegoat / Robbery): tap again to deselect that slot.
    if (id === targetId) {
      setTargetId(secondTargetId);
      setSecondTargetId(null);
      return;
    }
    if (id === secondTargetId) {
      setSecondTargetId(null);
      return;
    }
    if (!targetId) {
      setTargetId(id);
      return;
    }
    if (!secondTargetId) {
      setSecondTargetId(id);
      return;
    }
    setSecondTargetId(id);
  };

  const toggleFrontCard = (cardId: string) => {
    setSelectedCardIds((prev) => {
      if (frontPick === 'curse') return prev[0] === cardId ? [] : [cardId];
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 3) return prev;
      return [...prev, cardId];
    });
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="s1692-play-target-title"
    >
      <div className="modal s1692-modal s1692-select-modal" onClick={(e) => e.stopPropagation()}>
        <div className="s1692-select-modal__hero">
          <div className="s1692-select-modal__card-wrap">
            <img
              src={salem1692PlayingCardImage(kind)}
              alt={label}
              className="s1692-select-modal__card"
              width={722}
              height={1130}
            />
          </div>
          <div className="s1692-select-modal__copy">
            <h2 id="s1692-play-target-title" className="text-base! md:text-lg!">
              {title}
            </h2>
            <p className="text-xs! md:text-base!">{copyBody}</p>
            {!isActor ? (
              <p className="s1692-select-modal__meta">ผู้เล่นอื่นกำลังเลือกเป้าหมาย</p>
            ) : dual ? (
              <p className="s1692-select-modal__meta">ต้องการเป้าหมาย 2 คน</p>
            ) : frontPick === 'alibi' ? (
              <p className="s1692-select-modal__meta">ทิ้งได้สูงสุด 3 accusation</p>
            ) : null}
          </div>
        </div>

        {isActor && requireTarget && !showFrontPick ? (
          <ul className="s1692-select-modal__targets" aria-label="เลือกเป้าหมาย">
            {aliveTargets.map((p) => {
              const isFirst = targetId === p.id;
              const isSecond = secondTargetId === p.id;
              const selected = isFirst || isSecond;
              const blockedByPiety = isRedAccusation && hasPiety(p);
              const isWitchAlly = witches.includes(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={[
                      's1692-select-modal__target',
                      selected ? 's1692-select-modal__target--selected' : '',
                      blockedByPiety ? 's1692-select-modal__target--disabled' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={blockedByPiety}
                    onClick={() => selectTarget(p.id)}
                    aria-pressed={selected}
                    aria-disabled={blockedByPiety}
                  >
                    <PlayerIdentity
                      playerId={p.id}
                      name={p.name}
                      avatarSize={40}
                      handCount={p.handCount}
                      frontCount={p.frontCards.length + (p.hasBlackCat ? 1 : 0)}
                      unrevealedTryalCount={(p.tryals ?? []).filter((t) => !t.revealed).length}
                      secondary={
                        <>
                          {/* {salem1692TownHallLabel(p.townHallId)} ·{' '} */}
                          {/* role abilities not supported yet */}
                          <span className="text-red-400">Acc {p.accusationPoints}</span>
                        </>
                      }
                      trailing={
                        <span className="s1692-dawn-modal__trailing">
                          {isWitchAlly ? (
                            <Badge size="sm" variant="purple">
                              Witch
                            </Badge>
                          ) : null}
                          {blockedByPiety ? (
                            <Badge size="sm" variant="info">
                              Piety
                            </Badge>
                          ) : null}
                          {dual && selected ? (
                            <span className="s1692-select-modal__badge">{isFirst ? '1' : '2'}</span>
                          ) : null}
                        </span>
                      }
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {showFrontPick ? (
          <div className="s1692-select-modal__card-pick">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSecondTargetId(null);
                setTargetId(null);
                setSelectedCardIds([]);
              }}
            >
              ← เปลี่ยนเป้าหมาย
            </button>
            {pickableFront.length === 0 && !canCurseBlackCat ? (
              <p className="s1692-select-modal__hint">ไม่มีใบให้เลือกบนเป้าหมายนี้</p>
            ) : (
              <ul className="s1692-select-modal__pick-row" aria-label="เลือกการ์ดตรงหน้า">
                {canCurseBlackCat ? (
                  <li>
                    <button
                      type="button"
                      className={[
                        's1692-select-modal__pick-card',
                        selectedCardIds.includes(SALEM_1692_BLACK_CAT_SELECT_ID)
                          ? 's1692-select-modal__pick-card--selected'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => toggleFrontCard(SALEM_1692_BLACK_CAT_SELECT_ID)}
                      aria-pressed={selectedCardIds.includes(SALEM_1692_BLACK_CAT_SELECT_ID)}
                    >
                      <img
                        src={BLACK_CAT_URL}
                        alt="Black Cat"
                        className="s1692-select-modal__pick-img"
                      />
                      <span>Black Cat</span>
                    </button>
                  </li>
                ) : null}
                {pickableFront.map((card) => {
                  const selected = selectedCardIds.includes(card.id);
                  return (
                    <li key={card.id}>
                      <button
                        type="button"
                        className={[
                          's1692-select-modal__pick-card',
                          selected ? 's1692-select-modal__pick-card--selected' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => toggleFrontCard(card.id)}
                        aria-pressed={selected}
                      >
                        <img
                          src={salem1692PlayingCardImage(card.kind)}
                          alt={salem1692CardLabelTh(card.kind)}
                          className="s1692-select-modal__pick-img"
                        />
                        <span>{salem1692CardLabelTh(card.kind)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}

        {!isActor ? (
          <p className="s1692-select-modal__hint s1692-select-modal__hint--spectate">
            การ์ดนี้ถูกเปิดให้ทุกคนเห็นแล้ว — รอผลเลือกเป้าหมาย
          </p>
        ) : null}

        {isActor ? (
          <div className="s1692-select-modal__actions">
            <Button
              size={actionButtonSize}
              type="button"
              disabled={!canConfirm}
              onClick={() =>
                onConfirm({
                  targetId: requireTarget ? (targetId ?? undefined) : undefined,
                  secondTargetId: dual ? (secondTargetId ?? undefined) : undefined,
                  selectedCardIds: frontPick ? selectedCardIds : undefined,
                })
              }
            >
              ยืนยันการเล่น
            </Button>
            <Button size={actionButtonSize} type="button" variant="secondary" onClick={onCancel}>
              ยกเลิก — คืนมือ
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
