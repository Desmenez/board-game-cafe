import { FlaskConical } from 'lucide-react';
import { GamePhasePanel, GameWaitingState } from '../../components/game-shell';
import { PlayerChoiceGrid } from '../../components/player-choice';

type Props = {
  myId: string;
  players: { id: string; name: string }[];
  ladyHolderId?: string;
  prompt?: { holderId: string; canInspectIds: { id: string; name: string }[] };
  onInspect: (targetId: string) => void;
};

export function AvalonLadyOfLakePhase({ myId, players, ladyHolderId, prompt, onInspect }: Props) {
  const holderName = players.find((p) => p.id === ladyHolderId)?.name ?? '?';
  const isHolder = ladyHolderId === myId;

  if (!isHolder) {
    return (
      <GameWaitingState surface="panel">
        ช่วง Lady of the Lake — รอ {holderName} ตรวจสอบฝ่ายของผู้เล่น
      </GameWaitingState>
    );
  }

  return (
    <GamePhasePanel
      title={
        <span className="inline-flex items-center gap-2">
          <FlaskConical size={21} aria-hidden />
          Lady of the Lake
        </span>
      }
      description="เลือกผู้เล่นหนึ่งคนเพื่อดูฝ่ายจริง ผู้ที่เคยถือ Lady มาก่อนจะไม่สามารถถูกเลือกได้ และโทเคนจะย้ายไปยังผู้เล่นที่เลือก"
    >
      <PlayerChoiceGrid
        players={prompt?.canInspectIds ?? []}
        selectedIds={[]}
        onToggle={onInspect}
        ariaLabel="เลือกผู้เล่นที่จะตรวจสอบฝ่าย"
      />
    </GamePhasePanel>
  );
}
