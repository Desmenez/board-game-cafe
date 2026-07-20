import type { Salem1692PublicPlayer } from 'shared';
import { Badge, Button } from '../../../components/ui';
import { PlayerIdentity } from '../../../components/player-avatar';
import { WaitingBanner } from '../../../components/session-sync';
import { useResponsiveSize } from '../../../hooks/useResponsiveSize';
import { BLACK_CAT_URL } from '../lib/cardMeta';
import { Salem1692DrawnCardRevealGate } from './Salem1692DrawnCardRevealGate';
// import { salem1692TownHallLabel } from '../lib/cardMeta'; // role abilities not supported yet

type Props = {
  players: Salem1692PublicPlayer[];
  myId: string;
  /** Living witch who may vote / confirm Black Cat. */
  canChoose: boolean;
  witchTeamIds: string[] | null;
  dawnBlackCatVotes: Record<string, string> | null;
  dawnBlackCatConsensusTargetId: string | null;
  onSelect: (targetId: string) => void;
  onConfirm: () => void;
};

export function Salem1692DawnModal({
  players,
  myId,
  canChoose,
  witchTeamIds,
  dawnBlackCatVotes,
  dawnBlackCatConsensusTargetId,
  onSelect,
  onConfirm,
}: Props) {
  const actionButtonSize = useResponsiveSize({ base: 'sm', md: 'md' });
  const witches = witchTeamIds ?? [];
  const votes = dawnBlackCatVotes ?? {};
  const myVote = votes[myId] ?? null;
  const votedCount = witches.filter((id) => Boolean(votes[id])).length;
  const canConfirm = dawnBlackCatConsensusTargetId != null;
  const consensusName = dawnBlackCatConsensusTargetId
    ? (players.find((p) => p.id === dawnBlackCatConsensusTargetId)?.name ??
      dawnBlackCatConsensusTargetId)
    : null;
  const alive = players.filter((p) => p.alive);

  const body = !canChoose ? (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="s1692-dawn-title"
    >
      <div className="modal s1692-modal s1692-dawn-modal" onClick={(e) => e.stopPropagation()}>
        <div className="s1692-dawn-modal__hero">
          <div className="s1692-dawn-modal__card-wrap">
            <img
              src={BLACK_CAT_URL}
              alt="Black Cat"
              className="s1692-dawn-modal__card"
              width={722}
              height={1130}
            />
          </div>
          <div className="s1692-dawn-modal__copy">
            <h2 id="s1692-dawn-title">Dawn — วาง Black Cat</h2>
            <p>Witches กำลังเลือกผู้เล่นที่จะได้รับ Black Cat</p>
            <p className="s1692-dawn-modal__meta">รอทีม Witch ตัดสินใจ…</p>
          </div>
        </div>
        <p className="s1692-dawn-modal__hint s1692-dawn-modal__hint--spectate">
          คุณจะเห็นว่าใครได้ Black Cat เมื่อ Witch ยืนยันแล้ว
        </p>
      </div>
    </div>
  ) : (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="s1692-dawn-title"
    >
      <div className="modal s1692-modal s1692-dawn-modal" onClick={(e) => e.stopPropagation()}>
        <div className="s1692-dawn-modal__hero">
          <div className="s1692-dawn-modal__card-wrap">
            <img
              src={BLACK_CAT_URL}
              alt="Black Cat"
              className="s1692-dawn-modal__card"
              width={722}
              height={1130}
            />
          </div>
          <div className="s1692-dawn-modal__copy">
            <h2 id="s1692-dawn-title" className="text-base! md:text-lg!">
              Dawn — วาง Black Cat
            </h2>
            <p className="text-xs! md:text-base!">
              Witches เลือกผู้เล่นที่จะได้รับ Black Cat (เลือกตัวเองได้) —
              ทุกคนในทีมต้องเลือกคนเดียวกัน ก่อนกดยอมรับ
            </p>
            <p className="s1692-dawn-modal__meta">Witch team: {witches.length} คน</p>
          </div>
        </div>

        <WaitingBanner
          done={votedCount}
          total={Math.max(1, witches.length)}
          label="Witch เลือกแล้ว"
          className="s1692-dawn-modal__progress"
        />

        <ul className="s1692-dawn-modal__targets" aria-label="เลือกผู้เล่น">
          {alive.map((p) => {
            const selectedByMe = myVote === p.id;
            const witchVotesOnThis = witches.filter((wid) => votes[wid] === p.id).length;
            const isWitchAlly = witches.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={[
                    's1692-dawn-modal__target',
                    selectedByMe ? 's1692-dawn-modal__target--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onSelect(p.id)}
                  aria-pressed={selectedByMe}
                >
                  <PlayerIdentity
                    playerId={p.id}
                    name={`${p.name}${p.id === myId ? ' (คุณ)' : ''}`}
                    avatarSize={40}
                    handCount={p.handCount}
                    frontCount={p.frontCards.length + (p.hasBlackCat ? 1 : 0)}
                    unrevealedTryalCount={(p.tryals ?? []).filter((t) => !t.revealed).length}
                    // secondary={salem1692TownHallLabel(p.townHallId)} // role abilities not supported yet
                    trailing={
                      isWitchAlly || witchVotesOnThis > 0 ? (
                        <span className="s1692-dawn-modal__trailing">
                          {isWitchAlly ? (
                            <Badge size="sm" variant="purple">
                              Witch
                            </Badge>
                          ) : null}
                          {witchVotesOnThis > 0 ? (
                            <span className="s1692-dawn-modal__vote-count">
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

        <div className="s1692-dawn-modal__actions">
          <Button type="button" size={actionButtonSize} disabled={!canConfirm} onClick={onConfirm}>
            {canConfirm ? `ยอมรับ — วางที่ ${consensusName}` : 'ยอมรับ'}
          </Button>
          {!canConfirm ? (
            <p className="s1692-dawn-modal__hint">
              {witches.length > 1
                ? 'รอ Witch ทุกคนเลือกผู้เล่นคนเดียวกัน'
                : 'เลือกผู้เล่นก่อน แล้วกดยอมรับ'}
            </p>
          ) : (
            <p className="s1692-dawn-modal__hint">
              ทุกคนตกลงเป้าเดียวกันแล้ว — กดยอมรับเพื่อเริ่มเกม
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Salem1692DrawnCardRevealGate
      enabled
      titleId="s1692-dawn-drawn-title"
      title="Black Cat"
      kicker="Dawn"
      hint="วาง Black Cat…"
      faceSrc={BLACK_CAT_URL}
      faceAlt="Black Cat"
    >
      {body}
    </Salem1692DrawnCardRevealGate>
  );
}
