import { useState } from 'react';
import { Check, Swords, X } from 'lucide-react';
import { Button } from '../../../components/ui';
import { GameDecisionActions, GamePhasePanel, GameWaitingState } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';

type Props = {
  selectedTeam: string[];
  players: { id: string; name: string }[];
  myId: string;
  onVote: (success: boolean) => void;
  myTeam: string;
};

export function AvalonQuestPhase({ selectedTeam, players, myId, onVote, myTeam }: Props) {
  const isOnQuest = selectedTeam.includes(myId);
  const [voted, setVoted] = useState(false);

  const teamPlayers = selectedTeam
    .map((id) => players.find((player) => player.id === id))
    .filter((player): player is { id: string; name: string } => Boolean(player));

  const handleVote = (success: boolean) => {
    setVoted(true);
    onVote(success);
  };

  return (
    <GamePhasePanel
      title={
        <span className="inline-flex items-center gap-2">
          <Swords size={21} aria-hidden />
          Quest
        </span>
      }
      description="ผู้เล่นชุดนี้กำลังออกทำ Quest"
    >
      <section
        className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2"
        aria-label="ทีม Quest"
      >
        {teamPlayers.map((player) => (
          <PlayerIdentity
            key={player.id}
            playerId={player.id}
            name={player.name}
            avatarSize={32}
            className="rounded-input border border-rule bg-paper-3 p-2"
          />
        ))}
      </section>

      {isOnQuest ? (
        !voted ? (
          <div>
            <p className="mb-5 text-center text-base leading-relaxed text-ink-2">
              {myTeam === 'good'
                ? 'คุณเป็นฝ่ายดี — ต้องเลือก Success เท่านั้น'
                : 'คุณเป็นฝ่ายชั่ว — เลือก Success หรือ Fail ก็ได้'}
            </p>
            {myTeam === 'evil' ? (
              <GameDecisionActions
                primary={{
                  label: (
                    <>
                      <Check size={18} aria-hidden /> Success
                    </>
                  ),
                  onSelect: () => handleVote(true),
                }}
                secondary={{
                  label: (
                    <>
                      <X size={18} aria-hidden /> Fail
                    </>
                  ),
                  onSelect: () => handleVote(false),
                }}
              />
            ) : (
              <Button size="lg" variant="success" block onClick={() => handleVote(true)}>
                <Check size={18} aria-hidden /> Success
              </Button>
            )}
          </div>
        ) : (
          <GameWaitingState>คุณลงการ์ดแล้ว — รอผลลัพธ์</GameWaitingState>
        )
      ) : (
        <GameWaitingState>คุณไม่ได้อยู่ใน Quest นี้ — รอผลลัพธ์</GameWaitingState>
      )}
    </GamePhasePanel>
  );
}
