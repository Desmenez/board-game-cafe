import type { AvalonPhase } from 'shared';
import { QUEST_TEAM_SIZES } from 'shared';
import { GameProgressTrack, type GameProgressValue } from '../../components/game-shell';

function readyLabel(ready: boolean) {
  return ready ? 'พร้อมแล้ว' : 'รอ';
}

type Props = {
  phase: AvalonPhase;
  questResults: ('success' | 'fail' | 'pending')[];
  currentQuest: number;
  playerCount: number;
  compositionAcknowledgeProgress?: GameProgressValue;
  roleAcknowledgeProgress?: GameProgressValue;
};

export function AvalonQuestTrack({
  phase,
  questResults,
  currentQuest,
  playerCount,
  compositionAcknowledgeProgress,
  roleAcknowledgeProgress,
}: Props) {
  const sizes = QUEST_TEAM_SIZES[playerCount] || [2, 3, 2, 3, 3];

  if (phase === 'composition' && compositionAcknowledgeProgress) {
    const { current, total } = compositionAcknowledgeProgress;
    return (
      <GameProgressTrack
        ariaLabel="ความพร้อมรับทราบสำรับ"
        items={Array.from({ length: total }, (_, i) => ({
          id: `composition-${i}`,
          label: readyLabel(i < current),
          state:
            i < current ? ('success' as const) : i === current ? ('active' as const) : 'pending',
        }))}
      />
    );
  }

  if (phase === 'role_reveal' && roleAcknowledgeProgress) {
    const { current, total } = roleAcknowledgeProgress;
    return (
      <GameProgressTrack
        ariaLabel="ความพร้อมรับทราบบทบาท"
        items={Array.from({ length: total }, (_, i) => ({
          id: `player-${i}`,
          label: readyLabel(i < current),
          state:
            i < current ? ('success' as const) : i === current ? ('active' as const) : 'pending',
        }))}
      />
    );
  }

  return (
    <GameProgressTrack
      ariaLabel="ความคืบหน้า Quest"
      items={questResults.map((result, i) => ({
        id: `quest-${i}`,
        label: `Quest ${i + 1}`,
        meta: `${sizes[i]} คน`,
        state:
          result === 'success'
            ? 'success'
            : result === 'fail'
              ? 'fail'
              : i === currentQuest
                ? 'active'
                : 'pending',
      }))}
    />
  );
}
