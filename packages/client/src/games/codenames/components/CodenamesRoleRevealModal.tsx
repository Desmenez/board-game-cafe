import type { CodenamesAction, CodenamesPlayerView } from 'shared';
import { GameCardActionModal } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { Button } from '../../../components/ui';
import { CN_ROLE_TITLE, cnTeamName, cnTeamRoleCardSrc } from '../art';

type Props = {
  view: CodenamesPlayerView;
  myId: string;
  send: (action: CodenamesAction) => void;
};

export function CodenamesRoleRevealModal({ view, myId, send }: Props) {
  const me = view.players.find((player) => player.id === myId);
  const progress = view.roleAcknowledgeProgress;
  const current = progress?.current ?? 0;
  const total = progress?.total ?? view.players.length;

  return (
    <GameCardActionModal
      open
      onOpenChange={() => undefined}
      dismissible={false}
      titleId="cn-role-reveal-title"
      descriptionId="cn-role-reveal-desc"
      title="บทบาทของคุณ"
      description={`คุณอยู่${cnTeamName(view.myTeam)} · หน้าที่: ${CN_ROLE_TITLE[view.myRole]}`}
      cardSrc={cnTeamRoleCardSrc(view.myTeam)}
      cardAlt={cnTeamName(view.myTeam)}
      cardAspectRatio="856 / 573"
      meta={`ผู้เล่นยืนยันบทบาทแล้ว ${current}/${total}`}
      actors={
        me ? (
          <PlayerIdentity
            playerId={me.id}
            name={me.name}
            avatarSize={36}
            secondary={CN_ROLE_TITLE[me.role]}
          />
        ) : null
      }
      footer={
        view.hasAcknowledgedRole ? (
          <Button type="button" variant="secondary" disabled>
            คุณยืนยันแล้ว — รอผู้เล่นคนอื่น
          </Button>
        ) : (
          <Button type="button" onClick={() => send({ type: 'acknowledge_role' })}>
            รับทราบ พร้อมเริ่มเกม
          </Button>
        )
      }
    >
      <p className="m-0 text-sm leading-relaxed text-ink-2">
        {view.myRole === 'spymaster'
          ? 'คุณเป็นหัวหน้าทีม: ให้คำใบ้ 1 คำ + จำนวน'
          : 'คุณเป็นลูกทีม: ฟังคำใบ้แล้วเลือกคำบนกระดาน'}
      </p>
    </GameCardActionModal>
  );
}
