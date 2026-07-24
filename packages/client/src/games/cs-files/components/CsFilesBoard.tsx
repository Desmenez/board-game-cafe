import { Skull, UserRound } from 'lucide-react';
import type { CsFilesCardDef, CsFilesPlayerView, CsFilesSeatView } from 'shared';
import { Badge } from '../../../components/ui';
import { PlayerIdentity } from '../../../components/player-avatar';
import { csFilesCardUrl } from '../../../imageMap';
import { CS_FILES_BADGE_URL, CS_FILES_CARD_ASPECT_CLASS } from '../lib/roleMeta';
import { cn } from '../../../utils/cn';

type Props = {
  gameState: CsFilesPlayerView;
  myId: string;
  highlightSeatId?: string | null;
  onToggleCardPin?: (cardId: string) => void;
};

function BoardCard({
  card,
  isSolution,
  defaultBorderClass,
  pinners,
  canPin,
  iPinned,
  onTogglePin,
}: {
  card: CsFilesCardDef;
  isSolution: boolean;
  defaultBorderClass: string;
  pinners: { id: string; name: string }[];
  canPin: boolean;
  iPinned: boolean;
  onTogglePin?: () => void;
}) {
  const body = (
    <>
      <img
        src={csFilesCardUrl(card.publicId, card.version)}
        alt={card.label}
        title={isSolution ? `${card.label} — คำตอบของฆาตกร` : card.label}
        className={cn(
          CS_FILES_CARD_ASPECT_CLASS,
          'w-full min-w-0 rounded-sm object-cover',
          isSolution
            ? 'border-2 border-error ring-2 ring-error/50 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]'
            : defaultBorderClass,
          iPinned && !isSolution && 'ring-2 ring-pear/60',
        )}
        loading="lazy"
        draggable={false}
      />
      {pinners.length > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-0.5 p-0.5">
          {pinners.map((p) => (
            <span
              key={p.id}
              className="max-w-full truncate rounded-sm bg-black/70 px-1 py-px text-[9px] leading-tight font-medium text-white opacity-50"
              title={p.name}
            >
              {p.name}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );

  if (!canPin || !onTogglePin) {
    return <div className="relative min-w-0">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onTogglePin}
      aria-pressed={iPinned}
      title={iPinned ? `ถอดหมุด — ${card.label}` : `ปักหมุด — ${card.label}`}
      className="relative min-w-0 rounded-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pear/70"
    >
      {body}
    </button>
  );
}

export function CsFilesBoard({ gameState: gs, myId, highlightSeatId, onToggleCardPin }: Props) {
  const solution = gs.solution;
  const cardPins = gs.cardPins ?? {};
  const canPinCards =
    Boolean(onToggleCardPin) &&
    gs.myRole !== 'forensic' &&
    (gs.phase === 'investigation' || gs.phase === 'witness_hunt');

  /** นิติ + สมรู้ร่วมคิด เห็นฆาตกร; เฉพาะนิติเห็นสมรู้ร่วมคิด (ฆาตกรไม่รู้) */
  const knownMurdererId =
    gs.myRole === 'forensic' || gs.myRole === 'accomplice' ? (gs.murdererId ?? null) : null;
  const knownAccompliceId = gs.myRole === 'forensic' ? (gs.accompliceId ?? null) : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {gs.seats
        .filter((seat: CsFilesSeatView) => seat.id !== gs.forensicId)
        .map((seat: CsFilesSeatView) => {
          const isMe = seat.id === myId;
          const isKnownMurderer = knownMurdererId === seat.id;
          const isKnownAccomplice = knownAccompliceId === seat.id;

          return (
            <section
              key={seat.id}
              className={cn(
                'flex min-w-0 flex-col rounded-card border p-3',
                isKnownMurderer
                  ? 'border-error/70 bg-error/5 ring-1 ring-error/25'
                  : isKnownAccomplice
                    ? 'border-rose-500/50 bg-rose-950/25 ring-1 ring-rose-400/20'
                    : 'bg-paper-2',
                !isKnownMurderer &&
                  !isKnownAccomplice &&
                  (highlightSeatId === seat.id ? 'border-pear ring-2 ring-pear/40' : 'border-rule'),
                (isKnownMurderer || isKnownAccomplice) &&
                  highlightSeatId === seat.id &&
                  'ring-2 ring-pear/40',
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <PlayerIdentity
                  playerId={seat.id}
                  name={isMe ? `${seat.name} (คุณ)` : seat.name}
                  avatarSize={36}
                />
                <div className="flex shrink-0 items-center gap-1.5">
                  {isKnownMurderer ? (
                    <Badge
                      variant="danger"
                      size="md"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 font-semibold"
                    >
                      <Skull size={14} aria-hidden />
                      ฆาตกร
                    </Badge>
                  ) : null}
                  {isKnownAccomplice ? (
                    <Badge
                      variant="danger"
                      size="sm"
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 font-semibold"
                    >
                      <UserRound size={13} aria-hidden />
                      ผู้สมรู้ร่วมคิด
                    </Badge>
                  ) : null}
                  {seat.hasBadge ? (
                    <img
                      src={CS_FILES_BADGE_URL}
                      alt="เหรียญตรา — สิทธิ์ไขคดี"
                      title="มีสิทธิ์ไขคดี"
                      className="h-9 w-auto"
                    />
                  ) : (
                    <Badge variant="outline" size="sm">
                      หมดสิทธิ์ไขคดี
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid min-w-0 gap-2">
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {seat.brownCards.map((c: CsFilesCardDef) => {
                    const pinners = cardPins[c.id] ?? [];
                    return (
                      <BoardCard
                        key={c.id}
                        card={c}
                        isSolution={
                          solution != null &&
                          solution.ownerId === seat.id &&
                          solution.evidenceCardId === c.id
                        }
                        defaultBorderClass="border border-amber-800/50"
                        pinners={pinners}
                        canPin={canPinCards}
                        iPinned={pinners.some((p) => p.id === myId)}
                        onTogglePin={canPinCards ? () => onToggleCardPin?.(c.id) : undefined}
                      />
                    );
                  })}
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {seat.blueCards.map((c: CsFilesCardDef) => {
                    const pinners = cardPins[c.id] ?? [];
                    return (
                      <BoardCard
                        key={c.id}
                        card={c}
                        isSolution={
                          solution != null &&
                          solution.ownerId === seat.id &&
                          solution.meansCardId === c.id
                        }
                        defaultBorderClass="border border-sky-800/50"
                        pinners={pinners}
                        canPin={canPinCards}
                        iPinned={pinners.some((p) => p.id === myId)}
                        onTogglePin={canPinCards ? () => onToggleCardPin?.(c.id) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
    </div>
  );
}
