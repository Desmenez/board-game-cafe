import type { InsiderAction, InsiderPlayerView } from 'shared';
import { Button } from '../../../components/ui';

type Props = {
  gameState: InsiderPlayerView;
  myId: string;
  remainLabel: string | null;
  send: (a: InsiderAction) => void;
};

export function InsiderDiscussionPanel({ gameState: gs, myId, remainLabel, send }: Props) {
  return (
    <section
      className="card insider-card insider-discussion"
      aria-label="อภิปรายและโหวตจับ Insider"
    >
      <div className="insider-row">
        <h2>อภิปราย + โหวตจับ Insider</h2>
        {remainLabel != null && <span className="insider-timer">เหลือ {remainLabel}</span>}
      </div>
      <p className="insider-discussion-intro">
        คำที่ถูกต้องถูกพบโดย <strong>{gs.solverName ?? '—'}</strong> — เลือกว่าใครน่าจะเป็น
        Insider แล้วกดยืนยัน ทุกคนเห็นการเลือกแบบเรียลไทม์
      </p>
      <p className="insider-muted insider-discussion-progress">
        ยืนยันโหวตแล้ว {gs.voteProgress.done}/{gs.voteProgress.total} คน ·
        หมดเวลาจะนับเฉพาะคนที่กดยืนยัน
      </p>

      <div className="insider-discussion-roster" aria-label="สถานะการโหวตแต่ละคน">
        <h3 className="insider-discussion-roster-title">ใครเลือกใคร</h3>
        <ul className="insider-discussion-roster-list">
          {gs.players.map((p) => {
            const confirmedTarget = gs.finalVotes[p.id];
            const draftTarget = gs.discussionDraftVotes?.[p.id];
            const pickId = confirmedTarget ?? draftTarget;
            const pickName =
              pickId != null ? (gs.players.find((x) => x.id === pickId)?.name ?? '—') : null;
            const isConfirmed = confirmedTarget != null;
            return (
              <li key={p.id} className="insider-discussion-roster-row">
                <span className="insider-discussion-roster-voter">{p.name}</span>
                {pickName == null ? (
                  <span className="insider-discussion-roster-none">ยังไม่เลือก</span>
                ) : (
                  <span
                    className={
                      isConfirmed
                        ? 'insider-discussion-roster-pick insider-discussion-roster-pick--ok'
                        : 'insider-discussion-roster-pick insider-discussion-roster-pick--draft'
                    }
                  >
                    → {pickName}
                    {isConfirmed ? ' · ยืนยันแล้ว' : ' · รอยืนยัน'}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {gs.finalVotes[myId] == null ? (
        <div className="insider-discussion-my">
          <h3 className="insider-discussion-my-title">โหวตของคุณ</h3>
          <p className="insider-muted insider-discussion-my-hint">
            เลือกผู้เล่นคนอื่น (ไม่รวมตัวเองและ Master — Master ไม่ใช่ Insider) แล้วกดยืนยัน —
            เปลี่ยนคนได้ก่อนยืนยัน
          </p>
          <div className="insider-discussion-target-grid">
            {gs.players
              .filter((p) => p.id !== myId)
              .map((p) => {
                const draft = gs.discussionDraftVotes?.[myId];
                const selected = draft === p.id;
                const isMasterSeat = p.id === gs.masterId;
                return (
                  <Button
                    key={p.id}
                    type="button"
                    variant={selected ? 'primary' : 'secondary'}
                    className="insider-discussion-target-btn"
                    disabled={isMasterSeat}
                    title={isMasterSeat ? 'โหวต Master เป็นผู้รู้ไม่ได้' : undefined}
                    onClick={() => send({ type: 'discussion_pick', targetId: p.id })}
                  >
                    {p.name}
                  </Button>
                );
              })}
          </div>
          <div className="insider-discussion-confirm-wrap">
            <Button
              type="button"
              size="lg"
              disabled={gs.discussionDraftVotes?.[myId] == null}
              onClick={() => send({ type: 'discussion_confirm_vote' })}
            >
              ยืนยันโหวตนี้
            </Button>
          </div>
        </div>
      ) : (
        <p className="insider-discussion-done-self insider-muted">
          คุณยืนยันโหวตแล้ว — รอคนอื่น ({gs.voteProgress.done}/{gs.voteProgress.total})
        </p>
      )}
    </section>
  );
}
