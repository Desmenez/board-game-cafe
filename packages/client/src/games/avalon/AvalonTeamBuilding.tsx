import { Swords } from 'lucide-react';
import { QUEST_TEAM_SIZES, QUEST_TWO_FAILS } from 'shared';
import { Button } from '../../components/ui';
import { GamePhasePanel } from '../../components/game-shell';
import { PlayerChoiceGrid } from '../../components/player-choice';

type Props = {
  players: { id: string; name: string }[];
  leader: { id: string; name: string };
  isLeader: boolean;
  questNumber: number;
  playerCount: number;
  selectedTeam: string[];
  onSelectTeam: (ids: string[]) => void;
  onSubmitTeam: () => void;
};

export function AvalonTeamBuilding({
  players,
  leader,
  isLeader,
  questNumber,
  playerCount,
  selectedTeam,
  onSelectTeam,
  onSubmitTeam,
}: Props) {
  const requiredSize = QUEST_TEAM_SIZES[playerCount]?.[questNumber] || 2;
  const failCardsNeededForEvil = QUEST_TWO_FAILS[playerCount]?.[questNumber] ? 2 : 1;

  const togglePlayer = (playerId: string) => {
    if (!isLeader) return;
    if (selectedTeam.includes(playerId)) {
      onSelectTeam(selectedTeam.filter((id) => id !== playerId));
    } else if (selectedTeam.length < requiredSize) {
      onSelectTeam([...selectedTeam, playerId]);
    }
  };

  return (
    <GamePhasePanel
      title={
        <span className="inline-flex items-center gap-2">
          <Swords size={21} aria-hidden />
          เลือกทีม Quest {questNumber + 1}
        </span>
      }
      description={
        isLeader
          ? `เลือกผู้เล่น ${requiredSize} คนเพื่อออกทำภารกิจ`
          : `รอ ${leader.name} เลือกทีม ${requiredSize} คน`
      }
      meta={
        <span>
          Quest นี้ต้องมีการ์ด Fail อย่างน้อย{' '}
          <strong className="text-error">{failCardsNeededForEvil} ใบ</strong> จึงจะล้มเหลว
          {failCardsNeededForEvil === 2 ? ' เพราะมีผู้เล่นตั้งแต่ 7 คนขึ้นไป' : ''}
        </span>
      }
      actions={
        isLeader ? (
          <Button size="lg" disabled={selectedTeam.length !== requiredSize} onClick={onSubmitTeam}>
            ส่งทีม ({selectedTeam.length}/{requiredSize})
          </Button>
        ) : null
      }
    >
      <PlayerChoiceGrid
        players={players}
        selectedIds={selectedTeam}
        disabled={!isLeader}
        onToggle={togglePlayer}
        ariaLabel={`เลือกผู้เล่น ${requiredSize} คนไป Quest`}
      />
    </GamePhasePanel>
  );
}
