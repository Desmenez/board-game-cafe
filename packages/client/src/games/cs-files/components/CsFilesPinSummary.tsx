import { ArrowRight } from 'lucide-react';
import type { CsFilesCardDef, CsFilesPlayerView, CsFilesSolveAttempt } from 'shared';
import { Badge } from '../../../components/ui';
import { GameHistoryDisclosure } from '../../../components/game-shell';
import { PlayerAvatar } from '../../../components/player-avatar';
import { csFilesCardUrl } from '../../../imageMap';
import { CS_FILES_CARD_ASPECT_CLASS } from '../lib/roleMeta';
import { cn } from '../../../utils/cn';

type Props = {
  gameState: CsFilesPlayerView;
};

type CardLookup = {
  card: CsFilesCardDef;
  kind: 'evidence' | 'means';
  ownerId: string;
  ownerName: string;
};

function buildCardLookup(gs: CsFilesPlayerView): Map<string, CardLookup> {
  const map = new Map<string, CardLookup>();
  for (const seat of gs.seats) {
    for (const card of seat.brownCards) {
      map.set(card.id, {
        card,
        kind: 'evidence',
        ownerId: seat.id,
        ownerName: seat.name,
      });
    }
    for (const card of seat.blueCards) {
      map.set(card.id, {
        card,
        kind: 'means',
        ownerId: seat.id,
        ownerName: seat.name,
      });
    }
  }
  return map;
}

function NamedAvatar({
  playerId,
  name,
  size = 36,
}: {
  playerId: string;
  name: string;
  size?: number;
}) {
  return (
    <div className="flex w-14 flex-col items-center gap-0.5">
      <PlayerAvatar playerId={playerId} name={name} size={size} />
      <span className="w-full truncate text-center text-[11px] font-medium text-ink-2">{name}</span>
    </div>
  );
}

function CardFigure({
  card,
  kind,
}: {
  card: CsFilesCardDef;
  kind: 'evidence' | 'means';
}) {
  const kindLabel = kind === 'evidence' ? 'หลักฐาน' : 'วิธีฆ่า';
  return (
    <figure className="flex flex-col items-center gap-0.5">
      <img
        src={csFilesCardUrl(card.publicId, card.version)}
        alt={`${kindLabel} · ${card.label}`}
        title={`${kindLabel} · ${card.label}`}
        className={cn(
          CS_FILES_CARD_ASPECT_CLASS,
          'h-16 w-auto rounded-sm object-cover shadow-sm',
          kind === 'evidence' ? 'border border-amber-600/70' : 'border border-sky-600/70',
        )}
        loading="lazy"
        draggable={false}
      />
      <figcaption className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
        {kindLabel}
      </figcaption>
    </figure>
  );
}

function SolveAttemptCard({
  attempt,
  evidence,
  means,
}: {
  attempt: CsFilesSolveAttempt;
  evidence?: CardLookup;
  means?: CardLookup;
}) {
  return (
    <li
      className={cn(
        'flex shrink-0 snap-start flex-row items-center gap-3 rounded-card border p-2.5',
        attempt.correct
          ? 'border-success/45 bg-success/10'
          : 'border-error/40 bg-error/10',
      )}
    >
      <div className="flex items-center gap-1.5">
        <NamedAvatar playerId={attempt.playerId} name={attempt.playerName} />
        <ArrowRight
          size={16}
          className={cn(
            'mb-4 shrink-0',
            attempt.correct ? 'text-success/70' : 'text-error/70',
          )}
          aria-hidden
        />
        <NamedAvatar playerId={attempt.targetPlayerId} name={attempt.targetPlayerName} />
        <Badge
          variant={attempt.correct ? 'success' : 'danger'}
          size="sm"
          className="mb-4 ml-0.5"
        >
          {attempt.correct ? 'ถูก' : 'ผิด'}
        </Badge>
      </div>

      {evidence || means ? (
        <>
          <div
            className={cn(
              'h-14 w-px shrink-0',
              attempt.correct ? 'bg-success/25' : 'bg-error/25',
            )}
            aria-hidden
          />
          <div className="flex items-end gap-2.5">
            {evidence ? <CardFigure card={evidence.card} kind="evidence" /> : null}
            {means ? <CardFigure card={means.card} kind="means" /> : null}
          </div>
        </>
      ) : null}
    </li>
  );
}

export function CsFilesPinSummary({ gameState: gs }: Props) {
  const spentBadges = gs.seats.filter((seat) => seat.id !== gs.forensicId && !seat.hasBadge);
  const lookup = buildCardLookup(gs);
  const solveHistory =
    gs.solveHistory && gs.solveHistory.length > 0
      ? gs.solveHistory
      : gs.lastSolveResult
        ? [gs.lastSolveResult]
        : [];

  if (spentBadges.length === 0 && solveHistory.length === 0) {
    return null;
  }

  return (
    <GameHistoryDisclosure
      title={`การไขคดี${solveHistory.length > 0 ? ` · ${solveHistory.length}` : ''}`}
      defaultOpen={solveHistory.length > 0}
      meta={
        spentBadges.length > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xs text-ink-3">หมดสิทธิ์</span>
            <span className="inline-flex -space-x-1.5">
              {spentBadges.map((seat) => (
                <span key={seat.id} className="rounded-full ring-2 ring-paper-2">
                  <PlayerAvatar playerId={seat.id} name={seat.name} size={22} />
                </span>
              ))}
            </span>
          </span>
        ) : null
      }
    >
      {solveHistory.length > 0 ? (
        <ul
          className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]"
          aria-label="ประวัติการไขคดี"
        >
          {solveHistory.map((attempt, index) => (
            <SolveAttemptCard
              key={`${attempt.playerId}-${attempt.targetPlayerId}-${attempt.evidenceCardId}-${attempt.meansCardId}-${index}`}
              attempt={attempt}
              evidence={lookup.get(attempt.evidenceCardId)}
              means={lookup.get(attempt.meansCardId)}
            />
          ))}
        </ul>
      ) : null}
    </GameHistoryDisclosure>
  );
}
