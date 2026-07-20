import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Salem1692PendingConspiracy, Salem1692TryalCard, Salem1692TryalKind } from 'shared';
import { Eye } from 'lucide-react';
import { Badge, Button } from '../../../components/ui';
import { PlayerIdentity } from '../../../components/player-avatar';
import {
  salem1692CardLabelTh,
  salem1692PlayingCardImage,
  salem1692TryalImage,
  salem1692TryalLabelTh,
  TRYAL_BACK_URL,
} from '../lib/cardMeta';
import { Salem1692AllyWitchHint } from './Salem1692AllyWitchHint';
import { Salem1692DrawnCardRevealGate } from './Salem1692DrawnCardRevealGate';
import { Salem1692TryalRow } from './Salem1692TryalRow';
import { useResponsiveSize } from '../../../hooks/useResponsiveSize';

const FLIP_ACK_MS = 1200;

type Props = {
  pending: Salem1692PendingConspiracy;
  myId: string;
  myName: string;
  myTryals: Salem1692TryalCard[];
  isWitchTeam: boolean;
  isConstable: boolean;
  /** Witch-team ids for this viewer (`null` if not a witch). */
  witchTeamIds: string[] | null;
  onSelectTryal: (tryalId: string) => void;
  onRevealTryal: (tryalId: string) => void;
  onAckReveal: () => void;
  onPassSelect: (tryalId: string) => void;
  onPeekAck: () => void;
};

export function Salem1692ConspiracyModal({
  pending,
  myId,
  myName,
  myTryals,
  isWitchTeam,
  isConstable,
  witchTeamIds,
  onSelectTryal,
  onRevealTryal,
  onAckReveal,
  onPassSelect,
  onPeekAck,
}: Props) {
  const {
    step,
    revealerId,
    revealerName,
    blackCatHolderId,
    blackCatHolderName,
    blackCatTryals,
    selectedTryalId,
    revealedTryalId,
    revealedKind,
    needsReveal,
    allyWitchTryalIds,
    leftNeighborId,
    leftNeighborName,
    leftTryals,
    leftUnrevealedTryalIds,
    rightNeighborId,
    rightNeighborName,
    hasPassPicked,
    myPassPickId,
    passProgress,
    hasPeekAcknowledged,
    peekProgress,
  } = pending;
  const actionButtonSize = useResponsiveSize({ base: 'sm', md: 'md' });
  const isRevealer = revealerId === myId;
  const isHolder = blackCatHolderId === myId;
  const revealerLabel = `${revealerName}${revealerId === myId ? ' (คุณ)' : ''}`;
  const holderLabel = blackCatHolderName
    ? `${blackCatHolderName}${blackCatHolderId === myId ? ' (คุณ)' : ''}`
    : null;
  const isRevealed = Boolean(revealedTryalId && revealedKind);
  const showTryalRow = step === 'reveal' && (needsReveal || isRevealed);
  const ownById = new Map(myTryals.map((t) => [t.id, t]));
  const conspiracyArt = salem1692PlayingCardImage('conspiracy');
  const overlayStyle = {
    '--s1692-conspiracy-art': conspiracyArt ? `url(${conspiracyArt})` : 'none',
  } as CSSProperties;
  const revealAckedRef = useRef(false);
  const witches = witchTeamIds ?? [];
  const allyWitchSet = new Set(allyWitchTryalIds);
  const holderIsWitchAlly = Boolean(blackCatHolderId && witches.includes(blackCatHolderId));
  const leftIsWitchAlly = Boolean(leftNeighborId && witches.includes(leftNeighborId));
  const rightIsWitchAlly = Boolean(rightNeighborId && witches.includes(rightNeighborId));
  const revealerIsWitchAlly = witches.includes(revealerId);

  const showDrawRevealIntro = step === 'reveal' && !revealedTryalId;
  const [drawRevealDone, setDrawRevealDone] = useState(!showDrawRevealIntro);
  const markDrawRevealDone = useCallback(() => setDrawRevealDone(true), []);
  const [passSelectedId, setPassSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (step === 'pass') setPassSelectedId(null);
  }, [step, leftNeighborId]);

  /** After Black Cat flip, revealer advances to pass (same timing as Accusation). */
  useEffect(() => {
    if (!drawRevealDone) return;
    if (step !== 'reveal' || !isRevealer || !isRevealed || revealAckedRef.current) return;
    const t = window.setTimeout(() => {
      if (revealAckedRef.current) return;
      revealAckedRef.current = true;
      onAckReveal();
    }, FLIP_ACK_MS);
    return () => window.clearTimeout(t);
  }, [drawRevealDone, step, isRevealed, isRevealer, onAckReveal]);

  useEffect(() => {
    revealAckedRef.current = false;
  }, [pending.revealerId, pending.blackCatHolderId, pending.revealedTryalId]);

  const revealCopy = isRevealed
    ? `เปิดแล้ว — ${salem1692TryalLabelTh(revealedKind as Salem1692TryalKind)}`
    : isRevealer
      ? holderIsWitchAlly && allyWitchTryalIds.length > 0
        ? `เลือก Tryal ของ ${holderLabel} (Black Cat) — ใบม่วงคือ Witch ของทีมคุณ อย่าเปิดผิด`
        : `เลือก Tryal ของ ${holderLabel} (Black Cat) แล้วกดยอมรับ`
      : isHolder
        ? 'นี่คือ Tryal ของคุณ — รอผู้เปิด Conspiracy เลือกเปิด'
        : `${revealerLabel} กำลังเลือก Tryal ของ ${holderLabel}`;

  const meLabel = `${myName} (คุณ)`;
  const leftLabel = leftNeighborName
    ? `${leftNeighborName}${leftNeighborId === myId ? ' (คุณ)' : ''}`
    : '—';
  const rightLabel = rightNeighborName
    ? `${rightNeighborName}${rightNeighborId === myId ? ' (คุณ)' : ''}`
    : '—';

  const receivedTryal =
    myPassPickId != null ? (myTryals.find((t) => t.id === myPassPickId) ?? null) : null;
  const receivedWitchFrom =
    receivedTryal?.kind === 'witch' && leftNeighborName ? leftNeighborName : null;
  const receivedConstableFrom =
    receivedTryal?.kind === 'constable' && leftNeighborName ? leftNeighborName : null;

  return (
    <Salem1692DrawnCardRevealGate
      enabled={showDrawRevealIntro}
      titleId="s1692-conspiracy-drawn-title"
      title={salem1692CardLabelTh('conspiracy')}
      kicker={`${revealerLabel} จั่วได้`}
      hint="Conspiracy เริ่มต้น…"
      faceSrc={conspiracyArt}
      faceAlt={salem1692CardLabelTh('conspiracy')}
      onComplete={markDrawRevealDone}
    >
      <div
        className="modal-overlay s1692-conspiracy-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="s1692-conspiracy-title"
        style={overlayStyle}
      >
        <div
          className="modal s1692-modal s1692-conspiracy-modal md:max-w-2xl!"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="s1692-conspiracy-title">Conspiracy</h2>

          {step === 'pass' ? (
            <div
              className="s1692-conspiracy-modal__actors s1692-conspiracy-modal__actors--seating"
              aria-label="ลำดับที่นั่ง: ซ้าย เรา ขวา"
            >
              {leftNeighborId && leftNeighborName ? (
                <div className="s1692-conspiracy-modal__actor">
                  <span className="s1692-conspiracy-modal__role">ซ้าย — หยิบจากคนนี้</span>
                  <PlayerIdentity
                    playerId={leftNeighborId}
                    name={leftLabel}
                    avatarSize={44}
                    secondary="Tryal คว่ำ 1 ใบ"
                    trailing={
                      leftIsWitchAlly ? (
                        <Badge size="sm" variant="purple">
                          Witch
                        </Badge>
                      ) : null
                    }
                  />
                </div>
              ) : (
                <div className="s1692-conspiracy-modal__actor s1692-conspiracy-modal__actor--empty">
                  <span className="s1692-conspiracy-modal__role">ซ้าย</span>
                  <p className="s1692-conspiracy-modal__empty">—</p>
                </div>
              )}
              <span className="s1692-conspiracy-modal__arrow" aria-hidden>
                ←
              </span>
              <div className="s1692-conspiracy-modal__actor">
                <span className="s1692-conspiracy-modal__role">คุณ</span>
                <PlayerIdentity
                  playerId={myId}
                  name={meLabel}
                  avatarSize={44}
                  secondary="กำลังเลือก"
                />
              </div>
              <span className="s1692-conspiracy-modal__arrow" aria-hidden>
                ←
              </span>
              {rightNeighborId && rightNeighborName ? (
                <div className="s1692-conspiracy-modal__actor">
                  <span className="s1692-conspiracy-modal__role">ขวา — หยิบของเรา</span>
                  <PlayerIdentity
                    playerId={rightNeighborId}
                    name={rightLabel}
                    avatarSize={44}
                    secondary="จะหยิบจากคุณ"
                    trailing={
                      rightIsWitchAlly ? (
                        <Badge size="sm" variant="purple">
                          Witch
                        </Badge>
                      ) : null
                    }
                  />
                </div>
              ) : (
                <div className="s1692-conspiracy-modal__actor s1692-conspiracy-modal__actor--empty">
                  <span className="s1692-conspiracy-modal__role">ขวา</span>
                  <p className="s1692-conspiracy-modal__empty">—</p>
                </div>
              )}
            </div>
          ) : (
            <div className="s1692-conspiracy-modal__actors" aria-label="ใครทำอะไรใส่ใคร">
              <div className="s1692-conspiracy-modal__actor">
                <span className="s1692-conspiracy-modal__role">เปิด Conspiracy</span>
                <PlayerIdentity
                  playerId={revealerId}
                  name={revealerLabel}
                  avatarSize={44}
                  secondary="ผู้จั่วใบ"
                  trailing={
                    revealerIsWitchAlly ? (
                      <Badge size="sm" variant="purple">
                        Witch
                      </Badge>
                    ) : null
                  }
                />
              </div>
              {blackCatHolderId && holderLabel ? (
                <>
                  <span className="s1692-conspiracy-modal__arrow" aria-hidden>
                    →
                  </span>
                  <div className="s1692-conspiracy-modal__actor">
                    <span className="s1692-conspiracy-modal__role">ถือ Black Cat</span>
                    <PlayerIdentity
                      playerId={blackCatHolderId}
                      name={holderLabel}
                      avatarSize={44}
                      secondary="เปิด Tryal 1 ใบ"
                      trailing={
                        holderIsWitchAlly ? (
                          <Badge size="sm" variant="purple">
                            Witch
                          </Badge>
                        ) : null
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>
          )}

          {step === 'reveal' ? (
            <>
              <p className="s1692-conspiracy-modal__copy">{revealCopy}</p>

              {showTryalRow && blackCatTryals.length > 0 ? (
                <ul className="s1692-conspiracy-modal__row" aria-label="Tryal ของผู้ถือ Black Cat">
                  {blackCatTryals.map((t) => {
                    const thisRevealed = revealedTryalId === t.id && revealedKind != null;
                    const isPriorOpen = Boolean(t.revealed && t.kind && !thisRevealed);
                    const selected = selectedTryalId === t.id;
                    const own = isHolder ? ownById.get(t.id) : undefined;
                    const faceKind: Salem1692TryalKind | null = thisRevealed
                      ? revealedKind
                      : isPriorOpen
                        ? t.kind
                        : (own?.kind ?? null);
                    const showOwnerFace = Boolean(
                      isHolder && faceKind && !thisRevealed && !isPriorOpen,
                    );
                    const showPublicFace = thisRevealed;
                    const showAllyWitchHint =
                      !thisRevealed && !isPriorOpen && !showOwnerFace && allyWitchSet.has(t.id);
                    const selectable = !t.revealed && !isRevealed;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          className={[
                            's1692-accusation-modal__slot',
                            selected ? 's1692-accusation-modal__slot--selected' : '',
                            thisRevealed || isPriorOpen
                              ? 's1692-accusation-modal__slot--revealed'
                              : '',
                            isPriorOpen ? 's1692-conspiracy-pass-slot--locked' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          disabled={!isRevealer || !selectable}
                          onClick={() => {
                            if (!isRevealer || !selectable) return;
                            onSelectTryal(t.id);
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
                                  <Eye
                                    size={18}
                                    strokeWidth={2.25}
                                    className="s1692-card__revealed-icon"
                                  />
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
                                  <img
                                    src={TRYAL_BACK_URL}
                                    alt=""
                                    className="s1692-accusation-flip__img"
                                  />
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
              ) : null}

              <div className="s1692-conspiracy-modal__actions">
                {needsReveal && isRevealer && !isRevealed ? (
                  <>
                    <Button
                      size={actionButtonSize}
                      type="button"
                      disabled={!selectedTryalId}
                      onClick={() => {
                        if (!selectedTryalId) return;
                        onRevealTryal(selectedTryalId);
                      }}
                    >
                      ยอมรับ — เปิด Tryal
                    </Button>
                    <p className="s1692-conspiracy-modal__hint">
                      แตะการ์ดคว่ำเพื่อเลือก แล้วกดยอมรับ — คนอื่นเห็นใบที่คุณชี้
                    </p>
                  </>
                ) : null}

                {needsReveal && !isRevealer && !isRevealed ? (
                  <p className="s1692-conspiracy-modal__hint">
                    {isHolder
                      ? selectedTryalId
                        ? `${revealerName} ชี้ใบนี้แล้ว — รอเปิด`
                        : `รอ ${revealerName} เลือกใบของคุณ`
                      : selectedTryalId
                        ? `${revealerName} เลือกใบแล้ว — รอเปิด`
                        : `รอ ${revealerName} เลือกใบ`}
                  </p>
                ) : null}

                {isRevealed && isRevealer ? (
                  <>
                    <p className="s1692-conspiracy-modal__hint">
                      กำลังเปิดเผยผล แล้วไปขั้นส่ง Tryal…
                    </p>
                    <Button
                      size={actionButtonSize}
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        revealAckedRef.current = true;
                        onAckReveal();
                      }}
                    >
                      ดำเนินการต่อ
                    </Button>
                  </>
                ) : null}

                {isRevealed && !isRevealer ? (
                  <p className="s1692-conspiracy-modal__hint">ดูผลการเปิด Tryal…</p>
                ) : null}
              </div>
            </>
          ) : null}

          {step === 'pass' ? (
            <>
              <p className="s1692-conspiracy-modal__copy">
                เลือก Tryal ที่ยังคว่ำของ {leftLabel} 1 ใบ — ใบที่เปิดแล้วไม่ถูกย้าย
                {leftIsWitchAlly && allyWitchTryalIds.length > 0
                  ? ' · ใบม่วงคือ Witch ของทีมคุณ'
                  : ''}
              </p>
              <p className="s1692-conspiracy-modal__hint">
                ความคืบหน้า {passProgress.current}/{passProgress.total}
              </p>

              {leftTryals.length > 0 ? (
                <ul className="s1692-conspiracy-modal__row" aria-label={`Tryal ของ ${leftLabel}`}>
                  {leftTryals.map((t) => {
                    const faceUp = Boolean(t.revealed && t.kind);
                    const selectable = !t.revealed;
                    const selected = hasPassPicked
                      ? myPassPickId === t.id
                      : passSelectedId === t.id;
                    const showAllyWitchHint = selectable && allyWitchSet.has(t.id);
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          className={[
                            's1692-accusation-modal__slot',
                            selected ? 's1692-accusation-modal__slot--selected' : '',
                            faceUp ? 's1692-accusation-modal__slot--revealed' : '',
                            faceUp ? 's1692-conspiracy-pass-slot--locked' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          disabled={!selectable || hasPassPicked}
                          onClick={() => {
                            if (!selectable || hasPassPicked) return;
                            setPassSelectedId(t.id);
                          }}
                          aria-pressed={selected}
                          aria-label={
                            faceUp && t.kind
                              ? `${salem1692TryalLabelTh(t.kind)} — เปิดแล้ว เลือกไม่ได้`
                              : showAllyWitchHint
                                ? 'Witch ของทีมคุณ (คว่ำ)'
                                : selected
                                  ? 'Tryal ที่เลือก'
                                  : 'Tryal คว่ำ'
                          }
                        >
                          <div className="s1692-accusation-flip">
                            {faceUp && t.kind ? (
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
                                  <Eye
                                    size={18}
                                    strokeWidth={2.25}
                                    className="s1692-card__revealed-icon"
                                  />
                                  <span className="s1692-card__revealed-text">เปิดแล้ว</span>
                                </div>
                              </div>
                            ) : (
                              <div className="s1692-accusation-flip__face s1692-accusation-flip__face--back s1692-accusation-flip__face--static">
                                <img
                                  src={TRYAL_BACK_URL}
                                  alt=""
                                  className="s1692-accusation-flip__img"
                                />
                                {showAllyWitchHint ? <Salem1692AllyWitchHint /> : null}
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="s1692-conspiracy-modal__hint">
                  {leftNeighborName
                    ? `${leftNeighborName} ไม่มี Tryal — ข้าม`
                    : 'ไม่มีผู้เล่นทางซ้าย — ข้าม'}
                </p>
              )}

              <div className="s1692-conspiracy-modal__actions">
                {hasPassPicked ? (
                  <p className="s1692-conspiracy-modal__hint">
                    เลือกแล้ว — รอผู้เล่นอื่น ({passProgress.current}/{passProgress.total})
                  </p>
                ) : leftUnrevealedTryalIds.length > 0 ? (
                  <>
                    <Button
                      size={actionButtonSize}
                      type="button"
                      disabled={!passSelectedId}
                      onClick={() => {
                        if (!passSelectedId) return;
                        onPassSelect(passSelectedId);
                      }}
                    >
                      ยอมรับ — หยิบใบนี้
                    </Button>
                    <p className="s1692-conspiracy-modal__hint">
                      {passSelectedId
                        ? 'แตะใบอื่นเพื่อเปลี่ยน แล้วกดยอมรับ'
                        : 'แตะการ์ดคว่ำ 1 ใบ แล้วกดยอมรับ'}
                    </p>
                  </>
                ) : leftTryals.length > 0 ? (
                  <p className="s1692-conspiracy-modal__hint">ไม่มีใบคว่ำให้เลือก — ข้าม</p>
                ) : null}
              </div>
            </>
          ) : null}

          {step === 'peek' ? (
            <>
              <p className="s1692-conspiracy-modal__copy">แอบดู Tryal ชุดใหม่ของคุณ</p>
              <div className="s1692-conspiracy-modal__role-notes" aria-label="ผลต่อบทบาท">
                <div
                  className={[
                    's1692-conspiracy-role-note',
                    isWitchTeam
                      ? 's1692-conspiracy-role-note--witch'
                      : 's1692-conspiracy-role-note--muted',
                  ].join(' ')}
                >
                  <span className="s1692-conspiracy-role-note__label">Witch</span>
                  <p className="s1692-conspiracy-role-note__body">
                    {receivedWitchFrom
                      ? `หยิบ Witch จาก ${receivedWitchFrom} — คุณอยู่ในฝ่ายแม่มด (ไม่หลุดแม้เสียใบ)`
                      : isWitchTeam
                        ? 'คุณอยู่ในฝ่ายแม่มด (เคยถือ Witch หรือเพิ่งได้มา — ไม่หลุดแม้เสียใบ)'
                        : 'คุณยังไม่ใช่ฝ่ายแม่มด'}
                  </p>
                </div>
                <div
                  className={[
                    's1692-conspiracy-role-note',
                    isConstable
                      ? 's1692-conspiracy-role-note--constable'
                      : 's1692-conspiracy-role-note--muted',
                  ].join(' ')}
                >
                  <span className="s1692-conspiracy-role-note__label">Constable</span>
                  <p className="s1692-conspiracy-role-note__body">
                    {receivedConstableFrom
                      ? `หยิบ Constable จาก ${receivedConstableFrom} — คุณเป็น Constable`
                      : isConstable
                        ? 'คุณเป็น Constable (ถือ Constable อยู่)'
                        : 'คุณไม่ใช่ Constable'}
                  </p>
                </div>
              </div>
              <Salem1692TryalRow tryals={myTryals} title="Tryal ของคุณ" ownerView size="sm" />
              <div className="s1692-conspiracy-modal__actions">
                {hasPeekAcknowledged ? (
                  <p className="s1692-conspiracy-modal__hint">
                    รับทราบแล้ว — รอคนอื่น ({peekProgress.current}/{peekProgress.total})
                  </p>
                ) : (
                  <Button size={actionButtonSize} type="button" onClick={onPeekAck}>
                    รับทราบ
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Salem1692DrawnCardRevealGate>
  );
}
