import type { SurviveTheIslandPlayerView } from 'shared';
import { GameCardActionModal, GameDecisionActions } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { STI_CREATURE_LABEL, stiAbilitySrc, stiCreatureSrc } from '../art';

type Props = {
  view: SurviveTheIslandPlayerView;
  myId: string;
  onUse: () => void;
  onPass: () => void;
};

export function SurviveTheIslandRepellentModal({ view, myId, onUse, onPass }: Props) {
  const pending = view.pendingRepellent;
  if (!pending) return null;
  const creature = view.creatures.find((item) => item.id === pending.creatureId);
  const canDecide =
    pending.eligiblePlayerIds.includes(myId) && !pending.passedPlayerIds.includes(myId);
  const waitingNames = pending.eligiblePlayerIds
    .filter((id) => !pending.passedPlayerIds.includes(id))
    .map((id) => view.players.find((player) => player.id === id)?.name ?? id);

  return (
    <GameCardActionModal
      open
      onOpenChange={() => {}}
      dismissible={false}
      titleId="sti-repellent-title"
      descriptionId="sti-repellent-desc"
      title="ใช้การ์ดไล่สัตว์?"
      description={`${STI_CREATURE_LABEL[pending.kind]} อยู่ช่องเดียวกับผจญภัย — ผู้ที่มีการ์ดไล่สัตว์ใช้ได้ทันที คนแรกที่กดใช้เอาสัตว์ออก`}
      cardSrc={stiAbilitySrc('repellent')}
      cardAlt="ไล่สัตว์"
      cardAspectRatio="1 / 0.866"
      meta={
        creature ? (
          <span className="inline-flex items-center gap-2">
            <img src={stiCreatureSrc(pending.kind)} alt="" className="h-8 w-8 object-contain" />
            {STI_CREATURE_LABEL[pending.kind]}
          </span>
        ) : null
      }
      actors={
        <div className="flex flex-col gap-2">
          {pending.eligiblePlayerIds.map((playerId) => {
            const player = view.players.find((item) => item.id === playerId);
            const passed = pending.passedPlayerIds.includes(playerId);
            return (
              <PlayerIdentity
                key={playerId}
                playerId={playerId}
                name={`${player?.name ?? playerId}${playerId === myId ? ' (คุณ)' : ''}`}
                avatarSize={36}
                secondary={passed ? 'ไม่ใช้' : 'มีการ์ดไล่สัตว์'}
              />
            );
          })}
        </div>
      }
      footer={
        canDecide ? (
          <GameDecisionActions
            primary={{ label: 'ใช้ไล่สัตว์', onSelect: onUse }}
            secondary={{ label: 'ไม่ใช้', variant: 'secondary', onSelect: onPass }}
          />
        ) : (
          <p id="sti-repellent-wait" className="m-0 text-sm text-[var(--text-secondary)]">
            {waitingNames.length
              ? `รอ ${waitingNames.join(', ')} ใช้หรือไม่ใช้การ์ดไล่สัตว์`
              : 'รอผลไล่สัตว์'}
          </p>
        )
      }
    >
      <p id="sti-repellent-desc" className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]">
        ทุกคนเห็นว่าใครมีการ์ดไล่สัตว์ในจังหวะนี้ งูทะเลไล่ไม่ได้
      </p>
    </GameCardActionModal>
  );
}
