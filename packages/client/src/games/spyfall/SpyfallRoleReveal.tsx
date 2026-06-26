import type { SpyfallPlayerView } from 'shared';
import { Button } from '../../components/ui';
import { SpyfallRoleCard } from './SpyfallRoleCard';

type Props = {
  view: SpyfallPlayerView;
  onAcknowledge: () => void;
};

export function SpyfallRoleReveal({ view, onAcknowledge }: Props) {
  const acked = view.players.filter((p) => p.hasAcknowledgedRole).length;
  const total = view.players.length;
  const { you } = view;

  return (
    <div className="sf-panel">
      <h2>เปิดการ์ดบทบาท — รอบ {view.roundNo}/{view.totalRounds}</h2>
      <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
        อ่านการ์ดของคุณแล้วกดรับทราบ — พูดถาม-ตอบนอกแอป (honor system)
      </p>
      <SpyfallRoleCard
        isSpy={you.isSpy}
        locationName={you.locationName}
        roleName={you.roleName}
        useRoles={view.useRoles}
      />
      <div className="sf-actions" style={{ justifyContent: 'center' }}>
        <Button
          variant="primary"
          disabled={you.hasAcknowledgedRole}
          onClick={onAcknowledge}
        >
          {you.hasAcknowledgedRole ? 'รับทราบแล้ว' : 'รับทราบ'}
        </Button>
      </div>
      <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)' }}>
        รับทราบแล้ว {acked}/{total}
      </p>
    </div>
  );
}
