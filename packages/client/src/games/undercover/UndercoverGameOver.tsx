import { Trophy, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import type { UndercoverPlayerView, UndercoverRole } from 'shared';
import { ucRoleModifier } from './roleStyles';

const ROLE_LABEL: Record<UndercoverRole, string> = {
  civilian: 'Civilian',
  undercover: 'Undercover',
  mr_white: 'Mr. White',
};

const TEAM_LABEL = {
  civilian: 'ทีมคนธรรมดา',
  hidden: 'ทีมบทบาทลับ',
  mr_white: 'Mr. White',
} as const;

type Props = {
  view: UndercoverPlayerView;
  myId: string;
  titleId?: string;
};

function teamBannerClass(team: 'civilian' | 'hidden' | 'mr_white'): string {
  if (team === 'civilian') return 'uc-game-over-banner--civilian';
  if (team === 'mr_white') return 'uc-game-over-banner--mr-white';
  return 'uc-game-over-banner--hidden';
}

export function UndercoverGameOver({ view, myId, titleId = 'undercover-game-over-title' }: Props) {
  const reveal = view.gameOverReveal;
  const winners = useMemo(
    () => new Set(view.gameResult?.winners ?? []),
    [view.gameResult?.winners],
  );

  if (!reveal) return null;

  const players = view.players;
  const iWon = winners.has(myId);
  const winningTeam = reveal.winningTeam;

  const { winnerRows, loserRows } = useMemo(() => {
    const winnerRows = players
      .filter((p) => winners.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        role: reveal.roles[p.id] ?? ('civilian' as UndercoverRole),
        word: reveal.words[p.id],
        isMe: p.id === myId,
      }));
    const loserRows = players
      .filter((p) => !winners.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        role: reveal.roles[p.id] ?? ('civilian' as UndercoverRole),
        word: reveal.words[p.id],
        isMe: p.id === myId,
      }));
    return { winnerRows, loserRows };
  }, [players, winners, reveal.roles, reveal.words, myId]);

  return (
    <div className="uc-game-over">
      <div className="uc-game-over-hero">
        {iWon ? (
          <Trophy className="uc-game-over-icon uc-game-over-icon--win" size={44} aria-hidden />
        ) : (
          <XCircle className="uc-game-over-icon uc-game-over-icon--lose" size={44} aria-hidden />
        )}
        <p className="uc-game-over-kicker">เกมจบแล้ว</p>
        <h2
          id={titleId}
          className={[
            'uc-game-over-title',
            iWon ? 'uc-game-over-title--win' : 'uc-game-over-title--lose',
          ].join(' ')}
        >
          {iWon ? 'ยินดีด้วย — คุณชนะ!' : 'เสียใจด้วย — คุณแพ้'}
        </h2>
        <div className={['uc-game-over-banner', teamBannerClass(winningTeam)].join(' ')}>
          <span className="uc-game-over-banner__label">ทีมที่ชนะ</span>
          <strong>{TEAM_LABEL[winningTeam]}</strong>
        </div>
        {view.gameResult?.reason ? (
          <p className="uc-game-over-reason">{view.gameResult.reason}</p>
        ) : null}
      </div>

      <div className="uc-game-over-outcome-grid">
        <section className="uc-game-over-outcome uc-game-over-outcome--win" aria-label="ผู้ชนะ">
          <h3>ผู้ชนะ ({winnerRows.length})</h3>
          {winnerRows.length === 0 ? (
            <p className="uc-muted">—</p>
          ) : (
            <ul className="uc-game-over-player-list">
              {winnerRows.map((p) => (
                <li key={p.id} className={p.isMe ? 'uc-game-over-player--me' : undefined}>
                  <span className="uc-game-over-player__name">{p.name}</span>
                  <span className={`uc-role-badge uc-role-badge--${ucRoleModifier(p.role)}`}>
                    {ROLE_LABEL[p.role]}
                  </span>
                  {p.word ? <span className="uc-game-over-player__word">{p.word}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="uc-game-over-outcome uc-game-over-outcome--lose" aria-label="ผู้แพ้">
          <h3>ผู้แพ้ ({loserRows.length})</h3>
          {loserRows.length === 0 ? (
            <p className="uc-muted">—</p>
          ) : (
            <ul className="uc-game-over-player-list">
              {loserRows.map((p) => (
                <li key={p.id} className={p.isMe ? 'uc-game-over-player--me' : undefined}>
                  <span className="uc-game-over-player__name">{p.name}</span>
                  <span className={`uc-role-badge uc-role-badge--${ucRoleModifier(p.role)}`}>
                    {ROLE_LABEL[p.role]}
                  </span>
                  {p.word ? <span className="uc-game-over-player__word">{p.word}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="uc-game-over-words card">
        <p>
          <strong>คำคนธรรมดา:</strong> {reveal.civilianWord}
        </p>
        <p>
          <strong>คำ Undercover:</strong> {reveal.undercoverWord}
        </p>
        <p className="uc-muted">
          หมวด {reveal.categoryLabel} · เล่น {reveal.roundsPlayed} รอบ
          {reveal.mostVotedPlayerId
            ? ` · โหวตมากสุด: ${players.find((p) => p.id === reveal.mostVotedPlayerId)?.name ?? '—'}`
            : ''}
        </p>
      </div>

      {reveal.voteHistory.length > 0 ? (
        <details className="uc-game-over-votes">
          <summary>ประวัติโหวต ({reveal.voteHistory.length})</summary>
          <ul className="uc-vote-history">
            {reveal.voteHistory.map((r, i) => (
              <li key={i}>
                รอบ {r.roundNo}:{' '}
                {r.eliminatedId
                  ? `คัดออก ${players.find((p) => p.id === r.eliminatedId)?.name ?? r.eliminatedId}`
                  : r.tie
                    ? 'เสมอ — ไม่คัดออก'
                    : '—'}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
