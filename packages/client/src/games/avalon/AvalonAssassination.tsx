import { useState } from 'react';
import { Target } from 'lucide-react';
import { Badge, Button } from '../../components/ui';
import { GamePhasePanel, GameWaitingState } from '../../components/game-shell';
import { PlayerChoiceGrid } from '../../components/player-choice';
import { getAvalonRolePortraitUrl } from '../../imageMap';

type Props = {
  players: { id: string; name: string }[];
  myId: string;
  myRole: string;
  knownInfo: { id: string; name: string; detail: string }[];
  onAssassinate: (targetId: string) => void;
};

export function AvalonAssassination({ players, myId, myRole, knownInfo, onAssassinate }: Props) {
  const [target, setTarget] = useState<string | null>(null);
  const isAssassin = myRole === 'assassin';

  const goodPlayers = players.filter((p) => p.id !== myId);
  // Assassin รู้เฉพาะ evil ally ที่ระบบบอกได้ (ตามกติกา Oberon จะไม่ถูกเปิดให้รู้ในข้อมูล knownInfo)
  const knownEvilIds = new Set(
    knownInfo.filter((k) => k.detail === 'Evil ally' || k.detail === 'Evil').map((k) => k.id),
  );

  if (!isAssassin) {
    const assassinCardArt = getAvalonRolePortraitUrl('assassin');
    return (
      <GamePhasePanel
        title={
          <span className="inline-flex items-center gap-2">
            <Target size={21} aria-hidden />
            ช่วงลอบสังหาร
          </span>
        }
        description="ฝ่ายดีทำ Quest สำเร็จสามครั้ง แต่ Assassin ยังมีโอกาสพลิกผลด้วยการตามหา Merlin"
      >
        <GameWaitingState>รอ Assassin เลือกเป้าหมาย</GameWaitingState>
        <div className="mx-auto mt-5 grid max-w-md gap-3 text-center">
          <div className="mx-auto w-full max-w-48 overflow-hidden rounded-card border border-rule bg-paper-3">
            <img
              src={assassinCardArt}
              alt="การ์ดบท Assassin"
              className="aspect-[3/4] w-full object-cover"
              loading="lazy"
            />
          </div>
          <p className="text-sm leading-relaxed text-ink-2">
            การ์ดนี้แสดงบท <strong>Assassin</strong> เท่านั้น — ไม่ได้เปิดเผยว่าใครในห้องถือบทนี้
          </p>
        </div>
      </GamePhasePanel>
    );
  }

  return (
    <GamePhasePanel
      tone="danger"
      title={
        <span className="inline-flex items-center gap-2">
          <Target size={21} aria-hidden />
          คุณคือ Assassin
        </span>
      }
      description="เลือกผู้เล่นที่คุณคิดว่าเป็น Merlin หากเลือกถูก ฝ่ายชั่วจะชนะทันที"
      actions={
        <Button
          variant="danger"
          size="lg"
          disabled={!target}
          onClick={() => target && onAssassinate(target)}
        >
          <Target size={18} aria-hidden /> ยืนยันเป้าหมาย
        </Button>
      }
    >
      <PlayerChoiceGrid
        players={goodPlayers.map((player) => ({
          ...player,
          badge: knownEvilIds.has(player.id) ? (
            <Badge size="sm" variant="danger">
              ฝ่ายเดียวกับคุณ
            </Badge>
          ) : null,
        }))}
        selectedIds={target ? [target] : []}
        onToggle={(id) => setTarget(id)}
        ariaLabel="เลือกเป้าหมายที่คิดว่าเป็น Merlin"
      />
    </GamePhasePanel>
  );
}
