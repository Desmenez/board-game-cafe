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

type PinnerGroup = {
  pinnerId: string;
  pinnerName: string;
  picks: CardLookup[];
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

function groupPinsByPinner(gs: CsFilesPlayerView): PinnerGroup[] {
  const lookup = buildCardLookup(gs);
  const byPinner = new Map<string, PinnerGroup>();

  for (const [cardId, pinners] of Object.entries(gs.cardPins ?? {})) {
    const info = lookup.get(cardId);
    if (!info) continue;
    for (const pinner of pinners) {
      let group = byPinner.get(pinner.id);
      if (!group) {
        group = { pinnerId: pinner.id, pinnerName: pinner.name, picks: [] };
        byPinner.set(pinner.id, group);
      }
      group.picks.push(info);
    }
  }

  return [...byPinner.values()]
    .map((group) => ({
      ...group,
      picks: group.picks.sort((a, b) => {
        if (a.ownerName !== b.ownerName) return a.ownerName.localeCompare(b.ownerName, 'th');
        if (a.kind !== b.kind) return a.kind === 'evidence' ? -1 : 1;
        return a.card.label.localeCompare(b.card.label, 'th');
      }),
    }))
    .sort((a, b) => a.pinnerName.localeCompare(b.pinnerName, 'th'));
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

function PickChip({ pick }: { pick: CardLookup }) {
  return (
    <li
      className="relative inline-flex rounded-sm"
      title={`${pick.kind === 'evidence' ? 'หลักฐาน' : 'วิธีฆ่า'} · ของ ${pick.ownerName}`}
    >
      <img
        src={csFilesCardUrl(pick.card.publicId, pick.card.version)}
        alt={pick.card.label}
        className={cn(
          CS_FILES_CARD_ASPECT_CLASS,
          'h-12 w-auto rounded-sm object-cover shadow-sm',
          pick.kind === 'evidence' ? 'border border-amber-600/70' : 'border border-sky-600/70',
        )}
        loading="lazy"
        draggable={false}
      />
      <span className="absolute -right-1 -bottom-1 rounded-full ring-2 ring-paper-2">
        <PlayerAvatar playerId={pick.ownerId} name={pick.ownerName} size={20} />
      </span>
    </li>
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
  const groups = groupPinsByPinner(gs);
  const pinCount = groups.reduce((n, g) => n + g.picks.length, 0);
  const spentBadges = gs.seats.filter((seat) => seat.id !== gs.forensicId && !seat.hasBadge);
  const lookup = buildCardLookup(gs);
  const solveHistory =
    gs.solveHistory && gs.solveHistory.length > 0
      ? gs.solveHistory
      : gs.lastSolveResult
        ? [gs.lastSolveResult]
        : [];

  if (pinCount === 0 && spentBadges.length === 0 && solveHistory.length === 0) {
    return null;
  }

  return (
    <GameHistoryDisclosure
      title={`หมุด & การไขคดี${pinCount > 0 ? ` · ${pinCount}` : ''}${
        solveHistory.length > 0 ? ` · ไข ${solveHistory.length}` : ''
      }`}
      defaultOpen={pinCount > 0 || solveHistory.length > 0}
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
      <div className="flex flex-col gap-3">
        {groups.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {groups.map((group) => (
              <li key={group.pinnerId} className="flex min-w-0 items-start gap-2.5">
                <NamedAvatar playerId={group.pinnerId} name={group.pinnerName} size={32} />
                <ul className="flex min-w-0 flex-wrap gap-2.5 pt-0.5">
                  {group.picks.map((pick) => (
                    <PickChip key={`${group.pinnerId}-${pick.card.id}`} pick={pick} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : null}

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
      </div>
    </GameHistoryDisclosure>
  );
}
