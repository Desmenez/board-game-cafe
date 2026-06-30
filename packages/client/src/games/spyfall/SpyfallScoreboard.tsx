import type { SpyfallPublicPlayer } from 'shared';

type Props = {
  players: SpyfallPublicPlayer[];
  scores: Record<string, number>;
  myId: string;
};

export function SpyfallScoreboard({ players, scores, myId }: Props) {
  const sorted = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  return (
    <div className="sf-panel">
      <h2>คะแนน</h2>
      <div className="sf-scoreboard">
        {sorted.map((p) => (
          <span
            key={p.id}
            className={['sf-score-pill', p.id === myId ? 'sf-score-pill--me' : '']
              .filter(Boolean)
              .join(' ')}
          >
            {p.name}: {scores[p.id] ?? 0}
          </span>
        ))}
      </div>
    </div>
  );
}
