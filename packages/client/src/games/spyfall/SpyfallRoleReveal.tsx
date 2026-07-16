import type { SpyfallPlayerView } from 'shared';
import { GroupAcknowledgeGate } from '../../components/session-sync';
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
    <GroupAcknowledgeGate
      className="sf-panel"
      title={
        <>
          เปิดการ์ดบทบาท — รอบ {view.roundNo}/{view.totalRounds}
        </>
      }
      subtitle={
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          อ่านการ์ดของคุณแล้วกดรับทราบ — พูดถาม-ตอบนอกแอป (honor system)
        </p>
      }
      acknowledged={you.hasAcknowledgedRole}
      onAcknowledge={onAcknowledge}
      progress={{ current: acked, total }}
    >
      <SpyfallRoleCard
        isSpy={you.isSpy}
        locationName={you.locationName}
        roleName={you.roleName}
        useRoles={view.useRoles}
      />
    </GroupAcknowledgeGate>
  );
}
