import { useState } from 'react';
import type { SurviveTheIslandPendingRaftBoarding, SurviveTheIslandPlayerView } from 'shared';
import { GameCardActionModal } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { Button } from '../../../components/ui';
import { stiArt, stiAdventurerSrc } from '../art';

type Props = {
  view: SurviveTheIslandPlayerView;
  myId: string;
  onConfirm: (adventurerIds: string[]) => void;
};

export function SurviveTheIslandRaftBoardingModal({ view, myId, onConfirm }: Props) {
  const pending = view.pendingRaftBoarding;
  if (!pending) return null;
  return (
    <SurviveTheIslandRaftBoardingModalBody
      key={`${pending.raftId}:${pending.seats}:${pending.candidateAdventurerIds.join(',')}`}
      view={view}
      myId={myId}
      pending={pending}
      onConfirm={onConfirm}
    />
  );
}

function SurviveTheIslandRaftBoardingModalBody({
  view,
  myId,
  pending,
  onConfirm,
}: Props & { pending: SurviveTheIslandPendingRaftBoarding }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const canDecide = pending.decidingPlayerId === myId;
  const decidingName =
    view.players.find((player) => player.id === pending.decidingPlayerId)?.name ??
    pending.decidingPlayerId;

  const toggle = (adventurerId: string) => {
    setSelectedIds((current) => {
      if (current.includes(adventurerId)) return current.filter((id) => id !== adventurerId);
      if (current.length >= pending.seats) return current;
      return [...current, adventurerId];
    });
  };

  return (
    <GameCardActionModal
      open
      onOpenChange={() => {}}
      dismissible={false}
      titleId="sti-raft-boarding-title"
      descriptionId="sti-raft-boarding-desc"
      title="เลือกผู้โดยสารขึ้นแพ"
      description={`แพมีที่นั่งว่าง ${pending.seats} ที่ แต่มีคนว่ายน้ำมากกว่า — เลือกให้ครบ ${pending.seats} คน`}
      cardSrc={stiArt.tokens.raft}
      cardAlt="แพ"
      cardAspectRatio="1.2"
      meta={`${selectedIds.length}/${pending.seats} คน`}
      actors={
        <div className="flex flex-col gap-2">
          {pending.candidateAdventurerIds.map((adventurerId) => {
            const adventurer = view.adventurers.find((item) => item.id === adventurerId);
            const owner = view.players.find((player) => player.id === adventurer?.playerId);
            const selected = selectedIds.includes(adventurerId);
            return (
              <button
                key={adventurerId}
                type="button"
                disabled={!canDecide}
                onClick={() => toggle(adventurerId)}
                className={[
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition',
                  selected
                    ? 'border-[var(--accent)] bg-[var(--paper-3)]'
                    : 'border-rule bg-transparent',
                  canDecide
                    ? 'cursor-pointer hover:border-[var(--accent)]'
                    : 'cursor-default opacity-80',
                ].join(' ')}
              >
                <img
                  src={stiAdventurerSrc(adventurer?.color ?? 'blue')}
                  alt=""
                  className="h-9 w-9 object-contain"
                />
                <PlayerIdentity
                  playerId={adventurer?.playerId ?? adventurerId}
                  name={owner?.name ?? adventurerId}
                  avatarSize={32}
                  secondary={selected ? 'ขึ้นแพ' : 'ว่ายน้ำ'}
                />
              </button>
            );
          })}
        </div>
      }
      footer={
        canDecide ? (
          <Button
            disabled={selectedIds.length !== pending.seats}
            onClick={() => onConfirm(selectedIds)}
          >
            ขึ้นแพ {selectedIds.length}/{pending.seats}
          </Button>
        ) : (
          <p id="sti-raft-boarding-wait" className="m-0 text-sm text-[var(--text-secondary)]">
            รอ {decidingName} เลือกผู้โดยสารขึ้นแพ
          </p>
        )
      }
    >
      <p
        id="sti-raft-boarding-desc"
        className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]"
      >
        ผู้ที่ไม่ได้ขึ้นแพยังว่ายน้ำอยู่ในช่องเดิม
      </p>
    </GameCardActionModal>
  );
}
