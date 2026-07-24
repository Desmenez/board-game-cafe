import { useState } from 'react';
import type { CsFilesCardDef, CsFilesPlayerView } from 'shared';
import { Button } from '../../../components/ui';
import { GamePhasePanel, GameWaitingState } from '../../../components/game-shell';
import { csFilesCardUrl } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { CS_FILES_CARD_ASPECT_CLASS } from '../lib/roleMeta';

type Props = {
  gameState: CsFilesPlayerView;
  myId: string;
  onSelect: (evidenceCardId: string, meansCardId: string) => void;
  onDraftChange: (evidenceCardId: string | null, meansCardId: string | null) => void;
};

function CardPick({
  cards,
  selectedId,
  onSelect,
  accent,
  readOnly = false,
}: {
  cards: CsFilesCardDef[];
  selectedId: string | null;
  onSelect?: (id: string) => void;
  accent: 'brown' | 'blue';
  readOnly?: boolean;
}) {
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {cards.map((c) => {
        const selected = selectedId === c.id;
        const className = cn(
          'group relative min-w-0 overflow-hidden rounded-card border bg-paper-3 transition',
          !readOnly &&
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-2',
          selected
            ? accent === 'brown'
              ? 'border-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.35)] ring-2 ring-amber-500/80 focus-visible:ring-amber-400'
              : 'border-sky-400 shadow-[0_0_0_1px_rgba(56,189,248,0.35)] ring-2 ring-sky-400/80 focus-visible:ring-sky-300'
            : accent === 'brown'
              ? 'border-amber-900/50 hover:border-amber-600/70 focus-visible:ring-amber-500/60'
              : 'border-sky-900/50 hover:border-sky-500/70 focus-visible:ring-sky-400/60',
          readOnly && !selected && 'opacity-80',
        );
        const body = (
          <>
            <img
              src={csFilesCardUrl(c.publicId, c.version)}
              alt={c.label}
              title={c.label}
              className={cn(
                CS_FILES_CARD_ASPECT_CLASS,
                'w-full object-cover transition duration-200',
                selected ? 'brightness-110' : !readOnly && 'group-hover:brightness-105',
              )}
              loading="lazy"
            />
            {selected ? (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-2 pb-2 pt-8 text-center text-xs font-semibold tracking-wide text-white">
                {readOnly ? 'ฆาตกรเลือก' : 'เลือกแล้ว'}
              </span>
            ) : null}
          </>
        );

        if (readOnly) {
          return (
            <div key={c.id} className={className} aria-current={selected ? 'true' : undefined}>
              {body}
            </div>
          );
        }

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect?.(c.id)}
            aria-pressed={selected}
            className={className}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}

export function CsFilesNightCrime({ gameState: gs, myId, onSelect, onDraftChange }: Props) {
  const draft = gs.crimeDraft;
  const [evidenceId, setEvidenceId] = useState<string | null>(() => draft?.evidenceCardId ?? null);
  const [meansId, setMeansId] = useState<string | null>(() => draft?.meansCardId ?? null);
  const isMurderer = gs.myRole === 'murderer';
  const isAccomplice = gs.myRole === 'accomplice';
  const mySeat = gs.seats.find((s) => s.id === myId);
  const murdererSeat = gs.murdererId ? gs.seats.find((s) => s.id === gs.murdererId) : undefined;
  const canConfirm = Boolean(evidenceId && meansId);

  const pickEvidence = (id: string) => {
    setEvidenceId(id);
    onDraftChange(id, meansId);
  };

  const pickMeans = (id: string) => {
    setMeansId(id);
    onDraftChange(evidenceId, id);
  };

  if (isMurderer && mySeat) {
    return (
      <GamePhasePanel
        tone="danger"
        className="max-w-4xl mx-auto w-full"
        title="ช่วงก่อเหตุ — คุณคือฆาตกร"
        description="เลือกการ์ดหลักฐาน 1 ใบ และการ์ดวิธีฆ่า 1 ใบของตนเป็นคำตอบ"
        actionsPlacement="footer"
        actions={
          <Button
            variant="danger"
            size="lg"
            className="min-w-48"
            disabled={!canConfirm}
            onClick={() => evidenceId && meansId && onSelect(evidenceId, meansId)}
          >
            ยืนยันคำตอบ
          </Button>
        }
      >
        <div className="grid gap-8">
          <div>
            <p className="mb-3 text-center font-display text-sm font-bold tracking-wide text-amber-200/90 sm:text-base">
              หลักฐาน (น้ำตาล)
            </p>
            <CardPick
              cards={mySeat.brownCards}
              selectedId={evidenceId}
              onSelect={pickEvidence}
              accent="brown"
            />
          </div>
          <div>
            <p className="mb-3 text-center font-display text-sm font-bold tracking-wide text-sky-200/90 sm:text-base">
              วิธีฆ่า (น้ำเงิน)
            </p>
            <CardPick
              cards={mySeat.blueCards}
              selectedId={meansId}
              onSelect={pickMeans}
              accent="blue"
            />
          </div>
        </div>
      </GamePhasePanel>
    );
  }

  if (isAccomplice && murdererSeat) {
    const draftEvidence = draft?.evidenceCardId ?? null;
    const draftMeans = draft?.meansCardId ?? null;
    const hasAnyDraft = Boolean(draftEvidence || draftMeans);

    return (
      <GamePhasePanel
        tone="danger"
        className="max-w-4xl mx-auto w-full"
        title="ช่วงก่อเหตุ — ผู้สมรู้ร่วมคิด"
        description={`ดูการ์ดของฆาตกร (${murdererSeat.name}) — ไฮไลต์คือใบที่กำลังเลือก`}
      >
        <div className="grid gap-8">
          {!hasAnyDraft ? (
            <GameWaitingState>รอฆาตกรเริ่มเลือกหลักฐานและวิธีฆ่า</GameWaitingState>
          ) : null}
          <div>
            <p className="mb-3 text-center font-display text-sm font-bold tracking-wide text-amber-200/90 sm:text-base">
              หลักฐาน (น้ำตาล)
            </p>
            <CardPick
              cards={murdererSeat.brownCards}
              selectedId={draftEvidence}
              accent="brown"
              readOnly
            />
          </div>
          <div>
            <p className="mb-3 text-center font-display text-sm font-bold tracking-wide text-sky-200/90 sm:text-base">
              วิธีฆ่า (น้ำเงิน)
            </p>
            <CardPick
              cards={murdererSeat.blueCards}
              selectedId={draftMeans}
              accent="blue"
              readOnly
            />
          </div>
        </div>
      </GamePhasePanel>
    );
  }

  if (isAccomplice) {
    return (
      <GamePhasePanel
        tone="danger"
        title="ช่วงก่อเหตุ — ผู้สมรู้ร่วมคิด"
        description="รอฆาตกรเลือกคำตอบ"
      >
        <GameWaitingState>รอฆาตกรเลือกหลักฐานและวิธีฆ่า</GameWaitingState>
      </GamePhasePanel>
    );
  }

  return (
    <GamePhasePanel title="ช่วงก่อเหตุ" description="ทุกคนหลับตา — ฆาตกรกำลังเลือกคำตอบ">
      <GameWaitingState>รอฆาตกรเลือกหลักฐานและวิธีฆ่า</GameWaitingState>
    </GamePhasePanel>
  );
}
