import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type {
  Salem1692PendingNightResult,
  Salem1692PublicPlayer,
  Salem1692TryalCard,
} from 'shared';
import { Gavel } from 'lucide-react';
import { Badge, Button } from '../../../components/ui';
import { PlayerIdentity } from '../../../components/player-avatar';
import { WaitingBanner } from '../../../components/session-sync';
import {
  BLACK_CAT_URL,
  salem1692CardLabelTh,
  salem1692PlayingCardImage,
  salem1692TownHallLabel,
} from '../lib/cardMeta';
import { Salem1692TryalRow } from './Salem1692TryalRow';

type Phase = 'night_witch' | 'night_constable' | 'night_confess' | 'night_result';

type Props = {
  phase: Phase;
  players: Salem1692PublicPlayer[];
  myId: string;
  myTryals: Salem1692TryalCard[];
  canNightWitchKill: boolean;
  canNightConstableSave: boolean;
  canNightConfess: boolean;
  hasConfessed: boolean;
  witchTeamIds: string[] | null;
  nightWitchKillVotes: Record<string, string> | null;
  nightWitchKillConsensusTargetId: string | null;
  gavelHolderId: string | null;
  gavelHolderName: string | null;
  pendingNightResult: Salem1692PendingNightResult | null;
  onWitchSelect: (targetId: string) => void;
  onWitchConfirm: () => void;
  onConstableSave: (targetId: string) => void;
  onConfess: (tryalId: string) => void;
  onSkipConfess: () => void;
  onResultAck: () => void;
};

function hasAsylum(player: Salem1692PublicPlayer): boolean {
  return player.frontCards.some((c) => c.kind === 'asylum');
}

export function Salem1692NightModal({
  phase,
  players,
  myId,
  myTryals,
  canNightWitchKill,
  canNightConstableSave,
  canNightConfess,
  hasConfessed,
  witchTeamIds,
  nightWitchKillVotes,
  nightWitchKillConsensusTargetId,
  gavelHolderId,
  gavelHolderName,
  pendingNightResult,
  onWitchSelect,
  onWitchConfirm,
  onConstableSave,
  onConfess,
  onSkipConfess,
  onResultAck,
}: Props) {
  const nightArt = salem1692PlayingCardImage('night');
  const overlayStyle = {
    '--s1692-night-art': nightArt ? `url(${nightArt})` : 'none',
  } as CSSProperties;

  const [confessTryalId, setConfessTryalId] = useState<string | null>(null);

  useEffect(() => {
    setConfessTryalId(null);
  }, [phase, canNightConfess]);

  const witches = witchTeamIds ?? [];
  const votes = nightWitchKillVotes ?? {};
  const myVote = votes[myId] ?? null;
  const votedCount = witches.filter((id) => Boolean(votes[id])).length;
  const canConfirmWitch = nightWitchKillConsensusTargetId != null;
  const consensusName = nightWitchKillConsensusTargetId
    ? (players.find((p) => p.id === nightWitchKillConsensusTargetId)?.name ??
      nightWitchKillConsensusTargetId)
    : null;

  const alive = useMemo(() => players.filter((p) => p.alive), [players]);
  const witchTargets = useMemo(() => alive.filter((p) => !hasAsylum(p)), [alive]);
  const constableTargets = useMemo(
    () =>
      alive
        .filter((p) => p.id !== myId)
        .map((p) => ({
          id: p.id,
          name: `${p.name}${p.id === myId ? ' (คุณ)' : ''}`,
          townHall: salem1692TownHallLabel(p.townHallId),
        })),
    [alive, myId],
  );

  const unrevealedTryals = useMemo(() => myTryals.filter((t) => !t.revealed), [myTryals]);

  const nightResultVictim = useMemo(() => {
    const id = pendingNightResult?.victimId;
    if (!id) return null;
    return players.find((p) => p.id === id) ?? null;
  }, [pendingNightResult?.victimId, players]);

  const title =
    phase === 'night_witch'
      ? 'Night — Witch'
      : phase === 'night_constable'
        ? 'Night — Constable'
        : phase === 'night_confess'
          ? 'Night — Confess'
          : 'Night — ผล';

  return (
    <div
      className="modal-overlay s1692-night-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="s1692-night-title"
      style={overlayStyle}
    >
      <div className="modal s1692-night-modal md:max-w-2xl!" onClick={(e) => e.stopPropagation()}>
        <h2 id="s1692-night-title">{title}</h2>

        {phase === 'night_witch' ? (
          canNightWitchKill ? (
            <>
              <p className="s1692-night-modal__copy">
                เลือกผู้เล่นที่จะฆ่า (รวมตัวเองหรือ Witch คนอื่นได้) —
                ทีมต้องเลือกคนเดียวกันก่อนกดยอมรับ ผู้มี Asylum เลือกไม่ได้
              </p>
              <WaitingBanner
                done={votedCount}
                total={Math.max(1, witches.length)}
                label="Witch เลือกแล้ว"
              />
              <ul className="s1692-night-modal__targets" aria-label="เลือกผู้เล่น">
                {witchTargets.map((p) => {
                  const selectedByMe = myVote === p.id;
                  const witchVotesOnThis = witches.filter((wid) => votes[wid] === p.id).length;
                  const isWitchAlly = witches.includes(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={[
                          's1692-night-modal__target',
                          selectedByMe ? 's1692-night-modal__target--selected' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => onWitchSelect(p.id)}
                        aria-pressed={selectedByMe}
                      >
                        <PlayerIdentity
                          playerId={p.id}
                          name={`${p.name}${p.id === myId ? ' (คุณ)' : ''}`}
                          avatarSize={40}
                          secondary={salem1692TownHallLabel(p.townHallId)}
                          trailing={
                            isWitchAlly || witchVotesOnThis > 0 ? (
                              <span className="s1692-night-modal__trailing">
                                {isWitchAlly ? (
                                  <Badge size="sm" variant="purple">
                                    Witch
                                  </Badge>
                                ) : null}
                                {witchVotesOnThis > 0 ? (
                                  <span className="s1692-night-modal__vote-count">
                                    {witchVotesOnThis}/{witches.length}
                                  </span>
                                ) : null}
                              </span>
                            ) : null
                          }
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="s1692-night-modal__actions">
                <Button type="button" disabled={!canConfirmWitch} onClick={onWitchConfirm}>
                  {canConfirmWitch ? `ยอมรับ — ฆ่า ${consensusName}` : 'ยอมรับ'}
                </Button>
                {!canConfirmWitch ? (
                  <p className="s1692-night-modal__hint">
                    Witch ทุกคนต้องเลือกผู้เล่นคนเดียวกันก่อน
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="s1692-night-modal__copy">Witches กำลังเลือกผู้เล่นที่จะฆ่า…</p>
          )
        ) : null}

        {phase === 'night_constable' ? (
          canNightConstableSave ? (
            <>
              <p className="s1692-night-modal__copy">
                มอบ Gavel ให้ผู้เล่นหนึ่งคนเพื่อป้องกันการฆ่ากลางคืน — ห้ามเลือกตัวเอง
              </p>
              <ul className="s1692-night-modal__targets" aria-label="มอบ Gavel">
                {constableTargets.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="s1692-night-modal__target"
                      onClick={() => onConstableSave(p.id)}
                    >
                      <PlayerIdentity
                        playerId={p.id}
                        name={p.name}
                        avatarSize={40}
                        secondary={p.townHall}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="s1692-night-modal__copy">Constable กำลังมอบ Gavel…</p>
          )
        ) : null}

        {phase === 'night_confess' ? (
          <>
            {gavelHolderId && gavelHolderName ? (
              <div className="s1692-night-gavel" aria-label="ผู้ได้รับ Gavel">
                <div className="s1692-night-gavel__icon" aria-hidden>
                  <Gavel size={22} strokeWidth={2.25} />
                </div>
                <div className="s1692-night-gavel__body">
                  <p className="s1692-night-gavel__label">ได้รับ Gavel จาก Constable</p>
                  <PlayerIdentity
                    playerId={gavelHolderId}
                    name={`${gavelHolderName}${gavelHolderId === myId ? ' (คุณ)' : ''}`}
                    avatarSize={44}
                    secondary={
                      gavelHolderId === myId
                        ? 'คุณรอดจาก Night — ไม่ต้อง Confess'
                        : 'รอดจาก Night โดยไม่ต้อง Confess'
                    }
                    trailing={
                      <Badge size="sm" variant="accent">
                        Gavel
                      </Badge>
                    }
                  />
                </div>
              </div>
            ) : null}
            {canNightConfess ? (
              <>
                <p className="s1692-night-modal__copy">
                  เลือก Tryal ที่ยังคว่ำ 1 ใบแล้วกดยืนยันเพื่อ Confess — หรือไม่สารภาพ (ไม่ช่วยรอด)
                </p>
                {unrevealedTryals.length > 0 ? (
                  <Salem1692TryalRow
                    tryals={myTryals}
                    title="Tryal ของคุณ"
                    ownerView
                    size="sm"
                    selectedTryalId={confessTryalId}
                    onSelectUnrevealed={setConfessTryalId}
                  />
                ) : (
                  <p className="s1692-night-modal__hint">ไม่มีใบคว่ำ — กดไม่สารภาพได้เท่านั้น</p>
                )}
                <div className="s1692-night-modal__actions s1692-night-modal__actions--row">
                  <Button
                    type="button"
                    disabled={!confessTryalId}
                    onClick={() => {
                      if (!confessTryalId) return;
                      onConfess(confessTryalId);
                    }}
                  >
                    ยืนยัน — Confess
                  </Button>
                  <Button type="button" variant="secondary" onClick={onSkipConfess}>
                    ไม่สารภาพ
                  </Button>
                </div>
              </>
            ) : hasConfessed || gavelHolderId === myId ? (
              <p className="s1692-night-modal__copy">รอผู้เล่นอื่น Confess หรือไม่สารภาพ…</p>
            ) : (
              <p className="s1692-night-modal__copy">ทุกคนกำลัง Confess…</p>
            )}
          </>
        ) : null}

        {phase === 'night_result' && pendingNightResult ? (
          <>
            {pendingNightResult.victimId && pendingNightResult.victimName ? (
              <div
                className={[
                  's1692-night-result',
                  pendingNightResult.killed
                    ? 's1692-night-result--killed'
                    : 's1692-night-result--survived',
                ].join(' ')}
              >
                <div className="s1692-night-result__hero">
                  <PlayerIdentity
                    playerId={pendingNightResult.victimId}
                    name={`${pendingNightResult.victimName}${
                      pendingNightResult.victimId === myId ? ' (คุณ)' : ''
                    }`}
                    avatarSize={56}
                    secondary={
                      nightResultVictim
                        ? salem1692TownHallLabel(nightResultVictim.townHallId)
                        : undefined
                    }
                    trailing={
                      pendingNightResult.killed ? (
                        <Badge size="sm" variant="danger">
                          ตาย
                        </Badge>
                      ) : (
                        <Badge size="sm" variant="success">
                          รอด
                        </Badge>
                      )
                    }
                  />
                </div>
                <p className="s1692-night-result__headline">
                  {pendingNightResult.killed
                    ? 'แม่มดเลือกเป้าหมายนี้ — ตายกลางคืน'
                    : 'แม่มดเลือกเป้าหมายนี้ — รอด'}
                </p>
                <p className="s1692-night-result__detail">
                  {pendingNightResult.killed
                    ? 'เปิด Tryal ที่เหลือทั้งหมด · การ์ดตรงหน้าถูกทิ้งเข้ากองทิ้ง'
                    : pendingNightResult.reasons.length > 0
                      ? 'รอดเพราะการป้องกันต่อไปนี้'
                      : 'ไม่มีเป้าหมายถูกฆ่า'}
                </p>
                {pendingNightResult.survived && pendingNightResult.reasons.length > 0 ? (
                  <ul className="s1692-night-result__reasons" aria-label="เหตุผลที่รอด">
                    {pendingNightResult.reasons.map((r) => (
                      <li key={r}>
                        <Badge
                          size="sm"
                          variant={r === 'gavel' ? 'accent' : r === 'confess' ? 'warning' : 'info'}
                        >
                          {r === 'gavel'
                            ? 'Gavel จาก Constable'
                            : r === 'confess'
                              ? 'Confess เปิด Tryal'
                              : 'Asylum ตรงหน้า'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <div className="s1692-night-result s1692-night-result--empty">
                <p className="s1692-night-result__headline">ไม่มีเป้าหมายการฆ่า</p>
                <p className="s1692-night-result__detail">Night จบโดยไม่มีใครถูกเลือก</p>
              </div>
            )}

            {pendingNightResult.killed &&
            (pendingNightResult.victimTryals.length > 0 ||
              pendingNightResult.victimFrontCards.length > 0 ||
              pendingNightResult.victimHadBlackCat) ? (
              <div className="s1692-night-result__cards" aria-label="การ์ดของผู้ตาย">
                {pendingNightResult.victimTryals.length > 0 ? (
                  <Salem1692TryalRow
                    tryals={pendingNightResult.victimTryals}
                    title="Tryal ทั้งหมด (เปิดแล้ว)"
                    ownerView
                    size="sm"
                  />
                ) : null}
                {pendingNightResult.victimFrontCards.length > 0 ||
                pendingNightResult.victimHadBlackCat ? (
                  <section className="s1692-night-result__front" aria-label="การ์ดตรงหน้า">
                    <h3 className="s1692-night-result__front-title">การ์ดตรงหน้า (ก่อนตาย)</h3>
                    <ul className="s1692-front-panel__row">
                      {pendingNightResult.victimHadBlackCat ? (
                        <li className="s1692-front-panel__item">
                          <img
                            src={BLACK_CAT_URL}
                            alt="Black Cat"
                            className="s1692-front-panel__img"
                            width={722}
                            height={1130}
                          />
                          <span className="s1692-front-panel__cap">Black Cat</span>
                        </li>
                      ) : null}
                      {pendingNightResult.victimFrontCards.map((card) => (
                        <li key={card.id} className="s1692-front-panel__item">
                          <img
                            src={salem1692PlayingCardImage(card.kind)}
                            alt={salem1692CardLabelTh(card.kind)}
                            className="s1692-front-panel__img"
                            loading="lazy"
                          />
                          <span className="s1692-front-panel__cap">
                            {salem1692CardLabelTh(card.kind)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : null}

            <div className="s1692-night-modal__actions">
              {pendingNightResult.hasAcknowledged ? (
                <p className="s1692-night-modal__hint">
                  รับทราบแล้ว — รอคนอื่น ({pendingNightResult.ackProgress.current}/
                  {pendingNightResult.ackProgress.total})
                </p>
              ) : (
                <Button type="button" onClick={onResultAck}>
                  รับทราบ
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
