import type { Salem1692PublicPlayer } from 'shared';
import { Button } from '../../components/ui';
import { Salem1692PlayerStrip } from './Salem1692PlayerStrip';

type Props = {
  players: Salem1692PublicPlayer[];
  witchTeamIds: string[] | null;
  onPlace: (targetId: string) => void;
};

export function Salem1692DawnModal({ players, witchTeamIds, onPlace }: Props) {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="s1692-dawn-title"
    >
      <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 id="s1692-dawn-title">Dawn — วาง Black Cat</h2>
        <p>Witches เลือกผู้เล่นที่จะได้รับ Black Cat (เลือกตัวเองได้)</p>
        {witchTeamIds && witchTeamIds.length > 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Witch team: {witchTeamIds.length} คน
          </p>
        )}
        <Salem1692PlayerStrip
          players={players.filter((p) => p.alive)}
          currentPlayerId={null}
          selectableIds={players.filter((p) => p.alive).map((p) => p.id)}
          onSelectPlayer={(id) => onPlace(id)}
        />
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          แตะชื่อผู้เล่นเพื่อวาง Black Cat
        </p>
        <Button type="button" variant="secondary" disabled>
          รอ Witch เลือก
        </Button>
      </div>
    </div>
  );
}
