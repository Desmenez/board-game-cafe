import type { Salem1692PublicPlayer } from 'shared';
import { salem1692TownHallImage, salem1692TownHallLabel } from './cardMeta';

type Props = {
  players: Salem1692PublicPlayer[];
  currentPlayerId: string | null;
  onSelectPlayer?: (id: string) => void;
  selectableIds?: string[];
};

export function Salem1692PlayerStrip({
  players,
  currentPlayerId,
  onSelectPlayer,
  selectableIds,
}: Props) {
  return (
    <section className="s1692-player-strip" aria-label="ผู้เล่น">
      {players.map((p) => {
        const selectable = selectableIds?.includes(p.id) ?? false;
        const active = currentPlayerId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            className={[
              's1692-player-chip',
              active ? 's1692-player-chip--active' : '',
              !p.alive ? 's1692-player-chip--dead' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={selectable && onSelectPlayer ? () => onSelectPlayer(p.id) : undefined}
            disabled={!selectable || !onSelectPlayer}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <img
                src={salem1692TownHallImage(p.townHallId)}
                alt=""
                width={36}
                height={48}
                style={{ borderRadius: 4, objectFit: 'cover' }}
              />
              <div style={{ textAlign: 'left' }}>
                <strong>{p.name}</strong>
                <div style={{ fontSize: '0.75rem' }}>{salem1692TownHallLabel(p.townHallId)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Accusation {p.accusationPoints}
                  {p.blueCards.length > 0 ? ` · Blue ${p.blueCards.length}` : ''}
                  {p.hasBlackCat ? ' · Black Cat' : ''}
                  {p.hasGavel ? ' · Gavel' : ''}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
}
