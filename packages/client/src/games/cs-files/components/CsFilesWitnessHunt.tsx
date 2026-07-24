import { useState } from 'react';
import { Target } from 'lucide-react';
import { CS_FILES_ROLE_LABEL_TH, type CsFilesPlayerView } from 'shared';
import { Badge, Button } from '../../../components/ui';
import { GamePhasePanel, GameWaitingState } from '../../../components/game-shell';
import { PlayerChoiceGrid, type PlayerChoice } from '../../../components/player-choice';

type Props = {
  gameState: CsFilesPlayerView;
  myId: string;
  onAccuse: (targetId: string) => void;
  onDraftChange: (targetId: string | null) => void;
};

function buildCandidates(
  gs: CsFilesPlayerView,
  murdererId: string,
  opts: { showAccompliceTag: boolean; blockKnownRoles: boolean },
): PlayerChoice[] {
  return gs.players
    .filter((p) => p.id !== murdererId)
    .map((player) => {
      const isForensic = player.id === gs.forensicId;
      const isAccomplice = gs.accompliceId != null && player.id === gs.accompliceId;
      const blocked = opts.blockKnownRoles && (isForensic || isAccomplice);

      return {
        ...player,
        disabled: blocked,
        badge: isForensic ? (
          <Badge size="sm" variant="info">
            {CS_FILES_ROLE_LABEL_TH.forensic}
          </Badge>
        ) : opts.showAccompliceTag && isAccomplice ? (
          <Badge size="sm" variant="danger">
            {CS_FILES_ROLE_LABEL_TH.accomplice}
          </Badge>
        ) : null,
      };
    });
}

export function CsFilesWitnessHunt({ gameState: gs, myId, onAccuse, onDraftChange }: Props) {
  const draft = gs.witnessHuntDraft ?? null;
  const [target, setTarget] = useState<string | null>(() => draft);
  const isMurderer = gs.myRole === 'murderer';
  const murdererId = gs.murdererId ?? (isMurderer ? myId : null);

  const showAccompliceTag =
    gs.myRole === 'murderer' || gs.myRole === 'forensic' || gs.myRole === 'accomplice';

  if (!isMurderer) {
    const spectators = murdererId
      ? buildCandidates(gs, murdererId, {
          showAccompliceTag,
          blockKnownRoles: false,
        })
      : gs.players.map((p) => ({ ...p }));

    return (
      <GamePhasePanel
        tone="danger"
        title={
          <span className="inline-flex items-center gap-2">
            <Target size={21} aria-hidden />
            ฆาตกรชี้พยาน
          </span>
        }
        description="ไขคดีสำเร็จแล้ว — ดูว่าฆาตกรกำลังชี้ใครอยู่"
      >
        {!draft ? <GameWaitingState>รอฆาตกรเริ่มเลือกเป้าหมาย</GameWaitingState> : null}
        <PlayerChoiceGrid
          ariaLabel="เป้าหมายที่ฆาตกรกำลังเลือก"
          players={spectators}
          selectedIds={draft ? [draft] : []}
          onToggle={() => {}}
          disabled
        />
      </GamePhasePanel>
    );
  }

  const candidates = buildCandidates(gs, myId, {
    showAccompliceTag: true,
    blockKnownRoles: true,
  });

  const canConfirm = target != null && !candidates.find((c) => c.id === target)?.disabled;

  const pickTarget = (id: string) => {
    setTarget(id);
    onDraftChange(id);
  };

  return (
    <GamePhasePanel
      tone="danger"
      title={
        <span className="inline-flex items-center gap-2">
          <Target size={21} aria-hidden />
          ชี้ตัวพยาน
        </span>
      }
      description="เลือกผู้เล่นที่คุณคิดว่าเป็นพยาน หากชี้ถูก ฝ่ายร้ายชนะ — นักนิติฯ และผู้สมรู้ร่วมคิดเลือกไม่ได้"
      actions={
        <Button
          variant="danger"
          size="lg"
          disabled={!canConfirm}
          onClick={() => target && canConfirm && onAccuse(target)}
        >
          <Target size={18} aria-hidden /> ยืนยันเป้าหมาย
        </Button>
      }
    >
      <PlayerChoiceGrid
        ariaLabel="เลือกพยาน"
        players={candidates}
        selectedIds={target ? [target] : []}
        onToggle={pickTarget}
      />
    </GamePhasePanel>
  );
}
